#!/usr/bin/env node

/**
 * KB-Voiceflow Startup Script
 * 
 * This script allows you to choose between different versions of the application:
 * - Original: The basic KB-Voiceflow application
 * - Enhanced: The enhanced version with review aggregation and advanced features
 */

import { spawn } from 'child_process'
import { readFileSync } from 'fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'))

console.log('🚀 KB-Voiceflow Application Launcher')
console.log(`📦 Version: ${packageJson.version}`)
console.log('=' .repeat(50))

// Get command line arguments
const args = process.argv.slice(2)
const mode = args[0] || 'enhanced'

// Available modes
const modes = {
  'original': {
    file: 'app.js',
    description: 'Original KB-Voiceflow application with basic features',
    features: [
      '✅ Content ingestion (URLs, PDFs, sitemaps)',
      '✅ Vector search with OpenSearch',
      '✅ Q&A with LangChain',
      '✅ Redis caching',
      '✅ Basic health checks'
    ]
  },
  'enhanced': {
    file: 'app-enhanced.js',
    description: 'Enhanced KB-Voiceflow with review aggregation and advanced features',
    features: [
      '✅ All original features',
      '🔍 Intelligent review aggregation',
      '🧠 AI-powered intent detection',
      '🌐 Multi-source review scraping',
      '📊 Sentiment analysis and insights',
      '🛡️ Enhanced security (Helmet, CORS, Rate limiting)',
      '📋 Collection management API',
      '⚡ Batch processing',
      '🏥 Advanced health monitoring',
      '🔧 Input validation and error handling'
    ]
  }
}

function showHelp() {
  console.log('\n📖 Usage:')
  console.log('  npm start [mode]')
  console.log('  node start.js [mode]')
  console.log('\n🎯 Available modes:')
  
  Object.entries(modes).forEach(([key, config]) => {
    console.log(`\n  ${key}:`)
    console.log(`    ${config.description}`)
    config.features.forEach(feature => {
      console.log(`    ${feature}`)
    })
  })
  
  console.log('\n💡 Examples:')
  console.log('  npm start enhanced    # Start enhanced version (default)')
  console.log('  npm start original    # Start original version')
  console.log('  npm start help        # Show this help')
  console.log('')
}

function checkEnvironment() {
  const requiredVars = ['OPENAI_API_KEY']
  const optionalVars = [
    'OPENSEARCH_URL',
    'REDIS_URL', 
    'PORT',
    'UNSTRUCTURED_URL',
    'OPENSEARCH_DEFAULT_INDEX'
  ]
  
  console.log('🔍 Environment Check:')
  
  let hasErrors = false
  
  // Check required variables
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName}: Set`)
    } else {
      console.log(`  ❌ ${varName}: Missing (Required)`)
      hasErrors = true
    }
  })
  
  // Check optional variables
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName}: ${process.env[varName]}`)
    } else {
      console.log(`  ⚠️  ${varName}: Using default`)
    }
  })
  
  if (hasErrors) {
    console.log('\n❌ Missing required environment variables!')
    console.log('💡 Please check your .env file or set the required variables.')
    console.log('📖 See .env.example for reference.')
    return false
  }
  
  console.log('✅ Environment check passed!')
  return true
}

function startApplication(mode) {
  const config = modes[mode]
  
  if (!config) {
    console.log(`❌ Unknown mode: ${mode}`)
    showHelp()
    process.exit(1)
  }
  
  console.log(`\n🚀 Starting ${mode} mode...`)
  console.log(`📄 File: ${config.file}`)
  console.log(`📝 ${config.description}`)
  
  // Check environment before starting
  if (!checkEnvironment()) {
    process.exit(1)
  }
  
  console.log(`\n🎯 Features enabled:`)
  config.features.forEach(feature => {
    console.log(`  ${feature}`)
  })
  
  console.log('\n' + '='.repeat(50))
  console.log('🚀 Starting server...\n')
  
  // Start the application
  const child = spawn('node', [config.file], {
    stdio: 'inherit',
    env: process.env
  })
  
  child.on('error', (error) => {
    console.error('❌ Failed to start application:', error)
    process.exit(1)
  })
  
  child.on('exit', (code) => {
    if (code !== 0) {
      console.log(`❌ Application exited with code ${code}`)
    }
    process.exit(code)
  })
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down...')
    child.kill('SIGINT')
  })
  
  process.on('SIGTERM', () => {
    console.log('\n🔄 Shutting down...')
    child.kill('SIGTERM')
  })
}

// Handle command line arguments
if (args.includes('help') || args.includes('--help') || args.includes('-h')) {
  showHelp()
  process.exit(0)
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(packageJson.version)
  process.exit(0)
}

// Start the application
startApplication(mode)
