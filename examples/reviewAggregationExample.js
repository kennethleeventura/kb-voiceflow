/**
 * Example usage of the Review Aggregation System
 * 
 * This example demonstrates how to use the intelligent review scraping system
 * that can detect user intent, categorize products, and scrape relevant review sites.
 */

import { ReviewAggregationService } from '../src/services/reviewAggregationService.js'

// Initialize the review aggregation service
const reviewService = new ReviewAggregationService()

/**
 * Example 1: Basic review analysis for eBikes
 */
async function exampleEBikeReviews() {
  console.log('🚴‍♂️ Example 1: Analyzing eBike reviews...\n')
  
  try {
    const result = await reviewService.processReviewRequest('top rated eBikes', {
      maxReviewsPerSite: 20,
      includeGoogleReviews: true,
      includeSentimentAnalysis: true,
      includeRecommendations: true
    })

    if (result.success) {
      console.log('✅ Analysis completed successfully!')
      console.log(`📊 Found ${result.summary.totalReviews} reviews from ${result.summary.sourcesScraped} sources`)
      console.log(`⭐ Average rating: ${result.summary.averageRating}/5`)
      console.log(`😊 Overall sentiment: ${result.summary.overallSentiment}`)
      console.log(`🎯 Recommendation: ${result.summary.recommendationLevel}`)
      
      console.log('\n📝 Key Insights:')
      result.analysis.keyInsights.forEach((insight, index) => {
        console.log(`${index + 1}. [${insight.category}] ${insight.insight} (${insight.sentiment})`)
      })
      
      console.log('\n✅ Pros:')
      result.analysis.prosAndCons.pros.forEach(pro => console.log(`  • ${pro}`))
      
      console.log('\n❌ Cons:')
      result.analysis.prosAndCons.cons.forEach(con => console.log(`  • ${con}`))
      
    } else {
      console.log('❌ Analysis failed:', result.error)
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
  
  console.log('\n' + '='.repeat(80) + '\n')
}

/**
 * Example 2: Gaming laptop comparison
 */
async function exampleGamingLaptops() {
  console.log('🎮 Example 2: Analyzing gaming laptop reviews...\n')
  
  try {
    const result = await reviewService.processReviewRequest('best gaming laptops under $1500', {
      maxReviewsPerSite: 25,
      includeGoogleReviews: true,
      includeSentimentAnalysis: true,
      includeRecommendations: true
    })

    if (result.success) {
      console.log('✅ Analysis completed!')
      console.log(`📱 Product: ${result.query.detectedProduct}`)
      console.log(`📂 Category: ${result.query.category}`)
      console.log(`🔍 Search type: ${result.query.searchType}`)
      
      console.log('\n📊 Data Sources:')
      result.sources.forEach(source => {
        console.log(`  • ${source.site}: ${source.reviewCount} reviews (${source.status})`)
      })
      
      console.log('\n🎯 Recommendations:')
      const rec = result.analysis.recommendations
      console.log(`Overall: ${rec.overall_recommendation}`)
      console.log(`Reason: ${rec.recommendation_reason}`)
      console.log(`Best for: ${rec.best_for.join(', ')}`)
      
    } else {
      console.log('❌ Analysis failed:', result.error)
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
  
  console.log('\n' + '='.repeat(80) + '\n')
}

/**
 * Example 3: Async processing with job tracking
 */
async function exampleAsyncProcessing() {
  console.log('⏳ Example 3: Async processing with job tracking...\n')
  
  try {
    // Start async processing
    const result = await reviewService.processReviewRequest('iPhone 15 reviews', {
      maxReviewsPerSite: 30,
      async: true
    })

    if (result.jobId) {
      console.log(`🚀 Job started with ID: ${result.jobId}`)
      
      // Poll for job status
      let completed = false
      while (!completed) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
        
        const status = reviewService.getJobStatus(result.jobId)
        console.log(`📊 Progress: ${status.progress}% - ${status.currentStep}`)
        
        if (status.status === 'completed') {
          completed = true
          console.log('✅ Job completed!')
          console.log(`📊 Found ${status.result.summary.totalReviews} reviews`)
          console.log(`⭐ Average rating: ${status.result.summary.averageRating}/5`)
        } else if (status.status === 'failed') {
          completed = true
          console.log('❌ Job failed:', status.error)
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
  
  console.log('\n' + '='.repeat(80) + '\n')
}

/**
 * Example 4: Intent detection only
 */
async function exampleIntentDetection() {
  console.log('🧠 Example 4: Intent detection only...\n')
  
  const queries = [
    'top rated eBikes',
    'iPhone 15 vs Samsung Galaxy S24',
    'best coffee makers under $200',
    'reviews for Tesla Model 3',
    'recommend a good laptop for programming'
  ]

  for (const query of queries) {
    try {
      const intent = await reviewService.intentService.analyzeIntent(query)
      
      console.log(`Query: "${query}"`)
      console.log(`  Product: ${intent.product}`)
      console.log(`  Category: ${intent.category}`)
      console.log(`  Intent: ${intent.intent}`)
      console.log(`  Search Type: ${intent.searchType}`)
      console.log(`  Confidence: ${intent.confidence}`)
      console.log(`  Review Sites: ${intent.reviewSites.slice(0, 3).join(', ')}...`)
      console.log('')
    } catch (error) {
      console.error(`Error analyzing "${query}":`, error.message)
    }
  }
  
  console.log('='.repeat(80) + '\n')
}

/**
 * Example 5: Quick analysis (minimal processing)
 */
async function exampleQuickAnalysis() {
  console.log('⚡ Example 5: Quick analysis...\n')
  
  try {
    const result = await reviewService.processReviewRequest('wireless headphones', {
      maxReviewsPerSite: 10,
      includeGoogleReviews: true,
      includeSentimentAnalysis: false,
      includeRecommendations: false
    })

    if (result.success) {
      console.log('✅ Quick analysis completed!')
      console.log(`📊 Found ${result.summary.totalReviews} reviews`)
      console.log(`⭐ Average rating: ${result.summary.averageRating}/5`)
      
      console.log('\n📝 Sample Reviews:')
      result.topReviews.slice(0, 3).forEach((review, index) => {
        console.log(`${index + 1}. [${review.source}] ${review.content.substring(0, 100)}...`)
      })
    } else {
      console.log('❌ Quick analysis failed:', result.error)
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🎯 Review Aggregation System Examples\n')
  console.log('This system can intelligently detect product categories and scrape relevant review sites.\n')
  
  // Note: These examples would work with actual API keys and network access
  console.log('⚠️  Note: These examples require OpenAI API key and network access to work fully.\n')
  
  await exampleIntentDetection()
  
  // Uncomment these to run with actual API calls:
  // await exampleEBikeReviews()
  // await exampleGamingLaptops()
  // await exampleAsyncProcessing()
  // await exampleQuickAnalysis()
  
  console.log('🎉 Examples completed!')
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error)
}

export {
  exampleEBikeReviews,
  exampleGamingLaptops,
  exampleAsyncProcessing,
  exampleIntentDetection,
  exampleQuickAnalysis
}
