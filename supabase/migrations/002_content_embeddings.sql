create extension if not exists vector;

alter table public.video_segments
  add column if not exists embedding vector(768);

create index if not exists video_segments_embedding_idx
  on public.video_segments using ivfflat (embedding vector_cosine_ops)
  with (lists = 10)
  where embedding is not null;
