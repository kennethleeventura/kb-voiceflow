import { describe, test, expect } from '@jest/globals'
import { 
  cleanText, 
  sanitize, 
  generateContentHash, 
  truncateText, 
  stripHtmlTags, 
  normalizeWhitespace 
} from '../../src/utils/textUtils.js'

describe('Text Utilities Tests', () => {
  describe('cleanText', () => {
    test('should remove leading newlines', () => {
      expect(cleanText('\nHello World')).toBe('Hello World')
      expect(cleanText('\n\nHello World')).toBe('Hello World')
      expect(cleanText('\n\n\nHello World')).toBe('Hello World')
    })

    test('should preserve text without leading newlines', () => {
      expect(cleanText('Hello World')).toBe('Hello World')
      expect(cleanText('Hello\nWorld')).toBe('Hello\nWorld')
      expect(cleanText('Hello World\n')).toBe('Hello World\n')
    })

    test('should handle empty and whitespace strings', () => {
      expect(cleanText('')).toBe('')
      expect(cleanText('\n')).toBe('')
      expect(cleanText('\n\n')).toBe('')
      expect(cleanText('   ')).toBe('   ')
    })

    test('should handle mixed whitespace', () => {
      expect(cleanText('\n  Hello World')).toBe('  Hello World')
      expect(cleanText('\n\t\nHello World')).toBe('\t\nHello World')
    })
  })

  describe('sanitize', () => {
    test('should sanitize collection names for OpenSearch', async () => {
      expect(await sanitize('Test Collection')).toBe('test-collection')
      expect(await sanitize('test_collection')).toBe('test_collection')
      expect(await sanitize('test-collection')).toBe('test-collection')
      expect(await sanitize('My Test Collection')).toBe('my-test-collection')
    })

    test('should remove special characters and convert to lowercase', async () => {
      expect(await sanitize('Test@Collection!')).toBe('testcollection')
      expect(await sanitize('Test#Collection$')).toBe('testcollection')
      expect(await sanitize('Test%Collection^')).toBe('testcollection')
      expect(await sanitize('Test&Collection*')).toBe('testcollection')
    })

    test('should handle mixed cases and preserve valid characters', async () => {
      expect(await sanitize('Test Collection Name')).toBe('test-collection-name')
      expect(await sanitize('TEST_COLLECTION_NAME')).toBe('test_collection_name')
      expect(await sanitize('test-collection-name')).toBe('test-collection-name')
      expect(await sanitize('Test_Collection-Name')).toBe('test_collection-name')
    })

    test('should handle empty and edge cases', async () => {
      expect(await sanitize('')).toBe('')
      expect(await sanitize('   ')).toBe('---')
      expect(await sanitize('123')).toBe('123')
      expect(await sanitize('abc123')).toBe('abc123')
    })
  })

  describe('generateContentHash', () => {
    test('should generate consistent hashes for same content', () => {
      const content = 'Hello World'
      const hash1 = generateContentHash(content)
      const hash2 = generateContentHash(content)
      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[0-9a-f]+$/) // Hexadecimal hash
    })

    test('should generate different hashes for different content', () => {
      const hash1 = generateContentHash('Hello World')
      const hash2 = generateContentHash('Hello Universe')
      expect(hash1).not.toBe(hash2)
    })

    test('should handle empty content', () => {
      const hash = generateContentHash('')
      expect(hash).toMatch(/^[0-9a-f]+$/) // Should be a valid hex string
    })
  })

  describe('truncateText', () => {
    test('should truncate long text with ellipsis', () => {
      const longText = 'This is a very long text that should be truncated'
      expect(truncateText(longText, 20)).toBe('This is a very lo...')
      expect(truncateText(longText, 10)).toBe('This is...')
    })

    test('should not truncate short text', () => {
      const shortText = 'Short text'
      expect(truncateText(shortText, 20)).toBe('Short text')
      expect(truncateText(shortText, 100)).toBe('Short text')
    })

    test('should use default max length', () => {
      const longText = 'A'.repeat(150)
      const result = truncateText(longText)
      expect(result).toHaveLength(100) // 97 chars + '...'
      expect(result.endsWith('...')).toBe(true)
    })

    test('should handle edge cases', () => {
      expect(truncateText('', 10)).toBe('')
      expect(truncateText('abc', 3)).toBe('abc')
      expect(truncateText('abcd', 3)).toBe('...')
    })
  })

  describe('stripHtmlTags', () => {
    test('should remove HTML tags', () => {
      expect(stripHtmlTags('<p>Hello World</p>')).toBe('Hello World')
      expect(stripHtmlTags('<div><span>Test</span></div>')).toBe('Test')
      expect(stripHtmlTags('<h1>Title</h1><p>Content</p>')).toBe('TitleContent')
    })

    test('should handle self-closing tags', () => {
      expect(stripHtmlTags('Line 1<br/>Line 2')).toBe('Line 1Line 2')
      expect(stripHtmlTags('Image: <img src="test.jpg"/>')).toBe('Image: ')
    })

    test('should handle text without HTML', () => {
      expect(stripHtmlTags('Plain text')).toBe('Plain text')
      expect(stripHtmlTags('')).toBe('')
    })

    test('should handle malformed HTML', () => {
      expect(stripHtmlTags('<p>Unclosed tag')).toBe('Unclosed tag')
      expect(stripHtmlTags('Text with < and > symbols')).toBe('Text with  symbols') // < and > are treated as empty tag
    })
  })

  describe('normalizeWhitespace', () => {
    test('should normalize multiple spaces', () => {
      expect(normalizeWhitespace('Hello    World')).toBe('Hello World')
      expect(normalizeWhitespace('Multiple   spaces   here')).toBe('Multiple spaces here')
    })

    test('should normalize different whitespace characters', () => {
      expect(normalizeWhitespace('Hello\t\tWorld')).toBe('Hello World')
      expect(normalizeWhitespace('Hello\n\nWorld')).toBe('Hello World')
      expect(normalizeWhitespace('Hello\r\nWorld')).toBe('Hello World')
    })

    test('should trim leading and trailing whitespace', () => {
      expect(normalizeWhitespace('  Hello World  ')).toBe('Hello World')
      expect(normalizeWhitespace('\t\nHello World\n\t')).toBe('Hello World')
    })

    test('should handle empty and whitespace-only strings', () => {
      expect(normalizeWhitespace('')).toBe('')
      expect(normalizeWhitespace('   ')).toBe('')
      expect(normalizeWhitespace('\t\n\r')).toBe('')
    })
  })
})
