import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { CollectionService } from '../../src/services/collectionService.js'

// Mock OpenSearch client
const mockOpenSearchClient = {
  cat: {
    indices: jest.fn()
  },
  indices: {
    exists: jest.fn(),
    stats: jest.fn(),
    getSettings: jest.fn(),
    getMapping: jest.fn(),
    delete: jest.fn()
  },
  search: jest.fn(),
  cluster: {
    health: jest.fn()
  }
}

describe('CollectionService', () => {
  let collectionService

  beforeEach(() => {
    collectionService = new CollectionService(mockOpenSearchClient)
    jest.clearAllMocks()
  })

  describe('listCollections', () => {
    test('should list collections successfully', async () => {
      const mockIndices = [
        {
          index: 'test-collection',
          'docs.count': '100',
          'store.size': '1.2mb',
          'creation.date.string': '2024-01-01T00:00:00.000Z'
        },
        {
          index: '.system-index',
          'docs.count': '50',
          'store.size': '500kb',
          'creation.date.string': '2024-01-01T00:00:00.000Z'
        }
      ]

      mockOpenSearchClient.cat.indices.mockResolvedValue({ body: mockIndices })

      const result = await collectionService.listCollections()

      expect(result).toHaveLength(1) // System index should be filtered out
      expect(result[0]).toEqual({
        name: 'test-collection',
        documentCount: 100,
        size: '1.2mb',
        createdAt: '2024-01-01T00:00:00.000Z'
      })
    })

    test('should handle empty indices list', async () => {
      mockOpenSearchClient.cat.indices.mockResolvedValue({ body: [] })

      const result = await collectionService.listCollections()

      expect(result).toEqual([])
    })

    test('should handle OpenSearch error', async () => {
      mockOpenSearchClient.cat.indices.mockRejectedValue(new Error('Connection failed'))

      await expect(collectionService.listCollections()).rejects.toThrow('Failed to list collections')
    })
  })

  describe('getCollectionInfo', () => {
    test('should get collection info successfully', async () => {
      const collectionName = 'test-collection'
      
      mockOpenSearchClient.indices.exists.mockResolvedValue({ body: true })
      mockOpenSearchClient.indices.stats.mockResolvedValue({
        body: {
          indices: {
            [collectionName]: {
              total: {
                docs: { count: 100 },
                store: { size_in_bytes: 1048576 }
              }
            }
          }
        }
      })
      mockOpenSearchClient.indices.getSettings.mockResolvedValue({
        body: {
          [collectionName]: {
            settings: {
              index: {
                number_of_shards: '1',
                number_of_replicas: '0',
                creation_date: '1640995200000'
              }
            }
          }
        }
      })
      mockOpenSearchClient.indices.getMapping.mockResolvedValue({
        body: {
          [collectionName]: {
            mappings: {
              properties: {
                pageContent: { type: 'text' }
              }
            }
          }
        }
      })
      mockOpenSearchClient.cluster.health.mockResolvedValue({
        body: { status: 'green' }
      })

      const result = await collectionService.getCollectionInfo(collectionName)

      expect(result.name).toBe(collectionName)
      expect(result.documentCount).toBe(100)
      expect(result.size).toBe('1 MB')
      expect(result.health).toBe('green')
    })

    test('should throw error for non-existent collection', async () => {
      mockOpenSearchClient.indices.exists.mockResolvedValue({ body: false })

      await expect(collectionService.getCollectionInfo('non-existent'))
        .rejects.toThrow("Collection 'non-existent' does not exist")
    })
  })

  describe('deleteCollection', () => {
    test('should delete collection successfully', async () => {
      const collectionName = 'test-collection'
      
      mockOpenSearchClient.indices.exists.mockResolvedValue({ body: true })
      mockOpenSearchClient.indices.delete.mockResolvedValue({ body: { acknowledged: true } })

      const result = await collectionService.deleteCollection(collectionName)

      expect(result).toBe(true)
      expect(mockOpenSearchClient.indices.delete).toHaveBeenCalledWith({
        index: collectionName
      })
    })

    test('should throw error for non-existent collection', async () => {
      mockOpenSearchClient.indices.exists.mockResolvedValue({ body: false })

      await expect(collectionService.deleteCollection('non-existent'))
        .rejects.toThrow("Collection 'non-existent' does not exist")
    })
  })

  describe('searchCollection', () => {
    test('should search collection successfully', async () => {
      const collectionName = 'test-collection'
      const query = 'test query'
      
      mockOpenSearchClient.indices.exists.mockResolvedValue({ body: true })
      mockOpenSearchClient.search.mockResolvedValue({
        body: {
          hits: {
            total: { value: 2 },
            hits: [
              {
                _id: '1',
                _score: 1.5,
                _source: {
                  pageContent: 'This is test content for the search query...',
                  metadata: { source: 'https://example.com' }
                },
                highlight: {
                  pageContent: ['This is <em>test</em> content...']
                }
              },
              {
                _id: '2',
                _score: 1.2,
                _source: {
                  pageContent: 'Another piece of content...',
                  metadata: { source: 'https://example2.com' }
                }
              }
            ]
          }
        }
      })

      const result = await collectionService.searchCollection(collectionName, query, 10)

      expect(result.total).toBe(2)
      expect(result.results).toHaveLength(2)
      expect(result.results[0]).toEqual({
        id: '1',
        score: 1.5,
        source: 'https://example.com',
        content: 'This is test content for the search query......',
        highlight: 'This is <em>test</em> content...'
      })
    })

    test('should throw error for non-existent collection', async () => {
      mockOpenSearchClient.indices.exists.mockResolvedValue({ body: false })

      await expect(collectionService.searchCollection('non-existent', 'query'))
        .rejects.toThrow("Collection 'non-existent' does not exist")
    })
  })

  describe('formatBytes', () => {
    test('should format bytes correctly', () => {
      expect(collectionService.formatBytes(0)).toBe('0 B')
      expect(collectionService.formatBytes(1024)).toBe('1 KB')
      expect(collectionService.formatBytes(1048576)).toBe('1 MB')
      expect(collectionService.formatBytes(1073741824)).toBe('1 GB')
      expect(collectionService.formatBytes(1536)).toBe('1.5 KB')
    })
  })
})
