import { Client } from '@opensearch-project/opensearch'

/**
 * Service for managing OpenSearch collections/indices
 */
export class CollectionService {
  constructor(opensearchClient) {
    this.client = opensearchClient
  }

  /**
   * List all collections (indices) in OpenSearch
   * @returns {Promise<Array>} - Array of collection information
   */
  async listCollections() {
    try {
      const response = await this.client.cat.indices({
        format: 'json',
        h: 'index,docs.count,store.size,creation.date.string'
      })

      return response.body
        .filter(index => !index.index.startsWith('.')) // Filter out system indices
        .map(index => ({
          name: index.index,
          documentCount: parseInt(index['docs.count'] || '0'),
          size: index['store.size'] || '0b',
          createdAt: index['creation.date.string'] || 'Unknown'
        }))
    } catch (error) {
      console.error('Error listing collections:', error)
      throw new Error('Failed to list collections')
    }
  }

  /**
   * Get detailed information about a specific collection
   * @param {string} collectionName - Name of the collection
   * @returns {Promise<Object>} - Collection details
   */
  async getCollectionInfo(collectionName) {
    try {
      // Check if index exists
      const exists = await this.client.indices.exists({
        index: collectionName
      })

      if (!exists.body) {
        throw new Error(`Collection '${collectionName}' does not exist`)
      }

      // Get index stats
      const stats = await this.client.indices.stats({
        index: collectionName
      })

      // Get index settings
      const settings = await this.client.indices.getSettings({
        index: collectionName
      })

      // Get index mapping
      const mapping = await this.client.indices.getMapping({
        index: collectionName
      })

      const indexStats = stats.body.indices[collectionName]
      const indexSettings = settings.body[collectionName].settings
      const indexMapping = mapping.body[collectionName].mappings

      return {
        name: collectionName,
        documentCount: indexStats.total.docs.count,
        size: this.formatBytes(indexStats.total.store.size_in_bytes),
        sizeInBytes: indexStats.total.store.size_in_bytes,
        settings: {
          numberOfShards: indexSettings.index.number_of_shards,
          numberOfReplicas: indexSettings.index.number_of_replicas,
          creationDate: new Date(parseInt(indexSettings.index.creation_date)).toISOString()
        },
        mapping: indexMapping,
        health: await this.getIndexHealth(collectionName)
      }
    } catch (error) {
      console.error(`Error getting collection info for ${collectionName}:`, error)
      throw error
    }
  }

  /**
   * Delete a collection (index)
   * @param {string} collectionName - Name of the collection to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteCollection(collectionName) {
    try {
      const exists = await this.client.indices.exists({
        index: collectionName
      })

      if (!exists.body) {
        throw new Error(`Collection '${collectionName}' does not exist`)
      }

      await this.client.indices.delete({
        index: collectionName
      })

      return true
    } catch (error) {
      console.error(`Error deleting collection ${collectionName}:`, error)
      throw error
    }
  }

  /**
   * Search within a collection
   * @param {string} collectionName - Name of the collection
   * @param {string} query - Search query
   * @param {number} size - Number of results to return
   * @returns {Promise<Object>} - Search results
   */
  async searchCollection(collectionName, query, size = 10) {
    try {
      const exists = await this.client.indices.exists({
        index: collectionName
      })

      if (!exists.body) {
        throw new Error(`Collection '${collectionName}' does not exist`)
      }

      const response = await this.client.search({
        index: collectionName,
        body: {
          query: {
            multi_match: {
              query: query,
              fields: ['pageContent', 'metadata.source'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          },
          highlight: {
            fields: {
              pageContent: {}
            }
          },
          size: size
        }
      })

      return {
        total: response.body.hits.total.value,
        results: response.body.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source.metadata?.source || 'Unknown',
          content: hit._source.pageContent?.substring(0, 200) + '...',
          highlight: hit.highlight?.pageContent?.[0] || null
        }))
      }
    } catch (error) {
      console.error(`Error searching collection ${collectionName}:`, error)
      throw error
    }
  }

  /**
   * Get index health status
   * @param {string} indexName - Name of the index
   * @returns {Promise<string>} - Health status
   */
  async getIndexHealth(indexName) {
    try {
      const response = await this.client.cluster.health({
        index: indexName
      })
      return response.body.status
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Number of bytes
   * @returns {string} - Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
