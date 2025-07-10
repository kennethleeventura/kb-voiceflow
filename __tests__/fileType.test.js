const { describe, test, expect } = require('@jest/globals');

// Extract and test the getFileType function logic from app.js
function getFileType(url) {
  const sitemap = /sitemap\.xml$/i;
  const image = /\.(jpg|jpeg|png|gif)$/i;
  const pdf = /\.pdf$/i;
  const powerpoint = /\.(ppt|pptx)$/i;
  const text = /\.(txt|md)$/i;
  const html = /\.(html|htm)$/i;

  if (url.match(image)) {
    return 'UNSTRUCTURED';
  } else if (url.match(pdf)) {
    return 'PDF';
  } else if (url.match(powerpoint)) {
    return 'UNSTRUCTURED';
  } else if (url.match(text)) {
    return 'UNSTRUCTURED';
  } else if (url.match(sitemap)) {
    return 'SITEMAP';
  } else if (url.match(html)) {
    return 'HTML';
  } else {
    return 'URL';
  }
}

describe('File Type Detection Tests', () => {
  test('should detect PDF files correctly', () => {
    expect(getFileType('https://example.com/document.pdf')).toBe('PDF');
    expect(getFileType('https://example.com/document.PDF')).toBe('PDF');
    expect(getFileType('https://example.com/path/to/file.pdf')).toBe('PDF');
  });

  test('should detect image files correctly', () => {
    expect(getFileType('https://example.com/image.jpg')).toBe('UNSTRUCTURED');
    expect(getFileType('https://example.com/image.jpeg')).toBe('UNSTRUCTURED');
    expect(getFileType('https://example.com/image.png')).toBe('UNSTRUCTURED');
    expect(getFileType('https://example.com/image.gif')).toBe('UNSTRUCTURED');
    expect(getFileType('https://example.com/IMAGE.JPG')).toBe('UNSTRUCTURED');
  });

  test('should detect PowerPoint files correctly', () => {
    expect(getFileType('https://example.com/presentation.ppt')).toBe('UNSTRUCTURED');
    expect(getFileType('https://example.com/presentation.pptx')).toBe('UNSTRUCTURED');
    expect(getFileType('https://example.com/PRESENTATION.PPT')).toBe('UNSTRUCTURED');
  });

  test('should detect text files correctly', () => {
    expect(getFileType('https://example.com/document.txt')).toBe('UNSTRUCTURED');
    expect(getFileType('https://example.com/document.md')).toBe('UNSTRUCTURED');
    expect(getFileType('https://example.com/README.MD')).toBe('UNSTRUCTURED');
  });

  test('should detect sitemap files correctly', () => {
    expect(getFileType('https://example.com/sitemap.xml')).toBe('SITEMAP');
    expect(getFileType('https://example.com/SITEMAP.XML')).toBe('SITEMAP');
    expect(getFileType('https://example.com/path/sitemap.xml')).toBe('SITEMAP');
  });

  test('should detect HTML files correctly', () => {
    expect(getFileType('https://example.com/page.html')).toBe('HTML');
    expect(getFileType('https://example.com/page.htm')).toBe('HTML');
    expect(getFileType('https://example.com/INDEX.HTML')).toBe('HTML');
  });

  test('should default to URL for unknown types', () => {
    expect(getFileType('https://example.com/page')).toBe('URL');
    expect(getFileType('https://example.com/unknown.xyz')).toBe('URL');
    expect(getFileType('https://example.com')).toBe('URL');
    expect(getFileType('https://example.com/api/endpoint')).toBe('URL');
  });
});
