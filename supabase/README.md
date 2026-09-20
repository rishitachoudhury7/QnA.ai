# Supabase setup

Apply `migrations/001_initial_learning_schema.sql` to the Supabase project whose URL is in `.env.local`, using the Supabase Dashboard SQL Editor. The application cannot create tables through the REST API. After running the migration, retry the goal creation request. Optionally apply `seed.sql` in a development project.

For YouTube ingestion, also apply `migrations/002_content_embeddings.sql`. It enables pgvector and adds `video_segments.embedding` with the 768-dimension Gemini embedding type. If PostgREST reports an error that the embedding column does not exist, apply this migration and run the schema-cache reload below.

If PostgREST still reports `PGRST205` immediately after applying the migration, wait briefly and reload the schema cache from the SQL Editor:

```sql
notify pgrst, 'reload schema';
```

The schema keeps shared concepts independent from user-owned resources. Deleting a goal cascades through its paths, modules, and topics. Deleting a resource cascades to its video segments and resource-concept links, while concepts remain available to other resources and learners. User-owned records cascade when the owning user is removed.

The RLS policies expect the Supabase JWT `sub` claim to contain the Clerk user ID. The application API uses Clerk server authentication and the service-role client only after resolving that identity to `public.users`; the service-role key must remain server-only.