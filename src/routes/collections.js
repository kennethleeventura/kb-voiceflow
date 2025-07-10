import express from 'express'
import { CollectionService } from '../services/collectionService.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validateCollectionName } from '../utils/validationUtils.js'

const router = express.Router()

/**
 * Initialize collection service
 */
let collectionService

export function initializeCollectionRoutes(opensearchClient) {
  collectionService = new CollectionService(opensearchClient)
  return router
}

/**
 * GET /api/collections
 * List all collections
 */
router.get('/', asyncHandler(async (req, res) => {
  const collections = await collectionService.listCollections()
  
  res.json({
    success: true,
    collections,
    total: collections.length
  })
}))

/**
 * GET /api/collections/:name
 * Get detailed information about a specific collection
 */
router.get('/:name', asyncHandler(async (req, res) => {
  const { name } = req.params
  
  // Validate collection name
  const validation = validateCollectionName(name)
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: validation.error
    })
  }

  const collectionInfo = await collectionService.getCollectionInfo(name)
  
  res.json({
    success: true,
    collection: collectionInfo
  })
}))

/**
 * DELETE /api/collections/:name
 * Delete a collection
 */
router.delete('/:name', asyncHandler(async (req, res) => {
  const { name } = req.params
  
  // Validate collection name
  const validation = validateCollectionName(name)
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: validation.error
    })
  }

  await collectionService.deleteCollection(name)
  
  res.json({
    success: true,
    message: `Collection '${name}' has been deleted`
  })
}))

/**
 * POST /api/collections/:name/search
 * Search within a collection
 */
router.post('/:name/search', asyncHandler(async (req, res) => {
  const { name } = req.params
  const { query, size = 10 } = req.body
  
  // Validate collection name
  const validation = validateCollectionName(name)
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: validation.error
    })
  }

  // Validate query
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Search query is required and must be a non-empty string'
    })
  }

  // Validate size
  const sizeNum = parseInt(size, 10)
  if (isNaN(sizeNum) || sizeNum < 1 || sizeNum > 100) {
    return res.status(400).json({
      success: false,
      error: 'Size must be between 1 and 100'
    })
  }

  const results = await collectionService.searchCollection(name, query, sizeNum)
  
  res.json({
    success: true,
    collection: name,
    query,
    ...results
  })
}))

/**
 * GET /api/collections/:name/stats
 * Get collection statistics
 */
router.get('/:name/stats', asyncHandler(async (req, res) => {
  const { name } = req.params
  
  // Validate collection name
  const validation = validateCollectionName(name)
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: validation.error
    })
  }

  const collectionInfo = await collectionService.getCollectionInfo(name)
  
  // Extract just the stats
  const stats = {
    name: collectionInfo.name,
    documentCount: collectionInfo.documentCount,
    size: collectionInfo.size,
    sizeInBytes: collectionInfo.sizeInBytes,
    health: collectionInfo.health,
    creationDate: collectionInfo.settings.creationDate,
    numberOfShards: collectionInfo.settings.numberOfShards,
    numberOfReplicas: collectionInfo.settings.numberOfReplicas
  }
  
  res.json({
    success: true,
    stats
  })
}))

export default router
