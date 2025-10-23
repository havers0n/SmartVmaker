import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY // на сервере можно SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Нет SUPABASE_URL или SUPABASE_*_KEY в .env')
  process.exit(1)
}

const supabase = createClient(url, key, { db: { schema: 'public' } })

async function main() {
  const { data, error } = await supabase
    .from('tasks') // <-- реальное имя таблицы
    .select('*')
    .limit(1)

  if (error) {
    console.error('Ошибка подключения:', error)
  } else {
    console.log('Подключение успешно:', data)
  }
}
main()
