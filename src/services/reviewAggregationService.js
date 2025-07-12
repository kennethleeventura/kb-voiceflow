import { IntentDetectionService } from './intentDetectionService.js'
import { ReviewScrapingService } from './reviewScrapingService.js'
import { ReviewAnalysisService } from './reviewAnalysisService.js'

/**
 * Main service that orchestrates the entire review aggregation process
 */
export class ReviewAggregationService {
  constructor() {
    this.intentService = new IntentDetectionService()
    this.scrapingService = new ReviewScrapingService()
    this.analysisService = new ReviewAnalysisService()
    this.jobs = new Map() // Store active jobs
  }

  /**
   * Process user input and return comprehensive review analysis
   * @param {string} userInput - User's query (e.g., "top rated eBikes")
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Complete review analysis
   */
  async processReviewRequest(userInput, options = {}) {
    const {
      maxReviewsPerSite = 30,
      includeGoogleReviews = true,
      includeSentimentAnalysis = true,
      includeRecommendations = true,
      async = false
    } = options

    const jobId = this.generateJobId()
    
    if (async) {
      // Start async processing
      this.processAsync(jobId, userInput, options)
      return {
        jobId,
        status: 'processing',
        message: 'Review aggregation started. Use the job ID to check status.'
      }
    } else {
      // Synchronous processing
      return await this.processSync(userInput, options)
    }
  }

  /**
   * Synchronous processing
   */
  async processSync(userInput, options) {
    try {
      console.log(`Processing review request: "${userInput}"`)

      // Step 1: Analyze user intent and detect category
      console.log('Step 1: Analyzing user intent...')
      const intentData = await this.intentService.analyzeIntent(userInput)
      
      if (!intentData.product || intentData.confidence < 0.3) {
        throw new Error('Could not understand the product request. Please be more specific.')
      }

      console.log(`Detected product: ${intentData.product} (Category: ${intentData.category})`)

      // Step 2: Scrape reviews from relevant sources
      console.log('Step 2: Scraping reviews from multiple sources...')
      const reviewData = await this.scrapingService.scrapeReviews(intentData, {
        maxReviewsPerSite: options.maxReviewsPerSite,
        includeGoogleReviews: options.includeGoogleReviews
      })

      if (reviewData.totalReviews === 0) {
        return {
          success: false,
          message: 'No reviews found for this product. Try a different search term.',
          intentData,
          reviewData: {
            totalReviews: 0,
            sources: []
          }
        }
      }

      // Step 3: Analyze and format the review data
      console.log('Step 3: Analyzing review data...')
      const analysis = await this.analysisService.analyzeReviews(reviewData, {
        includeSentimentAnalysis: options.includeSentimentAnalysis,
        includeRecommendations: options.includeRecommendations
      })

      // Step 4: Format final output
      const result = this.formatFinalOutput(intentData, reviewData, analysis)
      
      console.log(`Review processing completed. Found ${reviewData.totalReviews} reviews from ${reviewData.sources.length} sources.`)
      
      return result

    } catch (error) {
      console.error('Error processing review request:', error)
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Asynchronous processing
   */
  async processAsync(jobId, userInput, options) {
    const job = {
      id: jobId,
      status: 'processing',
      startTime: new Date(),
      userInput,
      progress: 0,
      result: null,
      error: null
    }

    this.jobs.set(jobId, job)

    try {
      // Step 1: Intent analysis
      job.progress = 10
      job.currentStep = 'Analyzing user intent'
      const intentData = await this.intentService.analyzeIntent(userInput)
      
      // Step 2: Review scraping
      job.progress = 30
      job.currentStep = 'Scraping reviews from multiple sources'
      const reviewData = await this.scrapingService.scrapeReviews(intentData, options)
      
      // Step 3: Analysis
      job.progress = 70
      job.currentStep = 'Analyzing review data'
      const analysis = await this.analysisService.analyzeReviews(reviewData, options)
      
      // Step 4: Final formatting
      job.progress = 90
      job.currentStep = 'Formatting results'
      const result = this.formatFinalOutput(intentData, reviewData, analysis)
      
      // Complete
      job.status = 'completed'
      job.progress = 100
      job.currentStep = 'Completed'
      job.result = result
      job.endTime = new Date()

    } catch (error) {
      job.status = 'failed'
      job.error = error.message
      job.endTime = new Date()
    }
  }

  /**
   * Get job status for async processing
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId)
    if (!job) {
      return { error: 'Job not found' }
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      startTime: job.startTime,
      endTime: job.endTime,
      userInput: job.userInput,
      result: job.result,
      error: job.error
    }
  }

  /**
   * Format the final output structure
   */
  formatFinalOutput(intentData, reviewData, analysis) {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      
      // Query Information
      query: {
        originalInput: intentData.originalInput,
        detectedProduct: intentData.product,
        category: intentData.category,
        searchType: intentData.searchType,
        confidence: intentData.confidence
      },

      // Review Summary
      summary: {
        totalReviews: reviewData.totalReviews,
        sourcesScraped: reviewData.sources.length,
        averageRating: analysis.overallRating.average,
        overallSentiment: analysis.sentiment?.overall_sentiment,
        recommendationLevel: analysis.recommendations?.overall_recommendation
      },

      // Detailed Analysis
      analysis: {
        rating: analysis.overallRating,
        ratingDistribution: analysis.ratingDistribution,
        sentiment: analysis.sentiment,
        keyInsights: analysis.keyInsights,
        prosAndCons: analysis.prosAndCons,
        recommendations: analysis.recommendations
      },

      // Data Sources
      sources: reviewData.sources.map(source => ({
        site: source.site,
        reviewCount: source.reviewCount,
        averageRating: source.avgRating,
        status: source.error ? 'error' : 'success',
        error: source.error
      })),

      // Sample Reviews
      topReviews: analysis.topReviews,

      // Metadata
      metadata: {
        processingTime: null, // Can be calculated if needed
        scrapedAt: reviewData.scrapedAt,
        analysisDate: analysis.analysisDate,
        version: '1.0.0'
      }
    }
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clean up old jobs
   */
  cleanupJobs(maxAge = 3600000) { // 1 hour default
    const now = Date.now()
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.endTime && (now - job.endTime.getTime()) > maxAge) {
        this.jobs.delete(jobId)
      }
    }
  }

  /**
   * Get all active jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      status: job.status,
      progress: job.progress,
      userInput: job.userInput,
      startTime: job.startTime,
      endTime: job.endTime
    }))
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId)
    if (job && job.status === 'processing') {
      job.status = 'cancelled'
      job.endTime = new Date()
      return true
    }
    return false
  }
}
