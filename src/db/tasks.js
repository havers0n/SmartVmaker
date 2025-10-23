import { pgPool } from './client.js'
import { logger } from '../lib/logger.js'

export async function upsertTask(task) {
  if (!pgPool) return
  const {
    id,
    kind = null,
    status = null,
    prompt = null,
    params = null,
    file_id = null,
    public_url = null,
    error = null,
    batch_id = null,
    topic = null,
    lang = null,
    started_at = null,
    finished_at = null,
  } = task

  const text = `insert into public.tasks(id, kind, status, prompt, params, file_id, public_url, error, batch_id, topic, lang, started_at, finished_at)
  values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
  on conflict (id) do update set
    kind=coalesce(excluded.kind, public.tasks.kind),
    status=coalesce(excluded.status, public.tasks.status),
    prompt=coalesce(excluded.prompt, public.tasks.prompt),
    params=coalesce(excluded.params, public.tasks.params),
    file_id=coalesce(excluded.file_id, public.tasks.file_id),
    public_url=coalesce(excluded.public_url, public.tasks.public_url),
    error=coalesce(excluded.error, public.tasks.error),
    batch_id=coalesce(excluded.batch_id, public.tasks.batch_id),
    topic=coalesce(excluded.topic, public.tasks.topic),
    lang=coalesce(excluded.lang, public.tasks.lang),
    started_at=coalesce(excluded.started_at, public.tasks.started_at),
    finished_at=coalesce(excluded.finished_at, public.tasks.finished_at);
  `
  const values = [
    id,
    kind,
    status,
    prompt,
    params ? JSON.stringify(params) : null,
    file_id,
    public_url,
    error,
    batch_id,
    topic,
    lang,
    started_at,
    finished_at,
  ]
  try {
    await pgPool.query(text, values)
  } catch (e) {
    logger.error({ err: e }, '[DB Upsert Error]')
  }
}

export async function getTaskById(id) {
  if (!pgPool) return null
  try {
    const r = await pgPool.query(
      'select id, kind, status, prompt, params, file_id, public_url, error, batch_id, topic, lang, started_at, finished_at from public.tasks where id = $1',
      [id]
    )
    return r.rows[0] || null
  } catch (e) {
    logger.error({ err: e }, '[DB Read Error]')
    return null
  }
}
