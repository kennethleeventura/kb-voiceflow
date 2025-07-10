/**
 * Clean the text by removing newlines at the beginning of the string
 * @param {string} text - The text to clean
 * @returns {string} - The cleaned text
 */
export function cleanText(text) {
  const regex = /^[\n]+/
  const cleanedText = text.replace(regex, '')
  return cleanedText
}

/**
 * Sanitize the collection name for OpenSearch
 * @param {string} collection - The collection name to sanitize
 * @returns {Promise<string>} - The sanitized collection name
 */
export async function sanitize(collection) {
  /* OpenSearch naming requirements:
   * - Only lowercase letters, numbers, hyphens, and underscores
   * - Cannot start with hyphen or underscore
   * - Replace spaces with hyphens
   */
  const sanitized = collection
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/ /g, '-')
    .toLowerCase()
  
  return sanitized
}

/**
 * Generate a unique hash for content identification
 * @param {string} content - The content to hash
 * @returns {string} - The generated hash
 */
export function generateContentHash(content) {
  // Simple hash function for content identification
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Truncate text to a specified length with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length of the text
 * @returns {string} - The truncated text
 */
export function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Remove HTML tags from text
 * @param {string} html - The HTML string to clean
 * @returns {string} - The cleaned text
 */
export function stripHtmlTags(html) {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Normalize whitespace in text
 * @param {string} text - The text to normalize
 * @returns {string} - The normalized text
 */
export function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}
