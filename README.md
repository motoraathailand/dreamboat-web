# DREAM BOAT — 꿈속을 달리는 보트 (first web sample)

A calm 3D boat journey through dreamlike places, built with three.js (vendored r170, MIT).
Provider: MOTOR AA.

- Places in this sample: 1) Sunset River 2) Lantern Bridge
- Controls: hold the Row button / screen or Space·W·↑ to row, drag or ←→ to look, M to mute.
- Debug: `?u=0.0–1.0` start position, `?zone=2`, `?lang=th|en|ko|zh|hi`, `?shot&auto` for screenshots, `?q=low|mid|high`.
- All geometry is procedural; all music is generated in code (see `music-license.txt`).

## v2 — painterly graphics upgrade
- Post: Kuwahara-style brush smoothing (high), soft sun god rays, watercolour edge darkening, paper/canvas grain, colour grade, FXAA.
- World: clumped painted tree canopies (5 shapes) with back-lit translucency, smooth painted terrain with wet-sand shore, layered hazy ridges,
  low-lying patchy mist, cattails + bank grass + wildflowers, lily pads, drifting petals (sunset), richer boat/rower/oars/lanterns.
- Water: fine ripple normals, sun glitter, softly blurred reflections, shallows + lapping shore foam, soft water-land edge, hull contact shadow.
- Quality: `?q=high` adds soft shadows + Kuwahara; `mid` drops those; `low` also drops god rays, reflection blur, glitter, FXAA.
  Adaptive quality steps down high → mid → low, then pixel ratio, then bloom.

## v3 — boat interior fix + clarity pass
- Fix: water no longer shows inside the boat. The water shader discards fragments that fall inside the hull volume
  (same hull formulas as boat.js, using the boat's live world matrix, so it holds during bobbing/rowing). Real slatted floorboards follow the inner hull; boat floats a little higher.
- Clarity: HDR bloom threshold (sky no longer blooms), black point + contrast per zone, mobile "brush-lite" painterly pass (5 taps), sharper sun-glitter path, birds, calmer petals/motes, livelier rower (look-around, breathing, nod).
- Debug: `?cam=dist,height,yaw` fixed camera, `?bob=3` strong bobbing.

## v4 — calm image pass (anti-shimmer) + graphics round 3
- Noise sources removed: hashed sun-glitter cells, sharp Blinn specular on high-freq normals, per-frame film grain / canvas weave, jittered god-ray sampling, edge-outline darkening, hard sector switching in Kuwahara / brush filter, star specks in the reflection, fast-flickering sub-pixel fireflies, sky dither.
- Sun path is now an analytic soft band with slow low-frequency shimmer; specular uses a low-frequency normal only.
- Kuwahara / brush-lite use soft inverse-variance weights (no popping); brush noise fades with distance (LOD).
- FXAA last in the chain at mid/high tier; bloom HDR threshold 1.35 so no specks bloom.
- Graphics: low cloud band in the sunset sky, distant forest silhouette layer with atmospheric fade, softer reeds, calmer water ripples, blurred soft reflections, warmer boat readability.
- Measured on 412x915@2.6 (mid): water high-freq energy 1.55 → 0.77, frame-to-frame 2.03 → 1.03.

## v6 — the full journey: 8 places
- One continuous river (~2.5 km of path) through 8 places, sunset → dawn: Sunset River, Golden Reeds, Old Wooden Bridges, Misty Valley, Firefly Forest, Lantern Bridge, Starlight Lake, Dawn Cloud Sea.
- Each place: own sky/fog/light/grade palette (js/zones.js), own props and density (ZP table in js/main.js), own procedural music mood (js/audio.js); everything crossfades at the boundaries.
- Ending after place 8 → place select (8 cards, unlocked as reached, progress in localStorage `dreamboat.reached`) and "Sail again from the start". Start screen also shows "Choose a place" once something is unlocked.
- Performance: per-place prop groups are only drawn near the boat; terrain is chunked and streamed (start region built at load, the rest a few ms per frame); distant ridges travel with the boat. Start-up time is about the same as v5.
- Debug: `?zone=1..8`, `?u=0..1`, `?unlock`, `?reached=N`.
