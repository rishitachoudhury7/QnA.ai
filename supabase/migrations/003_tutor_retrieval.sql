create or replace function public.match_video_segments(
  query_embedding vector(768),
  match_resource_id uuid,
  match_count integer default 6,
  match_threshold double precision default 0.15
)
returns table (
  id uuid,
  resource_id uuid,
  start_seconds numeric,
  end_seconds numeric,
  text text,
  similarity double precision
)
language sql
stable
as $$
  select
    video_segments.id,
    video_segments.resource_id,
    video_segments.start_seconds,
    video_segments.end_seconds,
    video_segments.text,
    1 - (video_segments.embedding <=> query_embedding) as similarity
  from public.video_segments
  where video_segments.resource_id = match_resource_id
    and video_segments.embedding is not null
    and 1 - (video_segments.embedding <=> query_embedding) >= match_threshold
  order by video_segments.embedding <=> query_embedding
  limit match_count;
$$;
