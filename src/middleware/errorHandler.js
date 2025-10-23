import { logger } from '../lib/logger.js'

export function errorHandler(err, req, res, _next) {
  const status = err.status || 500
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error')
  res.status(status).json({ ok: false, error: err.message || 'Internal Server Error' })
}
