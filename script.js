import { loadBackgroundForLevel } from "./background-config.js";

const duckAsset = "./assets/ducks/kikas-duck.png";
const clickDragThreshold = 8;
let resizeRefreshId = 0;
const RESPONSIVE_CONFIG = {
  mobileBreakpoint: 760,
  desktop: {
    visibleScale: 2 / 3,
    hitAreaMin: 1.2,
    hitAreaMax: 1.7,
    minSpacingFloor: 1.8,
    fitMode: "contain",
  },
  mobile: {
    visibleScale: 0.2,
    hitAreaMin: 1.15,
    hitAreaMax: 1.45,
    minSpacingFloor: 1.2,
    fitMode: "cover-height",
  },
};
const mobileMediaQuery = window.matchMedia(`(max-width: ${RESPONSIVE_CONFIG.mobileBreakpoint}px)`);

const state = {
  level: 1,
  totalDucks: 0,
  totalFound: 0,
  ducks: [],
  hintsRemaining: 0,
  soundEnabled: true,
  started: false,
  levelComplete: false,
  isLoadingLevel: false,
  levelLoadToken: 0,
  responsiveMode: getResponsiveMode(),
  background: {
    name: "Soft and cozy hidden ducks",
    src: "",
    width: 1600,
    height: 1000,
    source: "fallback",
  },
  transform: {
    scale: 1,
    minScale: 1,
    maxScale: 3.8,
    tx: 0,
    ty: 0,
    baseWidth: 0,
    baseHeight: 0,
    baseLeft: 0,
    baseTop: 0,
  },
  input: {
    pointers: new Map(),
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginTx: 0,
    dragOriginTy: 0,
    pinchStartDistance: 0,
    pinchStartScale: 1,
    pinchLocalPoint: null,
    clickSuppressedUntil: 0,
  },
};

const introScreen = document.getElementById("introScreen");
const enterGameButton = document.getElementById("enterGameButton");
const startScreen = document.getElementById("startScreen");
const startGameButton = document.getElementById("startGameButton");
const completionScreen = document.getElementById("completionScreen");
const loadingScreen = document.getElementById("loadingScreen");
const viewport = document.getElementById("viewport");
const scene = document.getElementById("scene");
const backgroundImage = document.getElementById("backgroundImage");
const duckLayer = document.getElementById("duckLayer");
const effectLayer = document.getElementById("effectLayer");
const levelLabel = document.getElementById("levelLabel");
const remainingLabel = document.getElementById("remainingLabel");
const hintsLabel = document.getElementById("hintsLabel");
const totalFoundLabel = document.getElementById("totalFoundLabel");
const statusText = document.getElementById("statusText");
const sceneLabel = document.getElementById("sceneLabel");
const progressFill = document.getElementById("progressFill");
const hintButton = document.getElementById("hintButton");
const resetButton = document.getElementById("resetButton");
const soundToggle = document.getElementById("soundToggle");
const completionTitle = document.getElementById("completionTitle");
const completionMessage = document.getElementById("completionMessage");
const nextLevelButton = document.getElementById("nextLevelButton");
const playAgainButton = document.getElementById("playAgainButton");

enterGameButton.addEventListener("click", startGame);
startGameButton.addEventListener("click", startGame);
hintButton.addEventListener("click", useHint);
resetButton.addEventListener("click", resetCurrentLevel);
nextLevelButton.addEventListener("click", nextLevel);
playAgainButton.addEventListener("click", backToTitle);
soundToggle.addEventListener("click", toggleSound);

viewport.addEventListener("wheel", handleWheel, { passive: false });
viewport.addEventListener("pointerdown", handlePointerDown);
viewport.addEventListener("pointermove", handlePointerMove);
viewport.addEventListener("pointerup", handlePointerUp);
viewport.addEventListener("pointercancel", handlePointerUp);
window.addEventListener("resize", handleResize);
mobileMediaQuery.addEventListener("change", handleResponsiveModeChange);

updateHud();
layoutScene();

async function startGame() {
  state.level = 1;
  state.started = true;
  state.levelComplete = false;
  introScreen.classList.add("hidden");
  startScreen.classList.add("hidden");
  completionScreen.classList.add("hidden");
  await buildLevel();
}

function backToTitle() {
  state.started = false;
  state.levelComplete = false;
  state.isLoadingLevel = false;
  state.level = 1;
  state.ducks = [];
  state.totalDucks = 0;
  state.hintsRemaining = 0;
  duckLayer.innerHTML = "";
  effectLayer.innerHTML = "";
  progressFill.style.width = "0%";
  statusText.textContent = "Press start when you are ready to hunt for ducks.";
  sceneLabel.textContent = "Soft and cozy hidden ducks";
  remainingLabel.textContent = "0";
  hintsLabel.textContent = "0";
  nextLevelButton.textContent = "Next Level";
  loadingScreen.classList.add("hidden");
  completionScreen.classList.add("hidden");
  introScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
}

async function buildLevel() {
  const loadToken = state.levelLoadToken + 1;
  state.levelLoadToken = loadToken;
  state.levelComplete = false;
  state.isLoadingLevel = true;
  completionScreen.classList.add("hidden");
  loadingScreen.classList.remove("hidden");
  duckLayer.innerHTML = "";
  effectLayer.innerHTML = "";
  state.ducks = [];
  state.totalDucks = 0;
  updateHud();

  const loadedBackground = await loadBackgroundForLevel(state.level);

  if (!state.started || loadToken !== state.levelLoadToken) {
    return;
  }

  state.background = loadedBackground;
  state.hintsRemaining = state.level < 4 ? 3 : 2;
  backgroundImage.src = state.background.src;
  backgroundImage.alt = `${state.background.name} scenic background`;
  layoutScene();
  state.ducks = createDuckPlacements(state.level);
  state.totalDucks = state.ducks.length;
  renderDucks();
  resetCamera();
  state.isLoadingLevel = false;
  loadingScreen.classList.add("hidden");
  updateHud();
}

function resetCurrentLevel() {
  if (!state.started) {
    return;
  }
  buildLevel();
}

function nextLevel() {
  state.level += 1;
  buildLevel();
}

function getDifficulty(level) {
  const capped = Math.min(level, 12);
  const responsive = getResponsiveSettings();
  const minDucks = Math.min(12, 6 + Math.floor((capped - 1) / 2));
  const maxDucks = Math.min(15, minDucks + 2);
  const baseVisibleDuckPct = Math.max(0.42, 0.72 - capped * 0.02);
  const visibleDuckPct = baseVisibleDuckPct * responsive.visibleScale;
  const hitAreaPct = clamp(
    Math.max(responsive.hitAreaMin, responsive.hitAreaMax - capped * 0.02),
    responsive.hitAreaMin,
    responsive.hitAreaMax
  );
  const edgePaddingPct = Math.max(1.8, 4.4 - capped * 0.1);
  const minSpacingPct = Math.max(responsive.minSpacingFloor, hitAreaPct * 1.2);
  return { minDucks, maxDucks, visibleDuckPct, hitAreaPct, edgePaddingPct, minSpacingPct };
}

function createDuckPlacements(level) {
  const { minDucks, maxDucks, visibleDuckPct, hitAreaPct, edgePaddingPct, minSpacingPct } =
    getDifficulty(level);
  const visibleBounds = getVisibleImageBoundsPct();
  const duckCount = randomInt(minDucks, maxDucks);
  const ducks = [];
  let attempts = 0;

  // Placement uses percentage coordinates so every duck stays locked to the
  // same spot on the background image while the scene zooms and pans.
  while (ducks.length < duckCount && attempts < duckCount * 260) {
    attempts += 1;
    const visualSizePct = clamp(visibleDuckPct + randomFloat(-0.03, 0.04), 0.06, 0.5);
    const hitSizePct = clamp(hitAreaPct + randomFloat(-0.08, 0.1), 0.95, 1.9);
    const minX = Math.max(edgePaddingPct, visibleBounds.left + edgePaddingPct);
    const maxX = Math.min(100 - edgePaddingPct - hitSizePct, visibleBounds.right - edgePaddingPct - hitSizePct);
    const minY = Math.max(edgePaddingPct, visibleBounds.top + edgePaddingPct);
    const maxY = Math.min(100 - edgePaddingPct - hitSizePct, visibleBounds.bottom - edgePaddingPct - hitSizePct);

    if (minX >= maxX || minY >= maxY) {
      break;
    }

    const x = randomFloat(minX, maxX);
    const y = randomFloat(minY, maxY);
    const candidate = {
      id: generateId(),
      x,
      y,
      hitWidthPct: hitSizePct,
      hitHeightPct: hitSizePct,
      visualWidthPct: visualSizePct,
      visualHeightPct: visualSizePct * 0.92,
      found: false,
    };

    // Overlap prevention uses the visual duck center, not the forgiving hitbox,
    // so ducks stay visually separated without making taps too punishing.
    const tooClose = ducks.some((duck) => {
      const dx = x + hitSizePct / 2 - (duck.x + duck.hitWidthPct / 2);
      const dy = y + hitSizePct / 2 - (duck.y + duck.hitHeightPct / 2);
      return Math.hypot(dx, dy) < minSpacingPct;
    });

    if (!tooClose) {
      ducks.push(candidate);
    }
  }

  return ducks;
}

function renderDucks() {
  duckLayer.innerHTML = "";

  state.ducks.forEach((duck) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "duck-button";
    button.dataset.duckId = duck.id;
    button.style.left = `${duck.x}%`;
    button.style.top = `${duck.y}%`;
    button.style.width = `${duck.hitWidthPct}%`;
    button.style.height = `${duck.hitHeightPct}%`;
    button.style.setProperty("--duck-visual-width", `${(duck.visualWidthPct / duck.hitWidthPct) * 100}%`);
    button.style.setProperty("--duck-visual-height", `${(duck.visualHeightPct / duck.hitHeightPct) * 100}%`);
    button.setAttribute("aria-label", duck.found ? "Duck found" : "Hidden duck");

    const img = document.createElement("img");
    img.src = duckAsset;
    img.alt = "";
    img.decoding = "async";
    img.loading = "eager";
    button.appendChild(img);

    // Click-detection fix:
    // 1. Ducks are rendered as real buttons with a larger hitbox than the image.
    // 2. The decorative effect layer ignores pointer events, so it can no longer
    //    sit on top of the ducks and steal taps/clicks.
    // 3. Duck buttons stop pointer propagation so the viewport's pan/zoom
    //    capture does not hijack a deliberate duck tap or click.
    // 4. Discovery uses the button's click event, which stays reliable for
    //    both mouse and touch once the viewport no longer intercepts it.
    button.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleDuckActivate(duck.id);
    });
    duckLayer.appendChild(button);
  });
}

function handleDuckActivate(duckId) {
  if (Date.now() < state.input.clickSuppressedUntil || state.levelComplete) {
    return;
  }

  const duck = state.ducks.find((entry) => entry.id === duckId);
  if (!duck || duck.found) {
    return;
  }

  duck.found = true;
  state.totalFound += 1;
  const button = duckLayer.querySelector(`[data-duck-id="${duckId}"]`);
  if (button) {
    button.classList.add("found");
    button.disabled = true;
  }
  spawnSparkle(duck);
  playFoundTone();
  updateHud();

  if (getRemainingCount() === 0) {
    finishLevel();
  }
}

function updateHud() {
  levelLabel.textContent = String(state.level);
  remainingLabel.textContent = String(getRemainingCount());
  hintsLabel.textContent = String(state.hintsRemaining);
  totalFoundLabel.textContent = String(state.totalFound);
  sceneLabel.textContent = state.started
    ? `${state.background.name}${state.background.source === "fallback" ? " (fallback)" : ""}`
    : "Soft and cozy hidden ducks";
  progressFill.style.width = `${state.totalDucks ? ((state.totalDucks - getRemainingCount()) / state.totalDucks) * 100 : 0}%`;
  hintButton.disabled =
    !state.started ||
    state.isLoadingLevel ||
    state.hintsRemaining <= 0 ||
    state.levelComplete ||
    getRemainingCount() === 0;
  statusText.textContent = getStatusMessage();
}

function getStatusMessage() {
  if (!state.started) {
    return "Press start when you are ready to hunt for ducks.";
  }
  if (state.isLoadingLevel) {
    return "Loading a fresh scenic photo before the ducks are hidden.";
  }
  if (state.levelComplete) {
    return `Level ${state.level} complete. All ${state.totalDucks} ducks were found.`;
  }
  return `Find all ${state.totalDucks} ducks hidden in ${state.background.name}.`;
}

function finishLevel() {
  state.levelComplete = true;
  updateHud();
  completionTitle.textContent = "You found every little duck!";
  completionMessage.textContent = `Level ${state.level} is complete. Ready for a new cozy scene?`;
  nextLevelButton.textContent = "Next Level";
  completionScreen.classList.remove("hidden");
  burstConfetti();
}

function useHint() {
  if (state.hintsRemaining <= 0 || state.levelComplete) {
    return;
  }
  const hiddenDucks = state.ducks.filter((duck) => !duck.found);
  if (!hiddenDucks.length) {
    return;
  }

  state.hintsRemaining -= 1;
  const hintedDuck = hiddenDucks[randomInt(0, hiddenDucks.length - 1)];

  // Hint logic focuses the camera on one unfound duck and briefly enlarges the
  // tiny duck button, helping the player without automatically solving it.
  focusDuck(hintedDuck, Math.max(state.transform.scale, 2));
  const button = duckLayer.querySelector(`[data-duck-id="${hintedDuck.id}"]`);
  if (button) {
    button.classList.add("hinting");
    window.setTimeout(() => button.classList.remove("hinting"), 1050);
  }
  spawnSparkle(hintedDuck);
  updateHud();
}

function focusDuck(duck, targetScale) {
  const viewportRect = viewport.getBoundingClientRect();
  const nextScale = clamp(targetScale, state.transform.minScale, state.transform.maxScale);
  const localCenterX = (duck.x + duck.hitWidthPct / 2) / 100 * state.transform.baseWidth;
  const localCenterY = (duck.y + duck.hitHeightPct / 2) / 100 * state.transform.baseHeight;
  state.transform.scale = nextScale;
  state.transform.tx = viewportRect.width / 2 - state.transform.baseLeft - localCenterX * nextScale;
  state.transform.ty = viewportRect.height / 2 - state.transform.baseTop - localCenterY * nextScale;
  clampTransform();
  applyTransform();
}

function spawnSparkle(duck) {
  const sparkle = document.createElement("div");
  sparkle.className = "sparkle";
  sparkle.style.left = `${duck.x + duck.hitWidthPct / 2}%`;
  sparkle.style.top = `${duck.y + duck.hitHeightPct / 2}%`;
  effectLayer.appendChild(sparkle);
  window.setTimeout(() => sparkle.remove(), 700);
}

function burstConfetti() {
  for (let index = 0; index < 16; index += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.left = `${randomFloat(8, 92)}%`;
    piece.style.top = `${randomFloat(12, 42)}%`;
    piece.style.background = ["#ffd9e8", "#ffc8de", "#f6b3cb", "#f3d7e7"][index % 4];
    effectLayer.appendChild(piece);
    window.setTimeout(() => piece.remove(), 1200);
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  soundToggle.textContent = `Sound: ${state.soundEnabled ? "On" : "Off"}`;
  soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
}

function playFoundTone() {
  if (!state.soundEnabled) {
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    soundToggle.disabled = true;
    soundToggle.textContent = "Sound Unavailable";
    return;
  }

  if (!playFoundTone.ctx) {
    playFoundTone.ctx = new AudioContext();
  }

  const ctx = playFoundTone.ctx;
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();

  osc.type = "triangle";
  osc2.type = "sine";
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(980, now + 0.16);
  osc2.frequency.setValueAtTime(990, now);
  osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.16);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc2.start(now);
  osc.stop(now + 0.18);
  osc2.stop(now + 0.18);
}

function layoutScene() {
  const rect = viewport.getBoundingClientRect();
  const sceneAspect = state.background.width / state.background.height;
  let width;
  let height;

  if (getResponsiveSettings().fitMode === "cover-height") {
    height = rect.height;
    width = height * sceneAspect;
  } else {
    width = rect.width;
    height = width / sceneAspect;
    if (height > rect.height) {
      height = rect.height;
      width = height * sceneAspect;
    }
  }

  state.transform.baseWidth = width;
  state.transform.baseHeight = height;
  state.transform.baseLeft = (rect.width - width) / 2;
  state.transform.baseTop = (rect.height - height) / 2;

  scene.style.width = `${width}px`;
  scene.style.height = `${height}px`;
  scene.style.left = `${state.transform.baseLeft}px`;
  scene.style.top = `${state.transform.baseTop}px`;
}

function resetCamera() {
  layoutScene();
  state.transform.scale = 1;
  state.transform.tx = 0;
  state.transform.ty = 0;
  applyTransform();
}

function handleResize() {
  layoutScene();
  clampTransform();
  applyTransform();

  if (state.started && !state.isLoadingLevel && getResponsiveSettings().fitMode === "cover-height") {
    window.clearTimeout(resizeRefreshId);
    resizeRefreshId = window.setTimeout(() => {
      regeneratePlacementsForViewport();
    }, 140);
  }
}

function handleResponsiveModeChange() {
  const nextMode = getResponsiveMode();
  if (nextMode === state.responsiveMode) {
    return;
  }

  state.responsiveMode = nextMode;
  layoutScene();
  clampTransform();
  applyTransform();

  if (state.started && !state.isLoadingLevel) {
    resetCurrentLevel();
  }
}

function applyTransform() {
  scene.style.transform = `translate(${state.transform.tx}px, ${state.transform.ty}px) scale(${state.transform.scale})`;
}

function clampTransform() {
  const rect = viewport.getBoundingClientRect();
  const scaledWidth = state.transform.baseWidth * state.transform.scale;
  const scaledHeight = state.transform.baseHeight * state.transform.scale;

  // Clamp panning so the player can explore the scene while keeping the
  // scenic image inside the viewport on both mobile and desktop.
  if (scaledWidth <= rect.width) {
    state.transform.tx = (rect.width - scaledWidth) / 2 - state.transform.baseLeft;
  } else {
    const minTx = rect.width - state.transform.baseLeft - scaledWidth;
    const maxTx = -state.transform.baseLeft;
    state.transform.tx = clamp(state.transform.tx, minTx, maxTx);
  }

  if (scaledHeight <= rect.height) {
    state.transform.ty = (rect.height - scaledHeight) / 2 - state.transform.baseTop;
  } else {
    const minTy = rect.height - state.transform.baseTop - scaledHeight;
    const maxTy = -state.transform.baseTop;
    state.transform.ty = clamp(state.transform.ty, minTy, maxTy);
  }
}

function handleWheel(event) {
  if (!state.started || state.levelComplete || state.isLoadingLevel) {
    return;
  }
  event.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const point = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  const nextScale = state.transform.scale * (event.deltaY < 0 ? 1.12 : 0.9);
  zoomAroundPoint(point, nextScale);
}

function zoomAroundPoint(point, nextScale) {
  const clampedScale = clamp(nextScale, state.transform.minScale, state.transform.maxScale);
  const localX = (point.x - (state.transform.baseLeft + state.transform.tx)) / state.transform.scale;
  const localY = (point.y - (state.transform.baseTop + state.transform.ty)) / state.transform.scale;
  state.transform.scale = clampedScale;
  state.transform.tx = point.x - state.transform.baseLeft - localX * clampedScale;
  state.transform.ty = point.y - state.transform.baseTop - localY * clampedScale;
  clampTransform();
  applyTransform();
}

function handlePointerDown(event) {
  if (!state.started || state.levelComplete || state.isLoadingLevel) {
    return;
  }

  if (event.target.closest(".duck-button")) {
    return;
  }

  viewport.setPointerCapture(event.pointerId);
  state.input.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (state.input.pointers.size === 1) {
    state.input.isDragging = true;
    state.input.dragStartX = event.clientX;
    state.input.dragStartY = event.clientY;
    state.input.dragOriginTx = state.transform.tx;
    state.input.dragOriginTy = state.transform.ty;
  }

  if (state.input.pointers.size === 2) {
    const [first, second] = [...state.input.pointers.values()];
    state.input.pinchStartDistance = getDistance(first, second);
    state.input.pinchStartScale = state.transform.scale;
    const midpoint = {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    };
    const rect = viewport.getBoundingClientRect();
    state.input.pinchLocalPoint = {
      x: (midpoint.x - rect.left - (state.transform.baseLeft + state.transform.tx)) / state.transform.scale,
      y: (midpoint.y - rect.top - (state.transform.baseTop + state.transform.ty)) / state.transform.scale,
    };
  }
}

function handlePointerMove(event) {
  if (!state.input.pointers.has(event.pointerId)) {
    return;
  }

  state.input.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const rect = viewport.getBoundingClientRect();

  if (state.input.pointers.size === 2) {
    const [first, second] = [...state.input.pointers.values()];
    const midpoint = {
      x: (first.x + second.x) / 2 - rect.left,
      y: (first.y + second.y) / 2 - rect.top,
    };
    const currentDistance = getDistance(first, second);
    const nextScale = state.input.pinchStartScale * (currentDistance / state.input.pinchStartDistance);
    state.transform.scale = clamp(nextScale, state.transform.minScale, state.transform.maxScale);
    state.transform.tx =
      midpoint.x - state.transform.baseLeft - state.input.pinchLocalPoint.x * state.transform.scale;
    state.transform.ty =
      midpoint.y - state.transform.baseTop - state.input.pinchLocalPoint.y * state.transform.scale;
    clampTransform();
    applyTransform();
    return;
  }

  if (state.input.pointers.size === 1 && state.input.isDragging && state.transform.scale > 1) {
    const dx = event.clientX - state.input.dragStartX;
    const dy = event.clientY - state.input.dragStartY;
    if (Math.hypot(dx, dy) > clickDragThreshold) {
      state.input.clickSuppressedUntil = Date.now() + 120;
    }
    state.transform.tx = state.input.dragOriginTx + dx;
    state.transform.ty = state.input.dragOriginTy + dy;
    clampTransform();
    applyTransform();
  }
}

function handlePointerUp(event) {
  if (!state.input.pointers.has(event.pointerId)) {
    return;
  }

  state.input.pointers.delete(event.pointerId);
  if (state.input.pointers.size < 2) {
    state.input.pinchStartDistance = 0;
    state.input.pinchLocalPoint = null;
  }
  if (!state.input.pointers.size) {
    state.input.isDragging = false;
  } else if (state.input.pointers.size === 1) {
    const remaining = [...state.input.pointers.values()][0];
    state.input.dragStartX = remaining.x;
    state.input.dragStartY = remaining.y;
    state.input.dragOriginTx = state.transform.tx;
    state.input.dragOriginTy = state.transform.ty;
  }
}

function getRemainingCount() {
  return state.ducks.filter((duck) => !duck.found).length;
}

function regeneratePlacementsForViewport() {
  if (!state.started || state.isLoadingLevel) {
    return;
  }

  // On mobile the background fills height and crops horizontally, so a resize
  // or rotation changes which slice of the photo is visible. Rebuild the
  // current level's placements so ducks stay inside the playable image region.
  state.levelComplete = false;
  completionScreen.classList.add("hidden");
  effectLayer.innerHTML = "";
  state.hintsRemaining = state.level < 4 ? 3 : 2;
  state.ducks = createDuckPlacements(state.level);
  state.totalDucks = state.ducks.length;
  renderDucks();
  resetCamera();
  updateHud();
}

function getResponsiveMode() {
  return mobileMediaQuery.matches ? "mobile" : "desktop";
}

function getResponsiveSettings() {
  return RESPONSIVE_CONFIG[state.responsiveMode];
}

function getVisibleImageBoundsPct() {
  const rect = viewport.getBoundingClientRect();
  const leftPx = clamp(0 - state.transform.baseLeft, 0, state.transform.baseWidth);
  const topPx = clamp(0 - state.transform.baseTop, 0, state.transform.baseHeight);
  const rightPx = clamp(rect.width - state.transform.baseLeft, 0, state.transform.baseWidth);
  const bottomPx = clamp(rect.height - state.transform.baseTop, 0, state.transform.baseHeight);

  return {
    left: (leftPx / state.transform.baseWidth) * 100,
    top: (topPx / state.transform.baseHeight) * 100,
    right: (rightPx / state.transform.baseWidth) * 100,
    bottom: (bottomPx / state.transform.baseHeight) * 100,
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function generateId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return "duck-xxxxxx4xxxyxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
