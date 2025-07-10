const { describe, test, expect } = require('@jest/globals');

describe('Basic Utility Functions Tests', () => {
  test('should pass basic arithmetic test', () => {
    expect(1 + 1).toBe(2);
    expect(5 * 3).toBe(15);
    expect(10 / 2).toBe(5);
  });

  test('should test string manipulation', () => {
    const testString = 'Hello World';
    expect(testString.toLowerCase()).toBe('hello world');
    expect(testString.toUpperCase()).toBe('HELLO WORLD');
    expect(testString.includes('World')).toBe(true);
  });

  test('should test array operations', () => {
    const testArray = [1, 2, 3, 4, 5];
    expect(testArray.length).toBe(5);
    expect(testArray.includes(3)).toBe(true);
    expect(testArray.filter(x => x > 3)).toEqual([4, 5]);
  });

  test('should test object operations', () => {
    const testObject = { name: 'test', value: 42 };
    expect(testObject.name).toBe('test');
    expect(testObject.value).toBe(42);
    expect(Object.keys(testObject)).toEqual(['name', 'value']);
  });

  test('should test async operations', async () => {
    const asyncFunction = async () => {
      return new Promise(resolve => {
        setTimeout(() => resolve('async result'), 10);
      });
    };
    
    const result = await asyncFunction();
    expect(result).toBe('async result');
  });
});
