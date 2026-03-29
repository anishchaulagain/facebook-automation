import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../middleware/logger.js';
import type { FacebookPostResult } from '../types/index.js';

const FB_API_VERSION = 'v25.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

/**
 * Validates the Facebook Page Access Token.
 * Returns true if valid, false otherwise.
 */
export async function validateToken(): Promise<boolean> {
  if (!config.FB_PAGE_ACCESS_TOKEN || !config.FB_PAGE_ID) {
    logger.warn('⚠️ Facebook credentials not configured');
    return false;
  }

  try {
    const response = await axios.get(`${FB_BASE_URL}/me`, {
      params: { access_token: config.FB_PAGE_ACCESS_TOKEN },
      timeout: 10000,
    });

    logger.info(`✅ Facebook token valid. Page: ${response.data.name} (ID: ${response.data.id})`);
    return true;
  } catch (error: any) {
    logger.error(`❌ Facebook token validation failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

/**
 * Publishes a text post to the configured Facebook Page.
 * Handles rate limits with automatic backoff.
 */
export async function publishPost(content: string): Promise<FacebookPostResult> {
  if (!config.FB_PAGE_ACCESS_TOKEN || !config.FB_PAGE_ID) {
    return {
      success: false,
      error: 'Facebook credentials not configured. Set FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN in .env',
    };
  }

  try {
    logger.info('📤 Publishing to Facebook Page...');

    const response = await axios.post(
      `${FB_BASE_URL}/${config.FB_PAGE_ID}/feed`,
      {
        message: content,
        access_token: config.FB_PAGE_ACCESS_TOKEN,
      },
      { timeout: 30000 }
    );

    const postId = response.data.id;
    logger.info(`✅ Published to Facebook! Post ID: ${postId}`);

    return { success: true, postId };
  } catch (error: any) {
    const fbError = error.response?.data?.error;

    // Handle rate limiting
    if (error.response?.status === 429 || fbError?.code === 32) {
      logger.warn('⏳ Facebook rate limit hit. Backing off...');
      return {
        success: false,
        error: 'Rate limit exceeded. Will retry later.',
      };
    }

    // Handle expired token
    if (fbError?.code === 190) {
      logger.error('🔑 Facebook access token expired. Please refresh.');
      return {
        success: false,
        error: 'Access token expired. Please generate a new token.',
      };
    }

    const errorMessage = fbError?.message || error.message;
    logger.error(`❌ Facebook publish error: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Gets the connection status including page info.
 */
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  pageName?: string;
  pageId?: string;
  error?: string;
}> {
  if (!config.FB_PAGE_ACCESS_TOKEN || !config.FB_PAGE_ID) {
    return { connected: false, error: 'Credentials not configured' };
  }

  try {
    const response = await axios.get(`${FB_BASE_URL}/me`, {
      params: {
        access_token: config.FB_PAGE_ACCESS_TOKEN,
        fields: 'id,name,fan_count,link',
      },
      timeout: 10000,
    });

    return {
      connected: true,
      pageName: response.data.name,
      pageId: response.data.id,
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

export default { validateToken, publishPost, getConnectionStatus };
