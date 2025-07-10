const { describe, test, expect } = require('@jest/globals');

// Extract and test the cleanText function logic from app.js
function cleanText(text) {
  const regex = /^[\n]+/;
  const cleanedText = text.replace(regex, '');
  return cleanedText;
}

describe('Text Cleaning Tests', () => {
  test('should remove leading newlines', () => {
    expect(cleanText('\nHello World')).toBe('Hello World');
    expect(cleanText('\n\nHello World')).toBe('Hello World');
    expect(cleanText('\n\n\nHello World')).toBe('Hello World');
  });

  test('should preserve text without leading newlines', () => {
    expect(cleanText('Hello World')).toBe('Hello World');
    expect(cleanText('Hello\nWorld')).toBe('Hello\nWorld');
    expect(cleanText('Hello World\n')).toBe('Hello World\n');
  });

  test('should handle empty and whitespace strings', () => {
    expect(cleanText('')).toBe('');
    expect(cleanText('\n')).toBe('');
    expect(cleanText('\n\n')).toBe('');
    expect(cleanText('   ')).toBe('   ');
  });

  test('should handle mixed whitespace', () => {
    expect(cleanText('\n  Hello World')).toBe('  Hello World');
    expect(cleanText('\n\t\nHello World')).toBe('\t\nHello World');
  });
});
