import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `L Missing required environment variable: ${name}\nPlease check your .env file.`
    )
  }
  return value
}

export const supabase = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { db: { schema: 'public' } }
)

/**
 * Save task start to Supabase
 * Called immediately after task_id is received from MiniMax API
 */
export async function saveTaskStart({ task_id, kind, prompt, params, topic, lang }) {
  try {
    const { error } = await supabase.from('tasks').insert({
      id: task_id,
      kind,
      status: 'processing',
      prompt,
      params,
      topic,
      lang,
      started_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[Supabase] Error saving task start:', error)
      return false
    }
    console.log(`[Supabase] Task ${task_id} recorded as processing`)
    return true
  } catch (e) {
    console.error('[Supabase] Unexpected error in saveTaskStart:', e?.message || e)
    return false
  }
}

/**
 * Update task finish in Supabase
 * Called from /hailuo/callback after file download completes
 */
export async function saveTaskFinish({ task_id, status, file_id, public_url, errorText }) {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        status,
        file_id,
        public_url,
        error: errorText || null,
        finished_at: new Date().toISOString(),
      })
      .eq('id', task_id)

    if (error) {
      console.error('[Supabase] Error updating task finish:', error)
      return false
    }
    console.log(`[Supabase] Task ${task_id} updated to ${status}`)
    return true
  } catch (e) {
    console.error('[Supabase] Unexpected error in saveTaskFinish:', e?.message || e)
    return false
  }
}

/**
 * Get task by ID from Supabase
 */
export async function getTaskFromSupabase(task_id) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, kind, status, prompt, params, file_id, public_url, error, topic, lang, started_at, finished_at'
      )
      .eq('id', task_id)
      .maybeSingle()

    if (error) {
      console.error('[Supabase] Error fetching task:', error)
      return null
    }
    return data
  } catch (e) {
    console.error('[Supabase] Unexpected error in getTaskFromSupabase:', e?.message || e)
    return null
  }
}
