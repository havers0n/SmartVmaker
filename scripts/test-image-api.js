// Test script for MiniMax Image Generation API
import 'dotenv/config'
import fetch from 'node-fetch'

const API = 'https://api.minimax.io'
const KEY = process.env.MINIMAX_API_KEY

async function testImageGeneration() {
  console.log('🧪 Testing MiniMax Image Generation API\n')

  if (!KEY) {
    console.error('❌ MINIMAX_API_KEY not found in .env file!')
    process.exit(1)
  }

  console.log('✅ API Key found:', KEY.substring(0, 10) + '...')
  console.log('📡 API Endpoint:', `${API}/v1/image_generation`)
  console.log('\n📝 Request payload:')

  const payload = {
    model: 'image-01',
    prompt: 'A cute cat sleeping on a window sill, photorealistic',
    aspect_ratio: '1:1',
    n: 1,
    response_format: 'url',
  }

  console.log(JSON.stringify(payload, null, 2))
  console.log('\n🚀 Sending request...\n')

  try {
    const response = await fetch(`${API}/v1/image_generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('📊 Response Status:', response.status, response.statusText)
    console.log('📋 Response Headers:')
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`)
    }
    console.log('\n📦 Response Body:')

    const responseText = await response.text()

    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText)
      console.log(JSON.stringify(data, null, 2))

      if (response.ok) {
        console.log('\n✅ SUCCESS!')
        if (data.data && data.data.image_urls) {
          console.log(`\n🖼️ Generated ${data.data.image_urls.length} image(s):`)
          data.data.image_urls.forEach((url, i) => {
            console.log(`   ${i + 1}. ${url}`)
          })
        }
      } else {
        console.log('\n❌ ERROR RESPONSE')
        if (data.base_resp) {
          console.log(`   Code: ${data.base_resp.status_code}`)
          console.log(`   Message: ${data.base_resp.status_msg}`)
        }
      }
    } catch (parseError) {
      console.log('⚠️ Response is not JSON:')
      console.log(responseText.substring(0, 1000))

      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        console.log('\n❌ ERROR: API returned HTML instead of JSON!')
        console.log('This usually means:')
        console.log('   1. Wrong API endpoint')
        console.log('   2. Authentication failed')
        console.log('   3. API key is invalid or expired')
        console.log("   4. Account doesn't have access to image generation")
      }
    }
  } catch (error) {
    console.error('\n💥 Request failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run test
testImageGeneration()
