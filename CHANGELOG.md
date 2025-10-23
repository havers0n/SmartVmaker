# Changelog - MiniMax Video & Image Generator

## Version 2.2 - Backend Refactoring 🏗️

### ✅ Modular Architecture

**Refactored monolithic server into modular structure:**

1. **Configuration Module** (`src/config/index.js`)
   - Centralized environment variable validation
   - Typed configuration object exports
   - Clear error messages for missing required vars
   - Organized by domain: api, server, database, supabase, cors

2. **Database Module** (`src/db/`)
   - `client.js` - PostgreSQL pool initialization and job cache
   - `tasks.js` - Task database operations (upsertTask, getTaskById)
   - Separation of connection management from business logic
   - Graceful handling of missing DATABASE_URL

3. **Security Middleware** (`src/middleware/security.js`)
   - `setupCORS()` - CORS configuration with allowlist
   - `setupHelmet()` - Security headers setup
   - `setupCSP()` - Content-Security-Policy setup
   - `apiLimiter` - API rate limiting (60/min)
   - `demoLimiter` - Demo rate limiting (10/min)
   - Clean separation of security concerns

4. **Server Bootstrap** (`src/server.js`)
   - Reduced from 1172 to ~1100 lines
   - Clean imports from modular structure
   - Focused on route definitions and application logic
   - Uses imported config, db, and security modules

**File Structure Changes:**

```
src/
├── config/
│   └── index.js          # Environment & config
├── db/
│   ├── client.js         # PostgreSQL pool
│   └── tasks.js          # Task operations
├── lib/
│   └── logger.js         # Pino logger
├── middleware/
│   ├── errorHandler.js   # Error handling
│   └── security.js       # Security middleware
└── server.js             # Main server (refactored)
```

**Benefits:**
- Better code organization and maintainability
- Easier testing and debugging
- Clear separation of concerns
- Simplified future enhancements
- Reduced cognitive load when working with code

**Breaking Changes:**
- None - API and functionality remain unchanged
- Server entry point moved: `node server.js` → `node src/server.js`
- package.json updated automatically

---

## Version 2.1 - Code Quality & Repository Organization 🧹

### ✅ Repository Organization

**Documentation Restructuring:**

1. **Organized Documentation Structure**
   - Created `docs/` for project documentation
   - Moved MiniMax API reference to `docs.me/` (git-ignored)
   - Moved `SUPABASE_SETUP.md` and `TEXT_TO_IMAGE.md` to `docs/`
   - Cleaned up root directory from 22 to 4 .md files

2. **Scripts Organization**
   - Moved all utility scripts to `scripts/` folder
   - Created `scripts/README.md` with documentation
   - Organized: `checkSupabaseConnection.js`, `test-image-api.js`, `ingest_yt_samples.js`

3. **Updated `.gitignore`**
   - Added `docs.me/` (external API reference)
   - Added `archive/` (generated videos)
   - Added audio file extensions (`.mp3`, `.wav`)

### ✅ Code Quality Improvements

**Infrastructure & Tooling:**

1. **Structured Logging with Pino**

   - Replaced console.log with structured logging
   - Pretty output for development
   - JSON logging for production
   - **Dependencies**: `pino`, `pino-pretty`
   - **Location**: `src/lib/logger.js`

2. **Centralized Error Handling**

   - Global error handler middleware
   - Consistent error response format
   - Structured error logging
   - **Location**: `src/middleware/errorHandler.js`

3. **Code Style & Linting**

   - ESLint configuration for code quality
   - Prettier for consistent formatting
   - Pre-configured rules for Node.js/ES modules
   - **Scripts**: `npm run lint`, `npm run format`

4. **Code Cleanup**
   - Removed obsolete files: `publicindex.html`, `nul`, `Quick Start - MiniMax API Docs.html`
   - All code formatted with Prettier
   - Clean repository structure

**Dependencies Added**:

- `pino` - Structured logging
- `pino-pretty` - Pretty logging for development
- `eslint` - Code linting
- `prettier` - Code formatting
- `eslint-config-prettier` - ESLint + Prettier integration
- `eslint-plugin-import` - Import/export linting
- `eslint-plugin-n` - Node.js specific rules
- `eslint-plugin-promise` - Promise best practices

**New Files**:

- `eslint.config.js` - ESLint configuration (flat config for ESLint 9+)
- `.prettierrc` - Prettier configuration
- `src/lib/logger.js` - Centralized logger
- `src/middleware/errorHandler.js` - Error handling middleware

---

## Version 2.0 - Security & Production Ready! 🔒

### ✅ Security Features Added (NEW!)

**Production-ready security enhancements:**

1. **CORS Allowlist**
   - Multi-domain CORS support via `CORS_ORIGIN` env variable
   - Comma-separated list of allowed origins
   - No restrictions in development (empty value)
   - Example: `CORS_ORIGIN=https://myapp.com,https://app.example.com`
   - **Location**: `server.js:32-42`

2. **Helmet Security Headers**
   - Comprehensive security headers via helmet middleware
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: SAMEORIGIN
   - X-XSS-Protection: 1; mode=block
   - Strict-Transport-Security for HTTPS
   - **Location**: `server.js:44-48`

3. **Content-Security-Policy (CSP)**
   - Strict CSP rules to prevent XSS attacks
   - Allows images from HTTPS sources (for MiniMax URLs)
   - Allows media from HTTPS sources (for videos)
   - Inline styles allowed for UI
   - No unsafe scripts or objects
   - **Location**: `server.js:50-55`

4. **Rate Limiting**
   - API endpoints: 60 requests/minute
   - Demo endpoints: 10 requests/minute
   - Automatic 429 response when exceeded
   - Standard rate limit headers included
   - Prevents abuse and DoS attacks
   - **Location**: `server.js:57-73`

5. **Health Check Endpoint**
   - `GET /healthz` for monitoring
   - Returns: status, timestamp, uptime, version
   - Perfect for load balancers and monitoring tools
   - **Location**: `server.js:86-93`

**Dependencies Added**:

- `cors` - CORS middleware
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting

---

## Latest Update: Text-to-Image Generation Added! 🎨

### ✅ Text-to-Image Generation (NEW!)

**Feature**: Complete Text-to-Image generation support using MiniMax image-01 model.

**What's included**:

- Full API integration with MiniMax image generation endpoint
- New `/api/generate-image` endpoint
- Dedicated "Text to Image" tab in UI
- Support for multiple aspect ratios (1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9)
- Generate 1-9 images per request
- Seed support for reproducibility
- Prompt optimizer option
- Image gallery display with download buttons
- Demo endpoint `/demo/t2i`

**Aspect Ratios Supported**:

- 1:1 (1024x1024) - Square
- 16:9 (1280x720) - Widescreen
- 4:3 (1152x864) - Standard
- 3:2 (1248x832) - Photo
- 2:3 (832x1248) - Portrait
- 3:4 (864x1152) - Portrait+
- 9:16 (720x1280) - Vertical
- 21:9 (1344x576) - Ultra-wide

**Features**:

- Instant results (no polling needed)
- Grid layout for multiple images
- Direct download links
- Statistics display (success/failed counts)
- Trace ID for debugging

**Location**:

- Backend: `server.js:135-167`, `server.js:417-452`, `server.js:273-283`
- Frontend: `public/index.html:500-568`, `public/index.html:921-1013`

---

## Previous Improvements Made

### 1. ✅ Fixed File Deletion Issue - Archive System

**Problem**: When new videos arrived in `out/` folder, previous ones were deleted.

**Solution**:

- Videos are now automatically copied to `./archive/` folder with timestamp prefixes
- Original files remain in `./out/` for quick access
- Archive preserves all generated videos permanently
- Archive folder structure: `./archive/YYYY-MM-DDTHH-MM-SS-MS_filename.mp4`

**Location**: `server.js:89-100`, callback handler at `server.js:55-56`

---

### 2. ✅ Fixed Tab Switching Bug

**Problem**: Tab switching failed because `event` parameter was not passed to `switchTab()` function.

**Solution**:

- Updated all tab buttons to pass `event` parameter: `onclick="switchTab(event, 'tabName')"`
- Modified `switchTab()` function signature to accept event: `function switchTab(e, tabName)`
- Changed `event.target` to `e.currentTarget` for proper element reference

**Location**: `public/index.html:309-312`, `public/index.html:583-595`

---

### 3. ✅ Added .env Validation

**Problem**: Application could start with missing environment variables, causing cryptic errors later.

**Solution**:

- Created `requireEnv()` helper function that validates required env variables
- Application now fails fast with clear error messages if variables are missing
- Required variables: `MINIMAX_API_KEY`, `PUBLIC_BASE_URL`

**Example error message**:

```
❌ Missing required environment variable: MINIMAX_API_KEY
Please check your .env file.
```

**Location**: `server.js:8-14`

---

### 4. ✅ Implemented Job Status Tracking

**Problem**: No way to track video generation status or know when videos are ready.

**Solution**:

- Added in-memory Map to store job statuses: `jobs = new Map()`
- Each task stores: status, file_id, public_url, timestamp, params
- Jobs are created with 'processing' status when task starts
- Status updated to 'success' or 'failed' when callback is received
- Public URLs generated for completed videos

**Location**: `server.js:22`, callback handler at `server.js:63-69`, all generation functions updated

---

### 5. ✅ Added Job Status Polling Endpoint

**Problem**: Frontend had no way to check video generation progress.

**Solution**:

- New endpoint: `GET /api/job/:task_id`
- Returns current job status, file info, and public URL when ready
- Returns `{status: 'pending'}` if job not found
- Can be polled every few seconds until completion

**Example response**:

```json
{
  "status": "success",
  "file_id": "205258526306433",
  "public_url": "http://localhost:8000/out/video.mp4",
  "timestamp": "2025-10-22T12:34:56.789Z",
  "params": { "prompt": "...", "model": "MiniMax-Hailuo-02" }
}
```

**Location**: `server.js:383-395`

---

### 6. ✅ Added Video Player to Frontend

**Problem**: No way to preview completed videos in the interface.

**Solution**:

- Modified `showResult()` to detect `public_url` in response
- Automatically displays HTML5 video player when video is ready
- Player is responsive with max-width of 800px
- Shows below task info and above server response JSON

**Location**: `public/index.html:617-624`

---

### 7. ✅ Implemented Frontend Status Polling

**Problem**: Users had to manually check if video generation completed.

**Solution**:

- Added `pollJobStatus()` function that automatically polls `/api/job/:task_id`
- Polls every 3 seconds (configurable)
- Maximum 200 attempts (10 minutes)
- Updates UI in real-time with progress
- Automatically displays video player when ready
- Integrated into all form submissions (T2V, I2V, Start+End, Demo)

**Features**:

- Shows attempt counter: "Обработка... (попытка 5/200)"
- Status updates: Processing → Ready/Failed
- Automatic video player display on success
- Error handling with retry logic

**Location**: `public/index.html:642-698`, integrated at `727-728`, `779-781`, `841-843`, `861-863`

---

### 8. ✅ Serve Static Video Files

**Problem**: Generated videos weren't accessible via public URLs.

**Solution**:

- Added static file serving for `/out` directory
- Added static file serving for `/archive` directory
- Videos accessible at `http://localhost:8000/out/filename.mp4`
- Archived videos at `http://localhost:8000/archive/timestamp_filename.mp4`

**Location**: `server.js:32-33`

---

## Additional Improvements

### Better Error Messages

All API errors now include descriptive messages instead of generic failures.

### Improved Code Organization

- Clear separation of concerns
- Helper functions properly documented
- Consistent error handling throughout

### Enhanced User Experience

- Real-time progress updates
- Automatic video playback when ready
- No manual refresh needed
- Clear status indicators

---

## API Endpoints Summary

### Image Generation (NEW! 🎨)

- `POST /api/generate-image` - Text to Image
- `GET /demo/t2i` - Text to Image demo

### Video Generation

- `POST /api/generate-text-video` - Text to Video
- `POST /api/generate-image-video` - Image to Video
- `POST /api/generate-start-end-video` - Start & End Frames

### Status & Files

- `GET /api/job/:task_id` - Poll job status
- `GET /api/file/:file_id` - Get file info

### Demo Endpoints

- `GET /demo/t2i` - Text to Image demo (NEW! 🎨)
- `GET /demo/t2v` - Text to Video demo
- `GET /demo/i2v` - Image to Video demo
- `GET /demo/start-end` - Start & End demo

### Static Files

- `/out/*` - Generated videos (temporary)
- `/archive/*` - Archived videos (permanent)

---

## Usage

1. Start the server:

```bash
npm start
```

2. Open browser to `http://localhost:8000`

3. Generate a video using any tab:
   - Text to Video
   - Image to Video
   - Start & End Frames
   - Quick Demo

4. Watch real-time progress updates

5. Video player appears automatically when ready

6. All videos saved to:
   - `./out/` (temporary)
   - `./archive/` (permanent with timestamps)

---

## Environment Variables

Required in `.env`:

```
MINIMAX_API_KEY=sk-your-api-key
PUBLIC_BASE_URL=http://localhost:8000
PORT=8000
```

The app will fail with clear error if these are missing!

---

## Notes

- Job status is stored in-memory (lost on restart)
- For production, use Redis or database for job persistence
- Archive folder grows over time - consider cleanup strategy
- Base64 images work but URLs are more efficient for large files
