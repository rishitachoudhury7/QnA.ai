import type { LearningResource } from "@/lib/state";

export type RecommendedVideo = Omit<LearningResource, "id" | "topicId" | "type"> & {
  id: string;
  topic: string;
  channel: string;
  level: string;
  type: "youtube";
};

export const recommendedVideos: RecommendedVideo[] = [
  {
    id: "linear-regression-statquest",
    topic: "linear-regression",
    type: "youtube",
    title: "Linear Regression Clearly Explained",
    channel: "StatQuest",
    source: "StatQuest",
    duration: "18 min",
    level: "Beginner",
  },
  {
    id: "linear-regression-freecodecamp",
    topic: "linear-regression",
    type: "youtube",
    title: "Linear Regression - Machine Learning",
    channel: "freeCodeCamp",
    source: "freeCodeCamp",
    duration: "24 min",
    level: "Beginner",
  },
  {
    id: "gradient-descent-statquest",
    topic: "gradient-descent",
    type: "youtube",
    title: "Gradient Descent, Step by Step",
    channel: "StatQuest",
    source: "StatQuest",
    duration: "16 min",
    level: "Beginner",
  },
  {
    id: "gradient-descent-scratch",
    topic: "gradient-descent",
    type: "youtube",
    title: "Gradient Descent from Scratch",
    channel: "Example Channel",
    source: "Example Channel",
    duration: "31 min",
    level: "Intermediate",
  },
];

export function getRecommendedVideos(topic: string) {
  return recommendedVideos.filter((video) => video.topic === topic);
}