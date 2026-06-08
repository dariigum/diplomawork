import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { emitNewMessageEvents, setSocketIoServer } from '@/lib/socket/io-registry';
import { attachChatSocketHandlers } from '@/lib/socket/chat-handlers';
import { resolveSessionSecret } from '@/lib/session-jwt';
import { tryServeResumeUpload } from '@/lib/serve-resume-upload';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function handleSocketPublish(req: IncomingMessage, res: ServerResponse, io: Server) {
  const secret = req.headers['x-jobflow-socket-secret'];
  if (secret !== resolveSessionSecret()) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }

  try {
    const body = (await readJsonBody(req)) as Record<string, unknown>;
    if (body.type === 'new_message' && typeof body.chatId === 'string') {
      emitNewMessageEvents(
        io,
        body.chatId,
        body.message as { receiverId: string; senderId: string },
        (body.chatPatch as Record<string, unknown>) || {},
        typeof body.clientTempId === 'string' ? body.clientTempId : undefined,
        body.notifyReceiver !== false,
      );
    } else if (body.type === 'read' && typeof body.chatId === 'string' && typeof body.readerId === 'string') {
      const payload = { chatId: body.chatId, readerId: body.readerId };
      io.to(`chat:${body.chatId}`).emit('chat:read', payload);
      io.to(`user:${body.readerId}`).emit('chat:read', payload);
    }
    res.writeHead(200);
    res.end('ok');
  } catch {
    res.writeHead(400);
    res.end('bad request');
  }
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';
    if (req.method === 'GET' && tryServeResumeUpload(pathname, res)) {
      return;
    }
    if (pathname === '/__jobflow/socket/publish' && req.method === 'POST') {
      const io = (globalThis as typeof globalThis & { __JOBFLOW_SOCKET_IO__?: Server })
        .__JOBFLOW_SOCKET_IO__;
      if (!io) {
        res.writeHead(503);
        res.end('socket not ready');
        return;
      }
      void handleSocketPublish(req, res, io);
      return;
    }
    return handle(req, res, parsedUrl);
  });

  const corsOrigin =
    process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean) || true;

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: corsOrigin, credentials: true },
    transports: ['websocket', 'polling'],
  });

  setSocketIoServer(io);
  (globalThis as typeof globalThis & { __JOBFLOW_SOCKET_IO__?: Server }).__JOBFLOW_SOCKET_IO__ = io;
  attachChatSocketHandlers(io);

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
