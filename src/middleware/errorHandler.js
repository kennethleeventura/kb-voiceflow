/**
 * Global error handling middleware
 */

/**
 * Error handler middleware for Express
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function errorHandler(err, req, res, next) {
  // Log the error for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  })

  // Default error response
  let statusCode = 500
  let message = 'Internal server error'
  let details = null

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation error'
    details = err.message
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401
    message = 'Unauthorized'
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403
    message = 'Forbidden'
  } else if (err.name === 'NotFoundError') {
    statusCode = 404
    message = 'Resource not found'
  } else if (err.name === 'TimeoutError') {
    statusCode = 408
    message = 'Request timeout'
  } else if (err.name === 'TooManyRequestsError') {
    statusCode = 429
    message = 'Too many requests'
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503
    message = 'Service unavailable - external service connection failed'
  } else if (err.code === 'ENOTFOUND') {
    statusCode = 400
    message = 'Invalid URL or domain not found'
  } else if (err.response && err.response.status) {
    // Handle HTTP errors from external APIs
    statusCode = err.response.status
    message = err.response.statusText || 'External API error'
    details = err.response.data
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error'
    details = null
  } else if (statusCode === 500) {
    details = err.message
  }

  // Send error response
  const errorResponse = {
    success: false,
    error: message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`
  })
}

/**
 * Async error wrapper to catch async errors in route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class TimeoutError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class TooManyRequestsError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TooManyRequestsError'
  }
}
