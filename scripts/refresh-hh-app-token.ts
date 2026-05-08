import * as dotenv from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DEFAULT_HH_CONTACT_EMAIL = process.env.HH_CONTACT_EMAIL || 'alimzhan.gabit@gmail.com';
const DEFAULT_HH_APP_NAME = process.env.HH_APP_NAME || 'JobFlow';
const TOKEN_ENDPOINT = `${(process.env.HH_API_BASE_URL || 'https://api.hh.ru').replace(/\/+$/, '')}/token`;
const ENV_LOCAL_PATH = path.resolve(process.cwd(), '.env.local');

type HeadHunterTokenResponse = {
  access_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set ${name} in your shell or in .env.local before running npm run hh:token.`
    );
  }
  return value;
}

function getHeadHunterUserAgent() {
  const configuredUserAgent = process.env.HH_USER_AGENT?.trim();
  const userAgent =
    configuredUserAgent || `${DEFAULT_HH_APP_NAME}/1.0 (${DEFAULT_HH_CONTACT_EMAIL})`;

  if (!userAgent || /example\.com/i.test(userAgent) || !/@/.test(userAgent)) {
    throw new Error(
      'Invalid HH_USER_AGENT. Set it like "JobFlow/1.0 (your-email@example.com)" before requesting a token.'
    );
  }

  return userAgent;
}

function escapeEnvValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function upsertEnvValue(content: string, key: string, value: string) {
  const nextLine = `${key}="${escapeEnvValue(value)}"`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  if (pattern.test(content)) {
    return content.replace(pattern, nextLine);
  }

  const normalizedContent = content.trim();
  return normalizedContent ? `${normalizedContent}\n${nextLine}\n` : `${nextLine}\n`;
}

function tryParseJson(text: string) {
  try {
    return JSON.parse(text) as HeadHunterTokenResponse;
  } catch {
    return null;
  }
}

async function requestHeadHunterToken() {
  const clientId = getRequiredEnv('HH_CLIENT_ID');
  const clientSecret = getRequiredEnv('HH_CLIENT_SECRET');
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': getHeadHunterUserAgent(),
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const responseText = await response.text();
  const payload = tryParseJson(responseText);

  if (!response.ok) {
    const detail =
      payload?.error_description || payload?.error || responseText || response.statusText;
    throw new Error(`HeadHunter token request failed (${response.status}): ${detail}`);
  }

  if (!payload?.access_token || payload.token_type !== 'bearer') {
    throw new Error('HeadHunter token response did not contain a valid bearer access_token.');
  }

  return payload.access_token;
}

async function persistToken(accessToken: string) {
  let currentContent = '';

  try {
    currentContent = await readFile(ENV_LOCAL_PATH, 'utf8');
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  const nextContent = upsertEnvValue(currentContent, 'HH_API_TOKEN', accessToken);
  await writeFile(ENV_LOCAL_PATH, nextContent, 'utf8');
}

async function main() {
  const accessToken = await requestHeadHunterToken();
  await persistToken(accessToken);
  console.log('HH_API_TOKEN saved to .env.local');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Failed to refresh HH app token.');
  process.exit(1);
});
