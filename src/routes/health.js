import express from 'express'
import { HealthService } from '../services/healthService.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * Initialize health service
 */
let healthService

export function initializeHealthRoutes(dependencies = {}) {
  healthService = new HealthService(dependencies)
  return router
}

/**
 * GET /api/health
 * Basic health check endpoint
 */
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: healthService.getUptime()
  })
}))

/**
 * GET /api/health/detailed
 * Comprehensive health check with all dependencies
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const healthReport = await healthService.checkHealth()
  
  // Set appropriate HTTP status based on health
  let statusCode = 200
  if (healthReport.status === 'unhealthy') {
    statusCode = 503 // Service Unavailable
  } else if (healthReport.status === 'degraded') {
    statusCode = 200 // OK but with warnings
  }

  res.status(statusCode).json({
    success: healthReport.status !== 'unhealthy',
    ...healthReport
  })
}))

/**
 * GET /api/health/redis
 * Check Redis health specifically
 */
router.get('/redis', asyncHandler(async (req, res) => {
  const redisHealth = await healthService.checkRedis()
  
  const statusCode = redisHealth.status === 'unhealthy' ? 503 : 200
  
  res.status(statusCode).json({
    success: redisHealth.status !== 'unhealthy',
    service: 'redis',
    ...redisHealth,
    timestamp: new Date().toISOString()
  })
}))

/**
 * GET /api/health/opensearch
 * Check OpenSearch health specifically
 */
router.get('/opensearch', asyncHandler(async (req, res) => {
  const opensearchHealth = await healthService.checkOpenSearch()
  
  const statusCode = opensearchHealth.status === 'unhealthy' ? 503 : 200
  
  res.status(statusCode).json({
    success: opensearchHealth.status !== 'unhealthy',
    service: 'opensearch',
    ...opensearchHealth,
    timestamp: new Date().toISOString()
  })
}))

/**
 * GET /api/health/unstructured
 * Check Unstructured service health specifically
 */
router.get('/unstructured', asyncHandler(async (req, res) => {
  const unstructuredHealth = await healthService.checkUnstructured()
  
  const statusCode = unstructuredHealth.status === 'unhealthy' ? 503 : 200
  
  res.status(statusCode).json({
    success: unstructuredHealth.status !== 'unhealthy',
    service: 'unstructured',
    ...unstructuredHealth,
    timestamp: new Date().toISOString()
  })
}))

/**
 * GET /api/health/openai
 * Check OpenAI API health specifically
 */
router.get('/openai', asyncHandler(async (req, res) => {
  const openaiHealth = await healthService.checkOpenAI()
  
  const statusCode = openaiHealth.status === 'unhealthy' ? 503 : 200
  
  res.status(statusCode).json({
    success: openaiHealth.status !== 'unhealthy',
    service: 'openai',
    ...openaiHealth,
    timestamp: new Date().toISOString()
  })
}))

/**
 * GET /api/health/system
 * Check system resources
 */
router.get('/system', asyncHandler(async (req, res) => {
  const systemHealth = await healthService.checkSystem()
  
  const statusCode = systemHealth.status === 'unhealthy' ? 503 : 200
  
  res.status(statusCode).json({
    success: systemHealth.status !== 'unhealthy',
    service: 'system',
    ...systemHealth,
    timestamp: new Date().toISOString()
  })
}))

/**
 * GET /api/health/readiness
 * Kubernetes-style readiness probe
 */
router.get('/readiness', asyncHandler(async (req, res) => {
  const healthReport = await healthService.checkHealth()
  
  // Ready if not unhealthy
  const isReady = healthReport.status !== 'unhealthy'
  
  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    status: healthReport.status,
    timestamp: new Date().toISOString()
  })
}))

/**
 * GET /api/health/liveness
 * Kubernetes-style liveness probe
 */
router.get('/liveness', asyncHandler(async (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: healthService.getUptime()
  })
}))

export default router
