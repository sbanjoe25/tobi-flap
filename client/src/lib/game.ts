/**
 * Space Arcade game rules: deterministic, DOM-free helpers shared by flight logic and unit tests.
 */
export type GameStatus = "ready" | "playing" | "paused" | "gameover";

export type Asteroid = {
  id: number;
  x: number;
  y: number;
  size: number;
  spin: number;
  scored?: boolean;
};

export const CHARACTER_X = 98;
export const PLAYER_COLLISION_HALF_WIDTH = 37;
export const PLAYER_COLLISION_HALF_HEIGHT = 34;
export const THREAT_TIER_INTERVAL = 30;

export const ASTEROID_DIFFICULTY_TIERS = [
  { level: 1, label: "SCOUT", speed: 192, interval: 0.92 },
  { level: 2, label: "RUSH", speed: 236, interval: 0.78 },
  { level: 3, label: "SURGE", speed: 280, interval: 0.66 },
  { level: 4, label: "NOVA", speed: 324, interval: 0.55 },
  { level: 5, label: "ECLIPSE", speed: 360, interval: 0.48 },
] as const;

export const getAsteroidDifficulty = (survivalSeconds: number) =>
  ASTEROID_DIFFICULTY_TIERS[Math.min(Math.floor(survivalSeconds / THREAT_TIER_INTERVAL), ASTEROID_DIFFICULTY_TIERS.length - 1)];

export const getSecondsUntilNextThreat = (survivalSeconds: number) => {
  const currentTier = getAsteroidDifficulty(survivalSeconds);
  if (currentTier.level === ASTEROID_DIFFICULTY_TIERS.length) return 0;
  return THREAT_TIER_INTERVAL - (Math.floor(survivalSeconds) % THREAT_TIER_INTERVAL);
};

export const clampVolume = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

export const canAcceptFlap = (status: GameStatus, launchRequested: boolean) =>
  status === "playing" || (launchRequested && (status === "ready" || status === "gameover"));

export const doesAsteroidHitPlayer = (asteroid: Asteroid, playerY: number) => {
  const asteroidCenterX = asteroid.x + asteroid.size * .5;
  const asteroidCenterY = asteroid.y + asteroid.size * .5;
  const closestX = Math.max(CHARACTER_X - PLAYER_COLLISION_HALF_WIDTH, Math.min(asteroidCenterX, CHARACTER_X + PLAYER_COLLISION_HALF_WIDTH));
  const closestY = Math.max(playerY - PLAYER_COLLISION_HALF_HEIGHT, Math.min(asteroidCenterY, playerY + PLAYER_COLLISION_HALF_HEIGHT));
  const distanceX = asteroidCenterX - closestX;
  const distanceY = asteroidCenterY - closestY;
  const asteroidRadius = asteroid.size * .46;
  return distanceX * distanceX + distanceY * distanceY <= asteroidRadius * asteroidRadius;
};
