import { Pool } from 'pg'
import { config } from '../config/index.js'
import { logger } from '../lib/logger.js'

// In-memory job cache for status tracking
export const jobs = new Map() // task_id -> { status, file_id, public_url, timestamp, error }

// Initialize Postgres pool when DATABASE_URL is available
let pgPool = null

if (config.database.url) {
  pgPool = new Pool({ connectionString: config.database.url })
  pgPool.on('error', (err) => logger.error({ err }, 'Postgres pool error'))
  logger.info('[POSTGRES] Pool created')
} else {
  logger.warn('[POSTGRES] DATABASE_URL not set - running without DB persistence')
}

export { pgPool }
