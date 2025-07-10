import { parse as parseUrl } from 'url'
import { extname, basename } from 'path'

/**
 * Get the file type from the URL based on extension
 * @param {string} url - The URL to analyze
 * @returns {string} - The file type (PDF, UNSTRUCTURED, SITEMAP, HTML, URL)
 */
export function getFileType(url) {
  const sitemap = /sitemap\.xml$/i
  const image = /\.(jpg|jpeg|png|gif)$/i
  const pdf = /\.pdf$/i
  const powerpoint = /\.(ppt|pptx)$/i
  const text = /\.(txt|md)$/i
  const html = /\.(html|htm)$/i

  if (url.match(image)) {
    return 'UNSTRUCTURED'
  } else if (url.match(pdf)) {
    return 'PDF'
  } else if (url.match(powerpoint)) {
    return 'UNSTRUCTURED'
  } else if (url.match(text)) {
    return 'UNSTRUCTURED'
  } else if (url.match(sitemap)) {
    return 'SITEMAP'
  } else if (url.match(html)) {
    return 'HTML'
  } else {
    return 'URL'
  }
}

/**
 * Extract the filename from the URL if it exists
 * @param {string} url - The URL to extract filename from
 * @returns {string|null} - The filename or null if no extension found
 */
export function getUrlFilename(url) {
  const parsedUrl = parseUrl(url)
  const pathname = parsedUrl.pathname
  const extension = extname(pathname)

  if (extension) {
    return basename(pathname)
  }

  return null
}

/**
 * Clean file path by removing non-alphanumeric characters except hyphens
 * @param {string} filePath - The file path to clean
 * @returns {string} - The cleaned file path
 */
export function cleanFilePath(filePath) {
  // Define a regular expression that matches all non-alphanumeric characters and hyphens
  const regex = /[^a-zA-Z0-9\-]/g
  // Replace all non-matching characters with an empty string
  const cleanedFilePath = filePath.replace(regex, '')
  return cleanedFilePath
}
