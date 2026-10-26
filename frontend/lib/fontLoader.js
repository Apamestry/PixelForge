/**
 * Dynamically registers and loads bundled fonts from font-service.
 */

const registeredFamilies = new Set();

export async function loadAndRegisterFonts(fontsList) {
  if (typeof document === "undefined" || !document.fonts || !Array.isArray(fontsList)) {
    return;
  }

  const loadPromises = [];

  for (const font of fontsList) {
    if (!font.family || !font.files || registeredFamilies.has(font.family)) {
      continue;
    }
    registeredFamilies.add(font.family);

    for (const [weight, fileUrl] of Object.entries(font.files)) {
      try {
        const fontFace = new FontFace(font.family, `url(${fileUrl})`, {
          weight: weight,
          style: "normal",
        });

        const promise = fontFace.load().then((loadedFace) => {
          document.fonts.add(loadedFace);
        }).catch(() => {});

        loadPromises.push(promise);
      } catch {
        // Silently skip if FontFace construction fails
      }
    }
  }

  await Promise.all(loadPromises);
}

export async function ensureFontLoaded(family, weight = 400, size = 24) {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await document.fonts.load(`${weight} ${size}px "${family}"`);
  } catch {
    // Fallback font used if custom font fails to load
  }
}
