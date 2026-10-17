# Hawaiʻi Lava Project Site — New Topic Handoff

## Goal for the new topic
Continue the Hawaiʻi Lava Risk project site as the first StoryMap-style case study inside the main SpatialGround Astro portfolio.

Do NOT redesign the project page from scratch. A published GPT Site prototype and an Astro integration package already exist. The immediate task is migration/integration first, then refinement.

## Existing published prototype
Published GPT Site:
`https://hawaii-lava-risk.aanndrew-aanndrew.chatgpt.site/`

The prototype already establishes the case-study visual language:
- full-screen Hawaiʻi hazard-map hero
- large editorial headline
- black / off-white / orange palette
- key parcel statistics
- chapter-style scrolling sections
- Hazard Context
- Methods
- Key Findings
- Monitoring & Warnings
- Next Phase / policy section
- top navigation for Context / Methods / Findings / Warnings
- map presentation and tabs
- responsible-agency / warning language

This design is the baseline, not something to throw away.

## Existing integration package
Source package:
`Hawaii_Lava_Site_Astro_Integration_Package_2026-10-01.zip`

It contains both the original static site and an Astro-ready integration.

Important Astro-ready files:
- `astro-integration/src/pages/projects/hawaii-lava-risk.astro`
- `astro-integration/src/styles/lava-risk.css`
- `astro-integration/public/lava-risk/script.js`
- `astro-integration/public/lava-risk/assets/main-map.jpg`
- `astro-integration/public/lava-risk/assets/high-risk-map.jpg`
- `astro-integration/public/lava-risk/assets/infrastructure-map.jpg`

Documentation included:
- `README_ASTRO_INTEGRATION.md`
- `project-notes/README.md`
- `project-notes/SITE_BLUEPRINT.md`
- `project-notes/SITE_COPY_DRAFT_V1.md`
- `project-notes/DATA_AND_CLAIMS_AUDIT.md`
- `project-notes/DATA_AND_CONTENT_CHECKLIST.md`

Original static site is also preserved under:
- `original-static-site/`

## Main SpatialGround project
Local root:
`E:\GPT projects\SpatialGround`

Technology:
- Astro static site
- GitHub repo: `aanndrew/spatialground`
- Cloudflare Worker deployment
- production domain: `spatialground.earth`

The homepage/Selected Work 3D ring is a separate approved prototype. Do not rebuild it in this Hawaiʻi topic.

## Immediate next step — Phase 1
Integrate the existing Hawaiʻi Astro-ready page into the current SpatialGround project WITHOUT redesigning it first.

Target route:
`/projects/hawaii-lava-risk/`

Expected local URL:
`http://localhost:4321/projects/hawaii-lava-risk/`

The first milestone is simple:
1. Copy/place the Astro page, CSS, JS, and image assets into the existing SpatialGround tree.
2. Resolve imports/asset paths if necessary.
3. Run Astro locally.
4. Confirm the Hawaiʻi page renders and behaves substantially like the published GPT Site.
5. Fix migration-specific errors only.
6. Do not add new visual features until this baseline works.

## Phase 2 — Connect it to SpatialGround
After the case-study route works:
- link the Hawaiʻi card in the approved SpatialGround 9-card Selected Work ring to `/projects/hawaii-lava-risk/`
- eventually trigger a short front-card micro-animation before/while the project is active
- clicking VIEW PROJECT should open the dedicated case study
- keep navigation/domain continuity so the visitor does not feel they left SpatialGround

## Phase 3 — Visual integration
Only after migration works:
- reconcile the project page with SpatialGround global navigation/footer
- scope project CSS so `body`, headings, footer, etc. do not leak into other pages
- preserve the Hawaiʻi page's established black/off-white/orange identity
- preserve its editorial StoryMap feel
- avoid turning it into a generic portfolio template

## Phase 4 — StoryMap/scrollytelling upgrade
The long-term project-page direction is stronger StoryMap-style interaction.

Potential upgrade:
- sticky map beside narrative
- scroll-triggered layer changes
- map zoom/reveal by chapter
- parcel exposure / Zones 1 & 2 / infrastructure transitions
- restrained section transitions

Concept:

```
Narrative                     Sticky map
------------------------------------------------
Hazard Context                Hawaiʻi overview
scroll ↓                      layer changes
Zones 1 & 2                   hazard layer
scroll ↓
Parcel Exposure               parcels
scroll ↓
Infrastructure                infrastructure
```

Do not implement this before the existing Astro migration is stable.

## Front-card micro-animation roadmap
For the SpatialGround homepage ring, when Hawaiʻi becomes the active/front card:
- wait briefly for the card to settle
- play a roughly 1.2–1.8 second project-specific micro-animation
- subtle terrain/map zoom
- lava/hazard glow or layer reveal
- title/content reveal
- stop; no continuous looping

This is roadmap material only for now and should not distract from the Hawaiʻi page integration.

## Overall site UX
Target experience:

```
SpatialGround cinematic homepage
        ↓
9-card 3D Selected Work ring
        ↓
Hawaiʻi active/front card
        ↓
VIEW PROJECT
        ↓
/projects/hawaii-lava-risk/
        ↓
StoryMap-style editorial GIS case study
```

Homepage = discovery/gallery.
Project page = narrative/story.
Maps = evidence/exploration.
Policy/NRM interpretation = why the spatial analysis matters.

## Important working rule
Preserve working baselines. If experimenting, create a new file/branch rather than overwriting the approved version.

## Start the new topic with
"Continue the Hawaiʻi Lava Project Site. Use the attached integration package and handoff. Start with Phase 1: integrate the existing Astro-ready Hawaiʻi page into my current SpatialGround project without redesigning it."
