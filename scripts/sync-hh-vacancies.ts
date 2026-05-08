import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { syncHeadHunterVacancies } from '../lib/headhunter-sync';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const result = await syncHeadHunterVacancies();
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('HeadHunter sync failed:', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
