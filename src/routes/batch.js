import express from 'express'
import { BatchService } from '../services/batchService.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { 
  isValidUrl, 
  validateCollectionName, 
  validateChunkSize, 
  validateChunkOverlap,
  validateLimit 
} from '../utils/validationUtils.js'

const router = express.Router()

/**
 * Initialize batch service
 */
let batchService

export function initializeBatchRoutes(addUrlFunction, parseSitemapFunction) {
  batchService = new BatchService(addUrlFunction, parseSitemapFunction)
  
  // Clean up old jobs every hour
  setInterval(() => {
    batchService.cleanupJobs()
  }, 3600000)
  
  return router
}

/**
 * POST /api/batch/process
 * Process multiple URLs in batch
 */
router.post('/process', asyncHandler(async (req, res) => {
  const {
    urls,
    collection,
    chunkSize = 2000,
    chunkOverlap = 250,
    sleep = 1000,
    maxConcurrent = 3
  } = req.body

  // Validate URLs array
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'URLs array is required and must contain at least one URL'
    })
  }

  if (urls.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 100 URLs allowed per batch'
    })
  }

  // Validate each URL
  for (const url of urls) {
    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: `Invalid URL: ${url}`
      })
    }
  }

  // Validate collection name
  const collectionValidation = validateCollectionName(collection)
  if (!collectionValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: collectionValidation.error
    })
  }

  // Validate chunk size
  const chunkSizeValidation = validateChunkSize(chunkSize)
  if (!chunkSizeValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: chunkSizeValidation.error
    })
  }

  // Validate chunk overlap
  const chunkOverlapValidation = validateChunkOverlap(chunkOverlap, chunkSize)
  if (!chunkOverlapValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: chunkOverlapValidation.error
    })
  }

  // Validate sleep
  const sleepNum = parseInt(sleep, 10)
  if (isNaN(sleepNum) || sleepNum < 0 || sleepNum > 10000) {
    return res.status(400).json({
      success: false,
      error: 'Sleep must be between 0 and 10000 milliseconds'
    })
  }

  // Validate maxConcurrent
  const maxConcurrentNum = parseInt(maxConcurrent, 10)
  if (isNaN(maxConcurrentNum) || maxConcurrentNum < 1 || maxConcurrentNum > 10) {
    return res.status(400).json({
      success: false,
      error: 'Max concurrent must be between 1 and 10'
    })
  }

  const jobId = await batchService.processBatch(urls, collection, {
    chunkSize,
    chunkOverlap,
    sleep: sleepNum,
    maxConcurrent: maxConcurrentNum
  })

  res.json({
    success: true,
    jobId,
    message: 'Batch processing started',
    urls: urls.length,
    collection
  })
}))

/**
 * GET /api/batch/jobs/:jobId
 * Get job status
 */
router.get('/jobs/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params
  
  const jobStatus = batchService.getJobStatus(jobId)
  
  if (!jobStatus) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    })
  }

  res.json({
    success: true,
    job: jobStatus
  })
}))

/**
 * DELETE /api/batch/jobs/:jobId
 * Cancel a running job
 */
router.delete('/jobs/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params
  
  const cancelled = batchService.cancelJob(jobId)
  
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
 * GET /api/batch/jobs
 * Get all jobs
 */
router.get('/jobs', asyncHandler(async (req, res) => {
  const jobs = batchService.getAllJobs()
  
  res.json({
    success: true,
    jobs,
    total: jobs.length
  })
}))

/**
 * POST /api/batch/cleanup
 * Clean up old completed jobs
 */
router.post('/cleanup', asyncHandler(async (req, res) => {
  const { maxAge = 3600000 } = req.body // Default 1 hour
  
  const maxAgeNum = parseInt(maxAge, 10)
  if (isNaN(maxAgeNum) || maxAgeNum < 60000) { // Minimum 1 minute
    return res.status(400).json({
      success: false,
      error: 'Max age must be at least 60000 milliseconds (1 minute)'
    })
  }

  batchService.cleanupJobs(maxAgeNum)
  
  res.json({
    success: true,
    message: 'Job cleanup completed'
  })
}))

export default router
