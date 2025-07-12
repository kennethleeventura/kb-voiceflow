import { ChatOpenAI } from 'langchain/chat_models/openai'
import { PromptTemplate } from 'langchain/prompts'
import { LLMChain } from 'langchain/chains'

/**
 * Service for detecting user intent and extracting product categories
 */
export class IntentDetectionService {
  constructor() {
    this.model = new ChatOpenAI({
      temperature: 0.1,
      modelName: 'gpt-3.5-turbo'
    })
    
    this.categoryMap = {
      'fitness': ['treadmill', 'exercise bike', 'weights', 'yoga mat', 'fitness tracker', 'smartwatch'],
      'transportation': ['bike', 'ebike', 'electric bike', 'scooter', 'electric scooter', 'car', 'motorcycle', 'skateboard'],
      'electronics': ['phone', 'smartphone', 'laptop', 'computer', 'tablet', 'headphones', 'earbuds', 'speaker', 'tv', 'camera'],
      'home_appliances': ['refrigerator', 'washing machine', 'dishwasher', 'microwave', 'vacuum', 'air conditioner', 'heater'],
      'kitchen': ['blender', 'coffee maker', 'toaster', 'air fryer', 'instant pot', 'food processor'],
      'beauty': ['skincare', 'makeup', 'hair dryer', 'straightener', 'electric toothbrush'],
      'gaming': ['gaming laptop', 'gaming chair', 'gaming headset', 'console', 'controller', 'monitor'],
      'outdoor': ['tent', 'sleeping bag', 'hiking boots', 'backpack', 'camping gear'],
      'tools': ['drill', 'saw', 'hammer', 'screwdriver', 'toolset', 'power tools'],
      'clothing': ['shoes', 'jacket', 'jeans', 'dress', 'shirt', 'sneakers'],
      'books': ['book', 'novel', 'textbook', 'ebook', 'audiobook'],
      'toys': ['toy', 'board game', 'puzzle', 'action figure', 'doll'],
      'pet_supplies': ['dog food', 'cat food', 'pet toy', 'leash', 'pet bed', 'litter box'],
      'health': ['supplement', 'vitamin', 'protein powder', 'medical device', 'thermometer'],
      'automotive': ['car parts', 'tire', 'car accessory', 'car charger', 'dash cam']
    }
  }

  /**
   * Analyze user input to detect intent and extract product information
   * @param {string} userInput - The user's input text
   * @returns {Promise<Object>} - Intent analysis result
   */
  async analyzeIntent(userInput) {
    try {
      // First, try to extract product and intent using AI
      const intentResult = await this.extractIntentWithAI(userInput)
      
      // Then categorize the product
      const category = this.categorizeProduct(intentResult.product)
      
      // Determine the search intent type
      const searchType = this.determineSearchType(userInput)
      
      return {
        originalInput: userInput,
        product: intentResult.product,
        category: category,
        searchType: searchType,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        extractedKeywords: this.extractKeywords(userInput),
        reviewSites: this.getRelevantReviewSites(category)
      }
    } catch (error) {
      console.error('Error analyzing intent:', error)
      throw new Error('Failed to analyze user intent')
    }
  }

  /**
   * Use AI to extract product and intent from user input
   */
  async extractIntentWithAI(userInput) {
    const template = `
    Analyze the following user input and extract the product they're interested in and their intent.
    
    User Input: "{input}"
    
    Please respond with a JSON object containing:
    - product: The main product or item they're asking about (be specific)
    - intent: Their main intent (e.g., "find_reviews", "compare_products", "find_best", "get_recommendations")
    - confidence: A confidence score from 0-1
    
    Examples:
    Input: "top rated eBikes"
    Output: {{"product": "electric bikes", "intent": "find_best", "confidence": 0.9}}
    
    Input: "best gaming laptops under $1000"
    Output: {{"product": "gaming laptops", "intent": "find_best", "confidence": 0.95}}
    
    Input: "reviews for iPhone 15"
    Output: {{"product": "iPhone 15", "intent": "find_reviews", "confidence": 0.9}}
    
    Respond only with the JSON object:
    `

    const prompt = new PromptTemplate({
      template: template,
      inputVariables: ['input']
    })

    const chain = new LLMChain({ llm: this.model, prompt: prompt })
    const response = await chain.call({ input: userInput })
    
    try {
      return JSON.parse(response.text.trim())
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return {
        product: this.extractProductFallback(userInput),
        intent: 'find_reviews',
        confidence: 0.5
      }
    }
  }

  /**
   * Categorize a product into predefined categories
   */
  categorizeProduct(product) {
    const productLower = product.toLowerCase()
    
    for (const [category, keywords] of Object.entries(this.categoryMap)) {
      for (const keyword of keywords) {
        if (productLower.includes(keyword)) {
          return category
        }
      }
    }
    
    return 'general' // Default category
  }

  /**
   * Determine the type of search based on user input
   */
  determineSearchType(userInput) {
    const input = userInput.toLowerCase()
    
    if (input.includes('best') || input.includes('top rated') || input.includes('highest rated')) {
      return 'best_products'
    } else if (input.includes('compare') || input.includes('vs') || input.includes('versus')) {
      return 'comparison'
    } else if (input.includes('review') || input.includes('reviews')) {
      return 'reviews'
    } else if (input.includes('recommend') || input.includes('suggestion')) {
      return 'recommendations'
    } else {
      return 'general_search'
    }
  }

  /**
   * Extract keywords from user input
   */
  extractKeywords(userInput) {
    // Remove common stop words and extract meaningful keywords
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'best', 'top', 'rated']
    
    return userInput
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .filter(word => /^[a-zA-Z0-9]+$/.test(word)) // Only alphanumeric
  }

  /**
   * Get relevant review sites based on product category
   */
  getRelevantReviewSites(category) {
    const siteMap = {
      'transportation': [
        'electricbikereview.com',
        'bikeradar.com',
        'cyclingnews.com',
        'reddit.com/r/ebikes',
        'amazon.com',
        'google_reviews'
      ],
      'electronics': [
        'gsmarena.com',
        'techradar.com',
        'cnet.com',
        'engadget.com',
        'theverge.com',
        'amazon.com',
        'bestbuy.com',
        'google_reviews'
      ],
      'home_appliances': [
        'consumerreports.org',
        'goodhousekeeping.com',
        'wirecutter.com',
        'amazon.com',
        'homedepot.com',
        'lowes.com',
        'google_reviews'
      ],
      'fitness': [
        'runnersworld.com',
        'menshealth.com',
        'womenshealthmag.com',
        'amazon.com',
        'dickssportinggoods.com',
        'google_reviews'
      ],
      'gaming': [
        'ign.com',
        'gamespot.com',
        'pcgamer.com',
        'tomshardware.com',
        'amazon.com',
        'newegg.com',
        'google_reviews'
      ],
      'general': [
        'amazon.com',
        'walmart.com',
        'target.com',
        'google_reviews',
        'yelp.com',
        'trustpilot.com'
      ]
    }

    return siteMap[category] || siteMap['general']
  }

  /**
   * Fallback method to extract product if AI fails
   */
  extractProductFallback(userInput) {
    // Simple keyword extraction as fallback
    const words = userInput.toLowerCase().split(/\s+/)
    const productWords = words.filter(word => 
      !['best', 'top', 'rated', 'review', 'reviews', 'good', 'great'].includes(word)
    )
    return productWords.join(' ') || 'product'
  }
}
