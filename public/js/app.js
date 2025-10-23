      // API_BASE is declared in main.js

      // Templates interaction
      document.addEventListener('DOMContentLoaded', async () => {
        // Initialize template browser
        try {
          const response = await fetch(`${API_BASE}/api/video-templates`)
          const templates = await response.json()
          displayTemplates(templates)
        } catch (error) {
          console.error('Failed to load templates:', error)
        }

        // Setup template preview interactions
        const previewVideo = document.getElementById('previewVideo')
        const playIcon = document.getElementById('playIcon')

        if (previewVideo) {
          previewVideo.addEventListener('mouseover', () => {
            previewVideo.play()
            playIcon.style.opacity = '0'
          })

          previewVideo.addEventListener('mouseout', () => {
            previewVideo.pause()
            playIcon.style.opacity = '1'
          })

          previewVideo.addEventListener('play', () => {
            playIcon.style.opacity = '0'
          })

          previewVideo.addEventListener('pause', () => {
            playIcon.style.opacity = '1'
          })
        }

        // Setup template form submission
        const templateForm = document.getElementById('templateForm')
        if (templateForm) {
          templateForm.addEventListener('submit', handleTemplateSubmit)
        }
      })

      function displayTemplates(templates) {
        const gallery = document.getElementById('templateGallery')
        if (!gallery) return

        gallery.innerHTML = templates
          .map(
            (template) => `
                <div class="template-card" style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; cursor: pointer;"
                     onclick="selectTemplate('${template.id}')">
                    <div style="position: relative;">
                        <img src="${template.thumbnail}" 
                             alt="${template.name}"
                             style="width: 100%; height: 158px; object-fit: cover;">
                        <div style="position: absolute; bottom: 0; left: 0; right: 0; 
                                  background: rgba(0,0,0,0.7); color: white; padding: 8px;">
                            ${template.name}
                        </div>
                    </div>
                    <div style="padding: 12px;">
                        <p style="margin: 0; font-size: 14px; color: #666;">
                            ${template.description}
                        </p>
                    </div>
                </div>
            `
          )
          .join('')
      }

      async function selectTemplate(templateId) {
        try {
          const response = await fetch(`${API_BASE}/api/video-templates/${templateId}`)
          const template = await response.json()

          // Show template form
          const templateForm = document.getElementById('templateForm')
          templateForm.style.display = 'block'

          // Update template name
          document.getElementById('selectedTemplateName').textContent = template.name

          // Generate input fields
          const inputsContainer = document.getElementById('templateInputs')
          inputsContainer.innerHTML = generateInputFields(template.inputs)

          // Setup preview
          const previewContainer = document.getElementById('templatePreview')
          const previewVideo = document.getElementById('previewVideo')

          previewContainer.style.display = 'block'
          previewVideo.src = template.preview_url
          previewVideo.poster = template.thumbnail

          // Store template ID
          templateForm.dataset.templateId = templateId

          // Scroll to form
          templateForm.scrollIntoView({ behavior: 'smooth' })
        } catch (error) {
          console.error('Failed to load template details:', error)
        }
      }

      function generateInputFields(inputs) {
        return inputs
          .map((input) => {
            let inputHtml = ''

            switch (input.type) {
              case 'text':
              case 'textarea':
                inputHtml = `
                            <div class="form-group">
                                <label>${input.label}</label>
                                <${input.type === 'textarea' ? 'textarea' : 'input type="text"'} 
                                    name="${input.id}"
                                    placeholder="${input.placeholder || ''}"
                                    ${input.required ? 'required' : ''}
                                ></${input.type === 'textarea' ? 'textarea' : 'input'}>
                                ${input.hint ? `<div class="hint">${input.hint}</div>` : ''}
                            </div>`
                break

              case 'image':
                inputHtml = `
                            <div class="form-group">
                                <label>${input.label}</label>
                                <input type="file" 
                                       name="${input.id}" 
                                       accept="image/*"
                                       ${input.required ? 'required' : ''}>
                                ${input.hint ? `<div class="hint">${input.hint}</div>` : ''}
                                <div style="margin-top: 10px; text-align: center;" id="${input.id}Preview"></div>
                            </div>`
                break

              case 'select':
                inputHtml = `
                            <div class="form-group">
                                <label>${input.label}</label>
                                <select name="${input.id}" ${input.required ? 'required' : ''}>
                                    ${input.options
                                      .map(
                                        (opt) =>
                                          `<option value="${opt.value}">${opt.label}</option>`
                                      )
                                      .join('')}
                                </select>
                                ${input.hint ? `<div class="hint">${input.hint}</div>` : ''}
                            </div>`
                break
            }

            return inputHtml
          })
          .join('')
      }

      async function handleTemplateSubmit(e) {
        e.preventDefault()

        const form = e.target
        const templateId = form.dataset.templateId
        const formData = new FormData(form)

        showLoading('templateLoading')

        try {
          // Convert file inputs to base64
          const inputs = {}
          for (let [key, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
              inputs[key] = await fileToBase64(value)
            } else {
              inputs[key] = value
            }
          }

          const data = {
            templateId,
            inputs,
            resolution: formData.get('resolution'),
            priority: formData.get('priority'),
          }

          const response = await fetch(`${API_BASE}/api/video-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          const result = await response.json()
          hideLoading('templateLoading')
          showResult('templateResult', result, response.ok)

          // Start polling if task was created
          if (response.ok && result.task_id) {
            pollJobStatus(result.task_id, 'templateResult')
          }
        } catch (error) {
          hideLoading('templateLoading')
          showResult('templateResult', { error: error.message }, false)
        }
      }

      // Helper function to convert image file to base64
      function fileToBase64(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      // Image preview helper
      function showImagePreview(file, previewElementId) {
        const preview = document.getElementById(previewElementId)
        const reader = new FileReader()
        reader.onload = (e) => {
          preview.innerHTML = `<img src="${e.target.result}" style="max-width: 300px; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`
        }
        reader.readAsDataURL(file)
      }

      // Setup file input handlers for Image to Video
      document.getElementById('i2vImageFile').addEventListener('change', (e) => {
        if (e.target.files[0]) {
          showImagePreview(e.target.files[0], 'i2vPreview')
          document.getElementById('i2vImage').value = '' // Clear URL input
        }
      })

      // Setup file input handlers for Start & End
      document.getElementById('startImageFile').addEventListener('change', (e) => {
        if (e.target.files[0]) {
          showImagePreview(e.target.files[0], 'startPreview')
          document.getElementById('startImage').value = '' // Clear URL input
        }
      })

      document.getElementById('endImageFile').addEventListener('change', (e) => {
        if (e.target.files[0]) {
          showImagePreview(e.target.files[0], 'endPreview')
          document.getElementById('endImage').value = '' // Clear URL input
        }
      })

      function switchTab(e, tabName) {
        // Prevent default button behavior
        e.preventDefault()

        // Hide all tabs
        const tabContents = document.querySelectorAll('.tab-content')
        const tabs = document.querySelectorAll('.tab')

        tabContents.forEach((content) => {
          content.style.display = 'none'
          content.classList.remove('active')
        })

        tabs.forEach((tab) => {
          tab.classList.remove('active')
        })

        // Show selected tab
        const selectedTab = document.getElementById(tabName)
        if (selectedTab) {
          selectedTab.style.display = 'block'
          selectedTab.classList.add('active')
          e.currentTarget.classList.add('active')
        } else {
          console.error(`Tab with id '${tabName}' not found`)
        }
      }
      function showResult(elementId, data, success = true) {
        const resultDiv = document.getElementById(elementId)
        const alertClass = success ? 'alert-success' : 'alert-error'
        const icon = success ? '✅' : '❌'

        let html = `<div class="alert ${alertClass}">
                <strong>${icon} ${success ? 'Запрос успешен!' : 'Ошибка!'}</strong>
            </div>`

        if (success && data.task_id) {
          html += `
                    <div class="alert alert-info">
                        <strong>🎯 Task ID:</strong> ${data.task_id}<br>
                        <strong>⏱️ Статус:</strong> Видео генерируется... Результат придет на callback.<br>
                        <strong>📁 Сохранится в:</strong> ./out/
                    </div>
                `
        }

        // Show video player if public_url is available
        if (data.public_url) {
          html += `
                    <div style="margin-top: 20px;">
                        <h3>🎬 Готовое видео:</h3>
                        <video controls style="width:100%; max-width:800px; margin-top:12px; border-radius:8px;" src="${data.public_url}"></video>
                    </div>
                `
        }

        html += '<h3>Ответ сервера:</h3>'
        html += `<pre>${JSON.stringify(data, null, 2)}</pre>`

        resultDiv.innerHTML = html
        resultDiv.classList.add('show')
      }

      function hideLoading(loadingId) {
        document.getElementById(loadingId).classList.remove('show')
      }

      function showLoading(loadingId) {
        document.getElementById(loadingId).classList.add('show')
      }

      // Poll job status until completion
      async function pollJobStatus(taskId, resultElementId) {
        const pollInterval = 3000 // 3 seconds
        const maxAttempts = 200 // 10 minutes max (200 * 3s)
        let attempts = 0

        const poll = async () => {
          try {
            const response = await fetch(`${API_BASE}/api/job/${taskId}`)
            const job = await response.json()

            attempts++

            // Update UI with current status
            const resultDiv = document.getElementById(resultElementId)
            const statusInfo = resultDiv.querySelector('.alert-info')

            if (statusInfo) {
              let statusText = '⏱️ Статус: '
              if (job.status === 'processing') {
                statusText += `Обработка... (попытка ${attempts}/${maxAttempts})`
              } else if (job.status === 'success') {
                statusText += '✅ Готово!'
              } else if (job.status === 'failed') {
                statusText += '❌ Ошибка'
              } else {
                statusText += 'Ожидание...'
              }

              // Update status line
              const lines = statusInfo.innerHTML.split('<br>')
              lines[1] = `<strong>${statusText}</strong>`
              statusInfo.innerHTML = lines.join('<br>')
            }

            // Check if completed
            if (job.status === 'success' || job.status === 'failed') {
              showResult(resultElementId, job, job.status === 'success')
              return
            }

            // Continue polling if not max attempts
            if (attempts < maxAttempts) {
              setTimeout(poll, pollInterval)
            } else {
              console.log('Max polling attempts reached')
            }
          } catch (error) {
            console.error('Polling error:', error)
            if (attempts < maxAttempts) {
              setTimeout(poll, pollInterval)
            }
          }
        }

        // Start polling
        setTimeout(poll, pollInterval)
      }

      // Text to Video form
      document.getElementById('t2vForm').addEventListener('submit', async (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const data = {
          prompt: formData.get('prompt'),
          duration: parseInt(formData.get('duration')),
          resolution: formData.get('resolution'),
          aspect_ratio: formData.get('aspect_ratio'),
          model: 'MiniMax-Hailuo-02',
        }

        showLoading('t2vLoading')

        try {
          const response = await fetch(`${API_BASE}/api/generate-text-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          const result = await response.json()
          hideLoading('t2vLoading')
          showResult('t2vResult', result, response.ok)

          // Start polling for job status if task was created
          if (response.ok && result.task_id) {
            pollJobStatus(result.task_id, 't2vResult')
          }
        } catch (error) {
          hideLoading('t2vLoading')
          showResult('t2vResult', { error: error.message }, false)
        }
      })

      // Image to Video form
      document.getElementById('i2vForm').addEventListener('submit', async (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)

        showLoading('i2vLoading')

        try {
          // Check if file or URL is provided
          const fileInput = document.getElementById('i2vImageFile')
          let imageSource

          if (fileInput.files[0]) {
            // Convert file to base64
            imageSource = await fileToBase64(fileInput.files[0])
          } else {
            // Use URL
            imageSource = document.getElementById('i2vImage').value
          }

          if (!imageSource) {
            throw new Error('Выберите изображение или укажите URL')
          }

          const data = {
            first_frame_image: imageSource,
            prompt: formData.get('prompt'),
            duration: parseInt(formData.get('duration')),
            resolution: formData.get('resolution'),
            aspect_ratio: formData.get('aspect_ratio'),
            model: 'MiniMax-Hailuo-02',
          }

          const response = await fetch(`${API_BASE}/api/generate-image-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          const result = await response.json()
          hideLoading('i2vLoading')
          showResult('i2vResult', result, response.ok)

          // Start polling for job status if task was created
          if (response.ok && result.task_id) {
            pollJobStatus(result.task_id, 'i2vResult')
          }
        } catch (error) {
          hideLoading('i2vLoading')
          showResult('i2vResult', { error: error.message }, false)
        }
      })

      // Start & End form
      document.getElementById('startEndForm').addEventListener('submit', async (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)

        showLoading('startEndLoading')

        try {
          // Get first frame (file or URL)
          const startFileInput = document.getElementById('startImageFile')
          let startImageSource

          if (startFileInput.files[0]) {
            startImageSource = await fileToBase64(startFileInput.files[0])
          } else {
            startImageSource = document.getElementById('startImage').value
          }

          // Get last frame (file or URL)
          const endFileInput = document.getElementById('endImageFile')
          let endImageSource

          if (endFileInput.files[0]) {
            endImageSource = await fileToBase64(endFileInput.files[0])
          } else {
            endImageSource = document.getElementById('endImage').value
          }

          if (!startImageSource || !endImageSource) {
            throw new Error('Выберите оба изображения или укажите их URL')
          }

          const data = {
            first_frame_image: startImageSource,
            last_frame_image: endImageSource,
            prompt: formData.get('prompt'),
            duration: parseInt(formData.get('duration')),
            resolution: formData.get('resolution'),
            aspect_ratio: formData.get('aspect_ratio'),
            model: 'MiniMax-Hailuo-02',
          }

          const response = await fetch(`${API_BASE}/api/generate-start-end-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          const result = await response.json()
          hideLoading('startEndLoading')
          showResult('startEndResult', result, response.ok)

          // Start polling for job status if task was created
          if (response.ok && result.task_id) {
            pollJobStatus(result.task_id, 'startEndResult')
          }
        } catch (error) {
          hideLoading('startEndLoading')
          showResult('startEndResult', { error: error.message }, false)
        }
      })

      // Text to Image form
      document.getElementById('t2iForm').addEventListener('submit', async (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)

        const data = {
          prompt: formData.get('prompt'),
          aspect_ratio: formData.get('aspect_ratio'),
          n: parseInt(formData.get('n')),
          prompt_optimizer: formData.get('prompt_optimizer') === 'true',
          model: 'image-01',
          response_format: 'url',
        }

        // Add seed if provided
        const seed = formData.get('seed')
        if (seed && seed.trim() !== '') {
          data.seed = parseInt(seed)
        }

        showLoading('t2iLoading')

        try {
          const response = await fetch(`${API_BASE}/api/generate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          const result = await response.json()
          hideLoading('t2iLoading')

          // Show result with images
          showImageResult('t2iResult', result, response.ok)
        } catch (error) {
          hideLoading('t2iLoading')

          // Try to parse error message for better display
          let errorMessage = error.message
          try {
            const errorData = JSON.parse(error.message)
            if (errorData.error) errorMessage = errorData.error
          } catch (e) {
            // Keep original error message
          }

          showResult(
            't2iResult',
            {
              error: errorMessage,
              hint: 'Проверьте консоль сервера для подробностей. Возможные причины: неверный API ключ, нет доступа к image generation, или проблемы с балансом.',
            },
            false
          )
        }
      })

      // Special result display for images
      function showImageResult(elementId, data, success = true) {
        const resultDiv = document.getElementById(elementId)
        const alertClass = success ? 'alert-success' : 'alert-error'
        const icon = success ? '✅' : '❌'

        let html = `<div class="alert ${alertClass}">
                <strong>${icon} ${success ? 'Изображения сгенерированы!' : 'Ошибка!'}</strong>
            </div>`

        // Display images if available
        if (success && data.data && data.data.image_urls) {
          const imageUrls = data.data.image_urls
          const metadata = data.metadata || {}

          html += `
                    <div class="alert alert-info">
                        <strong>📊 Статистика:</strong><br>
                        <strong>✅ Успешно:</strong> ${metadata.success_count || imageUrls.length}<br>
                        <strong>❌ Заблокировано:</strong> ${metadata.failed_count || 0}<br>
                        <strong>🆔 Trace ID:</strong> ${data.id || 'N/A'}
                    </div>
                `

          html += `<div style="margin-top: 20px;">
                    <h3>🖼️ Сгенерированные изображения:</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 15px;">`

          imageUrls.forEach((url, index) => {
            html += `
                        <div style="border: 2px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                            <img src="${url}" style="width: 100%; display: block;" alt="Generated image ${index + 1}">
                            <div style="padding: 10px; background: #f8f9fa; text-align: center;">
                                <a href="${url}" target="_blank" class="btn" style="width: auto; padding: 8px 16px; font-size: 14px; margin-top: 0;">
                                    📥 Скачать изображение ${index + 1}
                                </a>
                            </div>
                        </div>
                    `
          })

          html += `</div></div>`
        }

        html += '<h3>Ответ сервера:</h3>'
        html += `<pre>${JSON.stringify(data, null, 2)}</pre>`

        resultDiv.innerHTML = html
        resultDiv.classList.add('show')
      }

      // Quick Demo buttons
      async function runDemo(type) {
        showLoading('demoLoading')

        try {
          const response = await fetch(`${API_BASE}/demo/${type}`)
          const result = await response.json()
          hideLoading('demoLoading')

          // Use special image result for t2i
          if (type === 't2i') {
            showImageResult('demoResult', result, response.ok)
          } else {
            showResult('demoResult', result, response.ok)

            // Start polling for job status if task was created (videos only)
            if (response.ok && result.task_id) {
              pollJobStatus(result.task_id, 'demoResult')
            }
          }
        } catch (error) {
          hideLoading('demoLoading')
          showResult('demoResult', { error: error.message }, false)
        }
      }
