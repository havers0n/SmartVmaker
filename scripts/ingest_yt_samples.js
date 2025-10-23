import fs from 'fs'
import readline from 'readline'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function upsertBatch(rows) {
  const { error } = await supabase.from('yt_samples').upsert(rows, { onConflict: 'video_id' })
  if (error) throw error
}

async function run() {
  const rl = readline.createInterface({
    input: fs.createReadStream('data/yt_samples.ndjson', 'utf8'),
    crlfDelay: Infinity,
  })

  const batch = []
  for await (const line of rl) {
    if (!line.trim()) continue
    const obj = JSON.parse(line)
    const i = obj.input_features,
      o = obj.output_metrics
    batch.push({
      video_id: i.video_id,
      title: i.title,
      channel_title: i.channel_title,
      duration_s: i.duration_s,
      duration_category: i.duration_category,
      tags_from_report: i.tags_from_report ?? [],
      num_tags: i.num_tags ?? i.tags_from_report?.length ?? 0,
      views: o.views,
      likes: o.likes,
      comments: o.comments,
      like_rate: o.like_rate,
      comment_rate: o.comment_rate,
      engagement_rate: o.engagement_rate,
      viral_score: o.viral_score,
      virality_category: o.virality_category,
    })
    if (batch.length >= 300) {
      await upsertBatch(batch.splice(0))
    }
  }
  if (batch.length) await upsertBatch(batch)
  console.log('✓ Ingest complete')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
