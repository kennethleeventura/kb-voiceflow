import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { IntentDetectionService } from '../../src/services/intentDetectionService.js'

// Mock LangChain components
jest.mock('langchain/chat_models/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    call: jest.fn()
  }))
}))

jest.mock('langchain/prompts', () => ({
  PromptTemplate: jest.fn().mockImplementation(() => ({}))
}))

jest.mock('langchain/chains', () => ({
  LLMChain: jest.fn().mockImplementation(() => ({
    call: jest.fn()
  }))
}))

describe('IntentDetectionService', () => {
  let intentService

  beforeEach(() => {
    intentService = new IntentDetectionService()
    jest.clearAllMocks()
  })

  describe('categorizeProduct', () => {
    test('should categorize transportation products correctly', () => {
      expect(intentService.categorizeProduct('electric bike')).toBe('transportation')
      expect(intentService.categorizeProduct('eBike')).toBe('transportation')
      expect(intentService.categorizeProduct('electric scooter')).toBe('transportation')
      expect(intentService.categorizeProduct('motorcycle')).toBe('transportation')
    })

    test('should categorize electronics products correctly', () => {
      expect(intentService.categorizeProduct('smartphone')).toBe('electronics')
      expect(intentService.categorizeProduct('laptop computer')).toBe('electronics')
      expect(intentService.categorizeProduct('wireless headphones')).toBe('electronics')
      expect(intentService.categorizeProduct('gaming tablet')).toBe('electronics')
    })

    test('should categorize fitness products correctly', () => {
      expect(intentService.categorizeProduct('treadmill')).toBe('fitness')
      expect(intentService.categorizeProduct('exercise bike')).toBe('fitness')
      expect(intentService.categorizeProduct('fitness tracker')).toBe('fitness')
      expect(intentService.categorizeProduct('yoga mat')).toBe('fitness')
    })

    test('should return general for unknown products', () => {
      expect(intentService.categorizeProduct('unknown product')).toBe('general')
      expect(intentService.categorizeProduct('xyz123')).toBe('general')
      expect(intentService.categorizeProduct('')).toBe('general')
    })
  })

  describe('determineSearchType', () => {
    test('should detect best products search type', () => {
      expect(intentService.determineSearchType('best eBikes')).toBe('best_products')
      expect(intentService.determineSearchType('top rated smartphones')).toBe('best_products')
      expect(intentService.determineSearchType('highest rated laptops')).toBe('best_products')
    })

    test('should detect comparison search type', () => {
      expect(intentService.determineSearchType('iPhone vs Samsung')).toBe('comparison')
      expect(intentService.determineSearchType('compare laptops')).toBe('comparison')
      expect(intentService.determineSearchType('MacBook versus ThinkPad')).toBe('comparison')
    })

    test('should detect reviews search type', () => {
      expect(intentService.determineSearchType('iPhone 15 reviews')).toBe('reviews')
      expect(intentService.determineSearchType('review of Tesla Model 3')).toBe('reviews')
    })

    test('should detect recommendations search type', () => {
      expect(intentService.determineSearchType('recommend a good laptop')).toBe('recommendations')
      expect(intentService.determineSearchType('suggestion for eBike')).toBe('recommendations')
    })

    test('should default to general search', () => {
      expect(intentService.determineSearchType('eBike information')).toBe('general_search')
      expect(intentService.determineSearchType('tell me about smartphones')).toBe('general_search')
    })
  })

  describe('extractKeywords', () => {
    test('should extract meaningful keywords', () => {
      const keywords = intentService.extractKeywords('best electric bikes under 2000')
      expect(keywords).toContain('electric')
      expect(keywords).toContain('bikes')
      expect(keywords).toContain('under')
      expect(keywords).toContain('2000')
      expect(keywords).not.toContain('best') // Stop word
    })

    test('should filter out stop words', () => {
      const keywords = intentService.extractKeywords('the best and top rated bikes')
      expect(keywords).not.toContain('the')
      expect(keywords).not.toContain('and')
      expect(keywords).not.toContain('best')
      expect(keywords).not.toContain('top')
      expect(keywords).not.toContain('rated')
      expect(keywords).toContain('bikes')
    })

    test('should filter out short words', () => {
      const keywords = intentService.extractKeywords('a good bike is nice')
      expect(keywords).not.toContain('a')
      expect(keywords).not.toContain('is')
      expect(keywords).toContain('good')
      expect(keywords).toContain('bike')
      expect(keywords).toContain('nice')
    })

    test('should handle empty input', () => {
      const keywords = intentService.extractKeywords('')
      expect(keywords).toEqual([])
    })
  })

  describe('getRelevantReviewSites', () => {
    test('should return transportation sites for transportation category', () => {
      const sites = intentService.getRelevantReviewSites('transportation')
      expect(sites).toContain('electricbikereview.com')
      expect(sites).toContain('bikeradar.com')
      expect(sites).toContain('amazon.com')
      expect(sites).toContain('google_reviews')
    })

    test('should return electronics sites for electronics category', () => {
      const sites = intentService.getRelevantReviewSites('electronics')
      expect(sites).toContain('gsmarena.com')
      expect(sites).toContain('techradar.com')
      expect(sites).toContain('cnet.com')
      expect(sites).toContain('amazon.com')
    })

    test('should return general sites for unknown category', () => {
      const sites = intentService.getRelevantReviewSites('unknown')
      expect(sites).toContain('amazon.com')
      expect(sites).toContain('google_reviews')
      expect(sites).toContain('walmart.com')
    })

    test('should return general sites for general category', () => {
      const sites = intentService.getRelevantReviewSites('general')
      expect(sites).toContain('amazon.com')
      expect(sites).toContain('google_reviews')
      expect(sites).toContain('yelp.com')
      expect(sites).toContain('trustpilot.com')
    })
  })

  describe('extractProductFallback', () => {
    test('should extract product words excluding common terms', () => {
      const product = intentService.extractProductFallback('best electric bikes reviews')
      expect(product).toBe('electric bikes')
    })

    test('should handle input with only stop words', () => {
      const product = intentService.extractProductFallback('best top rated good')
      expect(product).toBe('product') // Falls back to 'product' when no valid words found
    })

    test('should return product for empty input', () => {
      const product = intentService.extractProductFallback('')
      expect(product).toBe('product')
    })
  })

  describe('analyzeIntent', () => {
    test('should handle AI parsing failure gracefully', async () => {
      // Mock the LLM chain to return invalid JSON
      const mockChain = {
        call: jest.fn().mockResolvedValue({
          text: 'invalid json response'
        })
      }
      
      // Mock the LLMChain constructor
      const { LLMChain } = require('langchain/chains')
      LLMChain.mockImplementation(() => mockChain)

      const result = await intentService.analyzeIntent('best eBikes')
      
      expect(result.originalInput).toBe('best eBikes')
      expect(result.category).toBe('transportation')
      expect(result.searchType).toBe('best_products')
      expect(result.extractedKeywords).toContain('ebikes')
      expect(result.reviewSites).toContain('electricbikereview.com')
    })

    test('should return structured intent data', async () => {
      // Mock successful AI response
      const mockChain = {
        call: jest.fn().mockResolvedValue({
          text: '{"product": "electric bikes", "intent": "find_best", "confidence": 0.9}'
        })
      }
      
      const { LLMChain } = require('langchain/chains')
      LLMChain.mockImplementation(() => mockChain)

      const result = await intentService.analyzeIntent('top rated eBikes')
      
      expect(result.originalInput).toBe('top rated eBikes')
      expect(result.product).toBe('electric bikes')
      expect(result.category).toBe('transportation')
      expect(result.searchType).toBe('best_products')
      expect(result.intent).toBe('find_best')
      expect(result.confidence).toBe(0.9)
      expect(Array.isArray(result.extractedKeywords)).toBe(true)
      expect(Array.isArray(result.reviewSites)).toBe(true)
    })
  })
})
