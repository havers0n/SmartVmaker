insert into public.tasks(id,kind,status,topic,lang)
values ('demo-task-1','t2v','queued','Snow leopard rescue','en')
on conflict (id) do nothing;
