-- Development-only seed data. Never use the placeholder Clerk identity in production.
insert into public.users (id, clerk_user_id, email, name)
values ('00000000-0000-0000-0000-000000000001', 'seed-clerk-user', 'seed@example.com', 'Seed User')
on conflict (id) do nothing;

insert into public.learning_goals (id, user_id, title, skill_level, objective)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Machine Learning', 'beginner', 'Build ML projects and become job-ready')
on conflict (id) do nothing;

insert into public.learning_paths (id, goal_id, title, status, version)
values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Machine Learning Fundamentals', 'active', 1)
on conflict (id) do nothing;

insert into public.path_modules (id, learning_path_id, title, position)
values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'ML Foundations', 0),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'Supervised Learning', 1)
on conflict (id) do nothing;

insert into public.topics (id, module_id, title, position)
values
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000004', 'What is Machine Learning?', 0),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', 'Linear Regression', 0),
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000005', 'Logistic Regression', 1),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000005', 'KNN', 2)
on conflict (id) do nothing;

insert into public.concepts (id, name)
values
  ('00000000-0000-0000-0000-000000000010', 'Features'),
  ('00000000-0000-0000-0000-000000000011', 'Labels'),
  ('00000000-0000-0000-0000-000000000012', 'Cost Function'),
  ('00000000-0000-0000-0000-000000000013', 'Gradient Descent'),
  ('00000000-0000-0000-0000-000000000014', 'Learning Rate')
on conflict (id) do nothing;

insert into public.concept_relationships (source_concept_id, target_concept_id, relationship_type)
values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000007', 'prerequisite_of'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000013', 'prerequisite_of'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000007', 'prerequisite_of')
on conflict (source_concept_id, target_concept_id, relationship_type) do nothing;

insert into public.resources (id, topic_id, user_id, type, title, url, status)
values
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'youtube', 'StatQuest - Linear Regression', 'https://www.youtube.com/watch?v=7Arm8gN1b8A', 'ready'),
  ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'youtube', 'Andrew Ng - Regression', 'https://www.youtube.com/watch?v=4b4MUYve_U8', 'ready')
on conflict (id) do nothing;

insert into public.student_concept_mastery (user_id, concept_id, mastery_score, confidence_score, evidence_count)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 70, 65, 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 42, 38, 1)
on conflict (user_id, concept_id) do nothing;