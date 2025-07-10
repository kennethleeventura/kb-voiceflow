const { describe, test, expect } = require('@jest/globals');

// Extract and test the sanitize function logic from app.js
async function sanitize(collection) {
  const sanitized = collection
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/ /g, '-');
  return sanitized;
}

describe('Collection Name Sanitization Tests', () => {
  test('should sanitize collection names for OpenSearch', async () => {
    expect(await sanitize('test collection')).toBe('test-collection');
    expect(await sanitize('test_collection')).toBe('test_collection');
    expect(await sanitize('test-collection')).toBe('test-collection');
    expect(await sanitize('my test collection')).toBe('my-test-collection');
  });

  test('should remove special characters', async () => {
    expect(await sanitize('test@collection!')).toBe('testcollection');
    expect(await sanitize('test#collection$')).toBe('testcollection');
    expect(await sanitize('test%collection^')).toBe('testcollection');
    expect(await sanitize('test&collection*')).toBe('testcollection');
  });

  test('should handle mixed cases and preserve valid characters', async () => {
    expect(await sanitize('Test Collection Name')).toBe('Test-Collection-Name');
    expect(await sanitize('TEST_COLLECTION_NAME')).toBe('TEST_COLLECTION_NAME');
    expect(await sanitize('test-collection-name')).toBe('test-collection-name');
    expect(await sanitize('Test_Collection-Name')).toBe('Test_Collection-Name');
  });

  test('should handle empty and edge cases', async () => {
    expect(await sanitize('')).toBe('');
    expect(await sanitize('   ')).toBe('---');
    expect(await sanitize('123')).toBe('123');
    expect(await sanitize('abc123')).toBe('abc123');
  });

  test('should handle complex mixed input', async () => {
    expect(await sanitize('My@Collection#2024!')).toBe('MyCollection2024');
    expect(await sanitize('user_data collection (v2)')).toBe('user_data-collection-v2');
    expect(await sanitize('test/collection\\name')).toBe('testcollectionname');
  });
});
