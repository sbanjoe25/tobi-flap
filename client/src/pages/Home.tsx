/**
 * Space Arcade visual system: dark collectible flight cabinet with a photo-first cockpit pilot.
 */
import { Button } from "@/components/ui/button";
import { ArrowUp, LayoutGrid, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type GameStatus = "ready" | "playing" | "gameover";
type CharacterId = "tobi" | "liam";
type GameMode = "normal" | "asteroid";

type Pipe = {
  id: number;
  x: number;
  top: number;
};

type Asteroid = {
  id: number;
  x: number;
  y: number;
  size: number;
  spin: number;
  scored?: boolean;
};

type HoverAudioNodes = {
  oscillator: OscillatorNode;
  gain: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
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
const ASTEROID_SPEED = 192;
const ASTEROID_INTERVAL = 0.92;

const logoImage = "/manus-storage/photo-flap-alien-logo_ea409bed.png";

const CHARACTERS: Array<{ id: CharacterId; name: string; image: string; note: string }> = [
  {
    id: "tobi",
    name: "Tobi",
    image: "/manus-storage/tobi-flap-tobi-cockpit-edge-clean_34dda769.png",
    note: "Orchard original",
  },
  {
    id: "liam",
    name: "Liam",
    image: "/manus-storage/tobi-flap-liam-cockpit-cutout_8fd6ac54.png",
    note: "Wide-eyed wonder",
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

const randomAsteroid = (id: number, x = STAGE_WIDTH + 28): Asteroid => {
  const size = 34 + Math.round(Math.random() * 29);
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
  const [bestScore, setBestScore] = useState(0);
  const [selectedCharacterId, setSelectedCharacterId] = useState<CharacterId>("tobi");
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [isMuted, setIsMuted] = useState(false);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const gameRef = useRef(getInitialGame());
  const statusRef = useRef<GameStatus>("ready");
  const animationFrameRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hoverAudioRef = useRef<HoverAudioNodes | null>(null);

  const selectedCharacter = CHARACTERS.find((character) => character.id === selectedCharacterId) ?? CHARACTERS[0];

  useEffect(() => {
    const storedCharacter = window.localStorage.getItem("tobi-flap-character") as CharacterId | null;
    if (storedCharacter === "tobi" || storedCharacter === "liam") setSelectedCharacterId(storedCharacter);
    const storedMode = window.localStorage.getItem("tobi-flap-mode") as GameMode | null;
    if (storedMode === "normal" || storedMode === "asteroid") setGameMode(storedMode);
    setIsMuted(window.localStorage.getItem("tobi-flap-muted") === "true");
  }, []);

  useEffect(() => {
    const storedBest = window.localStorage.getItem(`tobi-flap-best-${selectedCharacterId}-${gameMode}`);
    if (storedBest) setBestScore(Number(storedBest) || 0);
    else setBestScore(0);
  }, [gameMode, selectedCharacterId]);

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
    gain.gain.exponentialRampToValueAtTime(isTobi ? 0.052 : 0.04, now + 0.12);
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    lfo.start();
    hoverAudioRef.current = { oscillator, gain, lfo, lfoGain };
    void context.resume();
  }, [isMuted]);

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
    gain.gain.exponentialRampToValueAtTime(isTobi ? 0.055 : 0.044, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }, [isMuted]);

  const finishFlight = useCallback(() => {
    if (statusRef.current !== "playing") return;

    statusRef.current = "gameover";
    setStatus("gameover");

    const finalScore = gameRef.current.score;
    setBestScore((previousBest) => {
      const nextBest = Math.max(previousBest, finalScore);
      window.localStorage.setItem(`tobi-flap-best-${selectedCharacterId}-${gameMode}`, String(nextBest));
      return nextBest;
    });
  }, [gameMode, selectedCharacterId]);

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
  }, [gameMode]);

  const flap = useCallback(() => {
    startHoverAudio(selectedCharacterId);
    playFlapChirp(selectedCharacterId);

    if (statusRef.current === "gameover") {
      resetFlight(true);
      gameRef.current.velocity = FLAP_VELOCITY;
      setVelocity(FLAP_VELOCITY);
      return;
    }

    if (statusRef.current === "ready") {
      statusRef.current = "playing";
      setStatus("playing");
    }

    gameRef.current.velocity = FLAP_VELOCITY;
    setVelocity(FLAP_VELOCITY);
  }, [playFlapChirp, resetFlight, selectedCharacterId, startHoverAudio]);

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
  }, []);

  const returnToMenu = useCallback(() => {
    resetFlight(false);
  }, [resetFlight]);

  const toggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const next = !previous;
      window.localStorage.setItem("tobi-flap-muted", String(next));
      if (next) stopHoverAudio();
      return next;
    });
  }, [stopHoverAudio]);

  useEffect(() => {
    if (status !== "playing" || isMuted) stopHoverAudio();
  }, [isMuted, status, stopHoverAudio]);

  useEffect(() => {
    return () => {
      stopHoverAudio();
      void audioContextRef.current?.close();
    };
  }, [stopHoverAudio]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
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
        game.velocity += GRAVITY * deltaTime;
        game.y += game.velocity * deltaTime;
        game.spawnClock += deltaTime;

        const isAsteroidMode = gameMode === "asteroid";
        const spawnInterval = isAsteroidMode ? ASTEROID_INTERVAL : PIPE_INTERVAL;

        if (game.spawnClock >= spawnInterval) {
          game.spawnClock = 0;
          if (isAsteroidMode) game.asteroids.push(randomAsteroid(game.nextId));
          else game.pipes.push(randomPipe(game.nextId));
          game.nextId += 1;
        }

        game.pipes = game.pipes
          .map((pipe) => ({ ...pipe, x: pipe.x - PIPE_SPEED * deltaTime }))
          .filter((pipe) => pipe.x > -PIPE_WIDTH - 4);
        game.asteroids = game.asteroids
          .map((asteroid) => ({ ...asteroid, x: asteroid.x - ASTEROID_SPEED * deltaTime }))
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
        const hitAsteroid = game.asteroids.some((asteroid) => {
          const playerCenterX = CHARACTER_X + CHARACTER_SIZE * .5;
          const playerCenterY = game.y + CHARACTER_SIZE * .5;
          const asteroidCenterX = asteroid.x + asteroid.size * .5;
          const asteroidCenterY = asteroid.y + asteroid.size * .5;
          const distanceX = playerCenterX - asteroidCenterX;
          const distanceY = playerCenterY - asteroidCenterY;
          const collisionRadius = CHARACTER_SIZE * .25 + asteroid.size * .3;
          return distanceX * distanceX + distanceY * distanceY < collisionRadius * collisionRadius;
        });

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
        }

        const hitBoundary = playerTop <= 0 || playerBottom >= STAGE_HEIGHT - GROUND_HEIGHT;
        if (hitPipe || hitAsteroid || hitBoundary) {
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
  }, [finishFlight, gameMode]);

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
            onPointerDown={flap}
            role="application"
            aria-label={`Tobi Flap game. ${selectedCharacter.name} is selected. Press Space, Arrow Up, or tap to flap.`}
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
                  <p>Tap the sky or press <kbd>SPACE</kbd> to launch.</p>
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
                        <span className="mode-choice__glyph">☄</span><span><strong>Asteroid Field</strong><small>Fast debris dodge</small></span>
                      </button>
                    </div>
                  </div>
                  <Button className="launch-button" onPointerDown={(event) => event.stopPropagation()} onClick={flap}>
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
                    <Button className="launch-button" onPointerDown={(event) => event.stopPropagation()} onClick={flap}>
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
            <p>Tap, click, or press <kbd>SPACE</kbd> to boost.</p>
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
                <div><strong>Flap</strong><small>Tap the game or hit Space.</small></div>
              </div>
              <div className="how-to-play__step">
                <span className="step-number">02</span>
                <div><strong>Glide</strong><small>Let gravity carry you through.</small></div>
              </div>
              <div className="how-to-play__step">
                <span className="step-number">03</span>
                <div><strong>Navigate</strong><small>Pass cosmic gates to set a best flight.</small></div>
              </div>
            </div>

            <div className="flight-notes__tip"><span>TIP</span> Short, gentle taps keep your flight level.</div>
          </div>
        </aside>
      </section>
    </main>
  );
}
