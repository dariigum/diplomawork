import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const vacancies = await mongoose.connection.collection('vacancies').find({}).toArray();

  for (const v of vacancies) {
    const text = `${v.title} ${v.description} ${v.skillsRequired}`;

    const res = await fetch('http://127.0.0.1:8000/embed?text=' + encodeURIComponent(text));
    const data = await res.json();

    await mongoose.connection.collection('vacancies').updateOne(
      { _id: v._id },
      { $set: { embedding: data.embedding } }
    );

    console.log('Indexed:', v.title);
  }

  console.log('DONE');
  process.exit(0);
}

main();