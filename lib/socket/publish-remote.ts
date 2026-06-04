import { resolveSessionSecret } from '@/lib/session-jwt';

type RemotePayload =
  | {
      type: 'new_message';
      chatId: string;
      message: { receiverId: string; senderId: string };
      chatPatch: Record<string, unknown>;
      clientTempId?: string;
      notifyReceiver?: boolean;
    }
  | {
      type: 'read';
      chatId: string;
      readerId: string;
    };

/** Forward socket events to the custom server process when `io` is not in this module instance. */
export async function publishSocketEventRemote(body: RemotePayload): Promise<void> {
  const port = process.env.PORT || '3000';
  const host = process.env.SOCKET_PUBLISH_HOST || '127.0.0.1';
  const secret = resolveSessionSecret();

  try {
    const res = await fetch(`http://${host}:${port}/__jobflow/socket/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jobflow-socket-secret': secret,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok && process.env.NODE_ENV === 'development') {
      console.warn('[socket] remote publish failed', res.status);
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[socket] remote publish unreachable', err);
    }
  }
}
