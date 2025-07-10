import { describe, test, expect } from '@jest/globals'
import {
  isValidUrl,
  validateCollectionName,
  validateChunkSize,
  validateChunkOverlap,
  validateTemperature,
  validateK,
  validateMaxTokens,
  validateLimit
} from '../../src/utils/validationUtils.js'

describe('Validation Utilities Tests', () => {
  describe('isValidUrl', () => {
    test('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://example.com')).toBe(true)
      expect(isValidUrl('https://example.com/path')).toBe(true)
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true)
      expect(isValidUrl('https://subdomain.example.com')).toBe(true)
    })

    test('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('ftp://example.com')).toBe(true) // FTP is valid URL
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('http://')).toBe(false)
      expect(isValidUrl('https://')).toBe(false)
    })
  })

  describe('validateCollectionName', () => {
    test('should validate correct collection names', () => {
      expect(validateCollectionName('test')).toEqual({ isValid: true })
      expect(validateCollectionName('test_collection')).toEqual({ isValid: true })
      expect(validateCollectionName('test-collection')).toEqual({ isValid: true })
      expect(validateCollectionName('test collection')).toEqual({ isValid: true })
      expect(validateCollectionName('Test123')).toEqual({ isValid: true })
    })

    test('should reject invalid collection names', () => {
      expect(validateCollectionName('')).toEqual({ 
        isValid: false, 
        error: 'Collection name is required and must be a string' 
      })
      expect(validateCollectionName(null)).toEqual({ 
        isValid: false, 
        error: 'Collection name is required and must be a string' 
      })
      expect(validateCollectionName(123)).toEqual({ 
        isValid: false, 
        error: 'Collection name is required and must be a string' 
      })
    })

    test('should reject collection names with invalid characters', () => {
      expect(validateCollectionName('test@collection')).toEqual({ 
        isValid: false, 
        error: 'Collection name contains invalid characters' 
      })
      expect(validateCollectionName('test#collection')).toEqual({ 
        isValid: false, 
        error: 'Collection name contains invalid characters' 
      })
    })

    test('should reject collection names that are too long', () => {
      const longName = 'a'.repeat(256)
      expect(validateCollectionName(longName)).toEqual({ 
        isValid: false, 
        error: 'Collection name must be between 1 and 255 characters' 
      })
    })
  })

  describe('validateChunkSize', () => {
    test('should validate correct chunk sizes', () => {
      expect(validateChunkSize(500)).toEqual({ isValid: true })
      expect(validateChunkSize(2000)).toEqual({ isValid: true })
      expect(validateChunkSize('1000')).toEqual({ isValid: true })
      expect(validateChunkSize(undefined)).toEqual({ isValid: true })
    })

    test('should reject invalid chunk sizes', () => {
      expect(validateChunkSize(50)).toEqual({ 
        isValid: false, 
        error: 'Chunk size must be between 100 and 10000' 
      })
      expect(validateChunkSize(15000)).toEqual({ 
        isValid: false, 
        error: 'Chunk size must be between 100 and 10000' 
      })
      expect(validateChunkSize('invalid')).toEqual({ 
        isValid: false, 
        error: 'Chunk size must be between 100 and 10000' 
      })
    })
  })

  describe('validateChunkOverlap', () => {
    test('should validate correct chunk overlaps', () => {
      expect(validateChunkOverlap(100, 2000)).toEqual({ isValid: true })
      expect(validateChunkOverlap(0, 1000)).toEqual({ isValid: true })
      expect(validateChunkOverlap('250', 2000)).toEqual({ isValid: true })
      expect(validateChunkOverlap(undefined)).toEqual({ isValid: true })
    })

    test('should reject invalid chunk overlaps', () => {
      expect(validateChunkOverlap(-1, 2000)).toEqual({ 
        isValid: false, 
        error: 'Chunk overlap must be between 0 and 1999' 
      })
      expect(validateChunkOverlap(2000, 2000)).toEqual({ 
        isValid: false, 
        error: 'Chunk overlap must be between 0 and 1999' 
      })
      expect(validateChunkOverlap('invalid', 2000)).toEqual({ 
        isValid: false, 
        error: 'Chunk overlap must be between 0 and 1999' 
      })
    })
  })

  describe('validateTemperature', () => {
    test('should validate correct temperatures', () => {
      expect(validateTemperature(0)).toEqual({ isValid: true })
      expect(validateTemperature(1)).toEqual({ isValid: true })
      expect(validateTemperature(2)).toEqual({ isValid: true })
      expect(validateTemperature(0.5)).toEqual({ isValid: true })
      expect(validateTemperature('1.5')).toEqual({ isValid: true })
      expect(validateTemperature(undefined)).toEqual({ isValid: true })
    })

    test('should reject invalid temperatures', () => {
      expect(validateTemperature(-1)).toEqual({ 
        isValid: false, 
        error: 'Temperature must be between 0 and 2' 
      })
      expect(validateTemperature(3)).toEqual({ 
        isValid: false, 
        error: 'Temperature must be between 0 and 2' 
      })
      expect(validateTemperature('invalid')).toEqual({ 
        isValid: false, 
        error: 'Temperature must be between 0 and 2' 
      })
    })
  })

  describe('validateK', () => {
    test('should validate correct k values', () => {
      expect(validateK(1)).toEqual({ isValid: true })
      expect(validateK(10)).toEqual({ isValid: true })
      expect(validateK(20)).toEqual({ isValid: true })
      expect(validateK('5')).toEqual({ isValid: true })
      expect(validateK(undefined)).toEqual({ isValid: true })
    })

    test('should reject invalid k values', () => {
      expect(validateK(0)).toEqual({ 
        isValid: false, 
        error: 'K must be between 1 and 20' 
      })
      expect(validateK(21)).toEqual({ 
        isValid: false, 
        error: 'K must be between 1 and 20' 
      })
      expect(validateK('invalid')).toEqual({ 
        isValid: false, 
        error: 'K must be between 1 and 20' 
      })
    })
  })

  describe('validateMaxTokens', () => {
    test('should validate correct max tokens', () => {
      expect(validateMaxTokens(100)).toEqual({ isValid: true })
      expect(validateMaxTokens(2000)).toEqual({ isValid: true })
      expect(validateMaxTokens(4000)).toEqual({ isValid: true })
      expect(validateMaxTokens('1500')).toEqual({ isValid: true })
      expect(validateMaxTokens(undefined)).toEqual({ isValid: true })
    })

    test('should reject invalid max tokens', () => {
      expect(validateMaxTokens(0)).toEqual({ 
        isValid: false, 
        error: 'Max tokens must be between 1 and 4000' 
      })
      expect(validateMaxTokens(5000)).toEqual({ 
        isValid: false, 
        error: 'Max tokens must be between 1 and 4000' 
      })
      expect(validateMaxTokens('invalid')).toEqual({ 
        isValid: false, 
        error: 'Max tokens must be between 1 and 4000' 
      })
    })
  })

  describe('validateLimit', () => {
    test('should validate correct limits', () => {
      expect(validateLimit(1)).toEqual({ isValid: true })
      expect(validateLimit(100)).toEqual({ isValid: true })
      expect(validateLimit(1000)).toEqual({ isValid: true })
      expect(validateLimit('50')).toEqual({ isValid: true })
      expect(validateLimit(undefined)).toEqual({ isValid: true })
    })

    test('should reject invalid limits', () => {
      expect(validateLimit(0)).toEqual({ 
        isValid: false, 
        error: 'Limit must be between 1 and 1000' 
      })
      expect(validateLimit(1001)).toEqual({ 
        isValid: false, 
        error: 'Limit must be between 1 and 1000' 
      })
      expect(validateLimit('invalid')).toEqual({ 
        isValid: false, 
        error: 'Limit must be between 1 and 1000' 
      })
    })
  })
})
