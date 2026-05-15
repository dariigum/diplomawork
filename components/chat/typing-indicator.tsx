'use client';

import { cn } from '@/lib/utils';

export function TypingIndicator({ visible, label }: { visible: boolean; label?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 px-3 py-1 text-xs text-muted-foreground transition-opacity duration-200',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
      aria-live="polite"
    >
      <span className="inline-flex gap-0.5">
        <span className="size-1 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.2s]" />
        <span className="size-1 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.1s]" />
        <span className="size-1 animate-bounce rounded-full bg-muted-foreground/70" />
      </span>
      {label ?? 'Typing…'}
    </div>
  );
}
