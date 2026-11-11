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
