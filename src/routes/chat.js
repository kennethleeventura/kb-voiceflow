import express from 'express'
import { ConversationService } from '../services/conversationService.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * Initialize conversation service
 */
let conversationService

export function initializeChatRoutes(questionHandler, addContentHandler) {
  conversationService = new ConversationService(questionHandler, addContentHandler)
  return router
}

/**
 * POST /api/chat/message
 * Main conversational endpoint - send a message and get a response
 */
router.post('/message', asyncHandler(async (req, res) => {
  const { message, userId, sessionId } = req.body

  // Validate message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Message is required and must be a non-empty string'
    })
  }

  if (message.length > 1000) {
    return res.status(400).json({
      success: false,
      error: 'Message must be less than 1000 characters'
    })
  }

  // Use provided userId or sessionId, or generate one
  const conversationId = userId || sessionId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Process the message
  const result = await conversationService.processMessage(conversationId, message.trim())

  res.json({
    ...result,
    conversationId: conversationId
  })
}))

/**
 * POST /api/chat/quick
 * Quick chat endpoint for simple interactions
 */
router.post('/quick', asyncHandler(async (req, res) => {
  const { message } = req.body

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Message is required'
    })
  }

  // Use a temporary conversation ID for quick interactions
  const tempId = `quick_${Date.now()}`
  const result = await conversationService.processMessage(tempId, message.trim())

  // Clean up the temporary conversation
  conversationService.clearConversation(tempId)

  res.json(result)
}))

/**
 * GET /api/chat/history/:userId
 * Get conversation history for a user
 */
router.get('/history/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params
  const { limit = 20 } = req.query

  const limitNum = parseInt(limit, 10)
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 100'
    })
  }

  const history = conversationService.getConversationHistory(userId, limitNum)

  res.json({
    success: true,
    userId: userId,
    history: history,
    count: history.length
  })
}))

/**
 * DELETE /api/chat/history/:userId
 * Clear conversation history for a user
 */
router.delete('/history/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params

  const cleared = conversationService.clearConversation(userId)

  res.json({
    success: true,
    message: cleared ? 'Conversation history cleared' : 'No conversation found',
    userId: userId
  })
}))

/**
 * GET /api/chat/stats
 * Get conversation statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = conversationService.getStats()

  res.json({
    success: true,
    stats: stats,
    timestamp: new Date().toISOString()
  })
}))

/**
 * POST /api/chat/demo
 * Demo endpoint with predefined examples
 */
router.post('/demo', asyncHandler(async (req, res) => {
  const { example } = req.body

  const examples = {
    'product_research': 'best eBikes under $2000',
    'knowledge_question': 'how do I create a chatbot?',
    'greeting': 'hello there!',
    'help': 'what can you help me with?',
    'comparison': 'iPhone 15 vs Samsung Galaxy S24'
  }

  const message = examples[example] || examples['greeting']
  const demoId = `demo_${Date.now()}`

  const result = await conversationService.processMessage(demoId, message)

  res.json({
    ...result,
    demoExample: example,
    demoMessage: message
  })
}))

/**
 * GET /api/chat/examples
 * Get example conversations and use cases
 */
router.get('/examples', asyncHandler(async (req, res) => {
  const examples = {
    product_research: {
      title: 'Product Research',
      description: 'Ask about the best products in any category',
      examples: [
        'best eBikes under $2000',
        'top rated gaming laptops',
        'best wireless headphones',
        'recommend a good coffee maker'
      ]
    },
    knowledge_base: {
      title: 'Knowledge Base Questions',
      description: 'Ask questions about documentation or how-to guides',
      examples: [
        'how do I create a chatbot?',
        'what is machine learning?',
        'how to set up OpenSearch?',
        'explain vector databases'
      ]
    },
    general: {
      title: 'General Conversation',
      description: 'Start a conversation or get help',
      examples: [
        'hello!',
        'what can you help me with?',
        'I need help finding a product',
        'tell me about your capabilities'
      ]
    }
  }

  res.json({
    success: true,
    examples: examples,
    usage: {
      endpoint: '/api/chat/message',
      method: 'POST',
      body: {
        message: 'Your message here',
        userId: 'optional-user-id'
      }
    }
  })
}))

/**
 * WebSocket-style endpoint for real-time chat (using Server-Sent Events)
 */
router.get('/stream/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    userId: userId,
    message: 'Connected to chat stream',
    timestamp: new Date().toISOString()
  })}\n\n`)

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'ping',
      timestamp: new Date().toISOString()
    })}\n\n`)
  }, 30000)

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(keepAlive)
    console.log(`Chat stream closed for user: ${userId}`)
  })
}))

export default router
