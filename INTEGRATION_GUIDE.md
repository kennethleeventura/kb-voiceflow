# 🚀 KB-Voiceflow Integration Guide

This guide will help you integrate and use the enhanced KB-Voiceflow application with all the new features including intelligent review aggregation.

## 📋 Quick Start

### 1. Choose Your Version

You can now run KB-Voiceflow in two modes:

#### **🔧 Original Mode** (Basic Features)
```bash
npm run start:original
# or
npm start original
```

#### **✨ Enhanced Mode** (All Features + Review Aggregation)
```bash
npm run start:enhanced
# or
npm start enhanced  # This is the default
```

### 2. Environment Setup

Make sure you have all required environment variables in your `.env` file:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (with defaults)
OPENSEARCH_URL=http://127.0.0.1:9200
REDIS_URL=redis://localhost:6379
PORT=3000
UNSTRUCTURED_URL=http://localhost:8000
OPENSEARCH_DEFAULT_INDEX=default
NODE_ENV=development

# Enhanced Mode Additional (Optional)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Start the Application

```bash
# Install dependencies
npm install

# Start enhanced version (default)
npm start

# Or choose specific version
npm start enhanced  # Enhanced with review aggregation
npm start original  # Original basic version
npm start help      # Show help and available features
```

## 🎯 New Features Overview

### 🔍 **Intelligent Review Aggregation**

Transform natural language queries into comprehensive review analyses:

```bash
# Example API call
curl -X POST http://localhost:3000/api/reviews/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "top rated eBikes",
    "maxReviewsPerSite": 30,
    "includeGoogleReviews": true,
    "includeSentimentAnalysis": true,
    "includeRecommendations": true
  }'
```

**Supported Query Types:**
- "top rated eBikes" → Transportation category → Bike review sites
- "best gaming laptops under $1000" → Electronics → Tech review sites
- "iPhone 15 reviews" → Electronics → Phone review sites
- "recommend a good coffee maker" → Kitchen → Appliance review sites

### 📊 **Collection Management**

Manage your OpenSearch collections with full CRUD operations:

```bash
# List all collections
curl http://localhost:3000/api/collections

# Get collection details
curl http://localhost:3000/api/collections/my-collection

# Search within a collection
curl -X POST http://localhost:3000/api/collections/my-collection/search \
  -H "Content-Type: application/json" \
  -d '{"query": "search term", "size": 10}'

# Delete a collection
curl -X DELETE http://localhost:3000/api/collections/my-collection
```

### ⚡ **Batch Processing**

Process multiple URLs concurrently:

```bash
curl -X POST http://localhost:3000/api/batch/process \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com/page1",
      "https://example.com/page2",
      "https://example.com/sitemap.xml"
    ],
    "collection": "my-collection",
    "maxConcurrent": 3,
    "chunkSize": 2000
  }'
```

### 🏥 **Advanced Health Monitoring**

Comprehensive health checks for all dependencies:

```bash
# Basic health check
curl http://localhost:3000/api/health

# Detailed health report
curl http://localhost:3000/api/health/detailed

# Specific service checks
curl http://localhost:3000/api/health/redis
curl http://localhost:3000/api/health/opensearch
curl http://localhost:3000/api/health/openai
```

## 🛠️ API Endpoints Reference

### **Legacy Endpoints** (Available in both modes)
- `GET /api/health` - Basic health check
- `POST /api/add` - Add content to knowledge base
- `POST /api/question` - Ask questions using vector store
- `POST /api/live` - Live webpage analysis
- `DELETE /api/collection` - Delete a collection
- `GET /api/clearcache` - Clear Redis cache

### **Enhanced Endpoints** (Enhanced mode only)

#### Review Aggregation
- `POST /api/reviews/analyze` - Comprehensive review analysis
- `POST /api/reviews/quick` - Quick review analysis
- `POST /api/reviews/intent` - Intent detection only
- `GET /api/reviews/jobs/:jobId` - Async job status
- `GET /api/reviews/categories` - Available categories

#### Collection Management
- `GET /api/collections` - List all collections
- `GET /api/collections/:name` - Get collection details
- `DELETE /api/collections/:name` - Delete collection
- `POST /api/collections/:name/search` - Search within collection
- `GET /api/collections/:name/stats` - Collection statistics

#### Batch Processing
- `POST /api/batch/process` - Process multiple URLs
- `GET /api/batch/jobs/:jobId` - Get job status
- `DELETE /api/batch/jobs/:jobId` - Cancel job
- `GET /api/batch/jobs` - List all jobs

#### Advanced Health
- `GET /api/health/detailed` - Comprehensive health report
- `GET /api/health/redis` - Redis health check
- `GET /api/health/opensearch` - OpenSearch health check
- `GET /api/health/unstructured` - Unstructured service health
- `GET /api/health/openai` - OpenAI API health
- `GET /api/health/system` - System resources
- `GET /api/health/readiness` - Kubernetes readiness probe
- `GET /api/health/liveness` - Kubernetes liveness probe

## 🔧 Configuration Options

### Security Features (Enhanced Mode)
- **Helmet**: Security headers protection
- **CORS**: Cross-origin resource sharing control
- **Rate Limiting**: 100 requests per 15 minutes (production)
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Structured error responses

### Performance Features
- **Concurrent Processing**: Configurable concurrency limits
- **Caching**: Redis-based LLM response caching
- **Compression**: Response compression for large payloads
- **Request Logging**: Detailed request/response logging

## 🧪 Testing Your Integration

### 1. Test Basic Functionality
```bash
# Test health check
curl http://localhost:3000/api/health

# Test adding content
curl -X POST http://localhost:3000/api/add \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "collection": "test"}'

# Test asking questions
curl -X POST http://localhost:3000/api/question \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this about?", "collection": "test"}'
```

### 2. Test Review Aggregation (Enhanced Mode)
```bash
# Test intent detection
curl -X POST http://localhost:3000/api/reviews/intent \
  -H "Content-Type: application/json" \
  -d '{"query": "best eBikes"}'

# Test quick review analysis
curl -X POST http://localhost:3000/api/reviews/quick \
  -H "Content-Type: application/json" \
  -d '{"query": "top rated wireless headphones"}'
```

### 3. Test Collection Management (Enhanced Mode)
```bash
# List collections
curl http://localhost:3000/api/collections

# Get collection stats
curl http://localhost:3000/api/collections/test/stats
```

## 🚨 Troubleshooting

### Common Issues

#### 1. **Missing Environment Variables**
```
❌ OPENAI_API_KEY: Missing (Required)
```
**Solution**: Add your OpenAI API key to `.env` file

#### 2. **Redis Connection Failed**
```
❌ Error connecting to Redis: ECONNREFUSED
```
**Solution**: Start Redis server or check `REDIS_URL` in `.env`

#### 3. **OpenSearch Connection Failed**
```
❌ OpenSearch connection failed
```
**Solution**: Start OpenSearch or check `OPENSEARCH_URL` in `.env`

#### 4. **Review Scraping Errors**
```
❌ Error scraping reviews: Timeout
```
**Solution**: Check internet connection and reduce `maxReviewsPerSite`

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development npm start enhanced
```

### Health Check

Use the detailed health endpoint to diagnose issues:
```bash
curl http://localhost:3000/api/health/detailed
```

## 📈 Performance Optimization

### For Large Scale Usage

1. **Increase Rate Limits** (production):
```javascript
// In app-enhanced.js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increase as needed
})
```

2. **Optimize Batch Processing**:
```bash
# Use smaller batch sizes for better performance
curl -X POST http://localhost:3000/api/batch/process \
  -d '{"urls": [...], "maxConcurrent": 2, "sleep": 1000}'
```

3. **Use Async Processing** for large review analyses:
```bash
curl -X POST http://localhost:3000/api/reviews/analyze \
  -d '{"query": "...", "async": true}'
```

## 🎉 You're Ready!

Your enhanced KB-Voiceflow application is now ready with:
- ✅ Intelligent review aggregation
- ✅ Advanced collection management  
- ✅ Batch processing capabilities
- ✅ Comprehensive health monitoring
- ✅ Enhanced security and validation
- ✅ Production-ready features

Start exploring the new capabilities and building amazing AI-powered applications! 🚀
