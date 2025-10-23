import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { config } from '../config/index.js'
import { logger } from '../lib/logger.js'

// CORS middleware with allowlist
export function setupCORS(app) {
  const origins = config.cors.origins
  if (origins.length > 0) {
    app.use(
      cors({
        origin: (origin, cb) =>
          !origin || origins.includes(origin)
            ? cb(null, true)
            : cb(new Error('Not allowed by CORS')),
        credentials: false,
      })
    )
    logger.info(`[CORS] Allowed origins: ${origins.join(', ')}`)
  } else {
    logger.info('[CORS] No restrictions (all origins allowed)')
  }
}

// Helmet security headers
export function setupHelmet(app) {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  )
}

// Content-Security-Policy
export function setupCSP(app) {
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; connect-src 'self' http://localhost:* https:;"
    )
    next()
  })
}

// Rate limiting for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: { error: 'Too many requests, please try again later.', status_code: 1002 },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiting for demo endpoints
export const demoLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'Too many demo requests, please wait a moment.', status_code: 1002 },
})
