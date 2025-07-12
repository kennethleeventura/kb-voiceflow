import { ChatOpenAI } from 'langchain/chat_models/openai'
import { PromptTemplate } from 'langchain/prompts'
import { LLMChain } from 'langchain/chains'

/**
 * Service for analyzing and formatting review data
 */
export class ReviewAnalysisService {
  constructor() {
    this.model = new ChatOpenAI({
      temperature: 0.3,
      modelName: 'gpt-3.5-turbo'
    })
  }

  /**
   * Analyze scraped reviews and generate structured output
   * @param {Object} reviewData - Raw review data from scraping
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Structured analysis result
   */
  async analyzeReviews(reviewData, options = {}) {
    const {
      includeSentimentAnalysis = true,
      includeKeyInsights = true,
      includeProsAndCons = true,
      includeRecommendations = true,
      maxInsights = 5
    } = options

    console.log(`Analyzing ${reviewData.totalReviews} reviews for ${reviewData.product}`)

    const analysis = {
      product: reviewData.product,
      category: reviewData.category,
      analysisDate: new Date().toISOString(),
      dataSource: {
        totalReviews: reviewData.totalReviews,
        sources: reviewData.sources,
        scrapedAt: reviewData.scrapedAt
      },
      overallRating: this.calculateOverallRating(reviewData.reviews),
      sentiment: null,
      keyInsights: [],
      prosAndCons: null,
      recommendations: null,
      topReviews: this.selectTopReviews(reviewData.reviews),
      ratingDistribution: this.calculateRatingDistribution(reviewData.reviews)
    }

    try {
      // Perform sentiment analysis
      if (includeSentimentAnalysis) {
        analysis.sentiment = await this.performSentimentAnalysis(reviewData.reviews)
      }

      // Extract key insights
      if (includeKeyInsights) {
        analysis.keyInsights = await this.extractKeyInsights(reviewData.reviews, maxInsights)
      }

      // Generate pros and cons
      if (includeProsAndCons) {
        analysis.prosAndCons = await this.generateProsAndCons(reviewData.reviews)
      }

      // Generate recommendations
      if (includeRecommendations) {
        analysis.recommendations = await this.generateRecommendations(reviewData, analysis)
      }

    } catch (error) {
      console.error('Error during review analysis:', error)
      analysis.error = error.message
    }

    return analysis
  }

  /**
   * Calculate overall rating from all reviews
   */
  calculateOverallRating(reviews) {
    const reviewsWithRatings = reviews.filter(r => r.rating !== null && r.rating !== undefined)
    
    if (reviewsWithRatings.length === 0) {
      return {
        average: null,
        total: reviews.length,
        withRatings: 0
      }
    }

    const sum = reviewsWithRatings.reduce((acc, review) => acc + review.rating, 0)
    const average = sum / reviewsWithRatings.length

    return {
      average: Math.round(average * 10) / 10,
      total: reviews.length,
      withRatings: reviewsWithRatings.length
    }
  }

  /**
   * Calculate rating distribution
   */
  calculateRatingDistribution(reviews) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    
    reviews.forEach(review => {
      if (review.rating !== null && review.rating !== undefined) {
        const roundedRating = Math.round(review.rating)
        if (roundedRating >= 1 && roundedRating <= 5) {
          distribution[roundedRating]++
        }
      }
    })

    return distribution
  }

  /**
   * Perform sentiment analysis on reviews
   */
  async performSentimentAnalysis(reviews) {
    try {
      const sampleReviews = reviews.slice(0, 20) // Analyze first 20 reviews for performance
      const reviewTexts = sampleReviews.map(r => r.content).join('\n\n')

      const template = `
      Analyze the sentiment of these product reviews and provide a summary:

      Reviews:
      {reviews}

      Please respond with a JSON object containing:
      - overall_sentiment: "positive", "negative", or "neutral"
      - confidence: confidence score from 0-1
      - positive_percentage: percentage of positive sentiment
      - negative_percentage: percentage of negative sentiment
      - neutral_percentage: percentage of neutral sentiment
      - key_emotions: array of main emotions detected (e.g., ["satisfaction", "frustration", "excitement"])

      Respond only with the JSON object:
      `

      const prompt = new PromptTemplate({
        template: template,
        inputVariables: ['reviews']
      })

      const chain = new LLMChain({ llm: this.model, prompt: prompt })
      const response = await chain.call({ reviews: reviewTexts })

      return JSON.parse(response.text.trim())
    } catch (error) {
      console.error('Error in sentiment analysis:', error)
      return {
        overall_sentiment: 'neutral',
        confidence: 0.5,
        positive_percentage: 33,
        negative_percentage: 33,
        neutral_percentage: 34,
        key_emotions: ['mixed']
      }
    }
  }

  /**
   * Extract key insights from reviews
   */
  async extractKeyInsights(reviews, maxInsights) {
    try {
      const sampleReviews = reviews.slice(0, 30) // Use more reviews for insights
      const reviewTexts = sampleReviews.map(r => r.content).join('\n\n')

      const template = `
      Analyze these product reviews and extract the most important insights:

      Reviews:
      {reviews}

      Please identify the top {maxInsights} key insights about this product based on the reviews.
      Focus on:
      - Most commonly mentioned features (positive or negative)
      - Performance aspects
      - Value for money
      - Common issues or problems
      - Standout benefits

      Respond with a JSON array of insights, each containing:
      - insight: the main insight (1-2 sentences)
      - category: category of insight (e.g., "performance", "value", "design", "durability")
      - sentiment: "positive", "negative", or "neutral"
      - frequency: how often this was mentioned ("high", "medium", "low")

      Example:
      [
        {{
          "insight": "Users consistently praise the long battery life, with many reporting 2-3 days of use",
          "category": "performance",
          "sentiment": "positive",
          "frequency": "high"
        }}
      ]

      Respond only with the JSON array:
      `

      const prompt = new PromptTemplate({
        template: template,
        inputVariables: ['reviews', 'maxInsights']
      })

      const chain = new LLMChain({ llm: this.model, prompt: prompt })
      const response = await chain.call({ 
        reviews: reviewTexts, 
        maxInsights: maxInsights.toString() 
      })

      return JSON.parse(response.text.trim())
    } catch (error) {
      console.error('Error extracting insights:', error)
      return []
    }
  }

  /**
   * Generate pros and cons from reviews
   */
  async generateProsAndCons(reviews) {
    try {
      const sampleReviews = reviews.slice(0, 25)
      const reviewTexts = sampleReviews.map(r => r.content).join('\n\n')

      const template = `
      Based on these product reviews, generate a comprehensive pros and cons list:

      Reviews:
      {reviews}

      Please respond with a JSON object containing:
      - pros: array of positive aspects (3-5 items)
      - cons: array of negative aspects (3-5 items)

      Each item should be:
      - Concise (1-2 sentences)
      - Based on actual review content
      - Specific and actionable

      Example:
      {{
        "pros": [
          "Excellent battery life lasting 2-3 days with heavy use",
          "Lightweight and comfortable for long rides",
          "Easy assembly with clear instructions"
        ],
        "cons": [
          "Higher price point compared to competitors",
          "Limited color options available",
          "Some users report issues with the mobile app"
        ]
      }}

      Respond only with the JSON object:
      `

      const prompt = new PromptTemplate({
        template: template,
        inputVariables: ['reviews']
      })

      const chain = new LLMChain({ llm: this.model, prompt: prompt })
      const response = await chain.call({ reviews: reviewTexts })

      return JSON.parse(response.text.trim())
    } catch (error) {
      console.error('Error generating pros and cons:', error)
      return {
        pros: ['Based on available reviews, users generally find positive aspects'],
        cons: ['Some users have reported areas for improvement']
      }
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  async generateRecommendations(reviewData, analysis) {
    try {
      const template = `
      Based on this product analysis, generate recommendations:

      Product: {product}
      Overall Rating: {rating}
      Total Reviews: {totalReviews}
      Sentiment: {sentiment}

      Please respond with a JSON object containing:
      - overall_recommendation: "highly_recommended", "recommended", "conditional", or "not_recommended"
      - recommendation_reason: brief explanation (1-2 sentences)
      - best_for: array of user types this product is best suited for
      - consider_if: array of conditions when this product should be considered
      - alternatives_if: when to consider alternatives

      Example:
      {{
        "overall_recommendation": "recommended",
        "recommendation_reason": "Strong performance and positive user feedback make this a solid choice in its category.",
        "best_for": ["Daily commuters", "Fitness enthusiasts", "Tech-savvy users"],
        "consider_if": ["You prioritize battery life", "You want reliable performance", "Budget allows for premium features"],
        "alternatives_if": ["You need a lower price point", "You prefer different design aesthetics"]
      }}

      Respond only with the JSON object:
      `

      const prompt = new PromptTemplate({
        template: template,
        inputVariables: ['product', 'rating', 'totalReviews', 'sentiment']
      })

      const chain = new LLMChain({ llm: this.model, prompt: prompt })
      const response = await chain.call({
        product: reviewData.product,
        rating: analysis.overallRating.average || 'N/A',
        totalReviews: reviewData.totalReviews,
        sentiment: analysis.sentiment?.overall_sentiment || 'neutral'
      })

      return JSON.parse(response.text.trim())
    } catch (error) {
      console.error('Error generating recommendations:', error)
      return {
        overall_recommendation: 'conditional',
        recommendation_reason: 'Based on available data, this product has mixed reviews.',
        best_for: ['Users with specific needs'],
        consider_if: ['You have researched alternatives'],
        alternatives_if: ['You have different requirements']
      }
    }
  }

  /**
   * Select top reviews for display
   */
  selectTopReviews(reviews, count = 5) {
    // Sort by rating (if available) and content length
    const sortedReviews = reviews
      .filter(r => r.content && r.content.length > 50)
      .sort((a, b) => {
        // Prioritize reviews with ratings
        if (a.rating && !b.rating) return -1
        if (!a.rating && b.rating) return 1
        
        // Then by rating (higher first)
        if (a.rating && b.rating) {
          if (a.rating !== b.rating) return b.rating - a.rating
        }
        
        // Then by content length (longer reviews often more detailed)
        return b.content.length - a.content.length
      })
      .slice(0, count)

    return sortedReviews.map(review => ({
      source: review.source,
      content: review.content.length > 300 ? 
        review.content.substring(0, 300) + '...' : 
        review.content,
      rating: review.rating,
      author: review.author
    }))
  }
}
