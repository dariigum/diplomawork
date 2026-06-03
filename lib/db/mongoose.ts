import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/diplomawork';
const MONGODB_FALLBACK_URI =
  process.env.MONGODB_FALLBACK_URI || 'mongodb://127.0.0.1:27017/diplomawork';
const IS_DEV = process.env.NODE_ENV !== 'production';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

type MemoryServerHandle = {
  getUri(): string;
  stop(): Promise<boolean>;
};

type MongooseGlobalCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServerPromise?: Promise<MemoryServerHandle>;
};

type GlobalWithMongoose = typeof globalThis & {
  mongoose?: MongooseGlobalCache;
};

const globalStore = global as GlobalWithMongoose;
const cached: MongooseGlobalCache = globalStore.mongoose ?? { conn: null, promise: null };

if (!globalStore.mongoose) {
  globalStore.mongoose = cached;
}

async function connectWithUri(uri: string) {
  const opts = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 7000,
    connectTimeoutMS: 7000,
  } as const;

  return mongoose.connect(uri, opts).then((m) => m);
}

async function ensureMemoryServer() {
  if (!cached.memoryServerPromise) {
    cached.memoryServerPromise = (async () => {
      const mod = await import('mongodb-memory-server');
      const MongoMemoryServer = mod.MongoMemoryServer;
      return await MongoMemoryServer.create({
        instance: { dbName: 'diplomawork' },
      });
    })();
  }
  return cached.memoryServerPromise;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = connectWithUri(MONGODB_URI);
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;

    // В dev часто падает Atlas из‑за whitelist/VPN. Тогда пробуем fallback URI,
    // а если его тоже нет — поднимаем in-memory MongoDB, чтобы проект запускался.
    if (IS_DEV) {
      try {
        cached.promise = connectWithUri(MONGODB_FALLBACK_URI);
        cached.conn = await cached.promise;
        return cached.conn;
      } catch {
        const memoryServer = await ensureMemoryServer();
        cached.promise = connectWithUri(memoryServer.getUri());
        cached.conn = await cached.promise;
        return cached.conn;
      }
    }

    throw e;
  }
  return cached.conn;
}

export default dbConnect;
