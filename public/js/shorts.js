// Orchestrator for 1-click "Generate Short" pipeline
// API_BASE is declared in main.js

function appendLog(msg) {
  const el = document.getElementById('shortsLog')
  if (!el) return
  el.style.display = 'block'
  el.textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`
  el.scrollTop = el.scrollHeight
}

async function buildScript(topic, language, beatDuration, mode) {
  appendLog('Building script...')
  // Very small local heuristic: break topic into 4 beats
  const beats = [
    { id: 'hook', prompt: `${topic} - Hook`, duration: beatDuration },
    { id: 'build', prompt: `${topic} - Build`, duration: beatDuration },
    { id: 'payoff', prompt: `${topic} - Payoff`, duration: beatDuration },
    { id: 'resolution', prompt: `${topic} - Resolution`, duration: beatDuration },
  ]
  // Return JSON scenario
  const scenario = { language, topic, beats }
  appendLog('Script built with ' + beats.length + ' beats')
  return scenario
}

async function generateAssetsForBeat(beat, mode) {
  appendLog(`Generating assets for beat '${beat.id}' (${mode})`)
  if (mode === 'i2v') {
    // Generate a key image per beat via server /api/generate-image
    const prompt = beat.prompt
    const resp = await fetch(`${API_BASE}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, n: 1, aspect_ratio: '16:9' }),
    })
    if (!resp.ok) throw new Error('Image generation failed')
    const data = await resp.json()
    // Prefer returned URL
    const url = data.data?.image_urls?.[0] || data.image_url || null
    if (!url) throw new Error('No image URL returned')
    appendLog(`Image generated: ${url}`)
    return { type: 'image', url }
  } else {
    // T2V: prepare prompt chunks
    appendLog(`Prepared T2V prompt: ${beat.prompt}`)
    return { type: 'prompt', prompt: beat.prompt }
  }
}

async function synthesizeVoice(text, voice_id, speed) {
  appendLog('Synthesizing voice')
  const resp = await fetch(`${API_BASE}/api/t2a_v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model: 'speech-2.5-hd-preview',
      voice_setting: { voice_id, speed: parseFloat(speed), vol: 1.0 },
      audio_setting: { format: 'mp3', audio_sample_rate: 32000, bitrate: 128000, channel: 2 },
    }),
  })
  if (!resp.ok) throw new Error('TTS failed')
  const data = await resp.json()
  const audioUrl = data.audio || data.result?.audio || data.public_url || null
  if (!audioUrl) throw new Error('No audio URL returned')
  appendLog('Voice synthesized: ' + audioUrl)
  return audioUrl
}

async function composeClips(clips, outputName = null) {
  appendLog('Requesting server to compose clips')
  const resp = await fetch(`${API_BASE}/api/compose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clips }),
  })
  if (!resp.ok) throw new Error('Compose failed')
  const data = await resp.json()
  appendLog('Compose job created: ' + JSON.stringify(data))
  return data
}

async function runShortPipeline(opts) {
  const { topic, language, mode, voice_id, speed, beat_duration } = opts
  appendLog('Pipeline started')
  showLoading('shortsLoading')
  try {
    const scenario = await buildScript(topic, language, beat_duration, mode)

    // Step: Assets
    const clips = []
    for (const beat of scenario.beats) {
      const asset = await generateAssetsForBeat(beat, mode)
      if (asset.type === 'image') {
        // Create an image->video clip via server
        appendLog('Requesting I2V for beat ' + beat.id)
        const resp = await fetch(`${API_BASE}/api/generate-image-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_frame_image: asset.url,
            prompt: beat.prompt,
            duration: beat.duration,
            resolution: '1080P',
            aspect_ratio: '9:16',
          }),
        })
        const job = await resp.json()
        if (!resp.ok) throw new Error('I2V request failed')
        appendLog('I2V task queued: ' + job.task_id)
        clips.push({ type: 'job', id: job.task_id, beat: beat.id })
      } else if (asset.type === 'prompt') {
        appendLog('Requesting T2V for beat ' + beat.id)
        const resp = await fetch(`${API_BASE}/api/generate-text-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: asset.prompt,
            duration: beat.duration,
            resolution: '1080P',
            aspect_ratio: '9:16',
          }),
        })
        const job = await resp.json()
        if (!resp.ok) throw new Error('T2V request failed')
        appendLog('T2V task queued: ' + job.task_id)
        clips.push({ type: 'job', id: job.task_id, beat: beat.id })
      }
    }

    // Step: Voice & Subtitles — synthesize full narration from concatenated beats
    const fullText = scenario.beats.map((b) => b.prompt).join('\n')
    const audioUrl = await synthesizeVoice(fullText, voice_id, speed)

    // Wait for all video jobs to finish and collect resulting public URLs
    const clipUrls = []
    for (const c of clips) {
      appendLog('Polling for job ' + c.id)
      let finished = false
      for (let i = 0; i < 120; i++) {
        // up to ~10 min
        const r = await fetch(`${API_BASE}/api/job/${c.id}`)
        const status = await r.json()
        if (status.status === 'success' && status.public_url) {
          clipUrls.push({ url: status.public_url, beat: c.beat })
          appendLog('Job finished: ' + c.id + ' -> ' + status.public_url)
          finished = true
          break
        }
        if (status.status === 'failed') throw new Error('Job failed: ' + c.id)
        await new Promise((res) => setTimeout(res, 3000))
      }
      if (!finished) throw new Error('Timeout waiting for job ' + c.id)
    }

    // Step: Compose clips with audio
    const composeResp = await composeClips({ clips: clipUrls, audio: audioUrl })

    // Show final links
    const resultDiv = document.getElementById('shortsResult')
    resultDiv.innerHTML = `
            <div class="alert alert-success"><strong>✅ Short pipeline completed</strong></div>
            <div style="margin-top:12px;"><strong>Compose response:</strong><pre>${JSON.stringify(composeResp, null, 2)}</pre></div>
        `
    resultDiv.classList.add('show')
    appendLog('Pipeline finished')
  } catch (err) {
    appendLog('ERROR: ' + err.message)
    const resultDiv = document.getElementById('shortsResult')
    resultDiv.innerHTML = `<div class="alert alert-error"><strong>❌ ${err.message}</strong></div>`
    resultDiv.classList.add('show')
  } finally {
    hideLoading('shortsLoading')
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('shortForm')
  if (!form) return
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(form)
    const opts = {
      topic: fd.get('topic'),
      language: fd.get('language'),
      mode: fd.get('mode'),
      voice_id: fd.get('voice_id'),
      speed: fd.get('speed') || 1.0,
      beat_duration: parseInt(fd.get('beat_duration')) || 6,
    }
    // Clear logs/result
    const log = document.getElementById('shortsLog')
    if (log) {
      log.textContent = ''
      log.style.display = 'none'
    }
    document.getElementById('shortsResult').classList.remove('show')
    runShortPipeline(opts)
  })
})
