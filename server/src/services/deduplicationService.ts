import { query } from '../database/connection.js';
import { generateFingerprint, calculateSimilarity } from '../utils/fingerprint.js';
import { logger } from '../middleware/logger.js';
import type { DeduplicationResult, NewsStory } from '../types/index.js';
import { RowDataPacket } from 'mysql2/promise';

const SIMILARITY_THRESHOLD = 0.7;

interface PostRow extends RowDataPacket {
  id: number;
  original_title: string;
  fingerprint: string;
  original_url: string;
}

/**
 * Multi-layer deduplication engine:
 * 1. Exact fingerprint match (SHA-256 of normalized title)
 * 2. URL uniqueness check
 * 3. Fuzzy similarity check against recent posts (Jaccard >= 0.7)
 */
export async function checkDuplicate(story: NewsStory): Promise<DeduplicationResult> {
  const fingerprint = generateFingerprint(story.title);

  // Layer 1: Exact fingerprint match
  const exactMatch = await query<PostRow[]>(
    'SELECT id, original_title FROM posts WHERE fingerprint = ? LIMIT 1',
    [fingerprint]
  );

  if (exactMatch.length > 0) {
    logger.debug(`🔁 Exact duplicate found: "${story.title}" matches post #${exactMatch[0].id}`);
    return {
      isDuplicate: true,
      reason: `Exact match with existing post #${exactMatch[0].id}`,
    };
  }

  // Layer 2: URL uniqueness
  if (story.url) {
    const urlMatch = await query<PostRow[]>(
      'SELECT id FROM posts WHERE original_url = ? LIMIT 1',
      [story.url]
    );

    if (urlMatch.length > 0) {
      logger.debug(`🔁 URL duplicate found: ${story.url}`);
      return {
        isDuplicate: true,
        reason: `URL already exists in post #${urlMatch[0].id}`,
      };
    }
  }

  // Layer 3: Fuzzy similarity against last 48h of posts
  const recentPosts = await query<PostRow[]>(
    `SELECT id, original_title FROM posts 
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR) 
     AND status != 'duplicate'
     ORDER BY created_at DESC LIMIT 200`
  );

  for (const post of recentPosts) {
    const similarity = calculateSimilarity(story.title, post.original_title);
    if (similarity >= SIMILARITY_THRESHOLD) {
      logger.debug(
        `🔁 Similar content found (${(similarity * 100).toFixed(1)}%): "${story.title}" ≈ "${post.original_title}"`
      );
      return {
        isDuplicate: true,
        reason: `${(similarity * 100).toFixed(1)}% similar to post #${post.id}`,
      };
    }
  }

  return { isDuplicate: false, reason: '' };
}

export function getFingerprint(title: string): string {
  return generateFingerprint(title);
}

export default { checkDuplicate, getFingerprint };
