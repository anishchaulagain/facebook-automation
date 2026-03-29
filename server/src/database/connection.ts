import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { config } from '../config/env.js';
import { logger } from '../middleware/logger.js';

let pool: Pool;

export async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = mysql.createPool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    logger.info('📦 MySQL connection pool created');
  }
  return pool;
}

export async function query<T extends RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
  const p = await getPool();
  const [rows] = await p.query<T>(sql, params);
  return rows;
}

export async function execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
  const p = await getPool();
  const [result] = await p.execute<ResultSetHeader>(sql, params);
  return result;
}

export async function getConnection(): Promise<PoolConnection> {
  const p = await getPool();
  return p.getConnection();
}

// ----- Auto-Migration -----
export async function runMigrations(): Promise<void> {
  logger.info('🔄 Running database migrations...');

  const migrations = [
    `CREATE TABLE IF NOT EXISTS posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      external_id VARCHAR(255) UNIQUE NOT NULL,
      source_name VARCHAR(255),
      original_title TEXT NOT NULL,
      original_url TEXT,
      restructured_content TEXT,
      restructured_content_en TEXT,
      restructured_content_unicode TEXT,
      category VARCHAR(100),
      severity VARCHAR(50),
      language VARCHAR(10),
      fingerprint VARCHAR(64) NOT NULL,
      status ENUM('pending','approved','posted','failed','duplicate','skipped') DEFAULT 'pending',
      fb_post_id VARCHAR(255),
      error_message TEXT,
      post_language ENUM('nepali','english','unicode') DEFAULT 'nepali',
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_fingerprint (fingerprint),
      INDEX idx_created_at (created_at),
      INDEX idx_external_id (external_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS automation_runs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      news_fetched INT DEFAULT 0,
      duplicates_found INT DEFAULT 0,
      posts_created INT DEFAULT 0,
      posts_failed INT DEFAULT 0,
      status ENUM('running','completed','failed') DEFAULT 'running',
      INDEX idx_status (status),
      INDEX idx_started_at (started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  const p = await getPool();
  for (const sql of migrations) {
    await p.query(sql);
  }

  // Seed default settings
  const defaultSettings = [
    ['cron_schedule', '*/30 * * * *'],
    ['auto_post', 'false'],
    ['post_language', 'nepali'],
    ['scheduler_active', 'false'],
    ['fb_connected', 'false'],
  ];

  for (const [key, value] of defaultSettings) {
    await p.query(
      `INSERT IGNORE INTO settings (\`key\`, value) VALUES (?, ?)`,
      [key, value]
    );
  }

  logger.info('✅ Database migrations completed');
}

export default { getPool, query, execute, getConnection, runMigrations };
