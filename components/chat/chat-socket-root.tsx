'use client';

import type { ReactNode } from 'react';
import { ChatSocketProvider } from '@/components/chat/chat-socket-provider';

export function ChatSocketRoot({ children }: { children: ReactNode }) {
  return <ChatSocketProvider>{children}</ChatSocketProvider>;
}
