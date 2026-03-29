import { Router } from 'express';
import { query, execute } from '../database/connection.js';
import { publishPost } from '../services/facebookService.js';
import { asyncHandler, createAppError } from '../middleware/errorHandler.js';
import { RowDataPacket } from 'mysql2/promise';

const router = Router();

interface PostRow extends RowDataPacket {
  id: number;
  external_id: string;
  source_name: string;
  original_title: string;
  original_url: string;
  restructured_content: string;
  restructured_content_en: string;
  restructured_content_unicode: string;
  category: string;
  severity: string;
  language: string;
  fingerprint: string;
  status: string;
  fb_post_id: string;
  error_message: string;
  post_language: string;
  published_at: string;
  created_at: string;
  updated_at: string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// GET /api/posts — Paginated list with filters
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;
  const status = req.query.status as string;
  const category = req.query.category as string;
  const search = req.query.search as string;

  let whereClause = '1=1';
  const params: any[] = [];

  if (status && status !== 'all') {
    whereClause += ' AND status = ?';
    params.push(status);
  }
  if (category) {
    whereClause += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    whereClause += ' AND (original_title LIKE ? OR restructured_content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [posts, countResult] = await Promise.all([
    query<PostRow[]>(
      `SELECT * FROM posts WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    query<CountRow[]>(
      `SELECT COUNT(*) as total FROM posts WHERE ${whereClause}`,
      params
    ),
  ]);

  const total = countResult[0]?.total || 0;

  res.json({
    success: true,
    data: {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}));

// GET /api/posts/:id — Single post detail
router.get('/:id', asyncHandler(async (req, res) => {
  const posts = await query<PostRow[]>(
    'SELECT * FROM posts WHERE id = ?',
    [req.params.id]
  );

  if (posts.length === 0) {
    throw createAppError('Post not found', 404);
  }

  res.json({ success: true, data: posts[0] });
}));

// POST /api/posts/:id/approve — Approve a pending post
router.post('/:id/approve', asyncHandler(async (req, res) => {
  const post = await query<PostRow[]>('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (post.length === 0) throw createAppError('Post not found', 404);
  if (post[0].status !== 'pending') throw createAppError('Post is not pending', 400);

  await execute('UPDATE posts SET status = ? WHERE id = ?', ['approved', req.params.id]);

  res.json({ success: true, message: 'Post approved' });
}));

// POST /api/posts/:id/publish — Manually publish a post
router.post('/:id/publish', asyncHandler(async (req, res) => {
  const post = await query<PostRow[]>('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (post.length === 0) throw createAppError('Post not found', 404);

  const lang = (req.body.language || post[0].post_language || 'nepali') as string;

  let content: string;
  switch (lang) {
    case 'english':
      content = post[0].restructured_content_en;
      break;
    case 'unicode':
      content = post[0].restructured_content_unicode;
      break;
    default:
      content = post[0].restructured_content;
  }

  if (!content) throw createAppError('No restructured content available', 400);

  const result = await publishPost(content);

  if (result.success) {
    await execute(
      'UPDATE posts SET status = ?, fb_post_id = ?, published_at = NOW(), post_language = ? WHERE id = ?',
      ['posted', result.postId, lang, req.params.id]
    );
    res.json({ success: true, message: 'Post published', postId: result.postId });
  } else {
    await execute(
      'UPDATE posts SET status = ?, error_message = ? WHERE id = ?',
      ['failed', result.error, req.params.id]
    );
    throw createAppError(`Publish failed: ${result.error}`, 500);
  }
}));

// POST /api/posts/:id/retry — Retry a failed post
router.post('/:id/retry', asyncHandler(async (req, res) => {
  const post = await query<PostRow[]>('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (post.length === 0) throw createAppError('Post not found', 404);
  if (post[0].status !== 'failed') throw createAppError('Post is not in failed state', 400);

  const lang = post[0].post_language || 'nepali';
  let content: string;
  switch (lang) {
    case 'english': content = post[0].restructured_content_en; break;
    case 'unicode': content = post[0].restructured_content_unicode; break;
    default: content = post[0].restructured_content;
  }

  if (!content) throw createAppError('No restructured content available for retry', 400);

  const result = await publishPost(content);

  if (result.success) {
    await execute(
      'UPDATE posts SET status = ?, fb_post_id = ?, published_at = NOW(), error_message = NULL WHERE id = ?',
      ['posted', result.postId, req.params.id]
    );
    res.json({ success: true, message: 'Retry successful', postId: result.postId });
  } else {
    await execute(
      'UPDATE posts SET error_message = ? WHERE id = ?',
      [result.error, req.params.id]
    );
    throw createAppError(`Retry failed: ${result.error}`, 500);
  }
}));

// DELETE /api/posts/:id — Delete a post
router.delete('/:id', asyncHandler(async (req, res) => {
  await execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Post deleted' });
}));

export default router;
