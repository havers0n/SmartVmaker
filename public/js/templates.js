// Video Templates functionality
const API_BASE = location.origin

async function generateFromTemplate(data) {
  const { template_id, media_inputs, text_inputs } = data

  const response = await fetch(`${API_BASE}/api/video-template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id,
      media_inputs,
      text_inputs,
    }),
  })

  if (!response.ok) {
    throw new Error(`Template generation failed: ${await response.text()}`)
  }

  return response.json()
}

async function checkTemplateStatus(taskId) {
  const response = await fetch(`${API_BASE}/api/video-template/status?task_id=${taskId}`)

  if (!response.ok) {
    throw new Error(`Status check failed: ${await response.text()}`)
  }

  return response.json()
}

// Initialize template functionality
document.addEventListener('DOMContentLoaded', () => {
  const templatesGrid = document.querySelector('.templates-grid')
  const templateForm = document.getElementById('templateForm')
  const loading = document.getElementById('templateLoading')
  const result = document.getElementById('templateResult')
  const preview = document.getElementById('videoPreview')

  if (templatesGrid) {
    // Handle template selection
    templatesGrid.addEventListener('click', (e) => {
      const templateBtn = e.target.closest('.use-template-btn')
      if (templateBtn) {
        const templateCard = templateBtn.closest('.template-card')
        const templateId = templateCard.dataset.templateId

        // Show form and set template ID
        templateForm.style.display = 'block'
        templateForm.querySelector('[name="templateId"]').value = templateId

        // Scroll to form
        templateForm.scrollIntoView({ behavior: 'smooth' })
      }
    })
  }

  // Preview uploaded image
  const mediaInput = templateForm?.querySelector('[name="mediaInput"]')
  if (mediaInput) {
    mediaInput.addEventListener('change', (e) => {
      const file = e.target.files[0]
      if (file) {
        const preview = document.getElementById('templateImagePreview')
        const reader = new FileReader()
        reader.onload = (e) => {
          preview.innerHTML = `<img src="${e.target.result}" style="max-width: 300px; max-height: 200px; border-radius: 8px;">`
        }
        reader.readAsDataURL(file)
        // Clear URL input
        templateForm.querySelector('[name="mediaUrl"]').value = ''
      }
    })
  }

  if (templateForm) {
    templateForm.addEventListener('submit', async (e) => {
      e.preventDefault()

      try {
        loading.classList.add('show')
        result.classList.remove('show')
        preview.style.display = 'none'

        const formData = new FormData(e.target)
        const templateId = formData.get('templateId')
        const textInput = formData.get('textInput')

        // Get media input - either file or URL
        let mediaValue
        const file = formData.get('mediaInput')
        if (file && file.size > 0) {
          mediaValue = await fileToBase64(file)
        } else {
          mediaValue = formData.get('mediaUrl')
        }

        if (!mediaValue) {
          throw new Error('Пожалуйста, загрузите изображение или укажите URL')
        }

        // Generate video from template
        const genResult = await generateFromTemplate({
          template_id: templateId,
          media_inputs: [{ value: mediaValue }],
          text_inputs: [{ value: textInput }],
        })

        // Start polling for status
        const pollInterval = setInterval(async () => {
          try {
            const status = await checkTemplateStatus(genResult.task_id)

            if (status.status === 'Success') {
              clearInterval(pollInterval)

              // Show success message
              result.innerHTML = `
                                <div class="alert alert-success">
                                    <strong>✅ Видео успешно сгенерировано!</strong>
                                </div>
                            `

              // Show video preview
              preview.style.display = 'block'
              const video = preview.querySelector('video')
              video.src = status.video_url

              loading.classList.remove('show')
              result.classList.add('show')
            } else if (status.status === 'Fail') {
              clearInterval(pollInterval)
              throw new Error('Генерация видео не удалась')
            }
            // Continue polling for 'Processing' status
          } catch (error) {
            clearInterval(pollInterval)
            throw error
          }
        }, 5000) // Poll every 5 seconds
      } catch (error) {
        result.innerHTML = `
                    <div class="alert alert-error">
                        <strong>❌ Ошибка:</strong> ${error.message}
                    </div>
                `
        loading.classList.remove('show')
        result.classList.add('show')
      }
    })
  }
})

// Helper function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
