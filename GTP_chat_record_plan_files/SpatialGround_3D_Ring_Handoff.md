# SpatialGround — 3D Ring Prototype Handoff

## Current objective
Build a distinctive professional SpatialGround portfolio using a cinematic GIS/editorial visual language. The Selected Work section uses a tilted 3D exhibition ring rather than a normal flat carousel.

## Live/site architecture
- Brand/domain: SpatialGround / spatialground.earth
- Local project: `E:\GPT projects\SpatialGround`
- Astro static site
- GitHub repo: `aanndrew/spatialground`
- Cloudflare Worker deployment
- Current prototype route: `/prototype/`
- Mobile/tablet LAN testing: `http://10.0.0.188:4321/prototype/` when Astro runs with `npm run dev -- --host 0.0.0.0`

## Visual direction locked so far
- Cinematic GIS + editorial typography + restrained scrollytelling
- Dark topographic / terrain atmosphere
- Selected Work is the strong 3D moment
- Front project: biggest, lowest, closest, sharpest
- Side projects: progressively higher, smaller, deeper
- Rear projects: visible and clearly behind the front card
- All cards should remain FRONT-FACING/readable; avoid mirrored/reversed backs
- User strongly prefers the 7-card concept over 5, and expects 8 slots to be even more balanced

## Current 8-slot geometry
Target composition:

```
                  05
             04        06
          03              07
       02                    08

                  01
                FRONT
```

This is an 8-slot tilted exhibition ring:
- 01 = active/front
- 02/08 = near shoulders
- 03/07 = middle depth
- 04/06 = rear shoulders
- 05 = unique deepest rear apex, centered behind front
- Ring rotates infinitely as active project changes
- Cards use sin/cos X/Z geometry plus vertical rise
- Rear apex remains front-facing

## Content status
Real/credible current project directions:
1. Hawaiʻi — Lava Hazard Analysis
2. Samish Bay — Marsh Migration
3. Public Lands — Multiple-Use Management
4. Natural Resources — Habitat Suitability
5. Field Monitoring — Drone + GIS

Slots 06–08 are temporary geometry-test placeholders. Do NOT invent portfolio projects just to fill the ring. Later choose real work only if strong enough.

## Prototype interaction
- Previous / next arrows
- Pagination dots
- Keyboard left/right
- Mouse wheel
- Pointer/touch drag
- Astro hot reload

## Current file
`index-8-card-ring.astro`

To test:
1. Rename/copy to `src/pages/prototype/index.astro`
2. Run `npm run dev -- --host 0.0.0.0`
3. Desktop: `http://localhost:4321/prototype/`
4. Tablet landscape is the main visual test

## Important design history
Earlier 5-card version looked too much like viewing a cylinder straight-on. The improvement came from:
- camera/scene feeling higher and tilted downward
- vertical rise as cards move backward
- wider rear spacing
- keeping rear cards facing the viewer
The user approved the resulting amphitheater/exhibition-ring direction.

## Next decisions
Do NOT redesign from scratch. First evaluate the 8-card prototype on tablet landscape:
- Is rear apex visible enough?
- Are rear shoulders wide enough?
- Is front card dominant enough?
- Is ring too tall/flat?
- Do rear cards need less blur/darkening?
Once geometry is approved, freeze it and move to:
- real project artwork/maps
- terrain/topographic background
- refined transitions/drag behavior
- responsive desktop/tablet/mobile behavior
- case-study navigation
