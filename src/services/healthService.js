/**
 * Health check service for monitoring system dependencies
 */
export class HealthService {
  constructor(dependencies = {}) {
    this.dependencies = dependencies
    this.startTime = Date.now()
  }

  /**
   * Perform comprehensive health check
   * @returns {Promise<Object>} - Health status report
   */
  async checkHealth() {
    const checks = await Promise.allSettled([
      this.checkRedis(),
      this.checkOpenSearch(),
      this.checkUnstructured(),
      this.checkOpenAI(),
      this.checkSystem()
    ])

    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        redis: this.getCheckResult(checks[0]),
        opensearch: this.getCheckResult(checks[1]),
        unstructured: this.getCheckResult(checks[2]),
        openai: this.getCheckResult(checks[3]),
        system: this.getCheckResult(checks[4])
      }
    }

    // Determine overall status
    const hasFailures = Object.values(results.checks).some(check => check.status === 'unhealthy')
    const hasWarnings = Object.values(results.checks).some(check => check.status === 'degraded')
    
    if (hasFailures) {
      results.status = 'unhealthy'
    } else if (hasWarnings) {
      results.status = 'degraded'
    }

    return results
  }

  /**
   * Check Redis connection and performance
   */
  async checkRedis() {
    if (!this.dependencies.redis) {
      return { status: 'skipped', message: 'Redis client not provided' }
    }

    try {
      const start = Date.now()
      await this.dependencies.redis.ping()
      const responseTime = Date.now() - start

      const info = await this.dependencies.redis.info('memory')
      const memoryUsage = this.parseRedisInfo(info, 'used_memory_human')

      return {
        status: responseTime < 100 ? 'healthy' : 'degraded',
        responseTime: `${responseTime}ms`,
        memory: memoryUsage,
        message: responseTime < 100 ? 'Redis is responsive' : 'Redis response time is slow'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Redis connection failed'
      }
    }
  }

  /**
   * Check OpenSearch cluster health
   */
  async checkOpenSearch() {
    if (!this.dependencies.opensearch) {
      return { status: 'skipped', message: 'OpenSearch client not provided' }
    }

    try {
      const start = Date.now()
      const health = await this.dependencies.opensearch.cluster.health()
      const responseTime = Date.now() - start

      const clusterHealth = health.body
      let status = 'healthy'
      
      if (clusterHealth.status === 'red') {
        status = 'unhealthy'
      } else if (clusterHealth.status === 'yellow') {
        status = 'degraded'
      }

      return {
        status,
        responseTime: `${responseTime}ms`,
        clusterStatus: clusterHealth.status,
        nodes: clusterHealth.number_of_nodes,
        indices: clusterHealth.active_primary_shards,
        message: `Cluster status: ${clusterHealth.status}`
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'OpenSearch connection failed'
      }
    }
  }

  /**
   * Check Unstructured service availability
   */
  async checkUnstructured() {
    const unstructuredUrl = process.env.UNSTRUCTURED_URL || 'http://localhost:8000'
    
    try {
      const start = Date.now()
      const response = await fetch(`${unstructuredUrl}/general/v0/general`, {
        method: 'GET',
        timeout: 5000
      })
      const responseTime = Date.now() - start

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: `${responseTime}ms`,
        statusCode: response.status,
        message: response.ok ? 'Unstructured service is available' : 'Unstructured service returned error'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Unstructured service is not reachable'
      }
    }
  }

  /**
   * Check OpenAI API connectivity
   */
  async checkOpenAI() {
    if (!process.env.OPENAI_API_KEY) {
      return {
        status: 'unhealthy',
        message: 'OpenAI API key not configured'
      }
    }

    try {
      const start = Date.now()
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
      const responseTime = Date.now() - start

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: `${responseTime}ms`,
        statusCode: response.status,
        message: response.ok ? 'OpenAI API is accessible' : 'OpenAI API returned error'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'OpenAI API is not reachable'
      }
    }
  }

  /**
   * Check system resources
   */
  async checkSystem() {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    // Convert bytes to MB
    const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    const heapTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024)
    const memoryPercent = Math.round((heapUsed / heapTotal) * 100)

    let status = 'healthy'
    if (memoryPercent > 90) {
      status = 'unhealthy'
    } else if (memoryPercent > 75) {
      status = 'degraded'
    }

    return {
      status,
      memory: {
        used: `${heapUsed}MB`,
        total: `${heapTotal}MB`,
        percentage: `${memoryPercent}%`
      },
      uptime: this.getUptime(),
      nodeVersion: process.version,
      platform: process.platform,
      message: `Memory usage: ${memoryPercent}%`
    }
  }

  /**
   * Get application uptime
   */
  getUptime() {
    const uptimeMs = Date.now() - this.startTime
    const seconds = Math.floor(uptimeMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  /**
   * Extract result from Promise.allSettled
   */
  getCheckResult(settledResult) {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value
    } else {
      return {
        status: 'unhealthy',
        error: settledResult.reason.message,
        message: 'Health check failed'
      }
    }
  }

  /**
   * Parse Redis INFO command output
   */
  parseRedisInfo(info, key) {
    const lines = info.split('\r\n')
    for (const line of lines) {
      if (line.startsWith(`${key}:`)) {
        return line.split(':')[1]
      }
    }
    return 'unknown'
  }
}
