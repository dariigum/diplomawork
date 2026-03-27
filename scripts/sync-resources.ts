import 'dotenv/config'
import mongoose from 'mongoose'

import { Article } from '../lib/db/schema'
import { curatedArticles } from '../lib/resources/curated-articles'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/diplomawork'

async function syncResources() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  await Article.deleteMany({})

  await Article.insertMany(
    curatedArticles.map((article) => ({
      ...article,
      createdAt: new Date(article.createdAt),
    }))
  )

  console.log(`Synced ${curatedArticles.length} curated articles.`)
}

syncResources()
  .then(async () => {
    await mongoose.disconnect()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('Resource sync failed:', error)
    await mongoose.disconnect()
    process.exit(1)
  })
