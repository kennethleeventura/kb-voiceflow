#!/usr/bin/env node

/**
 * Quick test script for the conversational bot
 * Run this to test the chat API without starting the full server
 */

import fetch from 'node-fetch'

const API_BASE = 'http://localhost:3000'

async function testChatAPI() {
  console.log('🤖 Testing KB-Voiceflow Conversational Bot API\n')

  const testMessages = [
    'hello there!',
    'what can you help me with?',
    'best eBikes under $2000',
    'how do I create a chatbot?',
    'top rated gaming laptops'
  ]

  const userId = `test_user_${Date.now()}`

  for (const message of testMessages) {
    try {
      console.log(`👤 User: ${message}`)
      
      const response = await fetch(`${API_BASE}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          userId: userId
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log(`🤖 Bot: ${result.response}`)
        console.log(`🧠 Intent: ${result.intent}`)
        if (result.suggestions && result.suggestions.length > 0) {
          console.log(`💡 Suggestions: ${result.suggestions.join(', ')}`)
        }
      } else {
        console.log(`❌ Error: ${result.error}`)
      }
      
      console.log('─'.repeat(80))
      
      // Wait a bit between messages
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`)
      console.log('💡 Make sure the server is running with: npm start enhanced')
      break
    }
  }

  // Test conversation history
  try {
    console.log('\n📚 Testing conversation history...')
    const historyResponse = await fetch(`${API_BASE}/api/chat/history/${userId}`)
    const historyResult = await historyResponse.json()
    
    if (historyResult.success) {
      console.log(`✅ Found ${historyResult.count} messages in history`)
    }
  } catch (error) {
    console.log(`❌ History Error: ${error.message}`)
  }

  console.log('\n🎉 Chat API test completed!')
  console.log('💡 To test the web interface, visit: http://localhost:3000/chat')
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/api/health`)
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Server is running!')
      return true
    }
  } catch (error) {
    console.log('❌ Server is not running!')
    console.log('💡 Start the server with: npm start enhanced')
    console.log('💡 Or: node app-enhanced.js')
    return false
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer()
  
  if (serverRunning) {
    await testChatAPI()
  } else {
    console.log('\n🚀 To start the server and test the chat bot:')
    console.log('1. npm start enhanced')
    console.log('2. Visit http://localhost:3000/chat in your browser')
    console.log('3. Or run this script again: node test-chat.js')
  }
}

main().catch(console.error)
