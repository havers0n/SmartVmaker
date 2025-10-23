// TTS functionality
// API_BASE is declared in main.js

async function generateSpeech(data) {
  const { text, model, voice_id, speed, volume, format, mode, sound_effects } = data

  const endpoint = mode === 'sync' ? `${API_BASE}/api/t2a_v2` : `${API_BASE}/api/t2a_async_v2`

  const payload = {
    model,
    text,
    voice_setting: {
      voice_id,
      speed: parseFloat(speed),
      vol: parseFloat(volume),
      pitch: 0,
    },
    audio_setting: {
      audio_sample_rate: 32000,
      bitrate: 128000,
      format,
      channel: 2,
    },
  }

  if (sound_effects !== 'none') {
    payload.voice_modify = {
      pitch: 0,
      intensity: 0,
      timbre: 0,
      sound_effects,
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()

  if (mode === 'sync') {
    // Handle synchronous response
    const audioBlob = await fetch(result.audio).then((r) => r.blob())
    return {
      type: 'sync',
      audio: URL.createObjectURL(audioBlob),
    }
  } else {
    // Handle asynchronous response
    return {
      type: 'async',
      taskId: result.task_id,
    }
  }
}

function updateRangeValue(input) {
  const value = input.value
  input.nextElementSibling.textContent = value
}

// Initialize TTS form
document.addEventListener('DOMContentLoaded', () => {
  const ttsForm = document.getElementById('ttsForm')
  const loading = document.getElementById('ttsLoading')
  const result = document.getElementById('ttsResult')
  const preview = document.getElementById('audioPreview')

  // Setup range inputs
  document.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener('input', () => updateRangeValue(input))
    updateRangeValue(input) // Initial value
  })

  if (ttsForm) {
    ttsForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(e.target)

      try {
        loading.classList.add('show')
        result.classList.remove('show')
        preview.style.display = 'none'

        const response = await generateSpeech({
          text: formData.get('text'),
          model: formData.get('model'),
          voice_id: formData.get('voice_id'),
          speed: formData.get('speed'),
          volume: formData.get('volume'),
          format: formData.get('format'),
          mode: formData.get('mode'),
          sound_effects: formData.get('sound_effects'),
        })

        if (response.type === 'sync') {
          // Show audio player for sync mode
          const audio = preview.querySelector('audio')
          audio.src = response.audio
          preview.style.display = 'block'

          result.innerHTML = `
                        <div class="alert alert-success">
                            <strong>✅ Аудио сгенерировано успешно!</strong>
                        </div>
                    `
        } else {
          // Show task ID for async mode
          result.innerHTML = `
                        <div class="alert alert-info">
                            <strong>⏳ Задача поставлена в очередь</strong><br>
                            ID задачи: ${response.taskId}<br>
                            Статус можно отслеживать во вкладке "Задачи"
                        </div>
                    `

          // Start polling for async task
          trackTask(response.taskId, {
            type: 'tts',
            status: 'processing',
            prompt: formData.get('text').substring(0, 100) + '...',
          })
        }
      } catch (error) {
        result.innerHTML = `
                    <div class="alert alert-error">
                        <strong>❌ Ошибка:</strong> ${error.message}
                    </div>
                `
      } finally {
        loading.classList.remove('show')
        result.classList.add('show')
      }
    })
  }
})
