import axios from 'axios'
import * as fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { join } from 'path'

/**
 * Download a file from URL and save it to the specified directory
 * @param {string} url - The URL to download from
 * @param {string} filename - The filename to save as
 * @param {string} downloadDir - The directory to save the file in
 * @returns {Promise<string>} - The path to the downloaded file
 */
export async function fetchAndSaveFile(url, filename, downloadDir) {
  /* Ensure the directory exists */
  try {
    await fs.access(downloadDir)
  } catch {
    await fs.mkdir(downloadDir, { recursive: true })
  }

  const outputPath = join(downloadDir, filename)

  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 30000, // 30 second timeout
    headers: {
      'User-Agent': 'KB-Voiceflow/2.0.0'
    }
  })

  const writer = createWriteStream(outputPath)
  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(outputPath))
    writer.on('error', (err) => reject(err))
  })
}

/**
 * Function to wait for a certain amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export const sleepWait = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if a URL is accessible
 * @param {string} url - The URL to check
 * @returns {Promise<boolean>} - Whether the URL is accessible
 */
export async function isUrlAccessible(url) {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'KB-Voiceflow/2.0.0'
      }
    })
    return response.status >= 200 && response.status < 400
  } catch (error) {
    return false
  }
}

/**
 * Get file size from URL without downloading
 * @param {string} url - The URL to check
 * @returns {Promise<number|null>} - File size in bytes or null if unavailable
 */
export async function getFileSize(url) {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'KB-Voiceflow/2.0.0'
      }
    })
    const contentLength = response.headers['content-length']
    return contentLength ? parseInt(contentLength, 10) : null
  } catch (error) {
    return null
  }
}
