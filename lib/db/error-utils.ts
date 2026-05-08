const DATABASE_UNAVAILABLE_PATTERNS = [
  'MongooseServerSelectionError',
  'MongoServerSelectionError',
  'Could not connect to any servers',
  'Server selection timed out',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'querySrv',
] as const;

function readErrorParts(error: unknown, seen = new Set<unknown>()): string[] {
  if (!error || seen.has(error)) {
    return [];
  }

  if (typeof error === 'string') {
    return [error];
  }

  if (typeof error !== 'object') {
    return [String(error)];
  }

  seen.add(error);

  const value = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    cause?: unknown;
    reason?: unknown;
  };

  return [
    typeof value.name === 'string' ? value.name : '',
    typeof value.message === 'string' ? value.message : '',
    typeof value.code === 'string' ? value.code : '',
    ...readErrorParts(value.cause, seen),
    ...readErrorParts(value.reason, seen),
  ].filter(Boolean);
}

export function isDatabaseUnavailableError(error: unknown) {
  const searchableText = readErrorParts(error).join(' ').toLowerCase();

  return DATABASE_UNAVAILABLE_PATTERNS.some((pattern) =>
    searchableText.includes(pattern.toLowerCase()),
  );
}

export function isAtlasConnectionString(uri: string | undefined) {
  return typeof uri === 'string' && uri.startsWith('mongodb+srv://');
}
