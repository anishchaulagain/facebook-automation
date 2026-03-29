import { Router } from 'express';
import { query, execute } from '../database/connection.js';
import { getConnectionStatus } from '../services/facebookService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { RowDataPacket } from 'mysql2/promise';

const router = Router();

interface SettingRow extends RowDataPacket {
  key: string;
  value: string;
  updated_at: string;
}

// GET /api/settings — Get all settings
router.get('/', asyncHandler(async (_req, res) => {
  const settings = await query<SettingRow[]>('SELECT * FROM settings');

  const settingsMap: Record<string, string> = {};
  settings.forEach(row => { settingsMap[row.key] = row.value; });

  // Include Facebook connection status
  const fbStatus = await getConnectionStatus();

  res.json({
    success: true,
    data: {
      settings: settingsMap,
      facebook: fbStatus,
    },
  });
}));

// PUT /api/settings — Update settings
router.put('/', asyncHandler(async (req, res) => {
  const updates = req.body as Record<string, string>;

  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ success: false, error: 'Invalid request body' });
    return;
  }

  const allowedKeys = ['cron_schedule', 'auto_post', 'post_language', 'scheduler_active'];

  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.includes(key)) continue;

    await execute(
      'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
      [key, String(value), String(value)]
    );
  }

  res.json({ success: true, message: 'Settings updated' });
}));

export default router;
