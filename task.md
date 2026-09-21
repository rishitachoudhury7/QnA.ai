# AI Tutor Project Tasks

## PHASE 0: Project Setup & Environment
- [x] ✅ Initialize Next.js project (TypeScript, Tailwind, App Router)
- [ ] Setup shadcn/ui and necessary components
- [x] ✅ Install and configure Framer Motion
- [x] ✅ Configure Clerk for authentication
- [x] ✅ Initialize Supabase client

## PHASE 1: Database & Learning Architecture
- [x] ✅ Define and migrate schema (`users`, `learning_goals`, `learning_paths`, `path_modules`, `resources`, `video_segments`)
- [x] ✅ Define and migrate schema (`concepts`, `concept_relationships`, `resource_concepts`)
- [x] ✅ Define and migrate schema (`student_concept_mastery`, `learning_interactions`, `assessments`, `assessment_attempts`)
- [x] ✅ Build "Structured Learning" vs "Quick Learn" flow models (Frontend routes created; DB models created)

## PHASE 1.5: AI Curriculum Generation
- [x] ✅ Groq curriculum generator with server-only API key
- [x] ✅ Zod validation and limited retry for structured output
- [x] ✅ Versioned learning path, module, and topic persistence
- [x] ✅ Goal creation loading/error states and generated dashboard path

## PHASE 2: YouTube Ingestion & Content Engine
- [x] ✅ Implement background processing flow (`PROCESSING` -> `READY`)
- [x] ✅ Implement YouTube Metadata & Transcript fetching
- [x] ✅ Implement Temporal & Semantic Chunking
- [x] ✅ Implement `lib/ai/content/embeddings.ts` (Gemini embeddings -> pgvector)

## PHASE 3: AI Knowledge Engine
- [x] ✅ Implement `lib/ai/content/conceptExtractor.ts` (Gemini structured concepts)
- [x] ✅ Implement Zod validation (`ConceptSchema`) and retry logic
- [x] ✅ Implement concept deduplication and relationship building
- [x] ✅ Persist concepts and relationships to DB

## PHASE 4: Timestamp-Aware Tutor
- [x] ✅ Build `app/learn/[resourceId]/page.tsx`
- [x] ✅ Build `components/video/YouTubePlayer.tsx` (YouTube IFrame API integration)
- [x] ✅ Implement temporal + semantic retrieval strategy
- [x] ✅ Implement `lib/ai/content/tutor.ts` with explicit Grounding Rules

## PHASE 5: Learner Engine & Mastery Model
- [x] ✅ Define Evidence-Based Mastery model (Observation, Assessment, Explanation)
- [x] ✅ Interactive Quick Check & Teach-Back evaluation UI
- [x] ✅ Implement `lib/ai/learner/assessment.ts` (Quick Checks / Zod validated)
- [x] ✅ Implement `lib/ai/learner/misconception.ts` (Teach-back evaluation)
- [x] ✅ Track and update `student_concept_mastery` and `learning_interactions`
## PHASE 6: Knowledge Map
- [x] ✅ Build `app/knowledge-map/page.tsx`
- [x] ✅ Implement `components/graph/KnowledgeGraph.tsx` (React Flow / @xyflow/react in `components/knowledge/KnowledgeMap.tsx`)
- [x] ✅ Connect graph nodes to Learner Engine mastery scores

## PHASE 7: Adaptation Engine
- [ ] Implement `lib/ai/adaptation/recommender.ts`
- [x] ✅ Build Recommendation UI (Revisions vs Unlocks)

## PHASE 8: Dashboard & UX Polish
- [x] ✅ Add Framer Motion states ("Analyzing course...", interactive modals)
- [x] ✅ Polish Dashboard and flagship Learning Page

## PHASE 9: Security & Evaluation
- [ ] Enforce Supabase RLS policies
- [ ] Ensure API keys are server-side only
- [ ] Create `/evals` directory with 5-10 benchmark datasets
- [ ] Run evaluations for extraction and RAG accuracy

## PHASE 10: SIH Demo Mode & Polish
- [x] ✅ Create Preprocessed "Machine Learning Fundamentals" Demo Course (Mock dataset & interactive scenario)
- [ ] Final dry run of demo scenario (Teach-back -> mastery drop -> recommendation)

