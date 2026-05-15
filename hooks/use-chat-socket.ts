'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export function useChatSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectJoinRef = useRef<{ chatId: string | null }>({ chatId: null });

  useEffect(() => {
    const origin =
      process.env.NEXT_PUBLIC_SOCKET_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!origin) return;

    const s = io(origin, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelayMax: 8000,
    });

    socketRef.current = s;

    const onConnect = () => {
      setConnected(true);
      const id = reconnectJoinRef.current.chatId;
      if (id) {
        s.emit('chat:join', { chatId: id }, (r: { ok?: boolean; error?: string }) => {
          if (!r?.ok) console.error('[chat:join]', r?.error);
        });
      }
    };
    const onDisconnect = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    if (s.connected) {
      setConnected(true);
      onConnect();
    }

    return () => {
      s.removeAllListeners();
      s.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  const joinChat = useCallback((chatId: string) => {
    reconnectJoinRef.current.chatId = chatId;
    socketRef.current?.emit('chat:join', { chatId }, (r: { ok?: boolean; error?: string }) => {
      if (!r?.ok) console.error('[chat:join]', r?.error);
    });
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    if (reconnectJoinRef.current.chatId === chatId) {
      reconnectJoinRef.current.chatId = null;
    }
    socketRef.current?.emit('chat:leave', { chatId });
  }, []);

  return { socket: socketRef.current, connected, joinChat, leaveChat, socketRef };
}
