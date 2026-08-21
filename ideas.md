# Photo Flap — Design Brainstorm

## Three Possible Approaches

| Theme Name | Very Brief Intro | Probability |
| --- | --- | --- |
| **Orchard Arcade** | A warm, storybook flight through a floating citrus orchard, using playful paper-cut forms and soft sunshine. It feels like a treasured children’s picture book turned into a responsive arcade cabinet. | 0.07 |
| **Midnight Toybox** | A deep indigo tabletop game world with glowing wooden blocks, stars, and a small wind-up atmosphere. The energy is cozy, tactile, and nocturnal rather than cyberpunk. | 0.04 |
| **Sunny Sticker Sprint** | A bright, sticker-collage obstacle course with energetic tape marks and hand-drawn doodles. The tone is spontaneous and craft-table cheerful. | 0.09 |

## Selected Direction — Orchard Arcade

**Design Movement:** Modern storybook illustration blended with a collectible 1980s tabletop arcade cabinet.

**Core Principles:**

1. **Tactile play:** Every interactive surface should feel pressed, stacked, or gently raised, with subtle paper grain and soft but decisive shadows.
2. **Childlike confidence:** Use large, direct instructions and calm game feedback without cluttering the screen with UI chrome.
3. **Layered scenery:** Give the game depth through drifting clouds, distant orchard hills, and foreground leaves—not busy visual noise.
4. **Photo-first character:** The supplied photo is the personality of the game, framed as a cheerful rounded character badge and never obscured by effects.

**Color Philosophy:** Sunlit apricot and oat build a welcoming, warm base; a fresh pea-green acts as the unmistakable gameplay accent; ink-blue establishes legibility and a mature arcade contrast. The palette evokes a picnic under a bright, calm sky rather than a generic digital game interface.

**Layout Paradigm:** A portrait arcade cabinet sits slightly to the left on wide screens, while a vertical “flight notes” rail fills the right side. On smaller screens, the cabinet becomes the complete experience and supporting notes collapse below it. The game field itself stays roomy and unobstructed.

**Signature Elements:**

1. Scalloped cloud layers and oversized orchard leaves framing the flight arena.
2. Pea-green pipe columns with a warm paper outline and tiny leaf caps.
3. A three-dot alien headband accent as an abstract brand signal used in the logo mark and restart panel.

**Interaction Philosophy:** One action should do one thing: **tap, click, or press Space to flap**. Buttons press inward briefly; scoring lands with a small visual pulse; collisions transition into a calm, encouraging retry state. There are no complex menus or distracting overlays.

**Animation:** The background clouds drift in a slow 14–24 second loop. The character has a gentle idle bob before play and rotates with velocity while flying. Leaves sway at very low amplitude. UI transitions use a 160–220ms spring-like ease-out. All decorative animation respects `prefers-reduced-motion`.

**Typography System:** **Baloo 2** supplies a soft, rounded display voice for the game title and scores; **Nunito Sans** handles controls and supporting copy with sturdy, friendly clarity. Use all-caps only for concise labels such as “BEST FLIGHT,” with generous letter spacing.

**Brand Essence:** **Photo Flap is a warm, photo-powered mini arcade game for families who want a quick, personal moment of play.** Personality: **sunny, tactile, encouraging**.

**Brand Voice:** Headlines are short, playful, and immediately actionable; CTAs are friendly imperatives with a dash of adventure. Example lines: “One tap. One tiny launch.” and “Thread the orchard, earn a new best.”

**Wordmark & Logo:** A custom, bouncing **PHOTO FLAP** wordmark with a small lime alien-head silhouette replacing the inner counter of the “O.” The separate logo is a bold, transparent-background three-eye alien head with two antennae and a curved smile—no lettering.

**Signature Brand Color:** **Orchard Pea — #A8D951.**

## Style Decisions

### Space Arcade revision
The surrounding experience now uses a dark cosmic palette: deep midnight navy fields, cyan instrumentation, violet-pink energy accents, and lime pilot indicators. The cockpit game remains playful and readable, while the cabinet, corridors, copy, and companion panel present a cohesive Space Arcade environment.

- The supplied photo is shown in the pre-flight pilot badge and remains the main character signal from the first screen.
- The wordmark uses a lime, three-eyed alien form as the “O,” with a hand-bounced `FLAP` counterweight to avoid a generic UI title.
- The three-eye alien dot pattern is a recurring stamp in the score, cabinet footer, and flight notes; Orchard Pea remains reserved for this motif, the pilot accents, scores, and primary actions.
