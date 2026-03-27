'use client'

import { useEffect, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import type { ChatMessageView } from '@/lib/chat-types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatMessagePaneProps {
  conversationKey: string | null;
  currentUserId: string;
  header: React.ReactNode;
  messages: ChatMessageView[];
  isLoading: boolean;
  isSending: boolean;
  onSendMessage: (content: string) => Promise<void>;
  emptyTitle: string;
  emptyDescription: string;
  onClose?: () => void;
  className?: string;
}

export function ChatMessagePane({
  conversationKey,
  currentUserId,
  header,
  messages,
  isLoading,
  isSending,
  onSendMessage,
  emptyTitle,
  emptyDescription,
  onClose,
  className,
}: ChatMessagePaneProps) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft('');
  }, [conversationKey]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;

    const nextDraft = draft;
    setDraft('');

    try {
      await onSendMessage(nextDraft);
    } catch {
      setDraft(nextDraft);
    }
  };

  if (!conversationKey) {
    return (
      <div className={cn('flex h-full min-h-0 flex-1 flex-col bg-card', className)}>
        {onClose && (
          <div className="border-b border-border p-3">
            <Button variant="ghost" size="icon" type="button" onClick={onClose}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close chat</span>
            </Button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/10 p-8 text-center">
          <div className="max-w-sm space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{emptyTitle}</h3>
            <p className="text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-1 flex-col bg-card', className)}>
      <div className="border-b border-border p-3">
        <div className="flex items-start gap-3">
          {onClose && (
            <Button variant="ghost" size="icon" type="button" onClick={onClose}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close chat</span>
            </Button>
          )}
          <div className="min-w-0 flex-1 p-1">{header}</div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 bg-muted/10">
        <div className="space-y-4 p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation.
            </p>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && (
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{message.senderName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                      <span className="font-medium">{message.senderName}</span>
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
                  </div>

                  {isOwn && (
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{message.senderName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border bg-background p-4"
      >
        <div className="flex items-center gap-3">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write an encrypted message..."
            disabled={isSending}
          />
          <Button type="submit" disabled={isSending || !draft.trim()}>
            <Send className="mr-2 h-4 w-4" />
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}
