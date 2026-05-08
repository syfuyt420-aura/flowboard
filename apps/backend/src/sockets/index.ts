import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

interface SocketUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export function initSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontend.url,
      credentials: true,
    },
    transports: ['websocket'],
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }
    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as {
        sub: string;
        name: string;
      };
      socket.data.userId = payload.sub;
      socket.data.name = payload.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user: SocketUser = {
      userId: socket.data.userId as string,
      name: socket.data.name as string,
      avatarUrl: null,
    };

    logger.debug('Socket connected', { userId: user.userId });

    socket.on('project:join', (projectId: string) => {
      const room = `project:${projectId}`;
      socket.join(room);
      socket.to(room).emit('presence:join', user);

      const usersInRoom = Array.from(io.sockets.adapter.rooms.get(room) ?? [])
        .map((id) => {
          const s = io.sockets.sockets.get(id);
          return s ? ({ userId: s.data.userId, name: s.data.name, avatarUrl: null } as SocketUser) : null;
        })
        .filter(Boolean);

      socket.emit('presence:users', usersInRoom);
    });

    socket.on('project:leave', (projectId: string) => {
      const room = `project:${projectId}`;
      socket.leave(room);
      socket.to(room).emit('presence:leave', user.userId);
    });

    socket.on('cursor:update', (data: { projectId: string; position: { x: number; y: number } }) => {
      socket.to(`project:${data.projectId}`).emit('cursor:move', {
        userId: user.userId,
        position: data.position,
      });
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { userId: user.userId });
      socket.rooms.forEach((room) => {
        socket.to(room).emit('presence:leave', user.userId);
      });
    });
  });

  return io;
}
