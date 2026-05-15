import 'dotenv/config';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { setSocketIoServer } from '@/lib/socket/io-registry';
import { attachChatSocketHandlers } from '@/lib/socket/chat-handlers';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true);
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
  attachChatSocketHandlers(io);

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
