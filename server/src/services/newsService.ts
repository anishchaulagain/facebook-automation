import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../middleware/logger.js';
import type { NewsStory } from '../types/index.js';

/**
 * Fetches latest news from the Nepal OSINT API.
 * Filters out stories with missing required fields.
 */
export async function fetchLatestNews(): Promise<NewsStory[]> {
  try {
    logger.info('📡 Fetching latest news from API...');

    const response = await axios.get<NewsStory[]>(config.NEWS_API_URL, {
      headers: {
        Authorization: `Bearer ${config.BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    const stories = response.data;

    if (!Array.isArray(stories)) {
      logger.warn('⚠️ News API returned non-array response');
      return [];
    }

    // Filter out stories with missing required fields
    const validStories = stories.filter((story) => {
      if (!story.external_id || !story.title) {
        logger.debug(`Skipping story with missing fields: ${story.id}`);
        return false;
      }
      return true;
    });

    logger.info(`📰 Fetched ${validStories.length} valid news stories (${stories.length} total)`);
    return validStories;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      logger.error(`❌ News API error: ${error.response?.status} - ${error.message}`);
      throw new Error(`News API request failed: ${error.response?.status || 'Network Error'}`);
    }
    throw error;
  }
}

export default { fetchLatestNews };
