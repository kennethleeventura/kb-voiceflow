import { sleepWait } from '../utils/downloadUtils.js'
import { getFileType } from '../utils/fileUtils.js'
import { sanitize } from '../utils/textUtils.js'

/**
 * Service for batch processing multiple URLs
 */
export class BatchService {
  constructor(addUrlFunction, parseSitemapFunction) {
    this.addUrl = addUrlFunction
    this.parseSitemap = parseSitemapFunction
    this.jobs = new Map() // Store active jobs
  }

  /**
   * Process multiple URLs in batch
   * @param {Array} urls - Array of URLs to process
   * @param {string} collection - Collection name
   * @param {Object} options - Processing options
   * @returns {Promise<string>} - Job ID for tracking
   */
  async processBatch(urls, collection, options = {}) {
    const {
      chunkSize = 2000,
      chunkOverlap = 250,
      sleep = 1000,
      maxConcurrent = 3,
      onProgress = null
    } = options

    const jobId = this.generateJobId()
    const encodedCollection = await sanitize(collection)

    const job = {
      id: jobId,
      status: 'running',
      total: urls.length,
      completed: 0,
      failed: 0,
      errors: [],
      startTime: new Date(),
      endTime: null,
      results: []
    }

    this.jobs.set(jobId, job)

    // Process URLs in batches with concurrency control
    this.processBatchAsync(urls, encodedCollection, chunkSize, chunkOverlap, sleep, maxConcurrent, job, onProgress)
      .then(() => {
        job.status = 'completed'
        job.endTime = new Date()
      })
      .catch((error) => {
        job.status = 'failed'
        job.endTime = new Date()
        job.errors.push(error.message)
      })

    return jobId
  }

  /**
   * Process URLs asynchronously with concurrency control
   */
  async processBatchAsync(urls, collection, chunkSize, chunkOverlap, sleep, maxConcurrent, job, onProgress) {
    const semaphore = new Semaphore(maxConcurrent)

    const promises = urls.map(async (url, index) => {
      await semaphore.acquire()
      
      try {
        console.log(`Processing ${index + 1}/${urls.length}: ${url}`)
        
        const type = getFileType(url)
        
        if (type === 'SITEMAP') {
          // Handle sitemap URLs
          const sitemapUrls = await this.parseSitemap(url, null, null)
          for (const sitemapUrl of sitemapUrls) {
            await this.addUrl(sitemapUrl, collection, chunkSize, chunkOverlap)
            await sleepWait(sleep)
          }
        } else {
          // Handle regular URLs
          await this.addUrl(url, collection, chunkSize, chunkOverlap)
        }

        job.completed++
        job.results.push({ url, status: 'success' })
        
        if (onProgress) {
          onProgress(job.completed, job.total, url, 'success')
        }
        
      } catch (error) {
        console.error(`Error processing ${url}:`, error)
        job.failed++
        job.errors.push(`${url}: ${error.message}`)
        job.results.push({ url, status: 'failed', error: error.message })
        
        if (onProgress) {
          onProgress(job.completed, job.total, url, 'failed', error.message)
        }
      } finally {
        semaphore.release()
        await sleepWait(sleep)
      }
    })

    await Promise.all(promises)
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object|null} - Job status or null if not found
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId)
    if (!job) return null

    return {
      id: job.id,
      status: job.status,
      progress: {
        total: job.total,
        completed: job.completed,
        failed: job.failed,
        percentage: Math.round((job.completed / job.total) * 100)
      },
      timing: {
        startTime: job.startTime,
        endTime: job.endTime,
        duration: job.endTime ? job.endTime - job.startTime : Date.now() - job.startTime
      },
      errors: job.errors,
      results: job.results
    }
  }

  /**
   * Cancel a running job
   * @param {string} jobId - Job ID
   * @returns {boolean} - Success status
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'running') {
      return false
    }

    job.status = 'cancelled'
    job.endTime = new Date()
    return true
  }

  /**
   * Clean up completed jobs older than specified time
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupJobs(maxAge = 3600000) {
    const now = Date.now()
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status !== 'running' && job.endTime && (now - job.endTime.getTime()) > maxAge) {
        this.jobs.delete(jobId)
      }
    }
  }

  /**
   * Generate a unique job ID
   * @returns {string} - Unique job ID
   */
  generateJobId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get all jobs
   * @returns {Array} - Array of job statuses
   */
  getAllJobs() {
    return Array.from(this.jobs.keys()).map(jobId => this.getJobStatus(jobId))
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent
    this.current = 0
    this.queue = []
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.current < this.maxConcurrent) {
        this.current++
        resolve()
      } else {
        this.queue.push(resolve)
      }
    })
  }

  release() {
    this.current--
    if (this.queue.length > 0) {
      this.current++
      const resolve = this.queue.shift()
      resolve()
    }
  }
}
