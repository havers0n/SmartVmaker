import 'dotenv/config'

// Helper to validate required environment variables
function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `❌ Missing required environment variable: ${name}\nPlease check your .env file.`
    )
  }
  return value
}

export const config = {
  api: {
    baseUrl: 'https://api.minimax.io',
    key: requireEnv('MINIMAX_API_KEY'),
  },
  server: {
    port: process.env.PORT || 8000,
    publicBaseUrl: requireEnv('PUBLIC_BASE_URL'),
  },
  database: {
    url: process.env.DATABASE_URL || null,
  },
  supabase: {
    url: process.env.SUPABASE_URL || null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
  },
  cors: {
    origins: (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
}
