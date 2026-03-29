// ============================================================
// Facebook Automation — Shared TypeScript Interfaces
// ============================================================

// ----- News API Response -----
export interface NewsStory {
  id: string;
  external_id: string;
  source_id: string;
  source_name: string;
  title: string;
  url: string;
  summary: string | null;
  language: string;
  author: string | null;
  categories: string[];
  nepal_relevance: string;
  relevance_score: number;
  category: string;
  severity: string;
  cluster_id: string | null;
  published_at: string;
  created_at: string;
}

// ----- Database Models -----
export interface Post {
  id: number;
  external_id: string;
  source_name: string;
  original_title: string;
  original_url: string;
  restructured_content: string | null;
  restructured_content_en: string | null;
  restructured_content_unicode: string | null;
  category: string;
  severity: string;
  language: string;
  fingerprint: string;
  status: PostStatus;
  fb_post_id: string | null;
  error_message: string | null;
  post_language: PostLanguage;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PostStatus = 'pending' | 'approved' | 'posted' | 'failed' | 'duplicate' | 'skipped';
export type PostLanguage = 'nepali' | 'english' | 'unicode';

export interface AutomationRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  news_fetched: number;
  duplicates_found: number;
  posts_created: number;
  posts_failed: number;
  status: 'running' | 'completed' | 'failed';
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

// ----- Service Return Types -----
export interface DeduplicationResult {
  isDuplicate: boolean;
  reason: string;
}

export interface LLMRestructuredContent {
  nepali: string;
  english: string;
  unicode: string;
}

export interface FacebookPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface DashboardStats {
  totalPosts: number;
  postedCount: number;
  failedCount: number;
  duplicateCount: number;
  pendingCount: number;
  successRate: number;
  todayPosts: number;
  todayDuplicates: number;
}

export interface PipelineResult {
  runId: number;
  newsFetched: number;
  duplicatesFound: number;
  postsCreated: number;
  postsFailed: number;
}

// ----- Settings Keys -----
export enum SettingKey {
  CRON_SCHEDULE = 'cron_schedule',
  AUTO_POST = 'auto_post',
  POST_LANGUAGE = 'post_language',
  FB_CONNECTED = 'fb_connected',
  SCHEDULER_ACTIVE = 'scheduler_active',
}
