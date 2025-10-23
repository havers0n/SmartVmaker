import express from 'express'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { config } from './config/index.js'
import { pgPool, jobs } from './db/client.js'
import { upsertTask, getTaskById } from './db/tasks.js'
import { logger } from './lib/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { setupCORS, setupHelmet, setupCSP, apiLimiter, demoLimiter } from './middleware/security.js'
import { saveTaskStart, saveTaskFinish, getTaskFromSupabase } from '../supabaseClient.js'

// Shortcuts for config
const API = config.api.baseUrl
const KEY = config.api.key
const PORT = config.server.port
const PUBLIC_BASE_URL = config.server.publicBaseUrl

// ---- Express app setup ----
const app = express()

// ---- Security Middleware ----
setupCORS(app)
setupHelmet(app)
setupCSP(app)
app.use('/api', apiLimiter)
app.use('/demo', demoLimiter)

// ---- Application Middleware ----
app.use(express.json({ limit: '10mb' }))

// Serve static files from public directory
app.use(express.static('public'))

// Serve videos from out and archive directories
app.use('/out', express.static('out'))
app.use('/archive', express.static('archive'))

// ---- Health Check ----
app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
  })
})

// ---- Callback handler (validation + status updates) ----

app.post('/hailuo/callback', async (req, res) => {
  try {
    const { challenge, task_id, status, file_id, base_resp } = req.body || {}
    if (challenge !== undefined) {
      // Endpoint validation - must return the same challenge within ≤3s
      return res.json({ challenge })
    }
    console.log('[CALLBACK]', { task_id, status, file_id, base_resp })

    let publicUrl = null

    // Auto-download on success
    if (status === 'success' && file_id) {
      const file = await retrieveFile(file_id)
      console.log('[FILE READY]', file.file?.download_url)
      // Download to disk:
      const outPath = `./out/${file.file.filename}`
      await downloadToDisk(file.file.download_url, outPath)
      console.log('[DOWNLOADED]', outPath)

      // Archive to permanent storage
      await archiveVideo(outPath)

      // Generate public URL for video
      publicUrl = `${PUBLIC_BASE_URL}/out/${file.file.filename}`
    }

    // Update job status in memory
    const now = new Date().toISOString()
    const taskRecord = {
      id: task_id,
      status,
      file_id,
      public_url: publicUrl,
      error: base_resp?.error || null,
      finished_at: status === 'success' || status === 'failed' ? now : null,
    }

    jobs.set(task_id, Object.assign({ timestamp: now, base_resp }, taskRecord))

    // Persist to Postgres (upsert)
    await upsertTask({
      id: task_id,
      status,
      file_id,
      public_url: publicUrl,
      error: base_resp?.error || null,
      finished_at: taskRecord.finished_at,
    })

    // Persist to Supabase
    await saveTaskFinish({
      task_id,
      status,
      file_id,
      public_url: publicUrl,
      errorText: base_resp?.error || null,
    })

    return res.json({ status: 'ok' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: String(e) })
  }
})

// ---- Mini API functions ----
async function hailuoPOST(path, body) {
  console.log(`[API REQUEST] ${path}`, JSON.stringify(body, null, 2))

  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const responseText = await res.text()
  console.log(`[API RESPONSE] Status: ${res.status}`)

  if (!res.ok) {
    console.error(`[API ERROR] ${responseText}`)
    throw new Error(`HTTP ${res.status}: ${responseText}`)
  }

  try {
    return JSON.parse(responseText)
  } catch (e) {
    console.error('[JSON PARSE ERROR]', responseText.substring(0, 500))
    throw new Error(`Failed to parse JSON response: ${responseText.substring(0, 200)}`)
  }
}

async function hailuoGET(path, query) {
  const url = new URL(`${API}${path}`)
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

async function retrieveFile(file_id) {
  return hailuoGET('/v1/files/retrieve', { file_id: String(file_id) })
}

async function downloadToDisk(download_url, outPath) {
  const res = await fetch(download_url)
  if (!res.ok) throw new Error(`DL ${res.status}`)
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
  const fileStream = fs.createWriteStream(outPath)
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream)
    res.body.on('error', reject)
    fileStream.on('finish', resolve)
  })
}

// Archive completed video to permanent storage
async function archiveVideo(sourcePath) {
  const archiveDir = './archive'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = path.basename(sourcePath)
  const archivePath = path.join(archiveDir, `${timestamp}_${filename}`)

  await fs.promises.mkdir(archiveDir, { recursive: true })
  await fs.promises.copyFile(sourcePath, archivePath)

  console.log('[ARCHIVED]', archivePath)
  return archivePath
}

// ---- Generation functions ----

// TEXT → SPEECH (T2S)
// Video Template Generation
export async function generateFromTemplate({ template_id, media_inputs, text_inputs }) {
  const body = {
    template_id,
    media_inputs,
    text_inputs,
  }

  return hailuoPOST('/v1/video_template_generation', body)
}

export async function checkTemplateStatus(task_id) {
  return hailuoGET('/v1/query/video_template_generation', { task_id })
}

// Voice Cloning
export async function cloneVoice({
  file_id,
  voice_id,
  clone_prompt = {},
  text,
  model = 'speech-2.5-hd-preview',
}) {
  const body = {
    file_id,
    voice_id,
    clone_prompt,
    text,
    model,
  }

  return hailuoPOST('/v1/voice_clone', body)
}

export async function createTextToSpeech({
  text,
  model = 'speech-2.5-hd-preview',
  voice_id = 'English_expressive_narrator',
  voice_setting = {
    speed: 1.0,
    vol: 1.0,
    pitch: 0,
  },
  audio_setting = {
    audio_sample_rate: 32000,
    bitrate: 128000,
    format: 'mp3',
    channel: 2,
  },
  voice_modify = null,
  mode = 'sync', // 'sync' or 'async'
}) {
  const body = {
    text,
    model,
    voice_setting: {
      voice_id,
      speed: voice_setting.speed,
      vol: voice_setting.vol,
      pitch: voice_setting.pitch,
    },
    audio_setting,
  }

  if (voice_modify) {
    body.voice_modify = voice_modify
  }

  const endpoint = mode === 'sync' ? '/v1/text_to_audio_v2' : '/v1/text_to_audio_v2_async'
  const result = await hailuoPOST(endpoint, body)

  // For async mode, store initial job status
  if (mode === 'async' && result.task_id) {
    jobs.set(result.task_id, {
      status: 'processing',
      timestamp: new Date().toISOString(),
      params: { text: text.substring(0, 100) + '...', model, voice_id },
    })
  }

  return result
}

// TEXT → IMAGE (T2I)
export async function createTextToImage({
  prompt,
  model = 'image-01',
  aspect_ratio = '1:1', // 1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9
  width = null, // Range [512, 2048], divisible by 8
  height = null, // Range [512, 2048], divisible by 8
  response_format = 'url', // 'url' or 'base64'
  seed = null, // For reproducibility
  n = 1, // Number of images [1-9]
  prompt_optimizer = false,
}) {
  const body = {
    model,
    prompt,
    response_format,
    n,
    prompt_optimizer,
  }

  // aspect_ratio takes priority over width/height
  if (aspect_ratio) {
    body.aspect_ratio = aspect_ratio
  } else if (width && height) {
    body.width = width
    body.height = height
  }

  if (seed !== null) {
    body.seed = seed
  }

  return hailuoPOST('/v1/image_generation', body)
}

// A) TEXT → VIDEO (T2V)
export async function createTextToVideo({
  prompt,
  model = 'MiniMax-Hailuo-02',
  duration = 6, // 6 or 10 (for 768P/512P); 1080P=6
  resolution = '1080P', // 1080P|768P|512P (see limitations)
  aspect_ratio = '16:9', // 16:9 (horizontal), 9:16 (vertical), 1:1 (square)
  prompt_optimizer = true,
  fast_pretreatment = false, // only for MiniMax-Hailuo-02
  topic = null, // optional topic tag
  lang = null, // optional language tag
}) {
  const result = await hailuoPOST('/v1/video_generation', {
    model,
    prompt,
    prompt_optimizer,
    fast_pretreatment,
    duration,
    resolution,
    aspect_ratio,
    callback_url: `${PUBLIC_BASE_URL}/hailuo/callback`,
  })

  // Store initial job status
  if (result.task_id) {
    jobs.set(result.task_id, {
      status: 'processing',
      timestamp: new Date().toISOString(),
      params: { prompt, model, duration, resolution, aspect_ratio },
    })

    // Save to Supabase
    await saveTaskStart({
      task_id: result.task_id,
      kind: 't2v',
      prompt,
      params: { duration, resolution, aspect_ratio },
      topic,
      lang,
    })
  }

  return result
}

// B) IMAGE → VIDEO (I2V)
export async function createImageToVideo({
  first_frame_image, // URL or data URL
  prompt = '',
  model = 'MiniMax-Hailuo-02',
  duration = 6,
  resolution = '1080P',
  aspect_ratio = '16:9',
  prompt_optimizer = true,
  fast_pretreatment = false,
  topic = null, // optional topic tag
  lang = null, // optional language tag
}) {
  const result = await hailuoPOST('/v1/video_generation', {
    model,
    prompt,
    prompt_optimizer,
    fast_pretreatment,
    duration,
    resolution,
    aspect_ratio,
    first_frame_image,
    callback_url: `${PUBLIC_BASE_URL}/hailuo/callback`,
  })

  // Store initial job status
  if (result.task_id) {
    jobs.set(result.task_id, {
      status: 'processing',
      timestamp: new Date().toISOString(),
      params: { prompt, model, duration, resolution, aspect_ratio, has_first_frame: true },
    })

    // Save to Supabase
    await saveTaskStart({
      task_id: result.task_id,
      kind: 'i2v',
      prompt,
      params: { duration, resolution, aspect_ratio, has_first_frame: true },
      topic,
      lang,
    })
  }

  return result
}

// C) START & END FRAMES → VIDEO
export async function createStartEndVideo({
  first_frame_image,
  last_frame_image,
  prompt = '',
  model = 'MiniMax-Hailuo-02',
  duration = 6, // 6 or 10 (for 768P); 1080P=6
  resolution = '1080P', // for this feature 768P and 1080P available
  aspect_ratio = '16:9',
  prompt_optimizer = true,
}) {
  const result = await hailuoPOST('/v1/video_generation', {
    model,
    prompt,
    first_frame_image,
    last_frame_image,
    prompt_optimizer,
    duration,
    resolution,
    aspect_ratio,
    callback_url: `${PUBLIC_BASE_URL}/hailuo/callback`,
  })

  // Store initial job status
  if (result.task_id) {
    jobs.set(result.task_id, {
      status: 'processing',
      timestamp: new Date().toISOString(),
      params: { prompt, model, duration, resolution, aspect_ratio, has_start_end: true },
    })
  }

  return result
}

// ---- Demo endpoints (convenient to call from Postman/browser) ----
app.get('/demo/t2i', async (req, res) => {
  try {
    const result = await createTextToImage({
      prompt:
        'A serene Japanese garden with cherry blossoms, koi pond, and traditional wooden bridge. Soft morning light, photorealistic, 8k quality.',
      aspect_ratio: '16:9',
      n: 3,
      prompt_optimizer: true,
    })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

app.get('/demo/t2v', async (req, res) => {
  try {
    const { task_id } = await createTextToVideo({
      resolution: '1080P',
      duration: 6,
      // Camera commands can be embedded in text:
      prompt:
        'A golden puppy walks toward a street-food stall, hesitating, then decides to help the cook. [Push in] Then the camera tracks sideways as he starts working. [Tracking shot]',
    })
    res.json({ task_id })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

app.get('/demo/i2v', async (req, res) => {
  try {
    const { task_id } = await createImageToVideo({
      resolution: '1080P',
      duration: 6,
      first_frame_image:
        'https://filecdn.minimax.chat/public/fe9d04da-f60e-444d-a2e0-18ae743add33.jpeg',
      prompt:
        'The mouse blinks, smiles, and runs toward the camera through soft morning light. [Pedestal up,Push in]',
    })
    res.json({ task_id })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

app.get('/demo/start-end', async (req, res) => {
  try {
    const { task_id } = await createStartEndVideo({
      resolution: '1080P', // or 768P (then 10 sec possible)
      duration: 6,
      first_frame_image:
        'https://filecdn.minimax.chat/public/fe9d04da-f60e-444d-a2e0-18ae743add33.jpeg',
      last_frame_image:
        'https://filecdn.minimax.chat/public/97b7cd08-764e-4b8b-a7bf-87a0bd898575.jpeg',
      // You can specify dynamics directly in prompt:
      prompt:
        'A little girl grows up across seasons; begin on a close-up, end on a wide shot near a lake. [Pan right,Pedestal up] then [Pull out]',
    })
    res.json({ task_id })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// ---- Custom API endpoints for easy video generation ----

// POST /api/generate-text-video
app.post('/api/generate-text-video', async (req, res) => {
  try {
    const {
      prompt,
      duration = 6,
      resolution = '1080P',
      aspect_ratio = '16:9',
      model = 'MiniMax-Hailuo-02',
    } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' })
    }

    const result = await createTextToVideo({
      prompt,
      duration,
      resolution,
      aspect_ratio,
      model,
    })

    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// POST /api/generate-image-video
app.post('/api/generate-image-video', async (req, res) => {
  try {
    const {
      first_frame_image,
      prompt = '',
      duration = 6,
      resolution = '1080P',
      aspect_ratio = '16:9',
      model = 'MiniMax-Hailuo-02',
    } = req.body

    if (!first_frame_image) {
      return res.status(400).json({ error: 'first_frame_image is required' })
    }

    const result = await createImageToVideo({
      first_frame_image,
      prompt,
      duration,
      resolution,
      aspect_ratio,
      model,
    })

    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// POST /api/generate-start-end-video
app.post('/api/generate-start-end-video', async (req, res) => {
  try {
    const {
      first_frame_image,
      last_frame_image,
      prompt = '',
      duration = 6,
      resolution = '1080P',
      aspect_ratio = '16:9',
      model = 'MiniMax-Hailuo-02',
    } = req.body

    if (!first_frame_image || !last_frame_image) {
      return res.status(400).json({ error: 'first_frame_image and last_frame_image are required' })
    }

    const result = await createStartEndVideo({
      first_frame_image,
      last_frame_image,
      prompt,
      duration,
      resolution,
      aspect_ratio,
      model,
    })

    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// GET /api/file/:file_id - retrieve file info
app.get('/api/file/:file_id', async (req, res) => {
  try {
    const { file_id } = req.params
    const result = await retrieveFile(file_id)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// POST /api/generate-image - Text to Image
app.post('/api/generate-image', async (req, res) => {
  try {
    const {
      prompt,
      model = 'image-01',
      aspect_ratio = '1:1',
      width = null,
      height = null,
      response_format = 'url',
      seed = null,
      n = 1,
      prompt_optimizer = false,
    } = req.body

    if (!prompt) {
      return res.status(400).json({
        error: 'prompt is required',
        base_resp: { status_code: 2013, status_msg: 'prompt is required' },
      })
    }

    const result = await createTextToImage({
      prompt,
      model,
      aspect_ratio,
      width,
      height,
      response_format,
      seed,
      n,
      prompt_optimizer,
    })

    res.json(result)
  } catch (e) {
    console.error('[TEXT-TO-IMAGE ERROR]', e)
    res.status(500).json({
      error: e.message,
      details: String(e),
      base_resp: { status_code: 1000, status_msg: 'Internal error' },
    })
  }
})

// POST /api/t2a_v2 - Text to Audio (Sync)
// POST /api/video-template - Template-based Video Generation
app.post('/api/video-template', async (req, res) => {
  try {
    const { template_id, media_inputs, text_inputs } = req.body

    if (!template_id || !media_inputs || !text_inputs) {
      return res.status(400).json({
        error: 'template_id, media_inputs and text_inputs are required',
        base_resp: { status_code: 2013, status_msg: 'Missing required parameters' },
      })
    }

    const result = await generateFromTemplate({
      template_id,
      media_inputs,
      text_inputs,
    })

    res.json(result)
  } catch (e) {
    console.error('[TEMPLATE GENERATION ERROR]', e)
    res.status(500).json({
      error: e.message,
      details: String(e),
      base_resp: { status_code: 1000, status_msg: 'Internal error' },
    })
  }
})

// GET /api/video-template/status - Check Template Generation Status
app.get('/api/video-template/status', async (req, res) => {
  try {
    const { task_id } = req.query
    if (!task_id) {
      return res.status(400).json({
        error: 'task_id is required',
        base_resp: { status_code: 2013, status_msg: 'Missing task_id' },
      })
    }

    const result = await checkTemplateStatus(task_id)
    res.json(result)
  } catch (e) {
    console.error('[TEMPLATE STATUS ERROR]', e)
    res.status(500).json({
      error: e.message,
      details: String(e),
      base_resp: { status_code: 1000, status_msg: 'Internal error' },
    })
  }
})

// POST /api/upload - File Upload for voice cloning
app.post('/api/upload', async (req, res) => {
  try {
    const { file, purpose } = req.body
    if (!file) {
      return res.status(400).json({
        error: 'file is required',
        base_resp: { status_code: 2013, status_msg: 'file is required' },
      })
    }

    const result = await hailuoPOST('/v1/files/upload', { file, purpose })
    res.json(result)
  } catch (e) {
    console.error('[FILE UPLOAD ERROR]', e)
    res.status(500).json({
      error: e.message,
      details: String(e),
      base_resp: { status_code: 1000, status_msg: 'Internal error' },
    })
  }
})

// POST /api/voice-clone - Voice Cloning
app.post('/api/voice-clone', async (req, res) => {
  try {
    const { file_id, voice_id, clone_prompt = {}, text, model = 'speech-2.5-hd-preview' } = req.body

    if (!file_id || !voice_id || !text) {
      return res.status(400).json({
        error: 'file_id, voice_id and text are required',
        base_resp: { status_code: 2013, status_msg: 'Missing required parameters' },
      })
    }

    const result = await cloneVoice({
      file_id,
      voice_id,
      clone_prompt,
      text,
      model,
    })

    res.json(result)
  } catch (e) {
    console.error('[VOICE CLONE ERROR]', e)
    res.status(500).json({
      error: e.message,
      details: String(e),
      base_resp: { status_code: 1000, status_msg: 'Internal error' },
    })
  }
})

// POST /api/compose - best-effort composition of clips + audio into final MP4
app.post('/api/compose', async (req, res) => {
  try {
    const { clips = [], audio } = req.body
    if (!Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ error: 'clips array is required' })
    }

    // Require ffmpeg installed
    const { execFile } = await import('child_process')
    const tmpDir = './out/tmp_compose'
    await fs.promises.mkdir(tmpDir, { recursive: true })

    // Download all clip URLs and audio to tmp
    const downloaded = []
    let idx = 0
    for (const c of clips) {
      idx++
      const ext = path.extname(new URL(c.url).pathname) || '.mp4'
      const localPath = path.join(tmpDir, `clip_${idx}${ext}`)
      const w = await fetch(c.url)
      if (!w.ok) throw new Error('Failed to download clip: ' + c.url)
      const buffer = await w.arrayBuffer()
      await fs.promises.writeFile(localPath, Buffer.from(buffer))
      downloaded.push(localPath)
    }

    let audioPath = null
    if (audio) {
      const a = await fetch(audio)
      if (!a.ok) throw new Error('Failed to download audio: ' + audio)
      const ext = path.extname(new URL(audio).pathname) || '.mp3'
      audioPath = path.join(tmpDir, `audio${ext}`)
      const buffer = await a.arrayBuffer()
      await fs.promises.writeFile(audioPath, Buffer.from(buffer))
    }

    // Create concat file list
    const concatFile = path.join(tmpDir, 'files.txt')
    const content = downloaded
      .map((p) => `file '${path.resolve(p).replace(/\\/g, '/')}'`)
      .join('\n')
    await fs.promises.writeFile(concatFile, content)

    const outName = `short_${Date.now()}.mp4`
    const outPath = path.join('./out', outName)

    // Build ffmpeg args
    const args = ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', outPath]
    // If audio present, remux and add audio
    if (audioPath) {
      // First create a concatenated video-only file
      const tmpConcat = path.join(tmpDir, 'concat.mp4')
      await new Promise((resolve, reject) => {
        execFile(
          'ffmpeg',
          ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', tmpConcat],
          (err) => (err ? reject(err) : resolve())
        )
      })
      // Then merge audio (audio will be looped/truncated to video length)
      await new Promise((resolve, reject) => {
        execFile(
          'ffmpeg',
          [
            '-y',
            '-i',
            tmpConcat,
            '-i',
            audioPath,
            '-c:v',
            'copy',
            '-c:a',
            'aac',
            '-shortest',
            outPath,
          ],
          (err, stdout, stderr) => (err ? reject(err) : resolve())
        )
      })
    } else {
      // No audio - simple concat
      await new Promise((resolve, reject) => {
        execFile('ffmpeg', args, (err) => (err ? reject(err) : resolve()))
      })
    }

    // Archive and respond with public URL
    await archiveVideo(outPath)
    const publicUrl = `${PUBLIC_BASE_URL}/out/${outName}`

    return res.json({ status: 'ok', out: outPath, public_url: publicUrl })
  } catch (e) {
    console.error('[COMPOSE ERROR]', e)
    return res.status(500).json({ error: String(e) })
  }
})

app.post('/api/t2a_v2', async (req, res) => {
  try {
    const {
      text,
      model = 'speech-2.5-hd-preview',
      voice_setting = {},
      audio_setting = {},
      voice_modify = null,
    } = req.body

    if (!text) {
      return res.status(400).json({
        error: 'text is required',
        base_resp: { status_code: 2013, status_msg: 'text is required' },
      })
    }

    if (text.length > 10000) {
      return res.status(400).json({
        error: 'Text too long for sync mode (max 10K chars)',
        base_resp: { status_code: 2014, status_msg: 'Text too long' },
      })
    }

    const result = await createTextToSpeech({
      text,
      model,
      voice_setting,
      audio_setting,
      voice_modify,
      mode: 'sync',
    })

    res.json(result)
  } catch (e) {
    console.error('[TEXT-TO-AUDIO ERROR]', e)
    res.status(500).json({
      error: e.message,
      details: String(e),
      base_resp: { status_code: 1000, status_msg: 'Internal error' },
    })
  }
})

// POST /api/t2a_async_v2 - Text to Audio (Async)
app.post('/api/t2a_async_v2', async (req, res) => {
  try {
    const {
      text,
      model = 'speech-2.5-hd-preview',
      voice_setting = {},
      audio_setting = {},
      voice_modify = null,
    } = req.body

    if (!text) {
      return res.status(400).json({
        error: 'text is required',
        base_resp: { status_code: 2013, status_msg: 'text is required' },
      })
    }

    if (text.length > 1000000) {
      return res.status(400).json({
        error: 'Text too long (max 1M chars)',
        base_resp: { status_code: 2014, status_msg: 'Text too long' },
      })
    }

    const result = await createTextToSpeech({
      text,
      model,
      voice_setting,
      audio_setting,
      voice_modify,
      mode: 'async',
    })

    res.json(result)
  } catch (e) {
    console.error('[TEXT-TO-AUDIO ERROR]', e)
    res.status(500).json({
      error: e.message,
      details: String(e),
      base_resp: { status_code: 1000, status_msg: 'Internal error' },
    })
  }
})

// GET /api/job/:task_id - poll job status
app.get('/api/job/:task_id', (req, res) => {
  const { task_id } = req.params
  ;(async () => {
    try {
      // Try Supabase first (if available)
      try {
        const supabaseTask = await getTaskFromSupabase(task_id)
        if (supabaseTask) {
          return res.json(supabaseTask)
        }
      } catch (e) {
        console.log('[SUPABASE FALLBACK]', e?.message)
      }

      // Fall back to Postgres
      if (pgPool) {
        const dbTask = await getTaskById(task_id)
        if (dbTask) {
          return res.json(dbTask)
        }
      }

      // Fall back to in-memory cache
      const job = jobs.get(task_id)
      if (!job) {
        return res.json({ status: 'pending', message: 'Job not found or not yet started' })
      }
      return res.json(job)
    } catch (e) {
      console.error('[JOB POLL ERROR]', e)
      return res.status(500).json({ error: String(e) })
    }
  })()
})

// ---- Error Handler (must be last) ----
app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════════╗
║  MiniMax Video & Image Generation Server v2.0            ║
╠═══════════════════════════════════════════════════════════╣
║  Server:     http://localhost:${PORT}                         ║
║  Healthz:    http://localhost:${PORT}/healthz                 ║
║  Callback:   ${PUBLIC_BASE_URL}/hailuo/callback${' '.repeat(Math.max(0, 17 - (PUBLIC_BASE_URL?.length || 0)))}║
╠═══════════════════════════════════════════════════════════╣
║  Demo Endpoints:                                          ║
║  GET  /demo/t2i         - Text to Image demo 🎨           ║
║  GET  /demo/t2v         - Text to Video demo              ║
║  GET  /demo/i2v         - Image to Video demo             ║
║  GET  /demo/start-end   - Start+End frames demo           ║
╠═══════════════════════════════════════════════════════════╣
║  API Endpoints:                                           ║
║  POST /api/generate-image            - Text to Image 🎨   ║
║  POST /api/generate-text-video       - Text to Video      ║
║  POST /api/generate-image-video      - Image to Video     ║
║  POST /api/generate-start-end-video  - Start+End frames   ║
║  POST /api/t2a_v2                   - Text to Audio 🎧    ║
║  POST /api/t2a_async_v2             - TTS Async          ║
║  POST /api/voice-clone              - Voice Clone 🎤     ║
║  POST /api/upload                   - File Upload        ║
║  POST /api/video-template           - Video Templates 📽️  ║
║  GET  /api/video-template/status    - Template Status    ║
║  GET  /api/file/:file_id             - File info          ║
║  GET  /api/job/:task_id              - Poll job status    ║
╠═══════════════════════════════════════════════════════════╣
║  Security Features: 🔒                                    ║
║  ✅ CORS allowlist (${config.cors.origins.length > 0 ? config.cors.origins.length + ' origin(s)' : 'unrestricted'})${' '.repeat(Math.max(0, 27 - (config.cors.origins.length > 0 ? (config.cors.origins.length + ' origin(s)').length : 'unrestricted'.length)))}║
║  ✅ Helmet security headers                               ║
║  ✅ Content-Security-Policy                               ║
║  ✅ Rate limiting (60/min API, 10/min demos)              ║
╠═══════════════════════════════════════════════════════════╣
║  Features:                                                ║
║  ✅ Text-to-Image generation                              ║
║  ✅ Auto-polling job status (videos)                      ║
║  ✅ Video player & Image gallery                          ║
║  ✅ Archive to ./archive/                                 ║
║  ✅ Static serving: /out, /archive                        ║
╚═══════════════════════════════════════════════════════════╝
  `)
})
