import cron from 'node-cron';
import { fetchLatestNews } from './newsService.js';
import { checkDuplicate, getFingerprint } from './deduplicationService.js';
import { restructureNews } from './llmService.js';
import { publishPost } from './facebookService.js';
import { execute, query } from '../database/connection.js';
import { logger } from '../middleware/logger.js';
import type { PipelineResult, PostLanguage } from '../types/index.js';
import { RowDataPacket } from 'mysql2/promise';

let schedulerTask: cron.ScheduledTask | null = null;
let isRunning = false;

interface SettingRow extends RowDataPacket {
  key: string;
  value: string;
}

/**
 * Gets a setting value from the database.
 */
async function getSetting(key: string, fallback: string = ''): Promise<string> {
  const rows = await query<SettingRow[]>(
    'SELECT value FROM settings WHERE `key` = ?',
    [key]
  );
  return rows.length > 0 ? rows[0].value : fallback;
}

/**
 * Core automation pipeline:
 * Fetch → Filter → Dedup → LLM Restructure → Post to Facebook
 */
export async function runPipeline(): Promise<PipelineResult> {
  if (isRunning) {
    logger.warn('⚠️ Pipeline already running. Skipping this trigger.');
    return { runId: 0, newsFetched: 0, duplicatesFound: 0, postsCreated: 0, postsFailed: 0 };
  }

  isRunning = true;
  const stats = { newsFetched: 0, duplicatesFound: 0, postsCreated: 0, postsFailed: 0 };

  // Create automation run record
  const runResult = await execute(
    'INSERT INTO automation_runs (status) VALUES (?)',
    ['running']
  );
  const runId = runResult.insertId;

  try {
    // Step 1: Fetch news
    const stories = await fetchLatestNews();
    stats.newsFetched = stories.length;

    if (stories.length === 0) {
      logger.info('📭 No news stories to process');
      await execute(
        'UPDATE automation_runs SET status = ?, completed_at = NOW(), news_fetched = ? WHERE id = ?',
        ['completed', 0, runId]
      );
      isRunning = false;
      return { runId, ...stats };
    }

    // Get auto_post and post_language settings
    const autoPost = (await getSetting('auto_post', 'false')) === 'true';
    const postLanguage = (await getSetting('post_language', 'nepali')) as PostLanguage;

    // Step 2-5: Process each story
    for (const story of stories) {
      try {
        // Step 2: Deduplication check
        const dedupResult = await checkDuplicate(story);
        const fingerprint = getFingerprint(story.title);

        if (dedupResult.isDuplicate) {
          stats.duplicatesFound++;
          await execute(
            `INSERT IGNORE INTO posts 
            (external_id, source_name, original_title, original_url, category, severity, language, fingerprint, status, error_message) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'duplicate', ?)`,
            [story.external_id, story.source_name, story.title, story.url, story.category, story.severity, story.language, fingerprint, dedupResult.reason]
          );
          continue;
        }

        // Step 3: LLM Restructuring
        const restructured = await restructureNews(story);

        // Step 4: Save to database
        const status = autoPost ? 'approved' : 'pending';
        const insertResult = await execute(
          `INSERT INTO posts 
          (external_id, source_name, original_title, original_url, restructured_content, restructured_content_en, restructured_content_unicode, category, severity, language, fingerprint, status, post_language)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [story.external_id, story.source_name, story.title, story.url, restructured.nepali, restructured.english, restructured.unicode, story.category, story.severity, story.language, fingerprint, status, postLanguage]
        );

        // Step 5: Auto-post if enabled
        if (autoPost) {
          const contentMap: Record<PostLanguage, string> = {
            nepali: restructured.nepali,
            english: restructured.english,
            unicode: restructured.unicode,
          };

          const content = contentMap[postLanguage] || restructured.nepali;
          const fbResult = await publishPost(content);

          if (fbResult.success) {
            await execute(
              'UPDATE posts SET status = ?, fb_post_id = ?, published_at = NOW() WHERE id = ?',
              ['posted', fbResult.postId, insertResult.insertId]
            );
            stats.postsCreated++;
          } else {
            await execute(
              'UPDATE posts SET status = ?, error_message = ? WHERE id = ?',
              ['failed', fbResult.error, insertResult.insertId]
            );
            stats.postsFailed++;
          }
        } else {
          stats.postsCreated++;
        }

        // Small delay between posts to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (storyError: any) {
        logger.error(`❌ Failed processing story "${story.title}": ${storyError.message}`);
        stats.postsFailed++;

        await execute(
          `INSERT IGNORE INTO posts 
          (external_id, source_name, original_title, original_url, category, severity, language, fingerprint, status, error_message)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?)`,
          [story.external_id, story.source_name, story.title, story.url, story.category, story.severity, story.language, getFingerprint(story.title), storyError.message]
        );
      }
    }

    // Update run record
    await execute(
      `UPDATE automation_runs SET 
       status = 'completed', completed_at = NOW(), 
       news_fetched = ?, duplicates_found = ?, posts_created = ?, posts_failed = ? 
       WHERE id = ?`,
      [stats.newsFetched, stats.duplicatesFound, stats.postsCreated, stats.postsFailed, runId]
    );

    logger.info(`✅ Pipeline complete — Fetched: ${stats.newsFetched}, Dupes: ${stats.duplicatesFound}, Created: ${stats.postsCreated}, Failed: ${stats.postsFailed}`);
  } catch (error: any) {
    logger.error(`❌ Pipeline failed: ${error.message}`);
    await execute(
      'UPDATE automation_runs SET status = ?, completed_at = NOW() WHERE id = ?',
      ['failed', runId]
    );
  } finally {
    isRunning = false;
  }

  return { runId, ...stats };
}

/**
 * Manual trigger: specifically fetches the top-most (newest) non-duplicate news,
 * revamps it via LLM, saves as pending, and returns it for manual review.
 */
export async function processTopSingleNews(): Promise<{ post: any } | { message: string }> {
  if (isRunning) {
    throw new Error('Pipeline is currently running in the background. Please wait.');
  }

  isRunning = true;
  try {
    const stories = await fetchLatestNews();
    
    // Find the first non-duplicate story
    let targetStory = null;
    let dedupResult = null;
    for (const story of stories) {
      const res = await checkDuplicate(story);
      if (!res.isDuplicate) {
        targetStory = story;
        dedupResult = res;
        break;
      }
    }

    if (!targetStory) {
      return { message: 'All latest news items have already been processed or are duplicates.' };
    }

    // Step 3: LLM Restructuring
    const restructured = await restructureNews(targetStory);
    const fingerprint = getFingerprint(targetStory.title);
    const postLanguage = (await getSetting('post_language', 'nepali')) as PostLanguage;

    // Step 4: Save to database as pending
    const status = 'pending';
    const insertResult = await execute(
      `INSERT INTO posts 
      (external_id, source_name, original_title, original_url, restructured_content, restructured_content_en, restructured_content_unicode, category, severity, language, fingerprint, status, post_language)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [targetStory.external_id, targetStory.source_name, targetStory.title, targetStory.url, restructured.nepali, restructured.english, restructured.unicode, targetStory.category, targetStory.severity, targetStory.language, fingerprint, status, postLanguage]
    );

    // Fetch the inserted post
    const [insertedPost] = await query<any[]>(
      'SELECT * FROM posts WHERE id = ?',
      [insertResult.insertId]
    );

    return { post: insertedPost };

  } finally {
    isRunning = false;
  }
}

/**
 * Start the cron scheduler.
 */
export async function startScheduler(): Promise<void> {
  const schedule = await getSetting('cron_schedule', '*/30 * * * *');

  if (schedulerTask) {
    schedulerTask.stop();
  }

  schedulerTask = cron.schedule(schedule, async () => {
    logger.info('⏰ Scheduled automation run triggered');
    await runPipeline();
  });

  await execute(
    "INSERT INTO settings (`key`, value) VALUES ('scheduler_active', 'true') ON DUPLICATE KEY UPDATE value = 'true'",
  );

  logger.info(`🚀 Scheduler started with schedule: ${schedule}`);
}

/**
 * Stop the cron scheduler.
 */
export async function stopScheduler(): Promise<void> {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
  }

  await execute(
    "INSERT INTO settings (`key`, value) VALUES ('scheduler_active', 'false') ON DUPLICATE KEY UPDATE value = 'false'",
  );

  logger.info('⏹️ Scheduler stopped');
}

/**
 * Get scheduler status.
 */
export function getSchedulerStatus(): { active: boolean; running: boolean } {
  return {
    active: schedulerTask !== null,
    running: isRunning,
  };
}

export default { runPipeline, processTopSingleNews, startScheduler, stopScheduler, getSchedulerStatus };
