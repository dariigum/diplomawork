'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAuthSession } from '@/app/actions/auth';

type ChatSocketContextValue = {
  socket: Socket | null;
  connected: boolean;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  socketRef: MutableRefObject<Socket | null>;
};

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

async function fetchSocketToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/socket-token', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return typeof data.token === 'string' && data.token.length > 0 ? data.token : null;
  } catch {
    return null;
  }
}

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const activeChatIdRef = useRef<string | null>(null);
  const connectGenRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let client: Socket | null = null;

    const attachClient = (socketToken: string) => {
      const origin =
        process.env.NEXT_PUBLIC_SOCKET_ORIGIN ||
        (typeof window !== 'undefined' ? window.location.origin : '');
      if (!origin) return null;

      const s = io(origin, {
        path: '/socket.io',
        withCredentials: true,
        auth: { token: socketToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelayMax: 8000,
      });

      const onConnect = () => {
        setConnected(true);
        const chatId = activeChatIdRef.current;
        if (chatId) {
          s.emit('chat:join', { chatId }, (r: { ok?: boolean; error?: string }) => {
            if (!r?.ok) console.error('[chat:join]', r?.error);
          });
        }
      };

      const onDisconnect = () => setConnected(false);

      const onConnectError = (err: Error) => {
        setConnected(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('[chat-socket] connect_error', err.message);
        }
        void (async () => {
          const fresh = await fetchSocketToken();
          if (!fresh || disposed || !s.active) return;
          s.auth = { token: fresh };
          s.connect();
        })();
      };

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      s.on('connect_error', onConnectError);

      s.io.on('reconnect_attempt', () => {
        void (async () => {
          const fresh = await fetchSocketToken();
          if (fresh) s.auth = { token: fresh };
        })();
      });

      if (s.connected) onConnect();
      return s;
    };

    const setup = async () => {
      const gen = ++connectGenRef.current;
      const session = await getAuthSession();
      if (disposed || gen !== connectGenRef.current) return;
      if (!session?.user?.id) return;
      if (session.user.role !== 'EMPLOYEE' && session.user.role !== 'EMPLOYER') return;

      const socketToken = await fetchSocketToken();
      if (disposed || gen !== connectGenRef.current) return;
      if (!socketToken) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[chat-socket] No session token. Log in again after setting SESSION_SECRET in .env and restarting npm run dev.',
          );
        }
        return;
      }

      client = attachClient(socketToken);
      if (!client) return;
      socketRef.current = client;
      setSocket(client);
    };

    void setup();

    return () => {
      disposed = true;
      if (client) {
        client.removeAllListeners();
        client.close();
      }
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, []);

  const joinChat = useCallback((chatId: string) => {
    activeChatIdRef.current = chatId;
    socketRef.current?.emit('chat:join', { chatId }, (r: { ok?: boolean; error?: string }) => {
      if (!r?.ok) console.error('[chat:join]', r?.error);
    });
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    if (activeChatIdRef.current === chatId) {
      activeChatIdRef.current = null;
    }
    socketRef.current?.emit('chat:leave', { chatId });
  }, []);

  const value = useMemo(
    () => ({
      socket,
      connected,
      joinChat,
      leaveChat,
      socketRef,
    }),
    [socket, connected, joinChat, leaveChat],
  );

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket(): ChatSocketContextValue {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    throw new Error('useChatSocket must be used within ChatSocketProvider');
  }
  return ctx;
}

/** Stable socket listener — handler always sees latest closure via ref. */
export function useChatSocketEvent(
  event: string,
  handler: (...args: unknown[]) => void,
  enabled = true,
) {
  const { socket, connected } = useChatSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !socket || !connected) return;
    const listener = (...args: unknown[]) => handlerRef.current(...args);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, connected, event, enabled]);
}
