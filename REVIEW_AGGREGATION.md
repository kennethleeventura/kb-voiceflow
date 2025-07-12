# 🔍 Intelligent Review Aggregation System

An AI-powered review aggregation system that can intelligently detect user intent, categorize products, and scrape reviews from multiple relevant sources.

## 🎯 Overview

This system transforms natural language queries like "top rated eBikes" into comprehensive review analyses by:

1. **🧠 Intent Detection**: Uses AI to understand what product the user is asking about
2. **📂 Category Classification**: Automatically categorizes products (transportation, electronics, fitness, etc.)
3. **🌐 Multi-Source Scraping**: Scrapes reviews from relevant sites based on the product category
4. **📊 Intelligent Analysis**: Provides sentiment analysis, pros/cons, and recommendations
5. **📋 Structured Output**: Returns formatted, actionable insights

## 🚀 Quick Start

### Basic Usage

```javascript
import { ReviewAggregationService } from './src/services/reviewAggregationService.js'

const reviewService = new ReviewAggregationService()

// Analyze reviews for a product
const result = await reviewService.processReviewRequest('top rated eBikes', {
  maxReviewsPerSite: 30,
  includeGoogleReviews: true,
  includeSentimentAnalysis: true,
  includeRecommendations: true
})

console.log(`Found ${result.summary.totalReviews} reviews`)
console.log(`Average rating: ${result.summary.averageRating}/5`)
console.log(`Sentiment: ${result.summary.overallSentiment}`)
```

### API Endpoint Usage

```bash
# Analyze reviews via API
curl -X POST http://localhost:3000/api/reviews/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best gaming laptops under $1000",
    "maxReviewsPerSite": 25,
    "includeGoogleReviews": true,
    "includeSentimentAnalysis": true
  }'
```

## 🏗️ Architecture

### Core Services

1. **IntentDetectionService** - Analyzes user queries and extracts product information
2. **ReviewScrapingService** - Scrapes reviews from multiple sources
3. **ReviewAnalysisService** - Performs sentiment analysis and generates insights
4. **ReviewAggregationService** - Orchestrates the entire process

### Supported Categories

- **🚴 Transportation**: eBikes, scooters, cars, motorcycles
- **💻 Electronics**: Phones, laptops, headphones, tablets
- **🏠 Home Appliances**: Refrigerators, washing machines, vacuums
- **💪 Fitness**: Treadmills, exercise bikes, fitness trackers
- **🎮 Gaming**: Gaming laptops, chairs, headsets, consoles
- **🍳 Kitchen**: Blenders, coffee makers, air fryers
- **👗 Fashion**: Shoes, clothing, accessories
- **📚 Books**: Novels, textbooks, audiobooks
- **🐕 Pet Supplies**: Pet food, toys, accessories

### Review Sources by Category

#### Transportation
- electricbikereview.com
- bikeradar.com
- cyclingnews.com
- reddit.com/r/ebikes
- Amazon, Google Reviews

#### Electronics
- gsmarena.com
- techradar.com
- cnet.com
- engadget.com
- theverge.com
- Amazon, Best Buy

#### Gaming
- ign.com
- gamespot.com
- pcgamer.com
- tomshardware.com
- Newegg, Amazon

## 📊 Output Structure

```javascript
{
  "success": true,
  "timestamp": "2024-01-25T10:00:00Z",
  
  // Query Information
  "query": {
    "originalInput": "top rated eBikes",
    "detectedProduct": "electric bikes",
    "category": "transportation",
    "searchType": "best_products",
    "confidence": 0.9
  },

  // Review Summary
  "summary": {
    "totalReviews": 127,
    "sourcesScraped": 6,
    "averageRating": 4.3,
    "overallSentiment": "positive",
    "recommendationLevel": "recommended"
  },

  // Detailed Analysis
  "analysis": {
    "rating": {
      "average": 4.3,
      "total": 127,
      "withRatings": 89
    },
    "ratingDistribution": {
      "1": 3, "2": 8, "3": 15, "4": 28, "5": 35
    },
    "sentiment": {
      "overall_sentiment": "positive",
      "confidence": 0.85,
      "positive_percentage": 68,
      "negative_percentage": 15,
      "neutral_percentage": 17
    },
    "keyInsights": [
      {
        "insight": "Users consistently praise the long battery life",
        "category": "performance",
        "sentiment": "positive",
        "frequency": "high"
      }
    ],
    "prosAndCons": {
      "pros": [
        "Excellent battery life lasting 2-3 days",
        "Lightweight and comfortable design"
      ],
      "cons": [
        "Higher price point than competitors",
        "Limited color options"
      ]
    },
    "recommendations": {
      "overall_recommendation": "recommended",
      "recommendation_reason": "Strong performance and positive feedback",
      "best_for": ["Daily commuters", "Fitness enthusiasts"],
      "consider_if": ["You prioritize battery life", "Budget allows premium features"]
    }
  },

  // Data Sources
  "sources": [
    {
      "site": "electricbikereview.com",
      "reviewCount": 25,
      "averageRating": 4.5,
      "status": "success"
    }
  ],

  // Sample Reviews
  "topReviews": [
    {
      "source": "amazon.com",
      "content": "Great electric bike with excellent battery life...",
      "rating": 5,
      "author": "John D."
    }
  ]
}
```

## 🛠️ API Endpoints

### POST /api/reviews/analyze
Main endpoint for comprehensive review analysis.

**Request:**
```json
{
  "query": "top rated eBikes",
  "maxReviewsPerSite": 30,
  "includeGoogleReviews": true,
  "includeSentimentAnalysis": true,
  "includeRecommendations": true,
  "async": false
}
```

### POST /api/reviews/quick
Quick analysis with minimal processing.

### POST /api/reviews/intent
Analyze user intent without full review scraping.

### GET /api/reviews/jobs/:jobId
Get status of async review analysis job.

### GET /api/reviews/categories
Get available product categories and review sites.

## 🔧 Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional
NODE_ENV=development
REVIEW_CACHE_TTL=3600
MAX_CONCURRENT_SCRAPING=3
DEFAULT_REVIEW_LIMIT=30
```

### Customization

#### Adding New Categories
```javascript
// In IntentDetectionService
this.categoryMap = {
  'your_category': ['keyword1', 'keyword2', 'keyword3'],
  // ... existing categories
}
```

#### Adding New Review Sites
```javascript
// In IntentDetectionService.getRelevantReviewSites()
const siteMap = {
  'your_category': [
    'yoursite.com',
    'anothersite.com',
    'amazon.com',
    'google_reviews'
  ]
}
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test
```

Test specific services:

```bash
npm test -- __tests__/services/intentDetectionService.test.js
npm test -- __tests__/services/reviewAnalysisService.test.js
```

## 📝 Examples

See `examples/reviewAggregationExample.js` for detailed usage examples:

- Basic review analysis
- Gaming laptop comparison
- Async processing with job tracking
- Intent detection only
- Quick analysis

## 🚦 Rate Limiting & Best Practices

### Scraping Guidelines
- 2-second delay between requests to different sites
- Maximum 3 concurrent scraping operations
- Respectful user agents and headers
- Automatic retry with exponential backoff

### Performance Tips
- Use async processing for large queries
- Cache results when possible
- Limit reviews per site based on needs
- Use quick analysis for real-time responses

## 🔒 Legal & Ethical Considerations

- Respects robots.txt files
- Implements reasonable rate limiting
- Uses public review data only
- Provides attribution to original sources
- Follows fair use guidelines

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for intelligent review aggregation**
