import { describe, test, expect } from '@jest/globals'
import { getFileType, getUrlFilename, cleanFilePath } from '../../src/utils/fileUtils.js'

describe('File Utilities Tests', () => {
  describe('getFileType', () => {
    test('should detect PDF files correctly', () => {
      expect(getFileType('https://example.com/document.pdf')).toBe('PDF')
      expect(getFileType('https://example.com/document.PDF')).toBe('PDF')
      expect(getFileType('https://example.com/path/to/file.pdf')).toBe('PDF')
    })

    test('should detect image files correctly', () => {
      expect(getFileType('https://example.com/image.jpg')).toBe('UNSTRUCTURED')
      expect(getFileType('https://example.com/image.jpeg')).toBe('UNSTRUCTURED')
      expect(getFileType('https://example.com/image.png')).toBe('UNSTRUCTURED')
      expect(getFileType('https://example.com/image.gif')).toBe('UNSTRUCTURED')
      expect(getFileType('https://example.com/IMAGE.JPG')).toBe('UNSTRUCTURED')
    })

    test('should detect PowerPoint files correctly', () => {
      expect(getFileType('https://example.com/presentation.ppt')).toBe('UNSTRUCTURED')
      expect(getFileType('https://example.com/presentation.pptx')).toBe('UNSTRUCTURED')
      expect(getFileType('https://example.com/PRESENTATION.PPT')).toBe('UNSTRUCTURED')
    })

    test('should detect text files correctly', () => {
      expect(getFileType('https://example.com/document.txt')).toBe('UNSTRUCTURED')
      expect(getFileType('https://example.com/document.md')).toBe('UNSTRUCTURED')
      expect(getFileType('https://example.com/README.MD')).toBe('UNSTRUCTURED')
    })

    test('should detect sitemap files correctly', () => {
      expect(getFileType('https://example.com/sitemap.xml')).toBe('SITEMAP')
      expect(getFileType('https://example.com/SITEMAP.XML')).toBe('SITEMAP')
      expect(getFileType('https://example.com/path/sitemap.xml')).toBe('SITEMAP')
    })

    test('should detect HTML files correctly', () => {
      expect(getFileType('https://example.com/page.html')).toBe('HTML')
      expect(getFileType('https://example.com/page.htm')).toBe('HTML')
      expect(getFileType('https://example.com/INDEX.HTML')).toBe('HTML')
    })

    test('should default to URL for unknown types', () => {
      expect(getFileType('https://example.com/page')).toBe('URL')
      expect(getFileType('https://example.com/unknown.xyz')).toBe('URL')
      expect(getFileType('https://example.com')).toBe('URL')
      expect(getFileType('https://example.com/api/endpoint')).toBe('URL')
    })
  })

  describe('getUrlFilename', () => {
    test('should extract filename from URLs with extensions', () => {
      expect(getUrlFilename('https://example.com/document.pdf')).toBe('document.pdf')
      expect(getUrlFilename('https://example.com/image.jpg')).toBe('image.jpg')
      expect(getUrlFilename('https://example.com/presentation.pptx')).toBe('presentation.pptx')
      expect(getUrlFilename('https://example.com/data.txt')).toBe('data.txt')
    })

    test('should extract filename from nested paths', () => {
      expect(getUrlFilename('https://example.com/path/to/document.pdf')).toBe('document.pdf')
      expect(getUrlFilename('https://example.com/deep/nested/path/file.jpg')).toBe('file.jpg')
    })

    test('should return null for URLs without file extensions', () => {
      expect(getUrlFilename('https://example.com/page')).toBe(null)
      expect(getUrlFilename('https://example.com/')).toBe(null)
      expect(getUrlFilename('https://example.com/api/endpoint')).toBe(null)
    })

    test('should handle URLs with query parameters', () => {
      expect(getUrlFilename('https://example.com/document.pdf?version=1')).toBe('document.pdf')
      expect(getUrlFilename('https://example.com/image.jpg?size=large')).toBe('image.jpg')
    })

    test('should handle URLs with fragments', () => {
      expect(getUrlFilename('https://example.com/document.pdf#section1')).toBe('document.pdf')
      expect(getUrlFilename('https://example.com/page.html#top')).toBe('page.html')
    })
  })

  describe('cleanFilePath', () => {
    test('should remove special characters', () => {
      expect(cleanFilePath('test@file!.txt')).toBe('testfiletxt')
      expect(cleanFilePath('file#name$.pdf')).toBe('filenamepdf')
      expect(cleanFilePath('my%file^name.doc')).toBe('myfilenamedoc')
    })

    test('should preserve alphanumeric characters and hyphens', () => {
      expect(cleanFilePath('test-file-123.txt')).toBe('test-file-123txt')
      expect(cleanFilePath('MyFile123.pdf')).toBe('MyFile123pdf')
      expect(cleanFilePath('file-name-v2.doc')).toBe('file-name-v2doc')
    })

    test('should handle empty and edge cases', () => {
      expect(cleanFilePath('')).toBe('')
      expect(cleanFilePath('123')).toBe('123')
      expect(cleanFilePath('abc')).toBe('abc')
      expect(cleanFilePath('---')).toBe('---')
    })

    test('should remove spaces and special characters', () => {
      expect(cleanFilePath('my file name.txt')).toBe('myfilenametxt')
      expect(cleanFilePath('file (copy).pdf')).toBe('filecopypdf')
      expect(cleanFilePath('test_file.doc')).toBe('testfiledoc')
    })
  })
})
