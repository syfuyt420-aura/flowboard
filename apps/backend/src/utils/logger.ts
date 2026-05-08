import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: config.isProd ? 'info' : 'debug',
  format: combine(timestamp(), json()),
  defaultMeta: { service: 'flowboard-api' },
  transports: [
    new winston.transports.Console({
      format: config.isProd ? combine(timestamp(), json()) : combine(colorize(), simple()),
    }),
  ],
});
