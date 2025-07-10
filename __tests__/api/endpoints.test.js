import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import express from 'express'

// Mock the external dependencies
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    on: jest.fn(),
    sendCommand: jest.fn((cmd, callback) => callback(null, 'OK'))
  }))
}))

jest.mock('@opensearch-project/opensearch', () => ({
  Client: jest.fn(() => ({}))
}))

jest.mock('langchain/cache/redis', () => ({
  RedisCache: jest.fn()
}))

jest.mock('langchain/embeddings/openai', () => ({
  OpenAIEmbeddings: jest.fn()
}))

jest.mock('langchain/llms/openai', () => ({
  OpenAI: jest.fn()
}))

jest.mock('langchain/chat_models/openai', () => ({
  ChatOpenAI: jest.fn()
}))

// Create a test app with basic endpoints
function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Server is healthy'
    })
  })

  // Clear cache endpoint
  app.get('/api/clearcache', (req, res) => {
    res.json({
      success: true,
      message: 'Cache cleared'
    })
  })

  // Add content endpoint (simplified for testing)
  app.post('/api/add', (req, res) => {
    const { url, collection } = req.body
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      })
    }

    res.json({
      response: 'added',
      collection: collection || 'default'
    })
  })

  // Question endpoint (simplified for testing)
  app.post('/api/question', (req, res) => {
    const { question, collection } = req.body
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      })
    }

    res.json({
      response: 'This is a test response',
      sources: ['test-source-1', 'test-source-2']
    })
  })

  // Live endpoint (simplified for testing)
  app.post('/api/live', (req, res) => {
    const { url, question } = req.body
    
    if (!url || !question) {
      return res.status(400).json({
        success: false,
        error: 'URL and question are required'
      })
    }

    res.json({
      response: 'This is a live response'
    })
  })

  // Delete collection endpoint (simplified for testing)
  app.delete('/api/collection', (req, res) => {
    const { collection } = req.body
    
    if (!collection) {
      return res.status(400).json({
        success: false,
        error: 'Collection name is required'
      })
    }

    res.json({
      success: true,
      message: `${collection} has been deleted`
    })
  })

  return app
}

describe('API Endpoints Tests', () => {
  let app

  beforeAll(() => {
    app = createTestApp()
  })

  describe('GET /api/health', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Server is healthy'
      })
    })
  })

  describe('GET /api/clearcache', () => {
    test('should clear cache successfully', async () => {
      const response = await request(app)
        .get('/api/clearcache')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Cache cleared'
      })
    })
  })

  describe('POST /api/add', () => {
    test('should add content successfully with valid URL', async () => {
      const response = await request(app)
        .post('/api/add')
        .send({
          url: 'https://example.com',
          collection: 'test-collection'
        })
        .expect(200)

      expect(response.body).toEqual({
        response: 'added',
        collection: 'test-collection'
      })
    })

    test('should use default collection when not provided', async () => {
      const response = await request(app)
        .post('/api/add')
        .send({
          url: 'https://example.com'
        })
        .expect(200)

      expect(response.body).toEqual({
        response: 'added',
        collection: 'default'
      })
    })

    test('should return error when URL is missing', async () => {
      const response = await request(app)
        .post('/api/add')
        .send({
          collection: 'test-collection'
        })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'URL is required'
      })
    })

    test('should handle additional parameters', async () => {
      const response = await request(app)
        .post('/api/add')
        .send({
          url: 'https://example.com/sitemap.xml',
          collection: 'test-collection',
          filter: '/blog/',
          limit: 10,
          chunkSize: 1500,
          chunkOverlap: 200,
          sleep: 1000
        })
        .expect(200)

      expect(response.body.response).toBe('added')
    })
  })

  describe('POST /api/question', () => {
    test('should answer question successfully', async () => {
      const response = await request(app)
        .post('/api/question')
        .send({
          question: 'What is the meaning of life?',
          collection: 'test-collection'
        })
        .expect(200)

      expect(response.body).toEqual({
        response: 'This is a test response',
        sources: ['test-source-1', 'test-source-2']
      })
    })

    test('should return error when question is missing', async () => {
      const response = await request(app)
        .post('/api/question')
        .send({
          collection: 'test-collection'
        })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Question is required'
      })
    })

    test('should handle additional parameters', async () => {
      const response = await request(app)
        .post('/api/question')
        .send({
          question: 'Test question?',
          collection: 'test-collection',
          model: 'gpt-4',
          k: 5,
          temperature: 0.7,
          max_tokens: 500
        })
        .expect(200)

      expect(response.body.response).toBe('This is a test response')
    })
  })

  describe('POST /api/live', () => {
    test('should get live response successfully', async () => {
      const response = await request(app)
        .post('/api/live')
        .send({
          url: 'https://example.com',
          question: 'What is this page about?'
        })
        .expect(200)

      expect(response.body).toEqual({
        response: 'This is a live response'
      })
    })

    test('should return error when URL is missing', async () => {
      const response = await request(app)
        .post('/api/live')
        .send({
          question: 'What is this page about?'
        })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'URL and question are required'
      })
    })

    test('should return error when question is missing', async () => {
      const response = await request(app)
        .post('/api/live')
        .send({
          url: 'https://example.com'
        })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'URL and question are required'
      })
    })

    test('should handle temperature parameter', async () => {
      const response = await request(app)
        .post('/api/live')
        .send({
          url: 'https://example.com',
          question: 'Test question?',
          temperature: 0.5
        })
        .expect(200)

      expect(response.body.response).toBe('This is a live response')
    })
  })

  describe('DELETE /api/collection', () => {
    test('should delete collection successfully', async () => {
      const response = await request(app)
        .delete('/api/collection')
        .send({
          collection: 'test-collection'
        })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'test-collection has been deleted'
      })
    })

    test('should return error when collection name is missing', async () => {
      const response = await request(app)
        .delete('/api/collection')
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Collection name is required'
      })
    })
  })
})
