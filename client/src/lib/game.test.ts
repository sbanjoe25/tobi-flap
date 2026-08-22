import { describe, expect, it } from "vitest";
import {
  ASTEROID_DIFFICULTY_TIERS,
  canAcceptFlap,
  clampVolume,
  doesAsteroidHitPlayer,
  getAsteroidDifficulty,
  getSecondsUntilNextThreat,
} from "./game";

describe("Asteroid Field timed threat progression", () => {
  it("holds Scout for the first 30 seconds and then advances one tier every 30 seconds", () => {
    expect(getAsteroidDifficulty(0).label).toBe("SCOUT");
    expect(getAsteroidDifficulty(29.99).level).toBe(1);
    expect(getAsteroidDifficulty(30).label).toBe("RUSH");
    expect(getAsteroidDifficulty(60).label).toBe("SURGE");
    expect(getAsteroidDifficulty(90).label).toBe("NOVA");
  });

  it("caps at the Eclipse tier after two minutes", () => {
    expect(getAsteroidDifficulty(120).label).toBe("ECLIPSE");
    expect(getAsteroidDifficulty(999).level).toBe(ASTEROID_DIFFICULTY_TIERS.length);
  });

  it("reports an accurate countdown until the next threat increase", () => {
    expect(getSecondsUntilNextThreat(0)).toBe(30);
    expect(getSecondsUntilNextThreat(29)).toBe(1);
    expect(getSecondsUntilNextThreat(30)).toBe(30);
    expect(getSecondsUntilNextThreat(120)).toBe(0);
  });
});

describe("Asteroid collision coverage", () => {
  it("hits debris overlapping the cockpit center", () => {
    expect(doesAsteroidHitPlayer({ id: 1, x: 73, y: 251, size: 50, spin: 6 }, 276)).toBe(true);
  });

  it("covers close visual contact at the cockpit edge", () => {
    expect(doesAsteroidHitPlayer({ id: 2, x: 130, y: 251, size: 50, spin: 6 }, 276)).toBe(true);
  });

  it("does not report distant debris as a collision", () => {
    expect(doesAsteroidHitPlayer({ id: 3, x: 220, y: 251, size: 50, spin: 6 }, 276)).toBe(false);
  });
});

describe("Launch and audio setting rules", () => {
  it("requires an explicit launch action before a ready or landed flight can flap", () => {
    expect(canAcceptFlap("ready", false)).toBe(false);
    expect(canAcceptFlap("ready", true)).toBe(true);
    expect(canAcceptFlap("gameover", false)).toBe(false);
    expect(canAcceptFlap("gameover", true)).toBe(true);
    expect(canAcceptFlap("playing", false)).toBe(true);
    expect(canAcceptFlap("paused", false)).toBe(false);
    expect(canAcceptFlap("paused", true)).toBe(false);
  });

  it("keeps music and effects slider values within their valid range", () => {
    expect(clampVolume(-20)).toBe(0);
    expect(clampVolume(55)).toBe(55);
    expect(clampVolume(500)).toBe(100);
    expect(clampVolume(Number.NaN)).toBe(0);
  });
});
