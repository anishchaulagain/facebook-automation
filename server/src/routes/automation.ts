import { Router } from 'express';
import { runPipeline, processTopSingleNews, startScheduler, stopScheduler, getSchedulerStatus } from '../services/schedulerService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// POST /api/automation/trigger — Manually trigger a pipeline run to fetch top single news
router.post('/trigger', asyncHandler(async (_req, res) => {
  const result = await processTopSingleNews();
  if ('message' in result) {
    res.json({ success: true, message: result.message });
  } else {
    res.json({ success: true, data: result.post });
  }
}));

// GET /api/automation/status — Current scheduler state
router.get('/status', asyncHandler(async (_req, res) => {
  const status = getSchedulerStatus();
  res.json({ success: true, data: status });
}));

// POST /api/automation/start — Start the scheduler
router.post('/start', asyncHandler(async (_req, res) => {
  await startScheduler();
  res.json({ success: true, message: 'Scheduler started' });
}));

// POST /api/automation/stop — Stop the scheduler
router.post('/stop', asyncHandler(async (_req, res) => {
  await stopScheduler();
  res.json({ success: true, message: 'Scheduler stopped' });
}));

export default router;
