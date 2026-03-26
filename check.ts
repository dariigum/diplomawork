import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const v = await mongoose.connection.collection('vacancies').findOne({});
  console.log('embedding length:', v?.embedding?.length);
  console.log('embedding sample:', v?.embedding?.slice(0, 3));
  process.exit(0);
}

main();