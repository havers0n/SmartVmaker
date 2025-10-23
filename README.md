# MiniMax Video Generation Server

Сервер для генерации видео через MiniMax Hailuo API с поддержкой трех режимов:

- Text to Video (T2V) - генерация видео из текста
- Image to Video (I2V) - анимация изображения
- Start & End Frames - видео между двумя кадрами

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните переменные:

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
MINIMAX_API_KEY=sk-ваш-ключ-из-minimax
PUBLIC_BASE_URL=https://ваш-домен.ngrok-free.app
PORT=8000
```

**Где взять API ключ:**

1. Зарегистрируйтесь на https://platform.minimax.io
2. Перейдите в User Center > API Keys
3. Скопируйте ключ в `.env`

**Настройка PUBLIC_BASE_URL (для callback):**

Для локальной разработки используйте ngrok:

```bash
# Установите ngrok: https://ngrok.com/download
ngrok http 8000
```

Скопируйте URL вида `https://xxxx-xx-xx-xx-xx.ngrok-free.app` в `.env`

### 3. Запуск сервера

```bash
npm start
```

Или с автоперезагрузкой при изменениях:

```bash
npm run dev
```

## API Endpoints

### Demo endpoints (GET)

Быстрое тестирование через браузер:

- `GET http://localhost:8000/demo/t2v` - пример Text to Video
- `GET http://localhost:8000/demo/i2v` - пример Image to Video
- `GET http://localhost:8000/demo/start-end` - пример Start+End frames

### Production API endpoints (POST)

#### 1. Генерация видео из текста

```bash
POST /api/generate-text-video
Content-Type: application/json

{
  "prompt": "A golden retriever puppy playing in the park [Push in] then running towards camera [Tracking shot]",
  "duration": 6,
  "resolution": "1080P",
  "model": "MiniMax-Hailuo-02"
}
```

**Параметры:**

- `prompt` (обязательный) - описание видео (до 2000 символов)
- `duration` - длительность: `6` или `10` секунд (зависит от разрешения)
- `resolution` - `1080P`, `768P`, `512P`
- `model` - `MiniMax-Hailuo-02` (по умолчанию)

#### 2. Генерация видео из изображения

```bash
POST /api/generate-image-video
Content-Type: application/json

{
  "first_frame_image": "https://example.com/image.jpg",
  "prompt": "The character smiles and waves [Tilt up,Zoom in]",
  "duration": 6,
  "resolution": "1080P"
}
```

**Параметры:**

- `first_frame_image` (обязательный) - URL или Base64 Data URL
- `prompt` - описание движения (опционально)
- `duration` - `6` или `10` секунд
- `resolution` - `1080P`, `768P`, `512P`

**Требования к изображению:**

- Форматы: JPG, JPEG, PNG, WebP
- Размер: < 20MB
- Короткая сторона > 300px
- Соотношение сторон: 2:5 - 5:2

#### 3. Генерация между двумя кадрами

```bash
POST /api/generate-start-end-video
Content-Type: application/json

{
  "first_frame_image": "https://example.com/start.jpg",
  "last_frame_image": "https://example.com/end.jpg",
  "prompt": "Smooth transition from childhood to adulthood [Pan right,Pedestal up]",
  "duration": 6,
  "resolution": "1080P"
}
```

**Параметры:**

- `first_frame_image` (обязательный) - первый кадр
- `last_frame_image` (обязательный) - последний кадр
- `prompt` - описание перехода (опционально)
- `duration` - `6` или `10` (только для 768P)
- `resolution` - `1080P` или `768P`

#### 4. Получение информации о файле

```bash
GET /api/file/{file_id}
```

Возвращает информацию о сгенерированном файле, включая `download_url`.

## Управление камерой

MiniMax поддерживает 15 команд камеры в формате `[команда]`:

### Движение камеры

- `[Truck left]`, `[Truck right]` - перемещение влево/вправо
- `[Pan left]`, `[Pan right]` - панорама влево/вправо
- `[Push in]`, `[Pull out]` - приближение/отдаление

### Вертикальное движение

- `[Pedestal up]`, `[Pedestal down]` - подъем/опускание камеры
- `[Tilt up]`, `[Tilt down]` - наклон вверх/вниз

### Зум и специальные эффекты

- `[Zoom in]`, `[Zoom out]` - оптический зум
- `[Shake]` - тряска камеры
- `[Tracking shot]` - следящая камера
- `[Static shot]` - статичная камера

### Правила использования

**Комбинированные движения:**

```json
{
  "prompt": "A cat jumps on the table [Pan left,Pedestal up]"
}
```

Максимум 3 команды в одних скобках.

**Последовательные движения:**

```json
{
  "prompt": "A dancer spins [Push in], then bows gracefully [Static shot]"
}
```

**Естественный язык:**
Можно использовать обычные описания, но явные команды дают точнее результат.

## Ограничения разрешения и длительности

| Разрешение | MiniMax-Hailuo-02 | Примечание                     |
| ---------- | ----------------- | ------------------------------ |
| **1080P**  | 6 сек             | Высокое качество               |
| **768P**   | 6 или 10 сек      | Оптимально для длинных роликов |
| **512P**   | 6 или 10 сек      | Быстрая генерация              |

## Как работает callback

1. При создании задачи вы передаете `callback_url`
2. MiniMax сначала валидирует endpoint, отправляя `challenge`
3. Ваш сервер должен вернуть тот же `challenge` за ≤3 секунды
4. При изменении статуса задачи MiniMax отправляет уведомление:

```json
{
  "task_id": "115334141465231360",
  "status": "success",
  "file_id": "205258526306433",
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

5. Сервер автоматически скачивает готовое видео в папку `./out/`

## Статусы задач

- `processing` - генерация в процессе
- `success` - видео готово
- `failed` - ошибка генерации

## Коды ошибок

| Код    | Значение                                   |
| ------ | ------------------------------------------ |
| `0`    | Успешно                                    |
| `1002` | Rate limit - попробуйте позже              |
| `1004` | Ошибка аутентификации - проверьте API ключ |
| `1008` | Недостаточно средств на балансе            |
| `1026` | Обнаружен запрещенный контент в prompt     |
| `2013` | Неверные параметры запроса                 |
| `2049` | Недействительный API ключ                  |

Полный список: [Error Code Reference](https://platform.minimax.io/docs/api-reference/errorcode)

## Примеры использования

### cURL

```bash
# Text to Video
curl -X POST http://localhost:8000/api/generate-text-video \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A corgi pranks his friend, then redeems himself [Tracking shot]",
    "duration": 6,
    "resolution": "1080P"
  }'

# Image to Video
curl -X POST http://localhost:8000/api/generate-image-video \
  -H "Content-Type: application/json" \
  -d '{
    "first_frame_image": "https://example.com/photo.jpg",
    "prompt": "The person waves and smiles [Zoom in]",
    "duration": 6
  }'
```

### JavaScript (fetch)

```javascript
async function generateVideo() {
  const response = await fetch('http://localhost:8000/api/generate-text-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'A beautiful sunset over mountains [Pan right,Pedestal down]',
      duration: 6,
      resolution: '1080P',
    }),
  })

  const { task_id } = await response.json()
  console.log('Task ID:', task_id)

  // Результат придет на callback_url
  // или можно опросить через /api/file/{file_id}
}
```

### Python (requests)

```python
import requests

response = requests.post(
    'http://localhost:8000/api/generate-text-video',
    json={
        'prompt': 'A puppy learns to share food [Push in] then [Static shot]',
        'duration': 6,
        'resolution': '1080P'
    }
)

result = response.json()
print(f"Task ID: {result['task_id']}")
```

## Base64 изображения

Вместо URL можно использовать Base64 Data URL:

```javascript
const imageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'

await fetch('http://localhost:8000/api/generate-image-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    first_frame_image: imageBase64,
    prompt: 'Animate this scene [Zoom in]',
  }),
})
```

## Создание 60-секундного видео

Стыкуйте 6 клипов по 10 секунд с помощью FFmpeg:

```bash
# Создайте list.txt
echo "file 'shot1.mp4'" > list.txt
echo "file 'shot2.mp4'" >> list.txt
echo "file 'shot3.mp4'" >> list.txt
echo "file 'shot4.mp4'" >> list.txt
echo "file 'shot5.mp4'" >> list.txt
echo "file 'shot6.mp4'" >> list.txt

# Склейте
ffmpeg -f concat -safe 0 -i list.txt -c copy final_60s.mp4
```

## Структура проекта

```
minimax/
├── server.js          # Основной сервер
├── package.json       # Зависимости
├── .env              # Конфигурация (не в git)
├── .env.example      # Пример конфигурации
├── .gitignore        # Игнорируемые файлы
├── out/              # Сгенерированные видео
├── docs.md           # API документация
├── todo.md           # Заметки и примеры
└── README.md         # Этот файл
```

## Документация MiniMax API

Полная документация MiniMax API доступна локально в папке `docs/minimax/`:

### Начало работы

- [Quick Start](docs/minimax/quick-start.md) - Получение GroupID и API ключа
- [Platform Intro](docs/minimax/platform-intro.md) - Обзор платформы MiniMax

### Модели и тарифы

- [Models](docs/minimax/models.md) - Спецификации всех моделей (Text, Speech, Video, Image)
- [Rate Limits](docs/minimax/rate-limits.md) - Лимиты API (RPM, TPM)
- [Pricing](docs/minimax/pricing.md) - Тарифы и пакеты подписок

### Руководства по Text (MiniMax-M1)

- [Text Generation Guide](docs/minimax/guides/text-generation-guide.md) - Генерация текста, стриминг, понимание изображений
- [Function Call Guide](docs/minimax/guides/text-function-call-guide.md) - Вызов функций, интеграция с vLLM
- [AI Coding Tools Guide](docs/minimax/guides/text-ai-coding-tools-guide.md) - Интеграция с Cursor и Cline
- [Transformers Deployment](docs/minimax/guides/text-transformers-deployment-guide.md) - Развертывание через Transformers
- [vLLM Deployment](docs/minimax/guides/text-vllm-deployment-guide.md) - Развертывание через vLLM

### Руководства по Speech

- [Voice Clone Guide](docs/minimax/guides/speech-voice-clone-guide.md) - Клонирование голоса
- [WebSocket TTS Guide](docs/minimax/guides/speech-t2a-websocket-guide.md) - Синхронный TTS (до 10K символов)
- [Async Long TTS Guide](docs/minimax/guides/speech-t2a-async-guide.md) - Асинхронный TTS (до 1M символов)
- [Speech Evaluation Guide](docs/minimax/guides/speech-evaluate-guide.md) - Метрики оценки качества

### Руководства по Video

- [Video Generation Guide](docs/minimax/guides/video-generation-guide.md) - T2V, I2V, First+Last Frame, Subject-Reference
- [Video Templates Guide](docs/minimax/guides/video-agent-guide.md) - Генерация видео по шаблонам

### Руководства по Image и Music

- [Image Generation Guide](docs/minimax/guides/image-generation-guide.md) - Text-to-Image и Image-to-Image
- [Music Generation Guide](docs/minimax/guides/music-generation-guide.md) - Генерация музыки с вокалом

### Model Context Protocol (MCP)

- [MCP Integration Guide](docs/minimax/guides/mcp-guide.md) - Интеграция с Claude Desktop, Cursor, Cherry Studio

### Условия использования

- [Terms of Service](docs/minimax/terms-of-service.md) - Условия предоставления услуг
- [Privacy Policy](docs/minimax/privacy-policy.md) - Политика конфиденциальности

## Полезные ссылки

- [MiniMax Platform](https://platform.minimax.io)
- [API Documentation](https://platform.minimax.io/docs)
- [Camera Movement Guide](https://b6j6u5f4zf.feishu.cn/docx/H03ZdRLh7oFsNpxE2ZqcUWb3njg)
- [ngrok Documentation](https://ngrok.com/docs)

## Лицензия

MIT
