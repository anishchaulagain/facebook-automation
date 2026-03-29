import { Router } from 'express';
import { query } from '../database/connection.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { RowDataPacket } from 'mysql2/promise';

const router = Router();

interface CountRow extends RowDataPacket {
  count: number;
}

interface StatusCountRow extends RowDataPacket {
  status: string;
  count: number;
}

// GET /api/dashboard/stats
router.get('/stats', asyncHandler(async (_req, res) => {
  // Total counts by status
  const statusCounts = await query<StatusCountRow[]>(
    `SELECT status, COUNT(*) as count FROM posts GROUP BY status`
  );

  const counts: Record<string, number> = {};
  statusCounts.forEach(row => { counts[row.status] = row.count; });

  const totalPosts = Object.values(counts).reduce((a, b) => a + b, 0);
  const postedCount = counts['posted'] || 0;
  const failedCount = counts['failed'] || 0;
  const duplicateCount = counts['duplicate'] || 0;
  const pendingCount = (counts['pending'] || 0) + (counts['approved'] || 0);
  const successRate = totalPosts > 0 ? Math.round((postedCount / (postedCount + failedCount)) * 100) : 0;

  // Today's stats
  const todayStats = await query<StatusCountRow[]>(
    `SELECT status, COUNT(*) as count FROM posts WHERE DATE(created_at) = CURDATE() GROUP BY status`
  );
  const todayCounts: Record<string, number> = {};
  todayStats.forEach(row => { todayCounts[row.status] = row.count; });

  const todayPosts = Object.values(todayCounts).reduce((a, b) => a + b, 0);
  const todayDuplicates = todayCounts['duplicate'] || 0;

  res.json({
    success: true,
    data: {
      totalPosts,
      postedCount,
      failedCount,
      duplicateCount,
      pendingCount,
      successRate,
      todayPosts,
      todayDuplicates,
    },
  });
}));

// GET /api/dashboard/activity
router.get('/activity', asyncHandler(async (_req, res) => {
  const runs = await query(
    `SELECT * FROM automation_runs ORDER BY started_at DESC LIMIT 20`
  );

  const recentPosts = await query(
    `SELECT id, original_title, source_name, status, category, post_language, created_at, published_at 
     FROM posts ORDER BY created_at DESC LIMIT 10`
  );

  res.json({
    success: true,
    data: { runs, recentPosts },
  });
}));

export default router;
