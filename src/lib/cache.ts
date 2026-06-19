export const CACHE_REVALIDATE = {
  homeStats: 120,
  posts: 120,
  missions: 60,
  leaderboard: 60,
  protocols: 300,
  publicProfile: 60,
} as const;

export const CACHE_TAGS = {
  homeStats: "home-stats",
  posts: "posts",
  missions: "missions",
  leaderboard: "leaderboard",
  protocols: "protocols",
} as const;
