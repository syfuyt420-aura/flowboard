import 'dotenv/config';
import http from 'http';
import { app } from './app';
import { initSocket } from './sockets';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';
import { logger } from './utils/logger';
import { config } from './config';

const server = http.createServer(app);
initSocket(server);

async function start() {
  try {
    await redis.connect();
    await prisma.$connect();
    logger.info('Database connected');

    server.listen(config.port, () => {
      logger.info(`FlowBoard API running on port ${config.port}`, {
        env: config.nodeEnv,
        port: config.port,
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

start();
