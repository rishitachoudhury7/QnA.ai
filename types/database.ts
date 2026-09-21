export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: UserInsert; Update: Partial<UserInsert>; Relationships: [] };
      learning_goals: { Row: LearningGoal; Insert: LearningGoalInsert; Update: Partial<LearningGoalInsert>; Relationships: [] };
      learning_paths: { Row: LearningPath; Insert: LearningPathInsert; Update: Partial<LearningPathInsert>; Relationships: [] };
      path_modules: { Row: PathModule; Insert: PathModuleInsert; Update: Partial<PathModuleInsert>; Relationships: [] };
      topics: { Row: Topic; Insert: TopicInsert; Update: Partial<TopicInsert>; Relationships: [] };
      resources: { Row: Resource; Insert: ResourceInsert; Update: Partial<ResourceInsert>; Relationships: [] };
      video_segments: { Row: VideoSegment; Insert: VideoSegmentInsert; Update: Partial<VideoSegmentInsert>; Relationships: [] };
      concepts: { Row: Concept; Insert: ConceptInsert; Update: Partial<ConceptInsert>; Relationships: [] };
      concept_relationships: { Row: ConceptRelationship; Insert: ConceptRelationshipInsert; Update: Partial<ConceptRelationshipInsert>; Relationships: [] };
      resource_concepts: { Row: ResourceConcept; Insert: ResourceConceptInsert; Update: Partial<ResourceConceptInsert>; Relationships: [] };
      student_concept_mastery: { Row: StudentConceptMastery; Insert: StudentConceptMasteryInsert; Update: Partial<StudentConceptMasteryInsert>; Relationships: [] };
      learning_interactions: { Row: LearningInteraction; Insert: LearningInteractionInsert; Update: Partial<LearningInteractionInsert>; Relationships: [] };
      assessments: { Row: Assessment; Insert: AssessmentInsert; Update: Partial<AssessmentInsert>; Relationships: [] };
      assessment_attempts: { Row: AssessmentAttempt; Insert: AssessmentAttemptInsert; Update: Partial<AssessmentAttemptInsert>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      match_video_segments: {
        Args: { query_embedding: number[]; match_resource_id: string; match_count?: number; match_threshold?: number };
        Returns: Array<{ id: string; resource_id: string; start_seconds: number; end_seconds: number; text: string; similarity: number }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type User = { id: string; clerk_user_id: string; email: string | null; name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
export type LearningGoal = { id: string; user_id: string; title: string; description: string | null; skill_level: "beginner" | "intermediate" | "advanced" | null; objective: string | null; status: "active" | "archived"; created_at: string; updated_at: string };
export type LearningPath = { id: string; goal_id: string; title: string; description: string | null; status: "draft" | "active" | "archived"; version: number; created_at: string; updated_at: string };
export type PathModule = { id: string; learning_path_id: string; title: string; description: string | null; position: number; created_at: string; updated_at: string };
export type Topic = { id: string; module_id: string; title: string; description: string | null; position: number; status: "active" | "archived"; created_at: string; updated_at: string };
export type Resource = { id: string; topic_id: string | null; user_id: string; type: "youtube" | "pdf" | "excel" | "file"; title: string; url: string | null; thumbnail_url: string | null; duration_seconds: number | null; status: "pending" | "processing" | "ready" | "failed"; metadata: Json; created_at: string; updated_at: string };
export type VideoSegment = { id: string; resource_id: string; start_seconds: number; end_seconds: number; text: string; embedding: number[] | null; created_at: string };
export type Concept = { id: string; name: string; description: string | null; created_at: string; updated_at: string };
export type ConceptRelationship = { id: string; source_concept_id: string; target_concept_id: string; relationship_type: "prerequisite_of" | "related_to" | "part_of"; created_at: string };
export type ResourceConcept = { resource_id: string; concept_id: string; relevance_score: number | null; created_at: string };
export type StudentConceptMastery = { id: string; user_id: string; concept_id: string; mastery_score: number; confidence_score: number; evidence_count: number; last_assessed_at: string | null; created_at: string; updated_at: string };
export type LearningInteraction = { id: string; user_id: string; topic_id: string | null; concept_id: string | null; resource_id: string | null; interaction_type: "VIDEO_WATCH" | "QUESTION" | "QUIZ" | "TEACH_BACK" | "REVISION" | "RESOURCE_OPENED"; metadata: Json; created_at: string };
export type Assessment = { id: string; topic_id: string; concept_id: string | null; type: "quick_check" | "teach_back" | "quiz"; question: string; options: Json | null; correct_answer: string | null; explanation: string | null; created_at: string };
export type AssessmentAttempt = { id: string; assessment_id: string; user_id: string; answer: string | null; is_correct: boolean | null; score: number | null; feedback: string | null; created_at: string };

export type UserInsert = Pick<User, "clerk_user_id"> & Partial<Pick<User, "email" | "name" | "avatar_url">>;
export type LearningGoalInsert = Pick<LearningGoal, "user_id" | "title"> & Partial<Pick<LearningGoal, "description" | "skill_level" | "objective" | "status">>;
export type LearningPathInsert = Pick<LearningPath, "goal_id" | "title"> & Partial<Pick<LearningPath, "description" | "status" | "version">>;
export type PathModuleInsert = Pick<PathModule, "learning_path_id" | "title" | "position"> & Partial<Pick<PathModule, "description">>;
export type TopicInsert = Pick<Topic, "module_id" | "title" | "position"> & Partial<Pick<Topic, "description" | "status">>;
export type ResourceInsert = Pick<Resource, "user_id" | "type" | "title"> & Partial<Pick<Resource, "topic_id" | "url" | "thumbnail_url" | "duration_seconds" | "status" | "metadata">>;
export type VideoSegmentInsert = Pick<VideoSegment, "resource_id" | "start_seconds" | "end_seconds" | "text"> & Partial<Pick<VideoSegment, "embedding">>;
export type ConceptInsert = Pick<Concept, "name"> & Partial<Pick<Concept, "description">>;
export type ConceptRelationshipInsert = Pick<ConceptRelationship, "source_concept_id" | "target_concept_id" | "relationship_type">;
export type ResourceConceptInsert = Pick<ResourceConcept, "resource_id" | "concept_id"> & Partial<Pick<ResourceConcept, "relevance_score">>;
export type StudentConceptMasteryInsert = Pick<StudentConceptMastery, "user_id" | "concept_id"> & Partial<Pick<StudentConceptMastery, "mastery_score" | "confidence_score" | "evidence_count" | "last_assessed_at">>;
export type LearningInteractionInsert = Pick<LearningInteraction, "user_id" | "interaction_type"> & Partial<Pick<LearningInteraction, "topic_id" | "concept_id" | "resource_id" | "metadata">>;
export type AssessmentInsert = Pick<Assessment, "topic_id" | "type" | "question"> & Partial<Pick<Assessment, "concept_id" | "options" | "correct_answer" | "explanation">>;
export type AssessmentAttemptInsert = Pick<AssessmentAttempt, "assessment_id" | "user_id"> & Partial<Pick<AssessmentAttempt, "answer" | "is_correct" | "score" | "feedback">>;