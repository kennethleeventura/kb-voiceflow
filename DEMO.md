# 🎯 KB-Voiceflow Demo Guide

This demo showcases the enhanced KB-Voiceflow application with intelligent review aggregation capabilities.

## 🚀 Quick Demo Setup

### 1. Start the Enhanced Application

```bash
# Clone and setup
git clone https://github.com/kennethleeventura/kb-voiceflow.git
cd kb-voiceflow
npm install

# Set up environment (create .env file)
echo "OPENAI_API_KEY=your_key_here" > .env

# Start enhanced version
npm start enhanced
```

### 2. Verify Application is Running

```bash
# Check health
curl http://localhost:3000/api/health

# Expected response:
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-25T10:00:00Z",
  "version": "2.0.0"
}
```

## 🔍 Demo 1: Intelligent Review Aggregation

### Example 1: eBike Reviews

```bash
curl -X POST http://localhost:3000/api/reviews/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "top rated eBikes",
    "maxReviewsPerSite": 20,
    "includeGoogleReviews": true,
    "includeSentimentAnalysis": true,
    "includeRecommendations": true
  }'
```

**What happens:**
1. 🧠 AI detects "electric bikes" in "transportation" category
2. 🌐 Scrapes electricbikereview.com, bikeradar.com, Amazon, Google Reviews
3. 📊 Analyzes sentiment and generates insights
4. 🎯 Provides personalized recommendations

**Expected Output Structure:**
```json
{
  "success": true,
  "query": {
    "originalInput": "top rated eBikes",
    "detectedProduct": "electric bikes",
    "category": "transportation",
    "confidence": 0.9
  },
  "summary": {
    "totalReviews": 127,
    "averageRating": 4.3,
    "overallSentiment": "positive",
    "recommendationLevel": "recommended"
  },
  "analysis": {
    "keyInsights": [
      {
        "insight": "Users consistently praise the long battery life",
        "category": "performance",
        "sentiment": "positive"
      }
    ],
    "prosAndCons": {
      "pros": ["Excellent battery life", "Lightweight design"],
      "cons": ["Higher price point", "Limited color options"]
    },
    "recommendations": {
      "overall_recommendation": "recommended",
      "best_for": ["Daily commuters", "Fitness enthusiasts"]
    }
  }
}
```

### Example 2: Gaming Laptop Reviews

```bash
curl -X POST http://localhost:3000/api/reviews/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best gaming laptops under $1500",
    "maxReviewsPerSite": 25
  }'
```

**What happens:**
1. 🧠 Detects "gaming laptops" in "electronics" category
2. 🌐 Scrapes techradar.com, pcgamer.com, tomshardware.com, Amazon
3. 📊 Focuses on performance and value analysis

### Example 3: Quick Analysis

```bash
curl -X POST http://localhost:3000/api/reviews/quick \
  -H "Content-Type: application/json" \
  -d '{"query": "wireless headphones"}'
```

**What happens:**
- ⚡ Fast analysis with minimal processing
- 📊 Basic review aggregation without deep analysis
- 🎯 Perfect for real-time applications

## 📊 Demo 2: Collection Management

### List All Collections

```bash
curl http://localhost:3000/api/collections
```

### Create and Manage Content

```bash
# Add content to a collection
curl -X POST http://localhost:3000/api/add \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/product-review",
    "collection": "product-reviews"
  }'

# Get collection details
curl http://localhost:3000/api/collections/product-reviews

# Search within collection
curl -X POST http://localhost:3000/api/collections/product-reviews/search \
  -H "Content-Type: application/json" \
  -d '{"query": "battery life", "size": 5}'
```

## ⚡ Demo 3: Batch Processing

### Process Multiple URLs

```bash
curl -X POST http://localhost:3000/api/batch/process \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com/review1",
      "https://example.com/review2",
      "https://example.com/sitemap.xml"
    ],
    "collection": "batch-reviews",
    "maxConcurrent": 2,
    "chunkSize": 1500
  }'
```

**Response:**
```json
{
  "success": true,
  "jobId": "batch_1640995200000_abc123",
  "message": "Batch processing started",
  "urls": 3,
  "collection": "batch-reviews"
}
```

### Track Job Progress

```bash
curl http://localhost:3000/api/batch/jobs/batch_1640995200000_abc123
```

## 🏥 Demo 4: Advanced Health Monitoring

### Comprehensive Health Check

```bash
curl http://localhost:3000/api/health/detailed
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-25T10:00:00Z",
  "uptime": "2h 15m",
  "version": "2.0.0",
  "environment": "development",
  "checks": {
    "redis": {
      "status": "healthy",
      "responseTime": "5ms",
      "memory": "15.2MB"
    },
    "opensearch": {
      "status": "healthy",
      "clusterStatus": "green",
      "nodes": 1
    },
    "openai": {
      "status": "healthy",
      "responseTime": "234ms"
    },
    "system": {
      "status": "healthy",
      "memory": {
        "used": "128MB",
        "percentage": "45%"
      }
    }
  }
}
```

### Individual Service Checks

```bash
# Check specific services
curl http://localhost:3000/api/health/redis
curl http://localhost:3000/api/health/opensearch
curl http://localhost:3000/api/health/openai
curl http://localhost:3000/api/health/system
```

## 🎯 Demo 5: Intent Detection

### Test Intent Recognition

```bash
curl -X POST http://localhost:3000/api/reviews/intent \
  -H "Content-Type: application/json" \
  -d '{"query": "iPhone 15 vs Samsung Galaxy S24"}'
```

**Response:**
```json
{
  "success": true,
  "intent": {
    "originalInput": "iPhone 15 vs Samsung Galaxy S24",
    "product": "smartphones",
    "category": "electronics",
    "searchType": "comparison",
    "intent": "compare_products",
    "confidence": 0.95,
    "reviewSites": ["gsmarena.com", "techradar.com", "cnet.com"]
  }
}
```

## 🔧 Demo 6: Legacy Features (Enhanced)

### Traditional Q&A

```bash
# Add content
curl -X POST http://localhost:3000/api/add \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.voiceflow.com",
    "collection": "voiceflow-docs"
  }'

# Ask questions
curl -X POST http://localhost:3000/api/question \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How do I create a chatbot?",
    "collection": "voiceflow-docs"
  }'
```

### Live Webpage Analysis

```bash
curl -X POST http://localhost:3000/api/live \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/product",
    "question": "What are the key features of this product?"
  }'
```

## 📈 Performance Comparison

### Original vs Enhanced Mode

| Feature | Original | Enhanced |
|---------|----------|----------|
| Basic Q&A | ✅ | ✅ |
| Content Ingestion | ✅ | ✅ |
| Review Aggregation | ❌ | ✅ |
| Intent Detection | ❌ | ✅ |
| Collection Management | ❌ | ✅ |
| Batch Processing | ❌ | ✅ |
| Advanced Health Checks | ❌ | ✅ |
| Security Features | Basic | Advanced |
| Input Validation | Basic | Comprehensive |
| Error Handling | Basic | Structured |

## 🎉 Demo Summary

The enhanced KB-Voiceflow application demonstrates:

1. **🧠 AI-Powered Intelligence**: Understands natural language queries and extracts meaningful product information
2. **🌐 Multi-Source Aggregation**: Scrapes reviews from category-relevant sites automatically
3. **📊 Advanced Analytics**: Provides sentiment analysis, insights, and personalized recommendations
4. **🏗️ Production-Ready Architecture**: Comprehensive error handling, validation, and monitoring
5. **⚡ Performance Optimization**: Concurrent processing, caching, and efficient resource management
6. **🛡️ Enterprise Security**: Rate limiting, CORS, security headers, and input sanitization

### Next Steps

1. **Integrate with your application** using the comprehensive API
2. **Customize categories and review sites** for your specific use case
3. **Scale horizontally** with the built-in batch processing capabilities
4. **Monitor performance** using the advanced health check endpoints
5. **Extend functionality** with the modular architecture

**Your intelligent review aggregation system is ready for production! 🚀**
