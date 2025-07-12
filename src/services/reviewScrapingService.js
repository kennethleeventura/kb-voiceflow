import axios from 'axios'
import * as cheerio from 'cheerio'
import { sleepWait } from '../utils/downloadUtils.js'

/**
 * Service for scraping reviews from multiple sources
 */
export class ReviewScrapingService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    this.requestDelay = 2000 // 2 seconds between requests
    this.maxRetries = 3
  }

  /**
   * Scrape reviews from multiple sources for a given product
   * @param {Object} intentData - Intent analysis result
   * @param {Object} options - Scraping options
   * @returns {Promise<Object>} - Aggregated review data
   */
  async scrapeReviews(intentData, options = {}) {
    const {
      maxReviewsPerSite = 50,
      includeGoogleReviews = true,
      timeout = 30000
    } = options

    const results = {
      product: intentData.product,
      category: intentData.category,
      totalReviews: 0,
      sources: [],
      reviews: [],
      summary: null,
      scrapedAt: new Date().toISOString()
    }

    console.log(`Starting review scraping for: ${intentData.product}`)

    // Scrape from each relevant site
    for (const site of intentData.reviewSites) {
      try {
        console.log(`Scraping reviews from: ${site}`)
        
        let siteReviews = []
        
        if (site === 'google_reviews') {
          if (includeGoogleReviews) {
            siteReviews = await this.scrapeGoogleReviews(intentData.product, maxReviewsPerSite)
          }
        } else if (site === 'amazon.com') {
          siteReviews = await this.scrapeAmazonReviews(intentData.product, maxReviewsPerSite)
        } else if (site.includes('reddit.com')) {
          siteReviews = await this.scrapeRedditReviews(site, intentData.product, maxReviewsPerSite)
        } else {
          siteReviews = await this.scrapeGenericSite(site, intentData.product, maxReviewsPerSite)
        }

        if (siteReviews.length > 0) {
          results.sources.push({
            site: site,
            reviewCount: siteReviews.length,
            avgRating: this.calculateAverageRating(siteReviews)
          })
          
          results.reviews.push(...siteReviews)
          results.totalReviews += siteReviews.length
        }

        // Delay between sites to be respectful
        await sleepWait(this.requestDelay)
        
      } catch (error) {
        console.error(`Error scraping ${site}:`, error.message)
        results.sources.push({
          site: site,
          reviewCount: 0,
          error: error.message
        })
      }
    }

    // Generate summary
    results.summary = this.generateSummary(results.reviews)

    console.log(`Scraping completed. Total reviews: ${results.totalReviews}`)
    return results
  }

  /**
   * Scrape Google Reviews (using Google Search for review snippets)
   */
  async scrapeGoogleReviews(product, maxReviews) {
    try {
      const searchQuery = `${product} reviews site:google.com OR site:maps.google.com`
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=20`
      
      const response = await this.makeRequest(searchUrl)
      const $ = cheerio.load(response.data)
      
      const reviews = []
      
      // Extract review snippets from search results
      $('.g').each((index, element) => {
        if (reviews.length >= maxReviews) return false
        
        const $element = $(element)
        const title = $element.find('h3').text().trim()
        const snippet = $element.find('.VwiC3b').text().trim()
        const link = $element.find('a').attr('href')
        
        if (snippet && (snippet.includes('review') || snippet.includes('rating') || snippet.includes('star'))) {
          reviews.push({
            source: 'google_reviews',
            title: title,
            content: snippet,
            url: link,
            rating: this.extractRatingFromText(snippet),
            date: null,
            author: 'Google User'
          })
        }
      })
      
      return reviews
    } catch (error) {
      console.error('Error scraping Google reviews:', error)
      return []
    }
  }

  /**
   * Scrape Amazon reviews
   */
  async scrapeAmazonReviews(product, maxReviews) {
    try {
      // Search for the product on Amazon
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(product)}&ref=nb_sb_noss`
      const response = await this.makeRequest(searchUrl)
      const $ = cheerio.load(response.data)
      
      const reviews = []
      
      // Extract product links and then scrape reviews
      const productLinks = []
      $('[data-component-type="s-search-result"] h2 a').each((index, element) => {
        if (productLinks.length < 3) { // Limit to first 3 products
          const link = $(element).attr('href')
          if (link) {
            productLinks.push(`https://www.amazon.com${link}`)
          }
        }
      })
      
      // For each product, try to get reviews
      for (const productUrl of productLinks) {
        if (reviews.length >= maxReviews) break
        
        try {
          await sleepWait(1000) // Delay between requests
          const productResponse = await this.makeRequest(productUrl)
          const $product = cheerio.load(productResponse.data)
          
          // Extract review snippets from product page
          $product('[data-hook="review-body"] span').each((index, element) => {
            if (reviews.length >= maxReviews) return false
            
            const content = $product(element).text().trim()
            const rating = $product(element).closest('[data-hook="review"]').find('[data-hook="review-star-rating"]').text()
            const author = $product(element).closest('[data-hook="review"]').find('[data-hook="review-author"]').text()
            
            if (content && content.length > 20) {
              reviews.push({
                source: 'amazon.com',
                content: content,
                rating: this.extractRatingFromText(rating),
                author: author || 'Amazon Customer',
                url: productUrl,
                date: null
              })
            }
          })
        } catch (productError) {
          console.error('Error scraping Amazon product:', productError.message)
        }
      }
      
      return reviews
    } catch (error) {
      console.error('Error scraping Amazon:', error)
      return []
    }
  }

  /**
   * Scrape Reddit reviews
   */
  async scrapeRedditReviews(subredditUrl, product, maxReviews) {
    try {
      const searchUrl = `${subredditUrl}/search?q=${encodeURIComponent(product)}&restrict_sr=1&sort=relevance`
      const response = await this.makeRequest(searchUrl)
      const $ = cheerio.load(response.data)
      
      const reviews = []
      
      // Extract posts and comments
      $('.Post').each((index, element) => {
        if (reviews.length >= maxReviews) return false
        
        const $post = $(element)
        const title = $post.find('h3').text().trim()
        const content = $post.find('[data-testid="post-content"]').text().trim()
        const author = $post.find('[data-testid="post-author"]').text().trim()
        const link = $post.find('a').attr('href')
        
        if (content && content.length > 50) {
          reviews.push({
            source: subredditUrl,
            title: title,
            content: content,
            author: author || 'Reddit User',
            url: link,
            rating: null,
            date: null
          })
        }
      })
      
      return reviews
    } catch (error) {
      console.error('Error scraping Reddit:', error)
      return []
    }
  }

  /**
   * Generic site scraper for review sites
   */
  async scrapeGenericSite(site, product, maxReviews) {
    try {
      const searchUrl = `https://${site}/search?q=${encodeURIComponent(product)}`
      const response = await this.makeRequest(searchUrl)
      const $ = cheerio.load(response.data)
      
      const reviews = []
      
      // Generic selectors for common review patterns
      const reviewSelectors = [
        '.review-content',
        '.review-text',
        '.review-body',
        '.user-review',
        '.comment-content',
        '.review-description',
        '[class*="review"]',
        '[class*="comment"]'
      ]
      
      for (const selector of reviewSelectors) {
        $(selector).each((index, element) => {
          if (reviews.length >= maxReviews) return false
          
          const content = $(element).text().trim()
          if (content && content.length > 30 && content.length < 2000) {
            reviews.push({
              source: site,
              content: content,
              rating: null,
              author: 'User',
              url: searchUrl,
              date: null
            })
          }
        })
        
        if (reviews.length > 0) break // If we found reviews with this selector, stop trying others
      }
      
      return reviews
    } catch (error) {
      console.error(`Error scraping ${site}:`, error)
      return []
    }
  }

  /**
   * Make HTTP request with retries and proper headers
   */
  async makeRequest(url, retries = 0) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      })
      
      return response
    } catch (error) {
      if (retries < this.maxRetries) {
        console.log(`Retrying request to ${url} (attempt ${retries + 1})`)
        await sleepWait(2000 * (retries + 1)) // Exponential backoff
        return this.makeRequest(url, retries + 1)
      }
      throw error
    }
  }

  /**
   * Extract rating from text
   */
  extractRatingFromText(text) {
    if (!text) return null
    
    const ratingMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:out of|\/|\s)\s*(\d+)/)
    if (ratingMatch) {
      return parseFloat(ratingMatch[1])
    }
    
    const starMatch = text.match(/(\d+(?:\.\d+)?)\s*star/)
    if (starMatch) {
      return parseFloat(starMatch[1])
    }
    
    return null
  }

  /**
   * Calculate average rating from reviews
   */
  calculateAverageRating(reviews) {
    const ratingsWithValues = reviews.filter(r => r.rating !== null && r.rating !== undefined)
    if (ratingsWithValues.length === 0) return null
    
    const sum = ratingsWithValues.reduce((acc, review) => acc + review.rating, 0)
    return Math.round((sum / ratingsWithValues.length) * 10) / 10
  }

  /**
   * Generate summary from reviews
   */
  generateSummary(reviews) {
    const totalReviews = reviews.length
    const reviewsWithRatings = reviews.filter(r => r.rating !== null)
    const avgRating = this.calculateAverageRating(reviews)
    
    const sources = [...new Set(reviews.map(r => r.source))]
    
    return {
      totalReviews,
      reviewsWithRatings: reviewsWithRatings.length,
      averageRating: avgRating,
      sources: sources,
      sourceCount: sources.length
    }
  }
}
