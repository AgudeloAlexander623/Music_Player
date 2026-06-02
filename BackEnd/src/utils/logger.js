import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.resolve(__dirname, '../../logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            const stackStr = stack ? `\n${stack}` : '';
            return `${timestamp} ${level}: ${message}${metaStr}${stackStr}`;
          })
        ),
  ),
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
          new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
        ]
      : []),
  ],
});

export default logger;
