const { describe, test, expect } = require('@jest/globals');
const { parse: parseUrl } = require('url');
const { extname, basename } = require('path');

// Extract and test the getUrlFilename function logic from app.js
function getUrlFilename(url) {
  const parsedUrl = parseUrl(url);
  const pathname = parsedUrl.pathname;
  const extension = extname(pathname);

  if (extension) {
    return basename(pathname);
  }

  return null;
}

describe('URL Filename Extraction Tests', () => {
  test('should extract filename from URLs with extensions', () => {
    expect(getUrlFilename('https://example.com/document.pdf')).toBe('document.pdf');
    expect(getUrlFilename('https://example.com/image.jpg')).toBe('image.jpg');
    expect(getUrlFilename('https://example.com/presentation.pptx')).toBe('presentation.pptx');
    expect(getUrlFilename('https://example.com/data.txt')).toBe('data.txt');
  });

  test('should extract filename from nested paths', () => {
    expect(getUrlFilename('https://example.com/path/to/document.pdf')).toBe('document.pdf');
    expect(getUrlFilename('https://example.com/deep/nested/path/file.jpg')).toBe('file.jpg');
  });

  test('should return null for URLs without file extensions', () => {
    expect(getUrlFilename('https://example.com/page')).toBe(null);
    expect(getUrlFilename('https://example.com/')).toBe(null);
    expect(getUrlFilename('https://example.com/api/endpoint')).toBe(null);
  });

  test('should handle URLs with query parameters', () => {
    expect(getUrlFilename('https://example.com/document.pdf?version=1')).toBe('document.pdf');
    expect(getUrlFilename('https://example.com/image.jpg?size=large')).toBe('image.jpg');
  });

  test('should handle URLs with fragments', () => {
    expect(getUrlFilename('https://example.com/document.pdf#section1')).toBe('document.pdf');
    expect(getUrlFilename('https://example.com/page.html#top')).toBe('page.html');
  });
});
