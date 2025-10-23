// Voice Clone functionality
// API_BASE is declared in main.js

async function uploadFile(file, purpose) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('purpose', purpose)

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${await response.text()}`)
  }

  const result = await response.json()
  return result.file.file_id
}

async function cloneVoice(data) {
  const { file_id, voice_id, clone_prompt = {}, text, model } = data

  const response = await fetch(`${API_BASE}/api/voice-clone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_id,
      voice_id,
      clone_prompt,
      text,
      model,
    }),
  })

  if (!response.ok) {
    throw new Error(`Voice cloning failed: ${await response.text()}`)
  }

  return response.json()
}

// Initialize voice clone form
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('voiceCloneForm')
  const loading = document.getElementById('voiceCloneLoading')
  const result = document.getElementById('voiceCloneResult')
  const preview = document.getElementById('clonePreview')

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()

      try {
        loading.classList.add('show')
        result.classList.remove('show')
        preview.style.display = 'none'

        const formData = new FormData(e.target)

        // Upload source audio
        const sourceFile = formData.get('sourceAudio')
        const sourceFileId = await uploadFile(sourceFile, 'voice_clone')

        // Upload prompt audio if provided
        let promptFileId = null
        const promptFile = formData.get('promptAudio')
        if (promptFile && promptFile.size > 0) {
          promptFileId = await uploadFile(promptFile, 'prompt_audio')
        }

        // Clone voice
        const cloneData = {
          file_id: sourceFileId,
          voice_id: formData.get('voiceId'),
          clone_prompt: {
            prompt_text: formData.get('promptText'),
          },
          text: formData.get('text'),
          model: formData.get('model'),
        }

        if (promptFileId) {
          cloneData.clone_prompt.prompt_audio = promptFileId
        }

        const cloneResult = await cloneVoice(cloneData)

        // Show result
        result.innerHTML = `
                    <div class="alert alert-success">
                        <strong>✅ Голос успешно клонирован!</strong><br>
                        ID голоса: ${formData.get('voiceId')}<br>
                        Теперь вы можете использовать этот голос в Text to Speech.
                    </div>
                `

        // Show previews
        preview.style.display = 'block'

        // Source audio
        const sourceAudio = document.getElementById('sourcePreview')
        sourceAudio.src = URL.createObjectURL(sourceFile)

        // Prompt audio if exists
        const promptAudio = document.getElementById('promptPreview')
        promptAudio.parentElement.style.display =
          promptFile && promptFile.size > 0 ? 'block' : 'none'
        if (promptFile && promptFile.size > 0) {
          promptAudio.src = URL.createObjectURL(promptFile)
        }

        // Result audio
        const resultAudio = document.getElementById('resultPreview')
        resultAudio.src = cloneResult.audio
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
