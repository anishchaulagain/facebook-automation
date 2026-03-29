import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { logger, httpLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { runMigrations } from './database/connection.js';
import { startScheduler } from './services/schedulerService.js';

import dashboardRoutes from './routes/dashboard.js';
import postRoutes from './routes/posts.js';
import automationRoutes from './routes/automation.js';
import settingsRoutes from './routes/settings.js';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({ origin: config.CLIENT_URL, credentials: true }));

// JSON parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Logging
app.use(httpLogger);

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/settings', settingsRoutes);

// Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', environment: config.NODE_ENV });
});

// Global Error Handler
app.use(errorHandler);

// Bootstrap
async function bootstrap() {
  try {
    logger.info('🚀 Starting Facebook Automation Server...');

    // Run database migrations
    await runMigrations();

    // Start Express server
    const server = app.listen(config.PORT, () => {
      logger.info(`✅ Server listening on port ${config.PORT}`);
    });

    // Handle graceful shutdown
    const shutdown = () => {
      logger.info('🛑 Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error: any) {
    logger.error(`❌ Bootstrap failed: ${error.message}`);
    process.exit(1);
  }
}

bootstrap();
