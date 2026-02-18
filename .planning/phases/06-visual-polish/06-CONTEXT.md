# Phase 6: Visual Polish - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace all colored rectangles with real art: zebra sprite with animations, kidney-themed obstacle/collectible sprites, parallax backgrounds, and game screen polish. The mechanics are already built (Phases 1-5); this phase adds the visual skin. No new gameplay mechanics, no branding/logos requiring legal approval.

</domain>

<decisions>
## Implementation Decisions

### Art style & character design
- 64x64 chibi pixel art — 2-head-tall proportions, bold readable silhouettes
- Determined & heroic personality — confident forward lean, focused eyes, galloping with purpose
- Pure zebra, no accessories — kidney theming comes from the world (obstacles, collectibles, backgrounds), not from the character
- Classic B&W stripes with blue eyes — monochrome body, pop of color only in the eyes for iconic contrast against warm backgrounds
- AI-generated assets: PixelLab (primary, has Aseprite plugin + API), Nano Banana/Gemini (supplementary), Claude SVG (reference/mood boards)
- Colored rectangle fallback preserved — if sprites fail to load, game stays playable with existing colored shapes

### Parallax & environment
- Stylized kidney interior — abstract biological world inspired by nephron structures, NOT anatomically literal
- Rich warm palette: pinks, purples, corals — vibrant and alive, the kidney world glows with warmth
- Floating particles/cells — small animated elements (bubbles, glowing cells) drifting through layers, making the world feel alive and biological
- Hybrid rendering approach (Hyper Light Drifter technique):
  - Deep/far layers: procedural canvas gradients (warm purple to pink to coral) — zero image files, infinitely seamless
  - Mid layers: small tileable pixel art strips (organic tube shapes, membrane textures) — 2-3 small PNGs
  - Near layers: pixel art detail strips (nephron tube edges, bubble clusters)
  - Particles: code-drawn procedural circles/ellipses with opacity animation
- 5 parallax layers: sky gradient (0.1x), far organic shapes (0.2x), mid tubule walls (0.4x), near detail (0.7x), ground (1.0x)
- B&W zebra pops against warm gradient backgrounds — maximum contrast by design

### Branding & screens
- NO CeRKiD or Charite branding — not approved, would require legal review. Game stands alone as "KidneyQuest"
- Start screen: zebra hero shot + "KidneyQuest" pixel art title + "Collect the Genes!" tagline + "Press Space to Start"
- Title rendered in pixel art font style (drawn on canvas, no external font files)
- Game over screen: score breakdown (distance + genes collected + total) with zebra showing sad/dazed reaction expression + "Press Space to Retry"
- ROADMAP success criterion "Start screen displays CeRKiD branding/logo" is overridden — replaced with KidneyQuest title + tagline

### Animation & effects
- Zebra run cycle: 6 frames — smooth, expressive gallop with distinct contact/pass/reach poses
- Zebra sprite sheet plan: run (6f), jump-ascend (2f), fall-descend (2f), land-squash (2f), idle (4f), death-tumble (4f) = ~20 frames total
- Gene collection: pop + particle burst — expanding circles/sparkles with brief flash, satisfying every time
- Death/collision: tumble + screen shake — zebra does quick spin, screen shakes briefly, then freezes. Dramatic but fast
- Obstacle idle animation: subtle breathing/pulsing effect — world feels alive
- Gene idle animation: floating up/down bob with glow pulse — signals "pick me up"

### Claude's Discretion
- Exact pixel art palette (specific hex colors) — choose what contrasts best
- Sprite sheet layout format (horizontal strip vs grid)
- Particle count and behavior tuning
- Parallax scroll speed fine-tuning
- Screen shake intensity and duration
- Gene glow implementation (canvas shadow vs sprite-based)
- Obstacle sprite designs (kidney stones, blockages) — shapes and detail level
- Gene sprite designs (PKD1, COL4A5, NPHS1) — how to visually differentiate gene types
- Pixel art font implementation (bitmap font vs canvas text rendering)
- Exact frame timing for animations (fps per animation state)
- Death animation timing before game over screen appears

</decisions>

<specifics>
## Specific Ideas

- Hyper Light Drifter technique for backgrounds: flat pixel art base with gradient overlays for atmospheric depth
- "Inside the nephron" environment — abstract enough to be beautiful, biological enough to be recognizable. Players should think "cool alien world" then realize it's a kidney
- Zebra stripes ARE the character identity — must read clearly at 64x64 game scale
- References: Celeste (expressive character animation), Hyper Light Drifter (atmospheric gradients), Shovel Knight (readable pixel silhouettes), Chrome Dino (satisfying simple motion)
- The warm background palette (pinks, purples, corals) was chosen specifically so the B&W zebra creates maximum visual contrast
- "Collect the Genes!" as the game's tagline — simple, action-oriented, tells you what to do

</specifics>

<deferred>
## Deferred Ideas

- CeRKiD/Charite branding integration — requires legal approval, separate effort outside game development
- Sound effects / audio — explicitly out of scope for v1.0 (noted in PROJECT.md)
- localStorage high scores — out of scope for v1.0
- Accessibility (prefers-reduced-motion for particles/shake) — future phase consideration

</deferred>

---

*Phase: 06-visual-polish*
*Context gathered: 2026-02-18*
