# Find the Ducks

A lightweight hidden-object web game prototype built with plain HTML, CSS, and JavaScript.

## Run locally

1. Open a terminal in this folder.
2. Start a tiny static server:

```bash
python3 -m http.server 8000
```

3. Open [http://localhost:8000](http://localhost:8000) in your browser.

You can also open `index.html` directly, but a local server is more reliable for touch/mobile testing.

## Project structure

```text
/assets/backgrounds   Placeholder scenic SVG backgrounds
/assets/ducks         Duck image assets
/background-config.js Background provider, preload, and fallback logic
/index.html           App markup
/styles.css           Cozy responsive UI styles
/script.js            Game logic and interaction handling
```

## Replacing assets later

- Replace Picsum or the fallback background list in [background-config.js](/Users/sam/Documents/dev/ducks/background-config.js).
- Replace the duck sticker path in [script.js](/Users/sam/Documents/dev/ducks/script.js).
- Duck positions are generated in percentage coordinates, so your own images will still scale correctly.

## Current feature set

- Personalized intro screen followed by a simple start screen
- Real-photo backgrounds from Picsum with local fallback backgrounds
- Progressive difficulty across levels
- Random duck placement with edge padding and spacing rules
- Mouse wheel zoom, drag pan, and touch pinch-to-zoom
- Hint button with limited uses per level
- Found-duck sparkle effect and lightweight synth sound
- Level completion overlay, progress bar, and reset flow
- Tiny visible ducks with a slightly larger hidden tap target for mobile fairness

## Editing notes

- The main placement rules live in `createDuckPlacements()`.
- Background image loading and fallback behavior live in `background-config.js`.
- Zoom and pan behavior lives in `zoomAroundPoint()` plus the pointer handlers.
- Hint behavior is controlled in `useHint()` and `focusDuck()`.
- Duck hit detection is handled in `renderDucks()` and `handleDuckActivate()`.
