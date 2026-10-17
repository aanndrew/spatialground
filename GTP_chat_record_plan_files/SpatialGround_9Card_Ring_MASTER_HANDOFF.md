# SpatialGround — 9-Card 3D Ring MASTER Handoff

## STATUS: GEOMETRY APPROVED / LOCKED

The user explicitly approved this version ("yes, yes, yes...").
Treat this as the baseline/master prototype. Do not revert to the earlier 5-, 7-, 8-card, Z-depth-adjusted, or angle-compressed experiments unless specifically asked.

## Master prototype
File: `SpatialGround_9Card_Ring_MASTER.astro`

Local destination:
`E:\GPT projects\SpatialGround\src\pages\prototype\index.astro`

Test route:
- Desktop: `http://localhost:4321/prototype/`
- LAN/tablet: `http://10.0.0.188:4321/prototype/`
- Run with: `npm run dev -- --host 0.0.0.0`

## Approved geometry

Nine cards form a tilted 3D exhibition ring. The important design trick is NOT a mathematically perfect circle.

Approximate composition:

```
               rear pair
              09      08
          01              07
       02                    06
    03                          05

                 04
               FRONT
```

As the carousel rotates, whichever project is active becomes FRONT.

### Critical approved behavior
- Front card is biggest, lowest, closest, sharpest.
- Cards rise and recede as they travel toward the rear.
- All cards remain readable/front-facing; no mirrored/reversed rear cards.
- Two cards occupy the deepest rear region rather than one rear apex.
- Desktop/tablet rear spacing is visually compressed toward the center.
- Mobile geometry is intentionally NOT compressed because it already looked good.

## The fix that made it work

Earlier versions left a large empty hole at the rear. Adding cards did not solve it because pure circular `sin(angle)` geometry naturally spread rear cards apart.

The approved version preserves Y/Z ring geometry but compresses only rear X positions on desktop/tablet:

```js
const baseX = Math.sin(rad) * radiusX;

const rearXCompression =
  compact
    ? 1
    : absDiff === 4
      ? 0.60
      : absDiff === 3
        ? 0.80
        : 1;

const x = baseX * rearXCompression;
```

Meaning:
- deepest rear pair (`absDiff === 4`) uses 60% horizontal spread
- next rear pair (`absDiff === 3`) uses 80%
- other cards use normal X
- mobile (`compact`) uses 100% / unchanged geometry

This is the key visual correction. Do not replace it with angle compression or extra Z offset unless testing a separate branch.

## Project slots currently in prototype

Real/credible project directions:
1. Hawaiʻi — Lava Hazard Analysis
2. Samish Bay — Marsh Migration
3. Public Lands — Multiple-Use Management
4. Natural Resources — Habitat Suitability
5. Field Monitoring — Drone + GIS

Slots 06–09 are temporary geometry placeholders. Do not invent weak projects merely to fill nine slots. Final portfolio can decide later how to populate/hide unused slots.

## Visual direction
- Brand: SpatialGround
- Domain: `spatialground.earth`
- GIS · Natural Resources · Environmental Policy
- Cinematic GIS + editorial typography
- Dark terrain/topographic atmosphere
- Selected Work is the main 3D visual moment
- Professional consultant/environmental analyst feel, not a student dashboard
- Real maps/methods belong inside case studies; cover artwork can be stylized

## Site architecture
- Astro static site
- Local project: `E:\GPT projects\SpatialGround`
- GitHub: `aanndrew/spatialground`
- Cloudflare Worker deployment
- Prototype route: `/prototype/`

## Interaction already present
- Previous / next arrows
- Pagination dots
- Keyboard left/right
- Mouse wheel
- Pointer/touch drag
- Responsive layout
- Astro hot reload

## Experiments that were rejected / superseded
1. 5-card fake curve: did not feel cylindrical.
2. True sin/cos 5-card ring: still looked too front-on.
3. Tilted/amphitheater approach: major improvement.
4. 7 cards: visually better than 5.
5. 8 cards with one centered rear apex: rear gap still looked too large.
6. Tightening angle map: looked worse.
7. Pushing middle/rear cards farther back on Z: wrong direction.
8. 9 cards with two rear cards: improved structure but still left a rear gap.
9. APPROVED: 9 cards + desktop/tablet rear X compression (60% / 80%).

## Next phase
Do not redesign the geometry from scratch. Start from the MASTER and move into visual/content refinement:
- real project artwork / GIS map visuals
- terrain/topographic background
- lighting and depth polish
- smoother animation/drag feel
- desktop/tablet/mobile refinement
- project click-through/case-study navigation
- decide which real projects eventually fill slots 06–09

If a future change is experimental, save it under a new filename and preserve the MASTER.
