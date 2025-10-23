# Quick Start Guide - MiniMax Video & Image Generator

## Prerequisites

1. Node.js installed (v14 or higher)
2. MiniMax API key from https://platform.minimax.io/
3. Public URL for callbacks (use ngrok for local development)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file (copy from `.env.example`):

```bash
MINIMAX_API_KEY=sk-your-actual-api-key
PUBLIC_BASE_URL=https://your-subdomain.ngrok-free.app
PORT=8000

# Optional: CORS restrictions (leave empty for development)
CORS_ORIGIN=
```

**Important**:

- Get your API key from https://platform.minimax.io/user-center/basic-information/interface-key
- For local development, use ngrok or similar to expose your localhost
- The PUBLIC_BASE_URL must be accessible from the internet for callbacks to work

### 3. Set Up ngrok (for local development)

```bash
# Install ngrok if you haven't
# Then run:
ngrok http 8000

# Copy the https URL (e.g., https://abc123.ngrok-free.app)
# Paste it as PUBLIC_BASE_URL in your .env file
```

### 4. Start the Server

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════════════════════════╗
║  MiniMax Video Generation Server                         ║
╠═══════════════════════════════════════════════════════════╣
║  Server:    http://localhost:8000                         ║
║  Callback:  https://your.ngrok.dev/hailuo/callback        ║
╠═══════════════════════════════════════════════════════════╣
...
```

### 5. Open Browser

Navigate to: http://localhost:8000

## Using the Interface

### Text to Image (NEW! 🎨)

1. Click on "🎨 Text to Image" tab
2. Enter your prompt (e.g., "A serene mountain landscape at sunset, photorealistic, 8k")
3. Select aspect ratio (1:1, 16:9, 4:3, etc.)
4. Choose number of images (1-9)
5. Optionally set a seed for reproducibility
6. Click "🎨 Сгенерировать изображения"
7. Images appear instantly in a gallery grid!
8. Download any image with the download button

**Features**:

- Instant results (no waiting!)
- Multiple aspect ratios
- Generate up to 9 images at once
- Reproducible results with seed
- AI prompt optimization option

### Text to Video

1. Click on "📝 Text to Video" tab
2. Enter your prompt (e.g., "A cat playing with yarn [Pan left,Zoom in]")
3. Select duration, resolution, and aspect ratio
4. Click "🚀 Сгенерировать видео"
5. Watch real-time status updates
6. Video player appears automatically when ready!

### Image to Video

1. Click on "🖼️ Image to Video" tab
2. Upload an image OR paste image URL
3. Optionally add a prompt for animation
4. Configure settings and submit
5. Wait for automatic polling to complete
6. Watch your animated image!

### Start & End Frames

1. Click on "🎬 Start & End Frames" tab
2. Upload or provide URLs for first and last frame
3. Add transition description
4. Submit and wait for result
5. See smooth transition video!

### Quick Demo

1. Click on "⚡ Quick Demo" tab
2. Choose a pre-configured demo
3. Watch it generate with default settings
4. Perfect for testing!

## Features

### 🔒 Security & Production Ready (NEW!)

- **CORS Allowlist**: Restrict API access to specific domains
- **Helmet Security Headers**: Comprehensive HTTP security
- **Content-Security-Policy**: XSS attack prevention
- **Rate Limiting**: 60 req/min API, 10 req/min demos
- **Health Check**: `/healthz` endpoint for monitoring
- See [SECURITY.md](SECURITY.md) for details

### ✅ Text-to-Image Generation

- Generate high-quality images instantly
- Multiple aspect ratios (1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9)
- Batch generation (up to 9 images)
- Reproducible results with seed parameter
- Beautiful gallery display with download buttons

### ✅ Automatic Status Polling (Videos)

- Frontend automatically polls job status every 3 seconds
- Real-time progress updates
- No manual refresh needed

### ✅ Video Player

- Embedded HTML5 video player
- Appears automatically when video is ready
- Responsive and user-friendly

### ✅ Archive System

- All videos saved to `./out/` (temporary)
- Automatically copied to `./archive/` with timestamps
- Never lose your generated videos!

### ✅ Error Validation

- Clear error messages for missing env variables
- Input validation on frontend and backend
- Helpful hints and examples

## Camera Movement Commands

Use these commands in your prompts:

**Movement**:

- `[Push in]`, `[Pull out]`
- `[Pan left]`, `[Pan right]`
- `[Truck left]`, `[Truck right]`
- `[Pedestal up]`, `[Pedestal down]`
- `[Tilt up]`, `[Tilt down]`
- `[Zoom in]`, `[Zoom out]`

**Style**:

- `[Tracking shot]` - Follow subject
- `[Static shot]` - No camera movement
- `[Shake]` - Shake effect

**Combine movements**:

```
A dancer spins [Pan left,Pedestal up], then bows [Static shot]
```

## Troubleshooting

### "Missing required environment variable"

- Check your `.env` file exists
- Ensure `MINIMAX_API_KEY` and `PUBLIC_BASE_URL` are set
- Restart the server after changing `.env`

### "Callback never received"

- Make sure your PUBLIC_BASE_URL is accessible from internet
- Check ngrok is running if using local development
- Verify no firewall is blocking the callback

### "Video not appearing"

- Wait for polling to complete (up to 10 minutes)
- Check browser console for errors
- Verify files are in `./out/` directory
- Check server logs for download errors

### Videos deleted from ./out/

- Don't worry! They're in `./archive/` folder
- Archive preserves all videos with timestamps
- Format: `YYYY-MM-DDTHH-MM-SS-MS_filename.mp4`

### "Too many requests" (429 error)

- You hit the rate limit (60/min API, 10/min demos)
- Wait a minute and try again
- For production: adjust limits in `server.js`
- See [SECURITY.md](SECURITY.md) for rate limit configuration

### CORS errors in production

- Add your domain to `CORS_ORIGIN` in `.env`
- Example: `CORS_ORIGIN=https://myapp.com,https://www.myapp.com`
- Restart server after changing `.env`
- See [SECURITY.md](SECURITY.md) for CORS setup

### Health check not responding

- Server might be down or overloaded
- Check: `curl http://localhost:8000/healthz`
- Expected response: `{"ok":true, ...}`
- Use for monitoring and load balancer checks

## API Usage (Programmatic)

### Generate Text to Image

```javascript
const response = await fetch('http://localhost:8000/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A serene Japanese garden with cherry blossoms, photorealistic, 8k',
    aspect_ratio: '16:9',
    n: 3,
    prompt_optimizer: true,
    model: 'image-01',
  }),
})

const result = await response.json()
console.log('Images:', result.data.image_urls)
// Images are ready immediately - no polling needed!
```

### Generate Text to Video

```javascript
const response = await fetch('http://localhost:8000/api/generate-text-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A beautiful sunset [Pan right]',
    duration: 6,
    resolution: '1080P',
    aspect_ratio: '16:9',
    model: 'MiniMax-Hailuo-02',
  }),
})

const { task_id } = await response.json()
console.log('Task created:', task_id)
```

### Poll Job Status

```javascript
const response = await fetch(`http://localhost:8000/api/job/${task_id}`)
const job = await response.json()

if (job.status === 'success') {
  console.log('Video ready:', job.public_url)
  // Download or display video
}
```

## File Structure

```
minimax/
├── server.js           # Main server with all improvements
├── public/
│   └── index.html      # Frontend with polling & video player
├── out/                # Temporary video storage
├── archive/            # Permanent video archive
├── .env                # Your configuration
├── CHANGELOG.md        # All improvements documented
└── QUICK_START.md      # This file
```

## Support

For MiniMax API documentation:

- https://platform.minimax.io/docs

For issues with this implementation:

- Check CHANGELOG.md for feature details
- Review server logs for errors
- Ensure all prerequisites are met

## Tips

1. **Resolution vs Duration**: 1080P only supports 6s, use 768P or 512P for 10s
2. **Prompt Quality**: Be specific and descriptive for best results
3. **Camera Commands**: Don't overuse - max 3 combined movements
4. **File Sizes**: Base64 images work but URLs are more efficient
5. **Archive Management**: Archive grows over time - consider cleanup strategy

Enjoy creating videos! 🎬
