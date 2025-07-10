/**
 * Validation utilities for API requests
 */

/**
 * Validate URL format
 * @param {string} url - The URL to validate
 * @returns {boolean} - Whether the URL is valid
 */
export function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Validate collection name
 * @param {string} collection - The collection name to validate
 * @returns {object} - Validation result with isValid and error message
 */
export function validateCollectionName(collection) {
  if (!collection || typeof collection !== 'string') {
    return { isValid: false, error: 'Collection name is required and must be a string' }
  }

  if (collection.length < 1 || collection.length > 255) {
    return { isValid: false, error: 'Collection name must be between 1 and 255 characters' }
  }

  // Check for valid characters (will be sanitized later)
  const hasValidChars = /^[a-zA-Z0-9_\- ]+$/.test(collection)
  if (!hasValidChars) {
    return { isValid: false, error: 'Collection name contains invalid characters' }
  }

  return { isValid: true }
}

/**
 * Validate chunk size parameter
 * @param {number} chunkSize - The chunk size to validate
 * @returns {object} - Validation result
 */
export function validateChunkSize(chunkSize) {
  if (chunkSize !== undefined) {
    const size = parseInt(chunkSize, 10)
    if (isNaN(size) || size < 100 || size > 10000) {
      return { isValid: false, error: 'Chunk size must be between 100 and 10000' }
    }
  }
  return { isValid: true }
}

/**
 * Validate chunk overlap parameter
 * @param {number} chunkOverlap - The chunk overlap to validate
 * @param {number} chunkSize - The chunk size for comparison
 * @returns {object} - Validation result
 */
export function validateChunkOverlap(chunkOverlap, chunkSize = 2000) {
  if (chunkOverlap !== undefined) {
    const overlap = parseInt(chunkOverlap, 10)
    if (isNaN(overlap) || overlap < 0 || overlap >= chunkSize) {
      return { isValid: false, error: `Chunk overlap must be between 0 and ${chunkSize - 1}` }
    }
  }
  return { isValid: true }
}

/**
 * Validate temperature parameter for AI models
 * @param {number} temperature - The temperature to validate
 * @returns {object} - Validation result
 */
export function validateTemperature(temperature) {
  if (temperature !== undefined) {
    const temp = parseFloat(temperature)
    if (isNaN(temp) || temp < 0 || temp > 2) {
      return { isValid: false, error: 'Temperature must be between 0 and 2' }
    }
  }
  return { isValid: true }
}

/**
 * Validate k parameter (number of results)
 * @param {number} k - The k value to validate
 * @returns {object} - Validation result
 */
export function validateK(k) {
  if (k !== undefined) {
    const kValue = parseInt(k, 10)
    if (isNaN(kValue) || kValue < 1 || kValue > 20) {
      return { isValid: false, error: 'K must be between 1 and 20' }
    }
  }
  return { isValid: true }
}

/**
 * Validate max tokens parameter
 * @param {number} maxTokens - The max tokens to validate
 * @returns {object} - Validation result
 */
export function validateMaxTokens(maxTokens) {
  if (maxTokens !== undefined) {
    const tokens = parseInt(maxTokens, 10)
    if (isNaN(tokens) || tokens < 1 || tokens > 4000) {
      return { isValid: false, error: 'Max tokens must be between 1 and 4000' }
    }
  }
  return { isValid: true }
}

/**
 * Validate limit parameter
 * @param {number} limit - The limit to validate
 * @returns {object} - Validation result
 */
export function validateLimit(limit) {
  if (limit !== undefined) {
    const limitValue = parseInt(limit, 10)
    if (isNaN(limitValue) || limitValue < 1 || limitValue > 1000) {
      return { isValid: false, error: 'Limit must be between 1 and 1000' }
    }
  }
  return { isValid: true }
}
