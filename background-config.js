const PICSUM_WIDTH = 1600;
const PICSUM_HEIGHT = 1000;

const fallbackBackgrounds = [
  { name: "Sunny Meadow", file: "./assets/backgrounds/meadow.svg" },
  { name: "Garden Path", file: "./assets/backgrounds/garden.svg" },
  { name: "Forest Clearing", file: "./assets/backgrounds/forest.svg" },
  { name: "Lake Morning", file: "./assets/backgrounds/lake.svg" },
  { name: "Mountain Bloom", file: "./assets/backgrounds/mountains.svg" },
  { name: "Golden Field", file: "./assets/backgrounds/field.svg" },
];

function createPicsumUrl(level) {
  const seed = `find-the-ducks-${level}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${PICSUM_WIDTH}/${PICSUM_HEIGHT}`;
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () =>
      resolve({
        src,
        width: image.naturalWidth || PICSUM_WIDTH,
        height: image.naturalHeight || PICSUM_HEIGHT,
      });
    image.onerror = reject;
    image.src = src;
  });
}

async function loadBackgroundForLevel(level) {
  const remoteUrl = createPicsumUrl(level);

  try {
    // Provider-specific logic lives here so the game can swap Picsum for
    // Unsplash or a local-only strategy later without changing duck gameplay.
    const remote = await preloadImage(remoteUrl);
    return {
      name: `Scenic Photo ${level}`,
      src: remote.src,
      width: remote.width,
      height: remote.height,
      source: "picsum",
    };
  } catch (error) {
    const fallback = fallbackBackgrounds[(level - 1) % fallbackBackgrounds.length];
    const local = await preloadImage(fallback.file);
    return {
      name: fallback.name,
      src: local.src,
      width: local.width,
      height: local.height,
      source: "fallback",
    };
  }
}

export {
  PICSUM_WIDTH,
  PICSUM_HEIGHT,
  fallbackBackgrounds,
  createPicsumUrl,
  preloadImage,
  loadBackgroundForLevel,
};
