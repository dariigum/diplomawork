'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send } from 'lucide-react';
import { AttachmentPreview, type PendingFile } from '@/components/chat/attachment-preview';
import type { Socket } from 'socket.io-client';
import { useI18n } from '@/lib/i18n/provider';
import type { ChatMessageDTO } from '@/components/chat/message-bubble';

type UploadedMeta = { storageKey: string; fileName: string; mimeType: string; size: number };

function uploadAttachment(
  chatId: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<UploadedMeta> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/chats/${chatId}/attachments`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.storageKey) {
          onProgress(100);
          resolve(data as UploadedMeta);
        } else {
          reject(new Error(data.error || 'Upload failed'));
        }
      } catch {
        reject(new Error('Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}

export function MessageInput({
  chatId,
  disabled,
  socketRef,
  onSent,
}: {
  chatId: string | null;
  disabled?: boolean;
  socketRef: MutableRefObject<Socket | null>;
  onSent?: (message: ChatMessageDTO) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const emitTyping = useCallback(
    (typing: boolean) => {
      const s = socketRef.current;
      if (!s || !chatId) return;
      s.emit('chat:typing', { chatId, typing });
    },
    [socketRef, chatId]
  );

  const onChangeText = (v: string) => {
    setText(v);
    if (!chatId) return;
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 2000);
  };

  const removePending = (id: string) => {
    setPending((p) => p.filter((x) => x.id !== id));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !chatId) return;
    const list = Array.from(files);
    for (const file of list) {
      const id = `${Date.now()}-${file.name}`;
      setPending((p) => [...p, { id, file, progress: 0 }]);
      try {
        const meta = await uploadAttachment(chatId, file, (pct) => {
          setPending((p) => p.map((x) => (x.id === id ? { ...x, progress: pct } : x)));
        });
        setPending((p) => p.filter((x) => x.id !== id));
        await sendWithAttachments(meta);
      } catch (e: any) {
        setPending((p) =>
          p.map((x) => (x.id === id ? { ...x, progress: 0, error: e?.message || 'Failed' } : x))
        );
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const sendWithAttachments = async (extra?: UploadedMeta) => {
    if (!chatId) return;
    const attachments = extra ? [extra] : [];
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    setSending(true);
    emitTyping(false);
    const clientTempId = `tmp-${Date.now()}`;
    const body = {
      text: trimmed,
      attachments: attachments.map((a) => ({
        storageKey: a.storageKey,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
      })),
      clientTempId,
    };

    const trySocket = () =>
      new Promise<{ ok: boolean; message?: ChatMessageDTO }>((resolve) => {
        const s = socketRef.current;
        if (!s?.connected) {
          resolve({ ok: false });
          return;
        }
        let settled = false;
        const finish = (result: { ok: boolean; message?: ChatMessageDTO }) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(result);
        };
        const timer = setTimeout(() => finish({ ok: false }), 10_000);
        s.emit(
          'chat:send',
          { chatId, ...body },
          (res: { ok?: boolean; message?: ChatMessageDTO }) => {
            finish({ ok: !!res?.ok, message: res?.message });
          }
        );
      });

    const socketResult = await trySocket();
    let sentMessage: ChatMessageDTO | undefined = socketResult.message;

    if (!socketResult.ok) {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSending(false);
        return;
      }
      sentMessage = data.message as ChatMessageDTO | undefined;
    }

    setText('');
    setSending(false);
    if (sentMessage) {
      onSent?.({
        ...sentMessage,
        chatId: sentMessage.chatId ?? chatId,
      });
    }
  };

  const submit = async () => {
    if (pending.some((p) => p.progress > 0 && p.progress < 100)) return;
    await sendWithAttachments();
  };

  return (
    <div className="border-t border-border/60 bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom,12px)]">
      <AttachmentPreview pending={pending} onRemove={removePending} />
      <div className="flex items-end gap-2 p-2 md:p-3">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,image/*"
          multiple
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={!chatId || disabled || sending}
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="size-4" />
        </Button>
        <Textarea
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={chatId ? t.chat.typeMessage : t.chat.selectApplicantToStartChat}
          rows={1}
          className="min-h-[44px] max-h-32 resize-none"
          disabled={!chatId || disabled || sending}
        />
        <Button
          type="button"
          size="icon"
          className="shrink-0"
          disabled={!chatId || disabled || sending}
          onClick={() => void submit()}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
