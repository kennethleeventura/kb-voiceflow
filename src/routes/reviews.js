import express from 'express'
import { ReviewAggregationService } from '../services/reviewAggregationService.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * Initialize review aggregation service
 */
const reviewService = new ReviewAggregationService()

// Clean up old jobs every hour
setInterval(() => {
  reviewService.cleanupJobs()
}, 3600000)

/**
 * POST /api/reviews/analyze
 * Main endpoint for review analysis
 */
router.post('/analyze', asyncHandler(async (req, res) => {
  const {
    query,
    maxReviewsPerSite = 30,
    includeGoogleReviews = true,
    includeSentimentAnalysis = true,
    includeRecommendations = true,
    async = false
  } = req.body

  // Validate query
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Query is required and must be a non-empty string'
    })
  }

  if (query.length > 200) {
    return res.status(400).json({
      success: false,
      error: 'Query must be less than 200 characters'
    })
  }

  // Validate maxReviewsPerSite
  const maxReviews = parseInt(maxReviewsPerSite, 10)
  if (isNaN(maxReviews) || maxReviews < 5 || maxReviews > 100) {
    return res.status(400).json({
      success: false,
      error: 'maxReviewsPerSite must be between 5 and 100'
    })
  }

  const options = {
    maxReviewsPerSite: maxReviews,
    includeGoogleReviews: Boolean(includeGoogleReviews),
    includeSentimentAnalysis: Boolean(includeSentimentAnalysis),
    includeRecommendations: Boolean(includeRecommendations),
    async: Boolean(async)
  }

  const result = await reviewService.processReviewRequest(query, options)
  
  if (async && result.jobId) {
    res.status(202).json(result) // 202 Accepted for async processing
  } else {
    res.json(result)
  }
}))

/**
 * POST /api/reviews/quick
 * Quick review analysis with minimal options
 */
router.post('/quick', asyncHandler(async (req, res) => {
  const { query } = req.body

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Query is required'
    })
  }

  const options = {
    maxReviewsPerSite: 15,
    includeGoogleReviews: true,
    includeSentimentAnalysis: false,
    includeRecommendations: false,
    async: false
  }

  const result = await reviewService.processReviewRequest(query, options)
  res.json(result)
}))

/**
 * GET /api/reviews/jobs/:jobId
 * Get status of async review analysis job
 */
router.get('/jobs/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params
  
  const jobStatus = reviewService.getJobStatus(jobId)
  
  if (jobStatus.error) {
    return res.status(404).json({
      success: false,
      error: jobStatus.error
    })
  }

  res.json({
    success: true,
    job: jobStatus
  })
}))

/**
 * DELETE /api/reviews/jobs/:jobId
 * Cancel an async review analysis job
 */
router.delete('/jobs/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params
  
  const cancelled = reviewService.cancelJob(jobId)
  
  if (!cancelled) {
    return res.status(400).json({
      success: false,
      error: 'Job not found or cannot be cancelled'
    })
  }

  res.json({
    success: true,
    message: 'Job cancelled successfully'
  })
}))

/**
 * GET /api/reviews/jobs
 * Get all review analysis jobs
 */
router.get('/jobs', asyncHandler(async (req, res) => {
  const jobs = reviewService.getAllJobs()
  
  res.json({
    success: true,
    jobs,
    total: jobs.length
  })
}))

/**
 * POST /api/reviews/intent
 * Analyze user intent without full review scraping
 */
router.post('/intent', asyncHandler(async (req, res) => {
  const { query } = req.body

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Query is required'
    })
  }

  const intentData = await reviewService.intentService.analyzeIntent(query)
  
  res.json({
    success: true,
    intent: intentData
  })
}))

/**
 * GET /api/reviews/categories
 * Get available product categories and their associated review sites
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = {
    transportation: {
      keywords: ['bike', 'ebike', 'electric bike', 'scooter', 'electric scooter', 'car', 'motorcycle'],
      reviewSites: ['electricbikereview.com', 'bikeradar.com', 'cyclingnews.com', 'reddit.com/r/ebikes', 'amazon.com']
    },
    electronics: {
      keywords: ['phone', 'smartphone', 'laptop', 'computer', 'tablet', 'headphones', 'earbuds'],
      reviewSites: ['gsmarena.com', 'techradar.com', 'cnet.com', 'engadget.com', 'theverge.com', 'amazon.com']
    },
    home_appliances: {
      keywords: ['refrigerator', 'washing machine', 'dishwasher', 'microwave', 'vacuum'],
      reviewSites: ['consumerreports.org', 'goodhousekeeping.com', 'wirecutter.com', 'amazon.com']
    },
    fitness: {
      keywords: ['treadmill', 'exercise bike', 'weights', 'yoga mat', 'fitness tracker'],
      reviewSites: ['runnersworld.com', 'menshealth.com', 'womenshealthmag.com', 'amazon.com']
    },
    gaming: {
      keywords: ['gaming laptop', 'gaming chair', 'gaming headset', 'console', 'controller'],
      reviewSites: ['ign.com', 'gamespot.com', 'pcgamer.com', 'tomshardware.com', 'amazon.com']
    }
  }

  res.json({
    success: true,
    categories
  })
}))

/**
 * POST /api/reviews/test-scraping
 * Test endpoint for scraping a specific site (development only)
 */
router.post('/test-scraping', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test endpoint not available in production'
    })
  }

  const { site, product, maxReviews = 10 } = req.body

  if (!site || !product) {
    return res.status(400).json({
      success: false,
      error: 'Site and product are required'
    })
  }

  try {
    const scrapingService = reviewService.scrapingService
    let reviews = []

    if (site === 'google_reviews') {
      reviews = await scrapingService.scrapeGoogleReviews(product, maxReviews)
    } else if (site === 'amazon.com') {
      reviews = await scrapingService.scrapeAmazonReviews(product, maxReviews)
    } else {
      reviews = await scrapingService.scrapeGenericSite(site, product, maxReviews)
    }

    res.json({
      success: true,
      site,
      product,
      reviewCount: reviews.length,
      reviews: reviews.slice(0, 5) // Return first 5 for testing
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}))

export default router
