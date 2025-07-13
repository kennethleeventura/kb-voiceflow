import { ReviewAggregationService } from './reviewAggregationService.js'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { PromptTemplate } from 'langchain/prompts'
import { LLMChain } from 'langchain/chains'

/**
 * Conversational Bot Service that integrates with review aggregation and knowledge base
 */
export class ConversationService {
  constructor(questionHandler, addContentHandler) {
    this.reviewService = new ReviewAggregationService()
    this.questionHandler = questionHandler // Function to handle knowledge base questions
    this.addContentHandler = addContentHandler // Function to add content
    this.conversations = new Map() // Store conversation state
    
    this.chatModel = new ChatOpenAI({
      temperature: 0.7,
      modelName: 'gpt-3.5-turbo'
    })
    
    // Conversation intents and their handlers
    this.intentHandlers = {
      'product_research': this.handleProductResearch.bind(this),
      'product_comparison': this.handleProductComparison.bind(this),
      'knowledge_question': this.handleKnowledgeQuestion.bind(this),
      'general_chat': this.handleGeneralChat.bind(this),
      'help': this.handleHelp.bind(this),
      'greeting': this.handleGreeting.bind(this)
    }
  }

  /**
   * Main conversation handler - processes user input and returns bot response
   * @param {string} userId - Unique user identifier
   * @param {string} message - User's message
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Bot response with conversation state
   */
  async processMessage(userId, message, options = {}) {
    try {
      // Get or create conversation state
      let conversation = this.conversations.get(userId) || {
        id: userId,
        history: [],
        context: {},
        currentIntent: null,
        awaitingInput: false,
        startTime: new Date()
      }

      // Add user message to history
      conversation.history.push({
        role: 'user',
        message: message,
        timestamp: new Date()
      })

      // Detect intent and route to appropriate handler
      const intent = await this.detectIntent(message, conversation.context)
      conversation.currentIntent = intent.name

      console.log(`🤖 User: ${message}`)
      console.log(`🧠 Detected intent: ${intent.name} (confidence: ${intent.confidence})`)

      // Route to appropriate handler
      const response = await this.intentHandlers[intent.name](message, conversation, intent)

      // Add bot response to history
      conversation.history.push({
        role: 'bot',
        message: response.text,
        timestamp: new Date(),
        data: response.data || null
      })

      // Update conversation state
      this.conversations.set(userId, conversation)

      // Clean up old conversations (keep last 100)
      if (this.conversations.size > 100) {
        const oldestKey = this.conversations.keys().next().value
        this.conversations.delete(oldestKey)
      }

      return {
        success: true,
        response: response.text,
        data: response.data,
        intent: intent.name,
        conversationId: userId,
        suggestions: response.suggestions || [],
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error in conversation processing:', error)
      return {
        success: false,
        response: "I'm sorry, I encountered an error. Please try again.",
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Detect user intent from message
   */
  async detectIntent(message, context = {}) {
    const template = `
    Analyze this user message and determine the intent. Consider the conversation context.

    User Message: "{message}"
    Context: {context}

    Available intents:
    - product_research: User wants to research/find products (e.g., "best eBikes", "top rated laptops")
    - product_comparison: User wants to compare specific products (e.g., "iPhone vs Samsung")
    - knowledge_question: User has questions about documentation/how-to (e.g., "how do I...", "what is...")
    - general_chat: General conversation, small talk
    - help: User needs help or doesn't know what to ask
    - greeting: User is greeting or starting conversation

    Respond with JSON only:
    {{"intent": "intent_name", "confidence": 0.0-1.0, "entities": {{"product": "extracted_product", "action": "extracted_action"}}}}
    `

    try {
      const prompt = new PromptTemplate({
        template: template,
        inputVariables: ['message', 'context']
      })

      const chain = new LLMChain({ llm: this.chatModel, prompt: prompt })
      const response = await chain.call({ 
        message: message, 
        context: JSON.stringify(context) 
      })

      const result = JSON.parse(response.text.trim())
      return {
        name: result.intent,
        confidence: result.confidence,
        entities: result.entities || {}
      }
    } catch (error) {
      console.error('Error detecting intent:', error)
      // Fallback intent detection
      const messageLower = message.toLowerCase()
      
      if (messageLower.includes('best') || messageLower.includes('top') || messageLower.includes('recommend')) {
        return { name: 'product_research', confidence: 0.7, entities: {} }
      } else if (messageLower.includes('vs') || messageLower.includes('compare')) {
        return { name: 'product_comparison', confidence: 0.7, entities: {} }
      } else if (messageLower.includes('how') || messageLower.includes('what') || messageLower.includes('why')) {
        return { name: 'knowledge_question', confidence: 0.6, entities: {} }
      } else if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
        return { name: 'greeting', confidence: 0.9, entities: {} }
      } else {
        return { name: 'general_chat', confidence: 0.5, entities: {} }
      }
    }
  }

  /**
   * Handle product research requests
   */
  async handleProductResearch(message, conversation, intent) {
    try {
      console.log('🔍 Processing product research request...')
      
      // Use the review aggregation service
      const reviewResult = await this.reviewService.processReviewRequest(message, {
        maxReviewsPerSite: 20,
        includeGoogleReviews: true,
        includeSentimentAnalysis: true,
        includeRecommendations: true
      })

      if (reviewResult.success) {
        const summary = reviewResult.summary
        const analysis = reviewResult.analysis
        
        let response = `Great question! I've analyzed ${summary.totalReviews} reviews from ${summary.sourcesScraped} sources for "${reviewResult.query.detectedProduct}". Here's what I found:\n\n`
        
        response += `⭐ **Overall Rating**: ${summary.averageRating}/5 stars\n`
        response += `😊 **Sentiment**: ${summary.overallSentiment}\n`
        response += `🎯 **Recommendation**: ${summary.recommendationLevel}\n\n`
        
        if (analysis.prosAndCons) {
          response += `**✅ Top Pros:**\n`
          analysis.prosAndCons.pros.slice(0, 3).forEach(pro => {
            response += `• ${pro}\n`
          })
          
          response += `\n**❌ Main Cons:**\n`
          analysis.prosAndCons.cons.slice(0, 3).forEach(con => {
            response += `• ${con}\n`
          })
        }
        
        if (analysis.recommendations) {
          response += `\n**🎯 Best for**: ${analysis.recommendations.best_for?.join(', ')}`
        }
        
        response += `\n\nWould you like me to dive deeper into any specific aspect, or help you with something else?`
        
        return {
          text: response,
          data: {
            type: 'product_research',
            reviewData: reviewResult,
            summary: summary
          },
          suggestions: [
            'Tell me more about the pros and cons',
            'What about the price range?',
            'Compare with alternatives',
            'Help me with something else'
          ]
        }
      } else {
        return {
          text: `I couldn't find enough review data for that product. Could you try being more specific? For example, instead of "bikes" try "electric bikes" or "mountain bikes".`,
          suggestions: [
            'Try a more specific product name',
            'Ask about a different product',
            'Get help with documentation instead'
          ]
        }
      }
    } catch (error) {
      console.error('Error in product research:', error)
      return {
        text: `I had trouble researching that product. Could you try rephrasing your question or asking about a different product?`,
        suggestions: ['Try a different product', 'Ask for help', 'Search documentation']
      }
    }
  }

  /**
   * Handle product comparison requests
   */
  async handleProductComparison(message, conversation, intent) {
    return {
      text: `I'd love to help you compare products! However, detailed product comparisons are coming soon. For now, I can research individual products really well. Try asking me about "best [product type]" and I'll give you comprehensive analysis!\n\nFor example: "best gaming laptops" or "top rated wireless headphones"`,
      suggestions: [
        'Research best gaming laptops',
        'Find top rated headphones',
        'Look up best smartphones',
        'Ask about documentation'
      ]
    }
  }

  /**
   * Handle knowledge base questions
   */
  async handleKnowledgeQuestion(message, conversation, intent) {
    try {
      console.log('📚 Processing knowledge base question...')
      
      // Use the existing question handler
      const result = await this.questionHandler({
        question: message,
        collection: 'default', // or determine from context
        model: 'gpt-3.5-turbo',
        k: 3,
        temperature: 0.3
      })

      if (result.sources && result.sources.length > 0) {
        let response = result.response + '\n\n'
        response += `📚 **Sources**: ${result.sources.join(', ')}`
        response += `\n\nIs there anything else you'd like to know?`
        
        return {
          text: response,
          data: {
            type: 'knowledge_answer',
            sources: result.sources,
            collection: result.collection
          },
          suggestions: [
            'Ask another question',
            'Research a product instead',
            'Get help'
          ]
        }
      } else {
        return {
          text: `I don't have specific information about that in my knowledge base. However, I'm great at researching products and analyzing reviews! Try asking me about "best [product]" or I can help you add content to the knowledge base.`,
          suggestions: [
            'Research a product instead',
            'Add content to knowledge base',
            'Ask for help'
          ]
        }
      }
    } catch (error) {
      console.error('Error in knowledge question:', error)
      return {
        text: `I had trouble finding information about that. Could you try rephrasing your question or ask me to research a product instead?`,
        suggestions: ['Try rephrasing', 'Research a product', 'Get help']
      }
    }
  }

  /**
   * Handle general chat
   */
  async handleGeneralChat(message, conversation, intent) {
    const responses = [
      "I'm here to help you research products and answer questions! What would you like to know about?",
      "Hi there! I can help you find the best products by analyzing reviews, or answer questions from documentation. What interests you?",
      "Hello! I'm your AI assistant for product research and knowledge base questions. How can I help you today?",
      "I'm great at analyzing product reviews and answering documentation questions. What would you like to explore?"
    ]
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    
    return {
      text: randomResponse,
      suggestions: [
        'Find best eBikes',
        'Research gaming laptops',
        'Ask about documentation',
        'Get help'
      ]
    }
  }

  /**
   * Handle help requests
   */
  async handleHelp(message, conversation, intent) {
    return {
      text: `I'm your AI assistant and I can help you with:\n\n🔍 **Product Research**: Ask me "best [product]" or "top rated [product]" and I'll analyze reviews from multiple sources\n\n📚 **Knowledge Base**: Ask questions about documentation or how-to guides\n\n💡 **Examples**:\n• "best eBikes under $2000"\n• "top rated gaming laptops"\n• "how do I create a chatbot?"\n• "what is the best coffee maker?"\n\nWhat would you like to try?`,
      suggestions: [
        'Find best eBikes',
        'Research smartphones',
        'Ask about documentation',
        'Compare products'
      ]
    }
  }

  /**
   * Handle greetings
   */
  async handleGreeting(message, conversation, intent) {
    return {
      text: `Hello! 👋 I'm your AI assistant for product research and knowledge base questions. I can analyze reviews from multiple sources to help you find the best products, or answer questions from documentation.\n\nWhat would you like to explore today?`,
      suggestions: [
        'Find best products',
        'Research eBikes',
        'Ask about documentation',
        'Get help'
      ]
    }
  }

  /**
   * Get conversation history for a user
   */
  getConversationHistory(userId, limit = 10) {
    const conversation = this.conversations.get(userId)
    if (!conversation) return []
    
    return conversation.history.slice(-limit)
  }

  /**
   * Clear conversation for a user
   */
  clearConversation(userId) {
    this.conversations.delete(userId)
    return true
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    return {
      activeConversations: this.conversations.size,
      totalProcessed: Array.from(this.conversations.values())
        .reduce((sum, conv) => sum + conv.history.length, 0)
    }
  }
}
