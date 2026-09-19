create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text,
  name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced')),
  objective text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.learning_goals(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (goal_id, version)
);

create table if not exists public.path_modules (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null references public.learning_paths(id) on delete cascade,
  title text not null,
  description text,
  position integer not null check (position >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (learning_path_id, position)
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.path_modules(id) on delete cascade,
  title text not null,
  description text,
  position integer not null check (position >= 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (module_id, position)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('youtube', 'pdf', 'excel', 'file')),
  title text not null,
  url text,
  thumbnail_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.video_segments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  start_seconds numeric not null check (start_seconds >= 0),
  end_seconds numeric not null check (end_seconds >= start_seconds),
  text text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (name)
);

create table if not exists public.concept_relationships (
  id uuid primary key default gen_random_uuid(),
  source_concept_id uuid not null references public.concepts(id) on delete cascade,
  target_concept_id uuid not null references public.concepts(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('prerequisite_of', 'related_to', 'part_of')),
  created_at timestamptz not null default timezone('utc', now()),
  check (source_concept_id <> target_concept_id),
  unique (source_concept_id, target_concept_id, relationship_type)
);

create table if not exists public.resource_concepts (
  resource_id uuid not null references public.resources(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  relevance_score numeric check (relevance_score is null or (relevance_score >= 0 and relevance_score <= 1)),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (resource_id, concept_id)
);

create table if not exists public.student_concept_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  mastery_score numeric not null default 0 check (mastery_score between 0 and 100),
  confidence_score numeric not null default 0 check (confidence_score between 0 and 100),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  last_assessed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, concept_id)
);

create table if not exists public.learning_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  concept_id uuid references public.concepts(id) on delete set null,
  resource_id uuid references public.resources(id) on delete set null,
  interaction_type text not null check (interaction_type in ('VIDEO_WATCH', 'QUESTION', 'QUIZ', 'TEACH_BACK', 'REVISION', 'RESOURCE_OPENED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete set null,
  type text not null check (type in ('quick_check', 'teach_back', 'quiz')),
  question text not null,
  options jsonb,
  correct_answer text,
  explanation text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  answer text,
  is_correct boolean,
  score numeric check (score is null or (score >= 0 and score <= 100)),
  feedback text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists users_email_idx on public.users(email);
create index if not exists learning_goals_user_id_idx on public.learning_goals(user_id);
create index if not exists learning_paths_goal_id_idx on public.learning_paths(goal_id);
create index if not exists path_modules_learning_path_id_idx on public.path_modules(learning_path_id);
create index if not exists topics_module_id_idx on public.topics(module_id);
create index if not exists resources_topic_id_idx on public.resources(topic_id);
create index if not exists resources_user_id_idx on public.resources(user_id);
create index if not exists video_segments_resource_id_idx on public.video_segments(resource_id);
create index if not exists resource_concepts_concept_id_idx on public.resource_concepts(concept_id);
create index if not exists concept_relationships_source_idx on public.concept_relationships(source_concept_id);
create index if not exists concept_relationships_target_idx on public.concept_relationships(target_concept_id);
create index if not exists student_concept_mastery_user_id_idx on public.student_concept_mastery(user_id);
create index if not exists student_concept_mastery_concept_id_idx on public.student_concept_mastery(concept_id);
create index if not exists learning_interactions_user_id_idx on public.learning_interactions(user_id);
create index if not exists learning_interactions_topic_id_idx on public.learning_interactions(topic_id);
create index if not exists learning_interactions_concept_id_idx on public.learning_interactions(concept_id);
create index if not exists assessments_topic_id_idx on public.assessments(topic_id);
create index if not exists assessments_concept_id_idx on public.assessments(concept_id);
create index if not exists assessment_attempts_user_id_idx on public.assessment_attempts(user_id);
create index if not exists assessment_attempts_assessment_id_idx on public.assessment_attempts(assessment_id);

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger learning_goals_set_updated_at before update on public.learning_goals for each row execute function public.set_updated_at();
create trigger learning_paths_set_updated_at before update on public.learning_paths for each row execute function public.set_updated_at();
create trigger path_modules_set_updated_at before update on public.path_modules for each row execute function public.set_updated_at();
create trigger topics_set_updated_at before update on public.topics for each row execute function public.set_updated_at();
create trigger resources_set_updated_at before update on public.resources for each row execute function public.set_updated_at();
create trigger concepts_set_updated_at before update on public.concepts for each row execute function public.set_updated_at();
create trigger student_concept_mastery_set_updated_at before update on public.student_concept_mastery for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.learning_goals enable row level security;
alter table public.learning_paths enable row level security;
alter table public.path_modules enable row level security;
alter table public.topics enable row level security;
alter table public.resources enable row level security;
alter table public.video_segments enable row level security;
alter table public.concepts enable row level security;
alter table public.concept_relationships enable row level security;
alter table public.resource_concepts enable row level security;
alter table public.student_concept_mastery enable row level security;
alter table public.learning_interactions enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_attempts enable row level security;

create policy users_select_own on public.users for select using (clerk_user_id = (auth.jwt() ->> 'sub'));
create policy learning_goals_own on public.learning_goals for all using (
  user_id in (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub'))
) with check (
  user_id in (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub'))
);
create policy learning_paths_owned_goal on public.learning_paths for all using (
  goal_id in (select id from public.learning_goals)
) with check (goal_id in (select id from public.learning_goals));
create policy path_modules_owned_path on public.path_modules for all using (
  learning_path_id in (select id from public.learning_paths)
) with check (learning_path_id in (select id from public.learning_paths));
create policy topics_owned_module on public.topics for all using (
  module_id in (select id from public.path_modules)
) with check (module_id in (select id from public.path_modules));
create policy resources_own on public.resources for all using (
  user_id in (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub'))
) with check (
  user_id in (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub'))
  and (topic_id is null or topic_id in (select id from public.topics))
);
create policy video_segments_owned_resource on public.video_segments for all using (
  resource_id in (select id from public.resources)
) with check (resource_id in (select id from public.resources));
create policy concepts_authenticated_read on public.concepts for select to authenticated using (true);
create policy concept_relationships_authenticated_read on public.concept_relationships for select to authenticated using (true);
create policy resource_concepts_owned_resource on public.resource_concepts for all using (
  resource_id in (select id from public.resources)
) with check (resource_id in (select id from public.resources));
create policy mastery_own on public.student_concept_mastery for all using (
  user_id in (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub'))
) with check (
  user_id in (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub'))
);
create policy interactions_own on public.learning_interactions for all using (
  user_id in (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub'))
) with check (
  user_id in (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub'))
);
create policy assessments_owned_topic on public.assessments for select using (topic_id in (select id from public.topics));
create policy attempts_own on public.assessment_attempts for all using (
  user_id in (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub'))
) with check (
  user_id in (select id from public.users where clerk_user_id = (auth.jwt() ->> 'sub'))
);