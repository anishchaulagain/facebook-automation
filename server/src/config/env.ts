import dotenv from 'dotenv';
import path from 'path';

// Load from root .env first, then server .env (server overrides)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: string;

  // News API
  NEWS_API_URL: string;
  BEARER_TOKEN: string;

  // Groq LLM
  GROQ_API_KEY: string;
  GROQ_MODEL: string;

  // Facebook
  FB_PAGE_ID: string;
  FB_PAGE_ACCESS_TOKEN: string;

  // MySQL (Aiven)
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;

  // Scheduler
  CRON_SCHEDULE: string;

  // Frontend
  CLIENT_URL: string;
}

function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (value === undefined) {
    console.warn(`⚠️  Environment variable ${key} is not set`);
    return '';
  }
  return value;
}

function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Required environment variable ${key} is missing. Check your .env file.`);
  }
  return value;
}

export const config: EnvConfig = {
  PORT: parseInt(getEnvVar('PORT', '5000'), 10),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),

  NEWS_API_URL: getRequiredEnvVar('LATEST_NEWS_API_URL'),
  BEARER_TOKEN: getRequiredEnvVar('BEARER_TOKEN'),

  GROQ_API_KEY: getRequiredEnvVar('GROQ_API_KEY'),
  GROQ_MODEL: getEnvVar('GROQ_MODEL', 'llama-3.3-70b-versatile'),

  FB_PAGE_ID: getEnvVar('FB_PAGE_ID', ''),
  FB_PAGE_ACCESS_TOKEN: getEnvVar('FB_PAGE_ACCESS_TOKEN', ''),

  DB_HOST: getRequiredEnvVar('DB_HOST'),
  DB_PORT: parseInt(getRequiredEnvVar('DB_PORT'), 10),
  DB_USER: getRequiredEnvVar('DB_USER'),
  DB_PASSWORD: getRequiredEnvVar('DB_PASSWORD'),
  DB_NAME: getRequiredEnvVar('DB_NAME'),

  CRON_SCHEDULE: getEnvVar('CRON_SCHEDULE', '*/30 * * * *'),
  CLIENT_URL: getEnvVar('CLIENT_URL', 'http://localhost:3000'),
};

export default config;
