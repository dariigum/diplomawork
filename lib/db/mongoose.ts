import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/diplomawork';
const DEFAULT_TIMEOUT_MS = 5000;

function readTimeoutMs(name: string) {
  const rawValue = process.env[name];
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : NaN;

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : DEFAULT_TIMEOUT_MS;
}

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: readTimeoutMs('MONGODB_CONNECT_TIMEOUT_MS'),
      serverSelectionTimeoutMS: readTimeoutMs('MONGODB_SERVER_SELECTION_TIMEOUT_MS'),
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

export default dbConnect;
