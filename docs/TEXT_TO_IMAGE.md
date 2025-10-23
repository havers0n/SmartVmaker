# Text-to-Image Generation Guide

## Overview

MiniMax image-01 model allows you to generate high-quality images from text descriptions. Images are generated instantly (no waiting/polling required like videos).

## Quick Example

```bash
# Start server
npm start

# Open browser
http://localhost:8000

# Click "🎨 Text to Image" tab
# Enter prompt and click generate
# Images appear immediately!
```

## API Usage

### Basic Request

```javascript
POST http://localhost:8000/api/generate-image

{
  "prompt": "A serene mountain landscape at sunset, photorealistic, 8k",
  "model": "image-01",
  "aspect_ratio": "16:9",
  "n": 3
}
```

### Response Format

```json
{
  "id": "03ff3cd0820949eb8a410056b5f21d38",
  "data": {
    "image_urls": ["https://...", "https://...", "https://..."]
  },
  "metadata": {
    "success_count": 3,
    "failed_count": 0
  },
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

## Parameters

### Required

- **prompt** (string): Text description, max 1500 characters
- **model** (string): Use `"image-01"`

### Optional

- **aspect_ratio** (string): Image format (default: `"1:1"`)
  - `"1:1"` - 1024x1024 (Square)
  - `"16:9"` - 1280x720 (Widescreen)
  - `"4:3"` - 1152x864 (Standard)
  - `"3:2"` - 1248x832 (Photo)
  - `"2:3"` - 832x1248 (Portrait)
  - `"3:4"` - 864x1152 (Portrait+)
  - `"9:16"` - 720x1280 (Vertical)
  - `"21:9"` - 1344x576 (Ultra-wide)

- **width** & **height** (integer): Custom dimensions
  - Range: [512, 2048]
  - Must be divisible by 8
  - Both must be set together
  - `aspect_ratio` takes priority if both provided

- **n** (integer): Number of images to generate
  - Range: [1, 9]
  - Default: 1

- **seed** (integer): Random seed for reproducibility
  - Same seed + same params = same images
  - If not provided, random seed is generated

- **response_format** (string): Output format
  - `"url"` - Returns image URLs (expires in 24 hours)
  - `"base64"` - Returns base64 encoded images

- **prompt_optimizer** (boolean): AI prompt enhancement
  - `false` - Use exact prompt (default)
  - `true` - AI improves your prompt

## Examples

### Basic - Single Image

```javascript
const response = await fetch('http://localhost:8000/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A cute cat sleeping on a window sill',
    model: 'image-01',
  }),
})

const result = await response.json()
const imageUrl = result.data.image_urls[0]
```

### Multiple Images with Seed

```javascript
const response = await fetch('http://localhost:8000/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Abstract art with vibrant colors and geometric shapes',
    model: 'image-01',
    aspect_ratio: '1:1',
    n: 4,
    seed: 42,
    prompt_optimizer: true,
  }),
})

const result = await response.json()
console.log(`Generated ${result.metadata.success_count} images`)
result.data.image_urls.forEach((url, i) => {
  console.log(`Image ${i + 1}: ${url}`)
})
```

### Custom Dimensions

```javascript
const response = await fetch('http://localhost:8000/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A professional headshot photograph',
    model: 'image-01',
    width: 1024,
    height: 1024,
    n: 1,
  }),
})
```

### Base64 Response

```javascript
const response = await fetch('http://localhost:8000/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A logo design for a tech startup',
    model: 'image-01',
    aspect_ratio: '1:1',
    response_format: 'base64',
  }),
})

const result = await response.json()
const base64Image = result.data.image_base64[0]
// Use: <img src={base64Image} />
```

## Demo Endpoint

Quick test without parameters:

```bash
GET http://localhost:8000/demo/t2i
```

Generates 3 images of a Japanese garden with cherry blossoms.

## Prompt Writing Tips

### Be Specific

❌ "A landscape"
✅ "A serene mountain landscape at sunset with vibrant orange and purple sky"

### Add Style Keywords

- "photorealistic"
- "8k quality"
- "cinematic lighting"
- "oil painting style"
- "digital art"
- "minimalist design"

### Include Details

- Lighting conditions (sunset, morning light, dramatic lighting)
- Mood/atmosphere (serene, energetic, mysterious)
- Art style (watercolor, sketch, 3D render)
- Quality descriptors (high detail, sharp focus, 8k)

### Good Examples

```
"A man in a white t-shirt, full-body, standing front view, outdoors,
with the Venice Beach sign in the background, Los Angeles.
Fashion photography in 90s documentary style, film grain, photorealistic."

"Abstract geometric pattern with vibrant neon colors on dark background,
modern digital art, high contrast, 4k resolution"

"A cozy coffee shop interior with warm lighting, wooden furniture,
plants by the window, rainy day outside, cinematic photography,
shallow depth of field"
```

## Content Safety

Images with sensitive content will be blocked. The API returns:

- `success_count`: Number of generated images
- `failed_count`: Number of blocked images

Example response with blocked content:

```json
{
  "metadata": {
    "success_count": 2,
    "failed_count": 1
  }
}
```

## Error Codes

- `0` - Success
- `1002` - Rate limit (try again later)
- `1004` - Authentication failed (check API key)
- `1008` - Insufficient balance
- `1026` - Sensitive content in prompt
- `2013` - Invalid parameters
- `2049` - Invalid API key

## Limitations

### Image URLs

- URLs expire in **24 hours**
- Download and save images you want to keep
- Or use `response_format: "base64"` for immediate use

### Rate Limits

- Check your MiniMax account for rate limits
- Error 1002 means you hit the limit

### Prompt Length

- Maximum: 1500 characters
- Be concise but descriptive

### Dimensions

- Custom width/height: [512, 2048]
- Must be divisible by 8
- Both must be set together

## Frontend Features

### Gallery Display

- Responsive grid layout
- Auto-fit columns (min 300px)
- Download button for each image
- Statistics display

### User Controls

- 8 aspect ratio options
- 1-9 images per generation
- Seed input for reproducibility
- Prompt optimizer toggle

## Troubleshooting

### "status_code: 1004"

- Check your MINIMAX_API_KEY in .env
- Ensure it starts with "sk-"
- Verify it's valid at https://platform.minimax.io/

### "status_code: 1026"

- Your prompt contains sensitive content
- Rephrase to avoid policy violations
- Be more general or use different wording

### Images not displaying

- Check browser console for errors
- Verify image URLs are accessible
- URLs expire in 24 hours

### Rate limit errors

- Wait a few moments and try again
- Reduce number of images (n parameter)
- Check your account limits

## Comparison: Images vs Videos

| Feature  | Text-to-Image | Text-to-Video |
| -------- | ------------- | ------------- |
| Speed    | Instant       | 1-5 minutes   |
| Polling  | Not needed    | Required      |
| Batch    | Up to 9       | 1 at a time   |
| Format   | URL or base64 | File download |
| Callback | Not used      | Required      |
| Archive  | Not saved     | Auto-archived |

## Next Steps

1. Try the demo: `/demo/t2i`
2. Experiment with different aspect ratios
3. Test prompt optimization
4. Use seeds for consistent results
5. Generate multiple variations with n parameter
6. Combine with Image-to-Video for animations!

## Support

- MiniMax Docs: https://platform.minimax.io/docs
- Error Codes: https://platform.minimax.io/docs/api-reference/errorcode
- API Keys: https://platform.minimax.io/user-center/basic-information/interface-key
