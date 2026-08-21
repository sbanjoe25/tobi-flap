/**
 * Space Arcade visual system: dark collectible flight cabinet with a photo-first cockpit pilot.
 */
import { Button } from "@/components/ui/button";
import { canAcceptFlap, clampVolume, doesAsteroidHitPlayer, getAsteroidDifficulty, getSecondsUntilNextThreat, THREAT_TIER_INTERVAL, type Asteroid, type GameStatus } from "@/lib/game";
import { ArrowUp, LayoutGrid, RotateCcw, SlidersHorizontal, Trophy, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type CharacterId = "tobi" | "liam";
type GameMode = "normal" | "asteroid";

type Pipe = {
  id: number;
  x: number;
  top: number;
};

type HoverAudioNodes = {
  oscillator: OscillatorNode;
  gain: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  baseGain: number;
};

const STAGE_WIDTH = 360;
const STAGE_HEIGHT = 640;
const GROUND_HEIGHT = 56;
const CHARACTER_SIZE = 58;
const CHARACTER_X = 98;
const PIPE_WIDTH = 76;
const PIPE_GAP = 224;
const GRAVITY = 900;
const FLAP_VELOCITY = -325;
const PIPE_SPEED = 126;
const PIPE_INTERVAL = 1.7;

const logoImage = "/manus-storage/photo-flap-alien-logo_ea409bed.png";
const soundtrackUrl = "/manus-storage/tobi-flap-space-arcade-loop_c4d9f30e.mp3";

const CHARACTERS: Array<{ id: CharacterId; name: string; image: string; note: string }> = [
  {
    id: "tobi",
    name: "Tobi",
    image: "/manus-storage/tobi-flap-tobi-cockpit-edge-clean_34dda769.png",
    note: "Orbit scout",
  },
  {
    id: "liam",
    name: "Liam",
    image: "/manus-storage/tobi-flap-liam-cockpit-cutout_8fd6ac54.png",
    note: "Comet copilot",
  },
];

const randomPipe = (id: number, x = STAGE_WIDTH + 30): Pipe => {
  const minTop = 96;
  const maxTop = STAGE_HEIGHT - GROUND_HEIGHT - PIPE_GAP - 96;

  return {
    id,
    x,
    top: Math.round(minTop + Math.random() * (maxTop - minTop)),
  };
};

const randomAsteroid = (id: number, difficultyLevel = 1, x = STAGE_WIDTH + 28): Asteroid => {
  const size = 34 + Math.round(Math.random() * 29) + Math.min((difficultyLevel - 1) * 3, 12);
  return {
    id,
    x,
    y: 76 + Math.round(Math.random() * (STAGE_HEIGHT - GROUND_HEIGHT - 152 - size)),
    size,
    spin: 5.5 + Math.random() * 3.5,
  };
};

function getInitialGame(mode: GameMode = "normal") {
  return {
    y: 276,
    velocity: 0,
    pipes: mode === "normal" ? [randomPipe(1, 430), randomPipe(2, 650)] : [],
    asteroids: [] as Asteroid[],
    score: 0,
    survivalSeconds: 0,
    nextId: 3,
    spawnClock: 0,
    lastTimestamp: 0,
  };
}

function PipeColumn({ pipe }: { pipe: Pipe }) {
  const upperHeight = (pipe.top / STAGE_HEIGHT) * 100;
  const lowerTop = ((pipe.top + PIPE_GAP) / STAGE_HEIGHT) * 100;
  const lowerHeight = ((STAGE_HEIGHT - GROUND_HEIGHT - (pipe.top + PIPE_GAP)) / STAGE_HEIGHT) * 100;
  const left = (pipe.x / STAGE_WIDTH) * 100;
  const width = (PIPE_WIDTH / STAGE_WIDTH) * 100;

  return (
    <>
      <div className="pipe pipe--top" style={{ left: `${left}%`, width: `${width}%`, height: `${upperHeight}%` }}>
        <span className="pipe__stem" />
        <span className="pipe__rim pipe__rim--bottom" />
        <span className="pipe__leaf pipe__leaf--one" />
        <span className="pipe__leaf pipe__leaf--two" />
      </div>
      <div className="pipe pipe--bottom" style={{ left: `${left}%`, width: `${width}%`, top: `${lowerTop}%`, height: `${lowerHeight}%` }}>
        <span className="pipe__stem" />
        <span className="pipe__rim pipe__rim--top" />
        <span className="pipe__leaf pipe__leaf--three" />
      </div>
    </>
  );
}

function AsteroidDebris({ asteroid }: { asteroid: Asteroid }) {
  return (
    <div
      className="asteroid-debris"
      style={{
        left: `${(asteroid.x / STAGE_WIDTH) * 100}%`,
        top: `${(asteroid.y / STAGE_HEIGHT) * 100}%`,
        width: `${(asteroid.size / STAGE_WIDTH) * 100}%`,
        aspectRatio: "1",
        animationDuration: `${asteroid.spin}s`,
      }}
      aria-hidden="true"
    >
      <span className="asteroid-debris__crater asteroid-debris__crater--one" />
      <span className="asteroid-debris__crater asteroid-debris__crater--two" />
      <span className="asteroid-debris__crater asteroid-debris__crater--three" />
    </div>
  );
}

export default function Home() {
  const [status, setStatus] = useState<GameStatus>("ready");
  const [y, setY] = useState(276);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>(() => getInitialGame().pipes);
  const [score, setScore] = useState(0);
  const [survivalSeconds, setSurvivalSeconds] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [selectedCharacterId, setSelectedCharacterId] = useState<CharacterId>("tobi");
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [isMuted, setIsMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(55);
  const [effectsVolume, setEffectsVolume] = useState(80);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const gameRef = useRef(getInitialGame());
  const statusRef = useRef<GameStatus>("ready");
  const animationFrameRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hoverAudioRef = useRef<HoverAudioNodes | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  const selectedCharacter = CHARACTERS.find((character) => character.id === selectedCharacterId) ?? CHARACTERS[0];
  const asteroidDifficulty = getAsteroidDifficulty(survivalSeconds);
  const nextThreatIn = getSecondsUntilNextThreat(survivalSeconds);
  const effectsLevel = effectsVolume / 100;

  useEffect(() => {
    const storedCharacter = window.localStorage.getItem("tobi-flap-character") as CharacterId | null;
    if (storedCharacter === "tobi" || storedCharacter === "liam") setSelectedCharacterId(storedCharacter);
    const storedMode = window.localStorage.getItem("tobi-flap-mode") as GameMode | null;
    if (storedMode === "normal" || storedMode === "asteroid") setGameMode(storedMode);
    setIsMuted(window.localStorage.getItem("tobi-flap-muted") === "true");
    const storedMusicVolume = window.localStorage.getItem("tobi-flap-music-volume");
    const storedEffectsVolume = window.localStorage.getItem("tobi-flap-effects-volume");
    if (storedMusicVolume !== null && Number.isFinite(Number(storedMusicVolume))) setMusicVolume(clampVolume(Number(storedMusicVolume)));
    if (storedEffectsVolume !== null && Number.isFinite(Number(storedEffectsVolume))) setEffectsVolume(clampVolume(Number(storedEffectsVolume)));
  }, []);

  useEffect(() => {
    const storedBest = window.localStorage.getItem(`tobi-flap-best-${selectedCharacterId}-${gameMode}`);
    if (storedBest) setBestScore(Number(storedBest) || 0);
    else setBestScore(0);
  }, [gameMode, selectedCharacterId]);

  useEffect(() => {
    const soundtrack = new Audio(soundtrackUrl);
    soundtrack.loop = true;
    soundtrack.preload = "auto";
    soundtrack.volume = 0;
    backgroundMusicRef.current = soundtrack;

    return () => {
      soundtrack.pause();
      soundtrack.removeAttribute("src");
      soundtrack.load();
      backgroundMusicRef.current = null;
    };
  }, []);

  useEffect(() => {
    const soundtrack = backgroundMusicRef.current;
    if (soundtrack) soundtrack.volume = (musicVolume / 100) * .28;
  }, [musicVolume]);

  const stopHoverAudio = useCallback(() => {
    const nodes = hoverAudioRef.current;
    const context = audioContextRef.current;
    if (!nodes || !context) return;

    const stopAt = context.currentTime + 0.12;
    nodes.gain.gain.cancelScheduledValues(context.currentTime);
    nodes.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.035);
    nodes.oscillator.stop(stopAt);
    nodes.lfo.stop(stopAt);
    hoverAudioRef.current = null;
  }, []);

  const startHoverAudio = useCallback((pilotId: CharacterId) => {
    if (isMuted || hoverAudioRef.current) return;

    const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    const isTobi = pilotId === "tobi";
    const now = context.currentTime;

    oscillator.type = isTobi ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(isTobi ? 148 : 212, now);
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(isTobi ? 1.55 : 2.15, now);
    lfoGain.gain.setValueAtTime(isTobi ? 6 : 9, now);
    gain.gain.setValueAtTime(0.0001, now);
    const baseGain = isTobi ? 0.052 : 0.04;
    gain.gain.exponentialRampToValueAtTime(baseGain * effectsLevel, now + 0.12);
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    lfo.start();
    hoverAudioRef.current = { oscillator, gain, lfo, lfoGain, baseGain };
    void context.resume();
  }, [effectsLevel, isMuted]);

  const playFlapChirp = useCallback((pilotId: CharacterId) => {
    const context = audioContextRef.current;
    if (isMuted || !context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const isTobi = pilotId === "tobi";
    const now = context.currentTime;
    oscillator.type = isTobi ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(isTobi ? 320 : 410, now);
    oscillator.frequency.exponentialRampToValueAtTime(isTobi ? 235 : 305, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime((isTobi ? 0.055 : 0.044) * effectsLevel, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }, [effectsLevel, isMuted]);

  const stopBackgroundMusic = useCallback(() => {
    const soundtrack = backgroundMusicRef.current;
    if (!soundtrack) return;
    soundtrack.pause();
    soundtrack.currentTime = 0;
  }, []);

  const startBackgroundMusic = useCallback((forcePlayback = false) => {
    const soundtrack = backgroundMusicRef.current;
    if (!soundtrack || (isMuted && !forcePlayback) || statusRef.current !== "playing") return;
    const playback = soundtrack.play();
    if (playback) void playback.catch(() => undefined);
  }, [isMuted]);

  const updateMusicVolume = useCallback((value: number) => {
    const next = clampVolume(value);
    setMusicVolume(next);
    window.localStorage.setItem("tobi-flap-music-volume", String(next));
    const soundtrack = backgroundMusicRef.current;
    if (soundtrack) soundtrack.volume = (next / 100) * .28;
  }, []);

  const updateEffectsVolume = useCallback((value: number) => {
    const next = clampVolume(value);
    setEffectsVolume(next);
    window.localStorage.setItem("tobi-flap-effects-volume", String(next));
    const nodes = hoverAudioRef.current;
    const context = audioContextRef.current;
    if (nodes && context) nodes.gain.gain.setTargetAtTime(nodes.baseGain * (next / 100), context.currentTime, 0.02);
  }, []);

  const playScoreChime = useCallback((currentScore: number) => {
    const context = audioContextRef.current;
    if (isMuted || !context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const basePitch = 510 + (currentScore % 3) * 45;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(basePitch, now);
    oscillator.frequency.exponentialRampToValueAtTime(basePitch * 1.5, now + 0.1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045 * effectsLevel, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.17);
  }, [effectsLevel, isMuted]);

  const playTierUpSignal = useCallback(() => {
    const context = audioContextRef.current;
    if (isMuted || !context) return;

    const now = context.currentTime;
    [0, 0.09].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(index === 0 ? 392 : 587, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.05 * effectsLevel, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.15);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.16);
    });
  }, [effectsLevel, isMuted]);

  const playCollisionImpact = useCallback(() => {
    const context = audioContextRef.current;
    if (isMuted || !context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(138, now);
    oscillator.frequency.exponentialRampToValueAtTime(42, now + 0.22);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.075 * effectsLevel, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.26);
  }, [effectsLevel, isMuted]);

  const finishFlight = useCallback(() => {
    if (statusRef.current !== "playing") return;

    stopBackgroundMusic();
    statusRef.current = "gameover";
    setStatus("gameover");

    const finalScore = gameRef.current.score;
    setBestScore((previousBest) => {
      const nextBest = Math.max(previousBest, finalScore);
      window.localStorage.setItem(`tobi-flap-best-${selectedCharacterId}-${gameMode}`, String(nextBest));
      return nextBest;
    });
  }, [gameMode, selectedCharacterId, stopBackgroundMusic]);

  const resetFlight = useCallback((begin = false) => {
    const nextGame = getInitialGame(gameMode);
    gameRef.current = nextGame;
    statusRef.current = begin ? "playing" : "ready";
    setStatus(begin ? "playing" : "ready");
    setY(nextGame.y);
    setVelocity(0);
    setPipes(nextGame.pipes);
    setAsteroids(nextGame.asteroids);
    setScore(0);
    setSurvivalSeconds(0);
  }, [gameMode]);

  useEffect(() => {
    if (statusRef.current !== "ready") return;
    const nextGame = getInitialGame(gameMode);
    gameRef.current = nextGame;
    setY(nextGame.y);
    setVelocity(0);
    setPipes(nextGame.pipes);
    setAsteroids(nextGame.asteroids);
    setScore(0);
    setSurvivalSeconds(0);
  }, [gameMode]);

  const flap = useCallback((allowLaunch = false) => {
    if (!canAcceptFlap(statusRef.current, allowLaunch)) return;

    if (statusRef.current === "gameover") {
      startHoverAudio(selectedCharacterId);
      playFlapChirp(selectedCharacterId);
      resetFlight(true);
      startBackgroundMusic();
      gameRef.current.velocity = FLAP_VELOCITY;
      setVelocity(FLAP_VELOCITY);
      return;
    }

    if (statusRef.current === "ready") {
      statusRef.current = "playing";
      setStatus("playing");
    }

    if (statusRef.current !== "playing") return;
    startHoverAudio(selectedCharacterId);
    playFlapChirp(selectedCharacterId);
    startBackgroundMusic();
    gameRef.current.velocity = FLAP_VELOCITY;
    setVelocity(FLAP_VELOCITY);
  }, [playFlapChirp, resetFlight, selectedCharacterId, startBackgroundMusic, startHoverAudio]);

  const chooseCharacter = useCallback((characterId: CharacterId) => {
    if (statusRef.current !== "ready") return;
    setSelectedCharacterId(characterId);
    window.localStorage.setItem("tobi-flap-character", characterId);
  }, []);

  const chooseMode = useCallback((mode: GameMode) => {
    if (statusRef.current !== "ready") return;
    setGameMode(mode);
    window.localStorage.setItem("tobi-flap-mode", mode);
    const nextGame = getInitialGame(mode);
    gameRef.current = nextGame;
    setY(nextGame.y);
    setVelocity(0);
    setPipes(nextGame.pipes);
    setAsteroids(nextGame.asteroids);
    setScore(0);
    setSurvivalSeconds(0);
  }, []);

  const returnToMenu = useCallback(() => {
    resetFlight(false);
  }, [resetFlight]);

  const toggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const next = !previous;
      window.localStorage.setItem("tobi-flap-muted", String(next));
      if (next) {
        stopHoverAudio();
        stopBackgroundMusic();
      } else if (statusRef.current === "playing") {
        startBackgroundMusic(true);
      }
      return next;
    });
  }, [startBackgroundMusic, stopBackgroundMusic, stopHoverAudio]);

  useEffect(() => {
    if (status !== "playing" || isMuted) {
      stopHoverAudio();
      stopBackgroundMusic();
    }
  }, [isMuted, status, stopBackgroundMusic, stopHoverAudio]);

  useEffect(() => {
    return () => {
      stopHoverAudio();
      stopBackgroundMusic();
      void audioContextRef.current?.close();
    };
  }, [stopBackgroundMusic, stopHoverAudio]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        if (statusRef.current !== "playing") return;
        event.preventDefault();
        flap();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flap]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      const game = gameRef.current;

      if (!game.lastTimestamp) game.lastTimestamp = timestamp;
      const deltaTime = Math.min((timestamp - game.lastTimestamp) / 1000, 0.032);
      game.lastTimestamp = timestamp;

      if (statusRef.current === "playing") {
        const priorSurvivalSeconds = game.survivalSeconds;
        game.velocity += GRAVITY * deltaTime;
        game.y += game.velocity * deltaTime;
        game.spawnClock += deltaTime;
        game.survivalSeconds += deltaTime;

        const isAsteroidMode = gameMode === "asteroid";
        const currentAsteroidDifficulty = getAsteroidDifficulty(game.survivalSeconds);
        const spawnInterval = isAsteroidMode ? currentAsteroidDifficulty.interval : PIPE_INTERVAL;

        if (isAsteroidMode && Math.floor(game.survivalSeconds / THREAT_TIER_INTERVAL) > Math.floor(priorSurvivalSeconds / THREAT_TIER_INTERVAL)) {
          playTierUpSignal();
        }
        if (Math.floor(game.survivalSeconds) !== Math.floor(priorSurvivalSeconds)) setSurvivalSeconds(Math.floor(game.survivalSeconds));

        if (game.spawnClock >= spawnInterval) {
          game.spawnClock = 0;
          if (isAsteroidMode) game.asteroids.push(randomAsteroid(game.nextId, currentAsteroidDifficulty.level));
          else game.pipes.push(randomPipe(game.nextId));
          game.nextId += 1;
        }

        game.pipes = game.pipes
          .map((pipe) => ({ ...pipe, x: pipe.x - PIPE_SPEED * deltaTime }))
          .filter((pipe) => pipe.x > -PIPE_WIDTH - 4);
        game.asteroids = game.asteroids
          .map((asteroid) => ({ ...asteroid, x: asteroid.x - currentAsteroidDifficulty.speed * deltaTime }))
          .filter((asteroid) => asteroid.x > -asteroid.size - 4);

        const playerLeft = CHARACTER_X - CHARACTER_SIZE / 2;
        const playerRight = CHARACTER_X + CHARACTER_SIZE / 2;
        const playerTop = game.y - CHARACTER_SIZE / 2;
        const playerBottom = game.y + CHARACTER_SIZE / 2;

        let scoredThisFrame = 0;
        const hitPipe = game.pipes.some((pipe) => {
          const overlapsPipe = playerRight > pipe.x && playerLeft < pipe.x + PIPE_WIDTH;
          if (!overlapsPipe) return false;

          const hitsUpper = playerTop < pipe.top;
          const hitsLower = playerBottom > pipe.top + PIPE_GAP;
          return hitsUpper || hitsLower;
        });
        const hitAsteroid = game.asteroids.some((asteroid) => doesAsteroidHitPlayer(asteroid, game.y));

        game.pipes.forEach((pipe) => {
          if (pipe.x + PIPE_WIDTH < playerLeft && !(pipe as Pipe & { scored?: boolean }).scored) {
            (pipe as Pipe & { scored?: boolean }).scored = true;
            scoredThisFrame += 1;
          }
        });
        game.asteroids.forEach((asteroid) => {
          if (asteroid.x + asteroid.size < playerLeft && !asteroid.scored) {
            asteroid.scored = true;
            scoredThisFrame += 1;
          }
        });

        if (scoredThisFrame > 0) {
          game.score += scoredThisFrame;
          setScore(game.score);
          playScoreChime(game.score);
        }

        const hitBoundary = playerTop <= 0 || playerBottom >= STAGE_HEIGHT - GROUND_HEIGHT;
        if (hitPipe || hitAsteroid || hitBoundary) {
          playCollisionImpact();
          finishFlight();
        }

        setY(game.y);
        setVelocity(game.velocity);
        setPipes([...game.pipes]);
        setAsteroids([...game.asteroids]);
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [finishFlight, gameMode, playCollisionImpact, playScoreChime, playTierUpSignal]);

  const characterAngle = Math.max(-20, Math.min(70, velocity * 0.09));
  const characterTop = (y / STAGE_HEIGHT) * 100;

  return (
    <main className="orchard-app">
      <section className="arcade-layout" aria-label="Photo Flap arcade game">
        <div className="arcade-cabinet">
          <header className="cabinet-header">
            <div className="brand-lockup" aria-label="Tobi Flap">
              <div className="brand-lockup__emblem" aria-hidden="true">
                <img className="brand-lockup__mark" src={logoImage} alt="" />
                <span className="emblem-dots"><i /><i /><i /></span>
              </div>
              <div>
                <p className="eyebrow">SPACE ARCADE</p>
                <h1 className="wordmark" aria-label="Tobi Flap"><span>T</span><span className="wordmark__alien"><i /><i /><i /></span><span>BI</span><b>FLAP</b></h1>
              </div>
            </div>
            <div className="cabinet-header__best" aria-label={`Best score ${bestScore}`}>
              <Trophy size={16} strokeWidth={2.5} />
              <span><small>BEST</small><strong>{bestScore}</strong></span>
            </div>
          </header>

          <div
            className={`game-stage game-stage--${status} game-stage--${gameMode}`}
            onPointerDown={() => flap()}
            role="application"
            aria-label={status === "playing" ? `Tobi Flap game in flight. ${selectedCharacter.name} is selected. Press Space, Arrow Up, or tap to flap.` : `Tobi Flap game. ${selectedCharacter.name} is selected. Choose a pilot and activate the launch button to begin.`}
          >
            <div className="starfield starfield--far" aria-hidden="true" />
            <div className="starfield starfield--near" aria-hidden="true" />
            <div className="game-stage__sky" />
            <div className="game-stage__grain" />
            <div className="cloud cloud--one" />
            <div className="cloud cloud--two" />
            <div className="cloud cloud--three" />

            <div className="score-pill" aria-live="polite">
              <span className="score-pill__stamp" aria-hidden="true"><i /><i /><i /></span>
              <span>FLIGHT</span>
              <strong>{score}</strong>
            </div>
            {gameMode === "asteroid" && (
              <div className={`threat-pill threat-pill--${asteroidDifficulty.level}`} aria-live="polite" aria-label={`Asteroid Field threat level ${asteroidDifficulty.level}: ${asteroidDifficulty.label}${nextThreatIn ? `. Next level in ${nextThreatIn} seconds` : ". Maximum threat reached"}`}>
                <span>THREAT</span>
                <strong>LV {asteroidDifficulty.level}</strong>
                <small>{nextThreatIn ? `${asteroidDifficulty.label} · NEXT ${nextThreatIn}s` : "MAX THREAT"}</small>
              </div>
            )}

            <button
              type="button"
              className="sound-toggle"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={toggleMute}
              aria-pressed={isMuted}
              aria-label={isMuted ? "Turn cockpit sounds on" : "Mute cockpit sounds"}
              title={isMuted ? "Turn cockpit sounds on" : "Mute cockpit sounds"}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              type="button"
              className="settings-toggle"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setIsSettingsOpen((previous) => !previous)}
              aria-expanded={isSettingsOpen}
              aria-haspopup="dialog"
              aria-label="Open audio settings"
              title="Audio settings"
            >
              <SlidersHorizontal size={15} />
            </button>
            {isSettingsOpen && (
              <section className="audio-settings" role="dialog" aria-label="Audio settings" onPointerDown={(event) => event.stopPropagation()}>
                <div className="audio-settings__heading"><span>AUDIO</span><button type="button" onClick={() => setIsSettingsOpen(false)} aria-label="Close audio settings">×</button></div>
                <label className="audio-slider">
                  <span><strong>Music</strong><output>{musicVolume}%</output></span>
                  <input type="range" min="0" max="100" step="1" value={musicVolume} onChange={(event) => updateMusicVolume(Number(event.target.value))} aria-label="Music volume" />
                </label>
                <label className="audio-slider">
                  <span><strong>Effects</strong><output>{effectsVolume}%</output></span>
                  <input type="range" min="0" max="100" step="1" value={effectsVolume} onChange={(event) => updateEffectsVolume(Number(event.target.value))} aria-label="Sound effects volume" />
                </label>
                <p>{isMuted ? "Muted — sliders are saved for later." : "Separate mix levels are saved."}</p>
              </section>
            )}

            {status === "playing" && (
              <button
                type="button"
                className="return-to-menu"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={returnToMenu}
              >
                <LayoutGrid size={14} />
                Menu
              </button>
            )}

            {pipes.map((pipe) => (
              <PipeColumn key={pipe.id} pipe={pipe} />
            ))}
            {asteroids.map((asteroid) => (
              <AsteroidDebris key={asteroid.id} asteroid={asteroid} />
            ))}

            <div
              className={`photo-flier photo-flier--${selectedCharacter.id}`}
              style={{ left: `${(CHARACTER_X / STAGE_WIDTH) * 100}%`, top: `${characterTop}%`, transform: `translate(-50%, -50%) rotate(${characterAngle}deg)` }}
              aria-hidden="true"
            >
              <span className="engine-aura" />
              <div className={`cockpit-hover cockpit-hover--${selectedCharacter.id}`}>
                <img src={selectedCharacter.image} alt="" />
              </div>
            </div>

            <div className="orchard-ground">
              <span className="orchard-ground__stripe" />
              <span className="orchard-ground__dots" />
            </div>

            {status === "ready" && (
              <div className="game-overlay game-overlay--start">
              <div className="game-overlay__card">
                  <div className="pilot-badge">
                    <div className={`pilot-badge__portrait pilot-badge__portrait--${selectedCharacter.id}`}><img src={selectedCharacter.image} alt="" /></div>
                    <div><span>YOUR PILOT</span><strong>{selectedCharacter.name} is ready</strong></div>
                  </div>
                  <p className="overlay-kicker">READY FOR TAKEOFF?</p>
                  <h2>{gameMode === "asteroid" ? "Dodge the debris." : "Thread the starfield."}</h2>
                  <p>Choose your pilot, then use the launch button.</p>
                  <div className="character-picker" aria-label="Choose a character">
                    <p>CHOOSE A PILOT</p>
                    <div className="character-picker__choices">
                      {CHARACTERS.map((character) => {
                        const isSelected = character.id === selectedCharacter.id;
                        return (
                          <button
                            key={character.id}
                            type="button"
                            className={`character-choice character-choice--${character.id} ${isSelected ? "is-selected" : ""}`}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => chooseCharacter(character.id)}
                            aria-pressed={isSelected}
                          >
                            <span className="character-choice__portrait"><img src={character.image} alt="" /></span>
                            <span><strong>{character.name}</strong><small>{character.note}</small></span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mode-picker" aria-label="Choose a flight mode">
                    <p>CHOOSE A MODE</p>
                    <div className="mode-picker__choices">
                      <button type="button" className={`mode-choice ${gameMode === "normal" ? "is-selected" : ""}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => chooseMode("normal")} aria-pressed={gameMode === "normal"}>
                        <span className="mode-choice__glyph">✦</span><span><strong>Cosmic Gates</strong><small>Balanced flight</small></span>
                      </button>
                      <button type="button" className={`mode-choice mode-choice--asteroid ${gameMode === "asteroid" ? "is-selected" : ""}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => chooseMode("asteroid")} aria-pressed={gameMode === "asteroid"}>
                        <span className="mode-choice__glyph">☄</span><span><strong>Asteroid Field</strong><small>Ramps / 30s</small></span>
                      </button>
                    </div>
                  </div>
                  <Button className="launch-button" onPointerDown={(event) => event.stopPropagation()} onClick={() => flap(true)}>
                    <ArrowUp size={18} />
                    {gameMode === "asteroid" ? "Launch Asteroid Field" : `Fly with ${selectedCharacter.name}`}
                  </Button>
                </div>
              </div>
            )}

            {status === "gameover" && (
              <div className="game-overlay game-overlay--over">
                <div className="game-overlay__card game-overlay__card--over">
                  <p className="overlay-kicker">{gameMode === "asteroid" ? "FIELD EXIT" : "COSMIC LANDING"}</p>
                  <h2>{selectedCharacter.name}'s flight!</h2>
                  <div className="result-row">
                    <span>THIS FLIGHT</span>
                    <strong>{score}</strong>
                  </div>
                  <div className="result-row result-row--best">
                    <span>{selectedCharacter.name.toUpperCase()}’S BEST</span>
                    <strong>{bestScore}</strong>
                  </div>
                  <div className="landing-actions">
                    <Button className="launch-button" onPointerDown={(event) => event.stopPropagation()} onClick={() => flap(true)}>
                      <RotateCcw size={17} />
                      Fly again
                    </Button>
                    <Button className="menu-button" variant="outline" onPointerDown={(event) => event.stopPropagation()} onClick={returnToMenu}>
                      <LayoutGrid size={16} />
                      Change pilot
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <footer className="cabinet-footer">
            <span className="cabinet-footer__dot" />
            <p>{status === "playing" ? <>Tap, click, or press <kbd>SPACE</kbd> to boost.</> : "Use the launch button to take off."}</p>
            <span className="cabinet-footer__dots" aria-hidden="true"><i /><i /><i /></span>
          </footer>
        </div>

        <aside className="flight-notes" aria-label="How to play">
          <div className="flight-notes__visual" />
          <div className="flight-notes__content">
            <div className="flight-notes__label"><span className="flight-notes__badge">SPACE ARCADE</span><span className="flight-notes__brand-stamp" aria-hidden="true"><i /><i /><i /></span></div>
            <h2>One tap.<br />One stellar launch.</h2>
            <p>Guide your photo-powered cockpit through cosmic gates. Every clear pass powers up your flight score.</p>

            <div className="how-to-play">
              <div className="how-to-play__step">
                <span className="step-number">01</span>
                <div><strong>Launch</strong><small>Choose a pilot, then use launch.</small></div>
              </div>
              <div className="how-to-play__step">
                <span className="step-number">02</span>
                <div><strong>Flap</strong><small>In flight, tap the game or hit Space.</small></div>
              </div>
              <div className="how-to-play__step">
                <span className="step-number">03</span>
                <div><strong>Glide</strong><small>Let gravity carry you through.</small></div>
              </div>
            </div>

            <div className="flight-notes__tip"><span>TIP</span> Short, gentle taps keep your flight level.</div>
          </div>
        </aside>
      </section>
    </main>
  );
}
