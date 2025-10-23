const API_BASE = location.origin

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

// Tab switching
function switchTab(tabName) {
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

    // Find and activate the corresponding tab button
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`)
    if (activeTab) {
      activeTab.classList.add('active')
    }
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

async function pollJobStatus(taskId, resultElementId) {
  const pollInterval = 3000
  const maxAttempts = 200
  let attempts = 0

  const poll = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/job/${taskId}`)
      const job = await response.json()

      attempts++

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

        const lines = statusInfo.innerHTML.split('<br>')
        lines[1] = `<strong>${statusText}</strong>`
        statusInfo.innerHTML = lines.join('<br>')
      }

      if (job.status === 'success' || job.status === 'failed') {
        showResult(resultElementId, job, job.status === 'success')
        return
      }

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

  setTimeout(poll, pollInterval)
}

async function runDemo(type) {
  showLoading('demoLoading')

  try {
    const response = await fetch(`${API_BASE}/demo/${type}`)
    const result = await response.json()
    hideLoading('demoLoading')

    if (type === 't2i') {
      showImageResult('demoResult', result, response.ok)
    } else {
      showResult('demoResult', result, response.ok)

      if (response.ok && result.task_id) {
        pollJobStatus(result.task_id, 'demoResult')
      }
    }
  } catch (error) {
    hideLoading('demoLoading')
    showResult('demoResult', { error: error.message }, false)
  }
}

// Initialize event listeners when DOM is loaded
// Task management
const tasks = new Map()

function updateTasksList(filters = {}) {
  const tasksList = document.getElementById('tasksList')
  if (!tasksList) return

  const { status = 'all', type = 'all' } = filters

  let html = ''
  const now = new Date()

  for (const [taskId, task] of tasks.entries()) {
    // Apply filters
    if (status !== 'all' && task.status !== status) continue
    if (type !== 'all' && task.type !== type) continue

    const progress = task.status === 'processing' ? Math.min(95, task.progress || 0) : 100
    const timeAgo = formatTimeAgo(new Date(task.timestamp), now)

    html += `
            <div class="task-card" data-task-id="${taskId}">
                <div class="task-header">
                    <span class="task-type">${formatTaskType(task.type)}</span>
                    <span class="task-status ${task.status}">${formatStatus(task.status)}</span>
                </div>
                <div class="task-content">
                    <div class="task-prompt">${task.prompt || 'Без описания'}</div>
                    <div class="task-progress">
                        <div class="task-progress-bar" style="width: ${progress}%"></div>
                    </div>
                    <div class="task-meta">
                        <small>🕒 ${timeAgo}</small>
                        ${
                          task.public_url
                            ? `
                            <a href="${task.public_url}" target="_blank" class="btn" style="padding: 4px 8px; font-size: 12px; margin-left: 10px;">
                                📥 Скачать результат
                            </a>
                        `
                            : ''
                        }
                    </div>
                </div>
            </div>
        `
  }

  tasksList.innerHTML = html || '<div class="alert alert-info">Нет задач для отображения</div>'
  updateTaskStats()
}

function formatTaskType(type) {
  const types = {
    t2v: '📝 Text to Video',
    i2v: '🖼️ Image to Video',
    'start-end': '🎬 Start & End',
    t2i: '🎨 Text to Image',
  }
  return types[type] || type
}

function formatStatus(status) {
  const statuses = {
    processing: '⏳ В процессе',
    success: '✅ Готово',
    failed: '❌ Ошибка',
    pending: '⌛ Ожидание',
  }
  return statuses[status] || status
}

function formatTimeAgo(date, now) {
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`
  return `${Math.floor(diff / 86400)} дн. назад`
}

function updateTaskStats() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let active = 0
  let completedToday = 0
  let failedToday = 0

  for (const task of tasks.values()) {
    const taskDate = new Date(task.timestamp)

    if (task.status === 'processing') active++
    if (taskDate >= startOfDay) {
      if (task.status === 'success') completedToday++
      if (task.status === 'failed') failedToday++
    }
  }

  document.getElementById('activeTasksCount').textContent = active
  document.getElementById('completedTodayCount').textContent = completedToday
  document.getElementById('failedTodayCount').textContent = failedToday
}

// Track task creation and updates
function trackTask(taskId, taskInfo) {
  tasks.set(taskId, {
    ...taskInfo,
    timestamp: new Date().toISOString(),
  })
  updateTasksList()
}

async function updateTaskProgress(taskId) {
  try {
    const response = await fetch(`${API_BASE}/api/job/${taskId}`)
    const job = await response.json()

    if (job && tasks.has(taskId)) {
      tasks.set(taskId, {
        ...tasks.get(taskId),
        ...job,
        progress: calculateProgress(job),
      })
      updateTasksList()
    }
  } catch (error) {
    console.error('Error updating task progress:', error)
  }
}

function calculateProgress(job) {
  // This is a simplified progress calculation
  // You might want to implement more sophisticated logic based on your needs
  if (job.status === 'success') return 100
  if (job.status === 'failed') return 100
  if (job.status === 'processing') {
    // Simulate progress based on time passed
    const started = new Date(job.timestamp)
    const now = new Date()
    const diff = (now - started) / 1000
    return Math.min(95, Math.floor(diff / 2)) // Assume 2 seconds = 1%
  }
  return 0
}

// Price calculation
function calculatePrice(resolution, duration) {
  const prices = {
    '512P': { 6: 0.1, 10: 0.15 },
    '768P': { 6: 0.28, 10: 0.56 },
    '1080P': { 6: 0.49, 10: null },
  }
  return prices[resolution]?.[duration] || null
}

function updatePriceIndicator(selectElement) {
  const form = selectElement.closest('form')
  if (!form) return

  const resolution = form.querySelector('[name="resolution"]')?.value
  const duration = parseInt(form.querySelector('[name="duration"]')?.value || '6')
  const priceIndicator = selectElement.parentElement.querySelector('.price-indicator')

  if (resolution && priceIndicator) {
    const price = calculatePrice(resolution, duration)
    if (price !== null) {
      priceIndicator.textContent = `💰 $${price.toFixed(2)}`
      priceIndicator.style.color = ''
    } else {
      priceIndicator.textContent = '⚠️ Недоступно'
      priceIndicator.style.color = '#dc3545'
    }
  }
}

// Update price when duration or resolution changes
function setupPriceIndicators() {
  document
    .querySelectorAll('select[name="resolution"], select[name="duration"]')
    .forEach((select) => {
      select.addEventListener('change', () => updatePriceIndicator(select))
    })

  // Initial price update
  document.querySelectorAll('select[name="resolution"]').forEach((select) => {
    updatePriceIndicator(select)
  })
}

document.addEventListener('DOMContentLoaded', () => {
  // Setup price indicators
  setupPriceIndicators()

  // Setup task filters
  const taskStatusFilter = document.getElementById('taskStatusFilter')
  const taskTypeFilter = document.getElementById('taskTypeFilter')

  if (taskStatusFilter && taskTypeFilter) {
    taskStatusFilter.addEventListener('change', () => {
      updateTasksList({
        status: taskStatusFilter.value,
        type: taskTypeFilter.value,
      })
    })

    taskTypeFilter.addEventListener('change', () => {
      updateTasksList({
        status: taskStatusFilter.value,
        type: taskTypeFilter.value,
      })
    })
  }

  // Setup file input handlers for Image to Video
  document.getElementById('i2vImageFile').addEventListener('change', (e) => {
    if (e.target.files[0]) {
      showImagePreview(e.target.files[0], 'i2vPreview')
      document.getElementById('i2vImage').value = ''
    }
  })

  // Setup file input handlers for Start & End
  document.getElementById('startImageFile').addEventListener('change', (e) => {
    if (e.target.files[0]) {
      showImagePreview(e.target.files[0], 'startPreview')
      document.getElementById('startImage').value = ''
    }
  })

  document.getElementById('endImageFile').addEventListener('change', (e) => {
    if (e.target.files[0]) {
      showImagePreview(e.target.files[0], 'endPreview')
      document.getElementById('endImage').value = ''
    }
  })

  // Setup form submit handlers
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

      if (response.ok && result.task_id) {
        // Track the new task
        trackTask(result.task_id, {
          type: 't2v',
          status: 'processing',
          prompt: data.prompt,
          params: data,
        })

        // Start polling
        pollJobStatus(result.task_id, 't2vResult')

        // Update progress periodically
        const progressInterval = setInterval(() => {
          updateTaskProgress(result.task_id)
        }, 3000)

        // Clear interval when task is done
        setTimeout(() => {
          clearInterval(progressInterval)
        }, 600000) // 10 minutes max
      }
    } catch (error) {
      hideLoading('t2vLoading')
      showResult('t2vResult', { error: error.message }, false)
    }
  })

  // Setup tab click handlers
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault()
      const tabName = tab.getAttribute('data-tab')
      if (tabName) {
        switchTab(tabName)
      }
    })
  })
})
