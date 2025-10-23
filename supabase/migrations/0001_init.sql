-- tasks: единица генерации (t2v/i2v/startend/tts/compose)
create table if not exists public.tasks (
  id            text primary key,         -- task_id MiniMax или uuid
  kind          text not null,            -- 't2v' | 'i2v' | 'startend' | 'tts' | 'compose'
  status        text not null,            -- 'queued' | 'processing' | 'success' | 'failed'
  prompt        text,
  params        jsonb,
  file_id       text,
  public_url    text,
  error         text,
  batch_id      text,
  topic         text,
  lang          text,
  started_at    timestamptz default now(),
  finished_at   timestamptz
);

-- clips: клипы по бита́м
create table if not exists public.clips (
  id           uuid primary key default gen_random_uuid(),
  task_id      text not null references public.tasks(id) on delete cascade,
  beat_id      text,
  public_url   text,
  duration_s   int
);

-- batches: пакетные запуски по манифесту
create table if not exists public.batches (
  id            uuid primary key default gen_random_uuid(),
  plan_path     text,
  status        text,
  total         int,
  ok            int,
  fail          int,
  avg_time_ms   int,
  quality_score int,
  started_at    timestamptz default now(),
  finished_at   timestamptz
);

-- assets: кэш изображений (text->image)
create table if not exists public.assets (
  id           text primary key,          -- sha256(prompt+ar+model)
  kind         text,                      -- 'image'
  prompt       text,
  aspect_ratio text,
  model        text,
  url          text,
  created_at   timestamptz default now()
);

-- индексы
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_batch on public.tasks(batch_id);
create index if not exists idx_assets_prompt on public.assets (prompt);

-- RLS выключаем для dev (в проде включить и написать политики)
alter table public.tasks  disable row level security;
alter table public.clips  disable row level security;
alter table public.batches disable row level security;
alter table public.assets disable row level security;
