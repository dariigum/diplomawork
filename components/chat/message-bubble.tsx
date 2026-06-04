'use client';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FileText, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export type ChatMessageDTO = {
  id: string;
  chatId?: string;
  senderId: string;
  text: string;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
  attachments?: { fileName: string; mimeType: string; size: number; url: string }[];
};

export function MessageBubble({
  message,
  isSelf,
  showAvatar,
  peerName,
  peerImage,
}: {
  message: ChatMessageDTO;
  isSelf: boolean;
  showAvatar: boolean;
  peerName: string;
  peerImage?: string | null;
}) {
  const initials = peerName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn('flex w-full gap-2', isSelf ? 'flex-row-reverse' : 'flex-row')}
      data-message-id={message.id}
    >
      {showAvatar && !isSelf ? (
        <Avatar className="mt-0.5 size-8 shrink-0">
          {peerImage ? <AvatarImage src={peerImage} alt="" /> : null}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}
      <div className={cn('flex max-w-[min(85%,520px)] flex-col gap-1', isSelf ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm shadow-sm',
            isSelf ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          )}
        >
          {message.text ? <p className="whitespace-pre-wrap break-words">{message.text}</p> : null}
          {message.attachments?.map((a, i) => (
            <AttachmentInline key={i} att={a} isSelf={isSelf} />
          ))}
        </div>
        <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
          {isSelf ? (
            <span className="tabular-nums">{message.isRead ? 'Read' : 'Sent'}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AttachmentInline({
  att,
  isSelf,
}: {
  att: { fileName: string; mimeType: string; url: string };
  isSelf: boolean;
}) {
  const isImg = att.mimeType.startsWith('image/');
  if (isImg && att.url) {
    return (
      <a
        href={att.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('mt-2 block overflow-hidden rounded-lg border', isSelf ? 'border-primary-foreground/30' : '')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={att.url} alt={att.fileName} className="max-h-48 w-full object-cover" loading="lazy" />
      </a>
    );
  }
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'mt-2 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs underline-offset-2 hover:underline',
        isSelf ? 'border-primary-foreground/40 bg-primary-foreground/10' : 'border-border bg-background/80'
      )}
    >
      {isImg ? <ImageIcon className="size-3.5 shrink-0" /> : <FileText className="size-3.5 shrink-0" />}
      <span className="truncate">{att.fileName}</span>
    </a>
  );
}
