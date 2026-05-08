import type { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
) {
  res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: { cursor: string | null; total: number; hasMore: boolean; limit: number }
) {
  res.status(200).json({ success: true, data, meta });
}
