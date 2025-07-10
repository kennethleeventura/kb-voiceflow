import {
  isValidUrl,
  validateCollectionName,
  validateChunkSize,
  validateChunkOverlap,
  validateTemperature,
  validateK,
  validateMaxTokens,
  validateLimit
} from '../utils/validationUtils.js'

/**
 * Middleware to validate /api/add endpoint requests
 */
export function validateAddRequest(req, res, next) {
  const { url, collection, chunkSize, chunkOverlap, limit } = req.body

  // Validate required URL
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: 'URL is required' 
    })
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid URL format' 
    })
  }

  // Validate collection name if provided
  if (collection) {
    const collectionValidation = validateCollectionName(collection)
    if (!collectionValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: collectionValidation.error 
      })
    }
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

  // Validate limit
  const limitValidation = validateLimit(limit)
  if (!limitValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: limitValidation.error 
    })
  }

  next()
}

/**
 * Middleware to validate /api/question endpoint requests
 */
export function validateQuestionRequest(req, res, next) {
  const { question, collection, temperature, k, max_tokens } = req.body

  // Validate required question
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Question is required and must be a non-empty string' 
    })
  }

  if (question.length > 1000) {
    return res.status(400).json({ 
      success: false, 
      error: 'Question must be less than 1000 characters' 
    })
  }

  // Validate collection name if provided
  if (collection) {
    const collectionValidation = validateCollectionName(collection)
    if (!collectionValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: collectionValidation.error 
      })
    }
  }

  // Validate temperature
  const temperatureValidation = validateTemperature(temperature)
  if (!temperatureValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: temperatureValidation.error 
    })
  }

  // Validate k
  const kValidation = validateK(k)
  if (!kValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: kValidation.error 
    })
  }

  // Validate max_tokens
  const maxTokensValidation = validateMaxTokens(max_tokens)
  if (!maxTokensValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: maxTokensValidation.error 
    })
  }

  next()
}

/**
 * Middleware to validate /api/live endpoint requests
 */
export function validateLiveRequest(req, res, next) {
  const { url, question, temperature } = req.body

  // Validate required URL
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: 'URL is required' 
    })
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid URL format' 
    })
  }

  // Validate required question
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Question is required and must be a non-empty string' 
    })
  }

  if (question.length > 1000) {
    return res.status(400).json({ 
      success: false, 
      error: 'Question must be less than 1000 characters' 
    })
  }

  // Validate temperature
  const temperatureValidation = validateTemperature(temperature)
  if (!temperatureValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: temperatureValidation.error 
    })
  }

  next()
}

/**
 * Middleware to validate /api/collection DELETE requests
 */
export function validateDeleteCollectionRequest(req, res, next) {
  const { collection } = req.body

  // Validate required collection
  if (!collection) {
    return res.status(400).json({ 
      success: false, 
      error: 'Collection name is required' 
    })
  }

  const collectionValidation = validateCollectionName(collection)
  if (!collectionValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: collectionValidation.error 
    })
  }

  next()
}
