import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

/* Environment Configuration */
import * as dotenv from 'dotenv'
dotenv.config()

/* Core Dependencies */
import { createClient } from 'redis'
import { Client } from '@opensearch-project/opensearch'

/* Langchain Core */
import { OpenAI } from 'langchain/llms/openai'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { PromptTemplate } from 'langchain/prompts'
import { LLMChain, VectorDBQAChain } from 'langchain/chains'
import { WebBrowser } from 'langchain/tools/webbrowser'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import { UnstructuredLoader } from 'langchain/document_loaders/fs/unstructured'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { RedisCache } from 'langchain/cache/redis'
import { OpenSearchVectorStore } from 'langchain/vectorstores/opensearch'

/* Utilities */
import SitemapXMLParser from 'sitemap-xml-parser'
import { createWriteStream } from 'fs'
import { parse as parseUrl } from 'url'
import { join, extname, basename } from 'path'
import * as fs from 'fs/promises'

/* Enhanced Services and Middleware */
import { errorHandler, notFoundHandler, asyncHandler } from './src/middleware/errorHandler.js'
import { 
  validateAddRequest, 
  validateQuestionRequest, 
  validateLiveRequest,
  validateDeleteCollectionRequest 
} from './src/middleware/validation.js'

/* Enhanced Routes */
import collectionsRouter, { initializeCollectionRoutes } from './src/routes/collections.js'
import batchRouter, { initializeBatchRoutes } from './src/routes/batch.js'
import healthRouter, { initializeHealthRoutes } from './src/routes/health.js'
import reviewsRouter from './src/routes/reviews.js'
import chatRouter, { initializeChatRoutes } from './src/routes/chat.js'

/* Utility Functions */
import { getFileType, getUrlFilename, cleanFilePath } from './src/utils/fileUtils.js'
import { cleanText, sanitize } from './src/utils/textUtils.js'
import { fetchAndSaveFile, sleepWait } from './src/utils/downloadUtils.js'

/* Initialize Core Services */
const client = new Client({
  nodes: [process.env.OPENSEARCH_URL ?? 'http://127.0.0.1:9200'],
})

const clientRedis = createClient({
  url: process.env.REDIS_URL,
})

const cache = new RedisCache(clientRedis)

/* Connect to Redis */
clientRedis.connect()
clientRedis.on('error', (err) => {
  console.error('❌ Error connecting to Redis:', err)
})

clientRedis.on('ready', () => {
  console.log('✅ Connected to Redis server.')
})

/* Initialize Express App */
const app = express()

/* Security and Performance Middleware */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))

/* Rate Limiting */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', limiter)

/* Body Parsing Middleware */
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(express.json({ limit: '10mb' }))

/* Static Files */
app.use(express.static('public'))

/* Request Logging Middleware */
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`${timestamp} ${req.method} ${req.path}`)
  next()
})

/* Enhanced Routes */
app.use('/api/collections', initializeCollectionRoutes(client))
app.use('/api/batch', initializeBatchRoutes(addURL, parseSitemap))
app.use('/api/health', initializeHealthRoutes({
  redis: clientRedis,
  opensearch: client
}))
app.use('/api/reviews', reviewsRouter)
app.use('/api/chat', initializeChatRoutes(handleQuestion, addURL))

/* Chat Interface Route */
app.get('/chat', (req, res) => {
  res.sendFile('chat.html', { root: 'public' })
})

app.get('/', (req, res) => {
  res.redirect('/chat')
})

/* Legacy Endpoints (Enhanced with Validation) */

/* Basic health check */
app.get('/api/health', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0'
  })
}))

/* Clear Redis cache */
app.get('/api/clearcache', asyncHandler(async (req, res) => {
  await new Promise((resolve, reject) => {
    clientRedis.sendCommand(['FLUSHDB'], (err, result) => {
      if (err) {
        console.error('Error flushing database:', err)
        reject(err)
      } else {
        console.log('Database flushed:', result)
        resolve(result)
      }
    })
  })

  res.json({ 
    success: true, 
    message: 'Cache cleared',
    timestamp: new Date().toISOString()
  })
}))

/* Delete a collection */
app.delete('/api/collection', validateDeleteCollectionRequest, asyncHandler(async (req, res) => {
  const { collection } = req.body
  const encodedCollection = await sanitize(collection)
  
  const vectorStore = await OpenSearchVectorStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    {
      client,
      indexName: encodedCollection,
    }
  )
  
  await vectorStore.deleteIfExists()
  
  res.json({ 
    success: true, 
    message: `Collection '${collection}' has been deleted`,
    timestamp: new Date().toISOString()
  })
}))

/* Main endpoint to add content to OpenSearch */
app.post('/api/add', validateAddRequest, asyncHandler(async (req, res) => {
  const {
    url,
    collection = process.env.OPENSEARCH_DEFAULT_INDEX,
    filter,
    limit,
    chunkSize = 2000,
    chunkOverlap = 250,
    sleep = 0,
  } = req.body

  const downloadDir = process.env.DOCS_DIRECTORY || 'docs'
  const encodedCollection = await sanitize(collection)
  const type = getFileType(url)

  console.log(`📄 Processing ${type}: ${url}`)

  if (type === 'URL' || type === 'HTML') {
    await addURL(url, encodedCollection, chunkSize, chunkOverlap)
    res.json({ 
      success: true,
      response: 'added', 
      collection: collection,
      type: type,
      timestamp: new Date().toISOString()
    })
  } else if (type === 'SITEMAP') {
    const sitemap = await parseSitemap(url, filter, limit)

    // Process sitemap URLs asynchronously
    const processUrls = async () => {
      for (const item of sitemap) {
        console.log(`\n📄 Adding: ${item}`)
        await addURL(item, encodedCollection, chunkSize, chunkOverlap)
        await sleepWait(sleep)
      }
      console.log(`\n✅ Completed sitemap processing for collection: ${collection}`)
    }

    processUrls().catch(console.error)

    res.json({ 
      success: true,
      response: 'started', 
      collection: collection,
      type: type,
      urlCount: sitemap.length,
      timestamp: new Date().toISOString()
    })
  } else if (type === 'PDF') {
    const filename = getUrlFilename(url)
    if (!filename) {
      return res.status(400).json({ 
        success: false,
        message: 'The provided URL is not a PDF file.' 
      })
    }
    
    const filePath = await fetchAndSaveFile(url, filename, downloadDir)
    const loader = new PDFLoader(filePath, { splitPages: true })
    const docs = await loader.load()

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: chunkSize,
      chunkOverlap: chunkOverlap,
    })

    const docOutput = await textSplitter.splitDocuments(docs)

    /* Clean metadata for OpenSearch */
    docOutput.forEach((document) => {
      document.metadata.source = basename(document.metadata.source)
      delete document.metadata.pdf
      delete document.metadata.loc
    })

    const vectorStore = await OpenSearchVectorStore.fromDocuments(
      docOutput,
      new OpenAIEmbeddings(),
      {
        client,
        indexName: encodedCollection,
      }
    )

    console.log('✅ PDF processed and added!')
    res.json({ 
      success: true,
      response: 'added', 
      collection: collection,
      type: type,
      filename: filename,
      chunks: docOutput.length,
      timestamp: new Date().toISOString()
    })
  } else if (type === 'UNSTRUCTURED') {
    const filename = getUrlFilename(url)
    if (!filename) {
      return res.status(400).json({ 
        success: false,
        message: 'The provided URL is not a file URL.' 
      })
    }

    const filePath = await fetchAndSaveFile(url, filename, downloadDir)
    const loader = new UnstructuredLoader(
      `${process.env.UNSTRUCTURED_URL}/general/v0/general`,
      filePath
    )

    const docs = await loader.load()
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: chunkSize,
      chunkOverlap: chunkOverlap,
    })

    const docOutput = await textSplitter.splitDocuments(docs)

    /* Clean metadata for OpenSearch */
    docOutput.forEach((document) => {
      document.metadata.source = document.metadata.filename
      delete document.metadata.filename
      delete document.metadata.category
      delete document.metadata.loc
    })

    const vectorStore = await OpenSearchVectorStore.fromDocuments(
      docOutput,
      new OpenAIEmbeddings(),
      {
        client,
        indexName: encodedCollection,
      }
    )

    console.log('✅ File processed and added!')
    res.json({ 
      success: true,
      response: 'added', 
      collection: collection,
      type: type,
      filename: filename,
      chunks: docOutput.length,
      timestamp: new Date().toISOString()
    })
  }
}))

/* Get a response using live webpage as context */
app.post('/api/live', validateLiveRequest, asyncHandler(async (req, res) => {
  const { url, question, temperature = 0 } = req.body
  
  const model = new ChatOpenAI({ temperature: temperature })
  const embeddings = new OpenAIEmbeddings()
  const browser = new WebBrowser({ model, embeddings })
  const result = await browser.call(`"${url}","${question}"`)

  res.json({ 
    success: true,
    response: result,
    url: url,
    question: question,
    timestamp: new Date().toISOString()
  })
}))

/* Get a response using the vector store */
app.post('/api/question', validateQuestionRequest, asyncHandler(async (req, res) => {
  const {
    question,
    collection = process.env.OPENSEARCH_DEFAULT_INDEX,
    model = 'gpt-3.5-turbo',
    k = 3,
    temperature = 0,
    max_tokens = 400,
  } = req.body

  const encodedCollection = await sanitize(collection)

  const llm = new OpenAI({
    modelName: model,
    concurrency: 15,
    cache,
    temperature: temperature,
    maxTokens: max_tokens,
  })

  let vectorStore
  try {
    vectorStore = await OpenSearchVectorStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      {
        client,
        indexName: encodedCollection,
      }
    )
  } catch (err) {
    console.info(`Collection ${collection} does not exist.`)
  }

  if (vectorStore) {
    console.log('🔍 Using Vector Store for context')
    const chain = VectorDBQAChain.fromLLM(llm, vectorStore, {
      k: k,
      returnSourceDocuments: true,
    })
    const response = await chain.call({ query: question })

    // Get the sources from the response
    let sources = response.sourceDocuments
    sources = sources.map((source) => source.metadata.source)
    // Remove duplicates
    sources = [...new Set(sources)]
    
    console.log('📚 Sources:', sources)
    
    res.json({ 
      success: true,
      response: response.text, 
      sources,
      collection: collection,
      model: model,
      timestamp: new Date().toISOString()
    })
  } else {
    console.log('💭 No vector store found, using general knowledge')
    const template =
      "You are a helpful AI Assistant. Try to answer the following question: {question} If you don't know the answer, just say \"I'm not sure about that.\" Don't try to make up an answer."
    const prompt = new PromptTemplate({
      template: template,
      inputVariables: ['question'],
    })
    const chain = new LLMChain({ llm: llm, prompt: prompt })
    const response = await chain.call({ question: question })

    res.json({ 
      success: true,
      response: cleanText(response.text),
      sources: [],
      collection: null,
      model: model,
      timestamp: new Date().toISOString()
    })
  }
}))

/* Error Handling Middleware */
app.use(notFoundHandler)
app.use(errorHandler)

/* Graceful Shutdown */
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...')
  await clientRedis.quit()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...')
  await clientRedis.quit()
  process.exit(0)
})

/* Start Server */
const PORT = process.env.PORT || 3000
const server = http.createServer(app)

server.listen(PORT, () => {
  console.log('🚀 Enhanced KB-Voiceflow API Server Started!')
  console.log(`📡 Server listening on port ${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 OpenSearch: ${process.env.OPENSEARCH_URL || 'http://127.0.0.1:9200'}`)
  console.log(`🔗 Redis: ${process.env.REDIS_URL || 'default'}`)
  console.log(`📊 Available endpoints:`)
  console.log(`   • GET  /api/health - Health check`)
  console.log(`   • POST /api/reviews/analyze - Review aggregation`)
  console.log(`   • GET  /api/collections - Collection management`)
  console.log(`   • POST /api/batch/process - Batch processing`)
  console.log(`   • POST /api/add - Add content`)
  console.log(`   • POST /api/question - Ask questions`)
  console.log(`   • POST /api/live - Live webpage analysis`)
})

/* Utility Functions (Legacy Support) */

/* Question handler for chat service */
async function handleQuestion({ question, collection = process.env.OPENSEARCH_DEFAULT_INDEX, model = 'gpt-3.5-turbo', k = 3, temperature = 0, max_tokens = 400 }) {
  const encodedCollection = await sanitize(collection)

  const llm = new OpenAI({
    modelName: model,
    concurrency: 15,
    cache,
    temperature: temperature,
    maxTokens: max_tokens,
  })

  let vectorStore
  try {
    vectorStore = await OpenSearchVectorStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      {
        client,
        indexName: encodedCollection,
      }
    )
  } catch (err) {
    console.info(`Collection ${collection} does not exist.`)
  }

  if (vectorStore) {
    console.log('🔍 Using Vector Store for context')
    const chain = VectorDBQAChain.fromLLM(llm, vectorStore, {
      k: k,
      returnSourceDocuments: true,
    })
    const response = await chain.call({ query: question })

    // Get the sources from the response
    let sources = response.sourceDocuments
    sources = sources.map((source) => source.metadata.source)
    // Remove duplicates
    sources = [...new Set(sources)]

    return {
      response: response.text,
      sources,
      collection: collection,
      model: model
    }
  } else {
    console.log('💭 No vector store found, using general knowledge')
    const template =
      "You are a helpful AI Assistant. Try to answer the following question: {question} If you don't know the answer, just say \"I'm not sure about that.\" Don't try to make up an answer."
    const prompt = new PromptTemplate({
      template: template,
      inputVariables: ['question'],
    })
    const chain = new LLMChain({ llm: llm, prompt: prompt })
    const response = await chain.call({ question: question })

    return {
      response: cleanText(response.text),
      sources: [],
      collection: null,
      model: model
    }
  }
}

async function addURL(url, encodedCollection, chunkSize, chunkOverlap) {
  const loader = new CheerioWebBaseLoader(url)
  const docs = await loader.load()

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize || 500,
    chunkOverlap: chunkOverlap || 100,
  })

  const docOutput = await textSplitter.splitDocuments(docs)

  /* Clean metadata for OpenSearch */
  docOutput.forEach((document) => {
    delete document.metadata.loc
  })

  const vectorStore = await OpenSearchVectorStore.fromDocuments(
    docOutput,
    new OpenAIEmbeddings(),
    {
      client,
      indexName: encodedCollection,
    }
  )
  
  console.log('✅ URL content added!')
}

async function parseSitemap(url, filter, limit) {
  const options = {
    delay: 4000,
    limit: 5,
  }

  const sitemapXMLParser = new SitemapXMLParser(url, options)

  return sitemapXMLParser.fetch().then((result) => {
    let list = result
      .map((item) => item.loc[0].trim().replace(/\r\n/g, ' '))
      .filter((item) => !filter || item.includes(filter))
    return limit ? list.slice(0, limit) : list
  })
}

export default app
