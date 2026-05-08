import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/constants';

interface PresenceUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
  cursor?: { x: number; y: number };
}

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Map<string, PresenceUser>;
  connect: (token: string) => void;
  disconnect: () => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  updateCursor: (projectId: string, position: { x: number; y: number }) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: new Map(),

  connect: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false }));

    socket.on('presence:join', (user: PresenceUser) => {
      set((state) => {
        const next = new Map(state.onlineUsers);
        next.set(user.userId, user);
        return { onlineUsers: next };
      });
    });

    socket.on('presence:leave', (userId: string) => {
      set((state) => {
        const next = new Map(state.onlineUsers);
        next.delete(userId);
        return { onlineUsers: next };
      });
    });

    socket.on('presence:users', (users: PresenceUser[]) => {
      set({ onlineUsers: new Map(users.map((u) => [u.userId, u])) });
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isConnected: false, onlineUsers: new Map() });
  },

  joinProject: (projectId) => get().socket?.emit('project:join', projectId),
  leaveProject: (projectId) => get().socket?.emit('project:leave', projectId),
  updateCursor: (projectId, position) =>
    get().socket?.emit('cursor:update', { projectId, position }),
}));
