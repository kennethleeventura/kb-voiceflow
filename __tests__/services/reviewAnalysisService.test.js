import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { ReviewAnalysisService } from '../../src/services/reviewAnalysisService.js'

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

describe('ReviewAnalysisService', () => {
  let analysisService
  let mockReviewData

  beforeEach(() => {
    analysisService = new ReviewAnalysisService()
    
    mockReviewData = {
      product: 'Electric Bike XYZ',
      category: 'transportation',
      totalReviews: 25,
      sources: [
        { site: 'amazon.com', reviewCount: 15, avgRating: 4.2 },
        { site: 'google_reviews', reviewCount: 10, avgRating: 4.5 }
      ],
      reviews: [
        {
          source: 'amazon.com',
          content: 'Great electric bike with excellent battery life. Very satisfied with the purchase.',
          rating: 5,
          author: 'John D.',
          date: '2024-01-15'
        },
        {
          source: 'amazon.com',
          content: 'Good bike but the price is a bit high. Assembly was straightforward.',
          rating: 4,
          author: 'Sarah M.',
          date: '2024-01-10'
        },
        {
          source: 'google_reviews',
          content: 'Terrible experience. Bike broke after one week. Poor customer service.',
          rating: 1,
          author: 'Mike R.',
          date: '2024-01-05'
        },
        {
          source: 'google_reviews',
          content: 'Amazing bike! Fast delivery and great performance. Highly recommend.',
          rating: 5,
          author: 'Lisa K.',
          date: '2024-01-20'
        },
        {
          source: 'amazon.com',
          content: 'Average bike. Nothing special but does the job. Could be better for the price.',
          rating: 3,
          author: 'Tom B.',
          date: '2024-01-12'
        }
      ],
      scrapedAt: '2024-01-25T10:00:00Z'
    }

    jest.clearAllMocks()
  })

  describe('calculateOverallRating', () => {
    test('should calculate correct average rating', () => {
      const result = analysisService.calculateOverallRating(mockReviewData.reviews)
      
      expect(result.average).toBe(3.6) // (5+4+1+5+3)/5 = 3.6
      expect(result.total).toBe(5)
      expect(result.withRatings).toBe(5)
    })

    test('should handle reviews without ratings', () => {
      const reviewsWithoutRatings = [
        { content: 'Good product', rating: null },
        { content: 'Bad product', rating: undefined },
        { content: 'Average product', rating: 4 }
      ]
      
      const result = analysisService.calculateOverallRating(reviewsWithoutRatings)
      
      expect(result.average).toBe(4)
      expect(result.total).toBe(3)
      expect(result.withRatings).toBe(1)
    })

    test('should handle empty reviews array', () => {
      const result = analysisService.calculateOverallRating([])
      
      expect(result.average).toBe(null)
      expect(result.total).toBe(0)
      expect(result.withRatings).toBe(0)
    })
  })

  describe('calculateRatingDistribution', () => {
    test('should calculate correct rating distribution', () => {
      const result = analysisService.calculateRatingDistribution(mockReviewData.reviews)
      
      expect(result[1]).toBe(1) // One 1-star review
      expect(result[2]).toBe(0) // No 2-star reviews
      expect(result[3]).toBe(1) // One 3-star review
      expect(result[4]).toBe(1) // One 4-star review
      expect(result[5]).toBe(2) // Two 5-star reviews
    })

    test('should handle reviews without ratings', () => {
      const reviewsWithoutRatings = [
        { rating: null },
        { rating: undefined },
        { rating: 4 }
      ]
      
      const result = analysisService.calculateRatingDistribution(reviewsWithoutRatings)
      
      expect(result[1]).toBe(0)
      expect(result[2]).toBe(0)
      expect(result[3]).toBe(0)
      expect(result[4]).toBe(1)
      expect(result[5]).toBe(0)
    })

    test('should handle invalid ratings', () => {
      const reviewsWithInvalidRatings = [
        { rating: 0 },
        { rating: 6 },
        { rating: -1 },
        { rating: 4.7 } // Should round to 5
      ]
      
      const result = analysisService.calculateRatingDistribution(reviewsWithInvalidRatings)
      
      expect(result[1]).toBe(0)
      expect(result[2]).toBe(0)
      expect(result[3]).toBe(0)
      expect(result[4]).toBe(0)
      expect(result[5]).toBe(1) // 4.7 rounded to 5
    })
  })

  describe('selectTopReviews', () => {
    test('should select top reviews based on rating and content length', () => {
      const result = analysisService.selectTopReviews(mockReviewData.reviews, 3)
      
      expect(result).toHaveLength(3)
      expect(result[0].rating).toBe(5) // Should prioritize higher ratings
      expect(result[0].content).toBeDefined()
      expect(result[0].source).toBeDefined()
      expect(result[0].author).toBeDefined()
    })

    test('should filter out short reviews', () => {
      const reviewsWithShortContent = [
        { content: 'Good', rating: 5, source: 'test', author: 'User1' },
        { content: 'This is a longer review with more detailed content about the product', rating: 4, source: 'test', author: 'User2' }
      ]
      
      const result = analysisService.selectTopReviews(reviewsWithShortContent, 5)
      
      expect(result).toHaveLength(1) // Short review should be filtered out
      expect(result[0].content).toContain('longer review')
    })

    test('should truncate long reviews', () => {
      const longContent = 'A'.repeat(400) // 400 character review
      const reviewsWithLongContent = [
        { content: longContent, rating: 5, source: 'test', author: 'User1' }
      ]
      
      const result = analysisService.selectTopReviews(reviewsWithLongContent, 1)
      
      expect(result[0].content).toHaveLength(303) // 300 chars + '...'
      expect(result[0].content.endsWith('...')).toBe(true)
    })

    test('should handle empty reviews array', () => {
      const result = analysisService.selectTopReviews([], 5)
      
      expect(result).toEqual([])
    })
  })

  describe('performSentimentAnalysis', () => {
    test('should handle AI response correctly', async () => {
      const mockResponse = {
        text: JSON.stringify({
          overall_sentiment: 'positive',
          confidence: 0.8,
          positive_percentage: 60,
          negative_percentage: 20,
          neutral_percentage: 20,
          key_emotions: ['satisfaction', 'excitement']
        })
      }

      const mockChain = {
        call: jest.fn().mockResolvedValue(mockResponse)
      }
      
      const { LLMChain } = require('langchain/chains')
      LLMChain.mockImplementation(() => mockChain)

      const result = await analysisService.performSentimentAnalysis(mockReviewData.reviews)
      
      expect(result.overall_sentiment).toBe('positive')
      expect(result.confidence).toBe(0.8)
      expect(result.positive_percentage).toBe(60)
      expect(result.key_emotions).toContain('satisfaction')
    })

    test('should handle AI parsing errors gracefully', async () => {
      const mockChain = {
        call: jest.fn().mockResolvedValue({ text: 'invalid json' })
      }
      
      const { LLMChain } = require('langchain/chains')
      LLMChain.mockImplementation(() => mockChain)

      const result = await analysisService.performSentimentAnalysis(mockReviewData.reviews)
      
      expect(result.overall_sentiment).toBe('neutral')
      expect(result.confidence).toBe(0.5)
      expect(result.key_emotions).toContain('mixed')
    })
  })

  describe('extractKeyInsights', () => {
    test('should handle AI response correctly', async () => {
      const mockResponse = {
        text: JSON.stringify([
          {
            insight: 'Users consistently praise the long battery life',
            category: 'performance',
            sentiment: 'positive',
            frequency: 'high'
          },
          {
            insight: 'Some users report assembly difficulties',
            category: 'usability',
            sentiment: 'negative',
            frequency: 'medium'
          }
        ])
      }

      const mockChain = {
        call: jest.fn().mockResolvedValue(mockResponse)
      }
      
      const { LLMChain } = require('langchain/chains')
      LLMChain.mockImplementation(() => mockChain)

      const result = await analysisService.extractKeyInsights(mockReviewData.reviews, 5)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0].insight).toContain('battery life')
      expect(result[0].category).toBe('performance')
      expect(result[0].sentiment).toBe('positive')
    })

    test('should handle AI errors gracefully', async () => {
      const mockChain = {
        call: jest.fn().mockRejectedValue(new Error('AI service error'))
      }
      
      const { LLMChain } = require('langchain/chains')
      LLMChain.mockImplementation(() => mockChain)

      const result = await analysisService.extractKeyInsights(mockReviewData.reviews, 5)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })
  })

  describe('generateProsAndCons', () => {
    test('should handle AI response correctly', async () => {
      const mockResponse = {
        text: JSON.stringify({
          pros: [
            'Excellent battery life lasting 2-3 days',
            'Lightweight and comfortable design',
            'Easy assembly process'
          ],
          cons: [
            'Higher price point than competitors',
            'Limited color options',
            'Some quality control issues reported'
          ]
        })
      }

      const mockChain = {
        call: jest.fn().mockResolvedValue(mockResponse)
      }
      
      const { LLMChain } = require('langchain/chains')
      LLMChain.mockImplementation(() => mockChain)

      const result = await analysisService.generateProsAndCons(mockReviewData.reviews)
      
      expect(Array.isArray(result.pros)).toBe(true)
      expect(Array.isArray(result.cons)).toBe(true)
      expect(result.pros).toHaveLength(3)
      expect(result.cons).toHaveLength(3)
      expect(result.pros[0]).toContain('battery life')
    })

    test('should handle AI errors gracefully', async () => {
      const mockChain = {
        call: jest.fn().mockRejectedValue(new Error('AI service error'))
      }
      
      const { LLMChain } = require('langchain/chains')
      LLMChain.mockImplementation(() => mockChain)

      const result = await analysisService.generateProsAndCons(mockReviewData.reviews)
      
      expect(Array.isArray(result.pros)).toBe(true)
      expect(Array.isArray(result.cons)).toBe(true)
      expect(result.pros).toHaveLength(1)
      expect(result.cons).toHaveLength(1)
    })
  })
})
