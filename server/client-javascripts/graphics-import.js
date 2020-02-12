import {
  cloneBitmapFromArea,
  makeImageWriteOperation,
  makePenWriteMulticolorOperation,
  paletteNamed,
  paletteSubarrayFromPaletteName,
  posInTileset,
  spriteNamed,
  tilesInTileset
} from "./api";
import {TILE_PAL_SHIFT} from "./components/tile-selector-component";

export const COLORS_IN_PALETTE = 16;

function posterize(c) {
  if (c >>> 24 !== 255) return 0; // No semi-transparency, 0..254 = transparent, 255 = opaque
  c = (c >>> 4 & 0x0f0f0f0f);
  return c | c << 4;
}

function colorArrayToColor32(r, g, b) {
  return r | g << 8 | b << 16 | 0xff000000;
}

//function color32ToColor12(color32) {
//  return (color32 & 0xf0) >> 4 | (color32 & 0xf000) >> 8 | (color32 & 0xf00000) >> 12;
//}

// Fills the additions object with { paletteIndex: color12 }
function colorIndexInPalette(palette32, color32, additions) {
  // 1) try to find it in palette
  const color12 = posterize(color32);
  for (let i = 1; i < palette32.length; i++) {
    if (color12 === posterize(palette32[i])) return i;
  }

  // 2) add to empty slot
  for (let i = 1; i < palette32.length; i++) {
    if ((palette32[i] & 0xff000000) === 0) { // No alpha => free
      palette32[i] = additions[i] = color12;
      return i;
    }
  }

  // 3) no empty slot -> approximate color (index 0 is excluded as it's transparent)
  let best = 1 << 24, bestIdx = 1;
  const rs = color32 & 0xff, gs = color32 >> 8 & 0xff, bs = color32 >> 16 & 0xff;
  for (let i = 1; i < palette32.length; i++) {
    const r = palette32[i] & 0xff, g = palette32[i] >>  8 & 0xff, b = palette32[i] >> 16 & 0xff;
    const diff = (r - rs) * (r - rs) + (g - gs) * (g - gs) + (b - bs) * (b - bs);
    if (diff < best) {
      best = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function importSprite(pngData, paletteName) {
  const len = pngData.length / 4;
  const palette32 = paletteSubarrayFromPaletteName(paletteName).slice();
  const paletteNo = paletteNamed(paletteName).y;
  const pixels = new Array(len);
  const paletteAdditions = {};

  for (let i = 0; i < len; i++) {
    let found = 0;
    // Alpha = transparent (defaults to zero)
    if (pngData[i * 4 + 3] > 0) {
      const color32 = colorArrayToColor32(pngData[i * 4], pngData[i * 4 + 1], pngData[i * 4 + 2]);
      found = colorIndexInPalette(palette32, color32, paletteAdditions);
    }
    pixels[i] = found;
  }

  const pathList = Object.keys(paletteAdditions).flatMap(k => [parseInt(k), paletteNo, paletteAdditions[k]]);
  return { pixels, operation: makePenWriteMulticolorOperation('palette', pathList) };
}

// --------------
function posterizePalette(palette) {
  palette.forEach((c, index) => palette[index] = posterize(c));
  return palette;
}

function findColorIndex(color12, palette12, offset) {
  for (let i = 0; i < COLORS_IN_PALETTE; i++) {
    if (color12 === palette12[i + offset]) return i;
  }
  return -1;
}

function freeColorsInPalette(palette12, offset) {
  let result = 0;
  for (let i = 1; i < COLORS_IN_PALETTE; i++) {
    if (palette12[offset + i] === 0) result++;
  }
  return result;
}

function assignFirstFreeColorOrClosest(multiPalette32, offset, color32) {
  for (let i = 1; i < COLORS_IN_PALETTE; i++) {
    if (multiPalette32[offset + i] === 0) {
      multiPalette32[offset + i] = color32;
      return i;
    }
  }

  // Not found -> get the best
  let best = 1 << 24, bestIdx = 1;
  const rs = color32 & 0xff, gs = color32 >> 8 & 0xff, bs = color32 >> 16 & 0xff;
  for (let i = 1; i < COLORS_IN_PALETTE; i++) {
    const r = multiPalette32[offset + i] & 0xff, g = multiPalette32[offset + i] >>  8 & 0xff, b = multiPalette32[offset + i] >> 16 & 0xff;
    const diff = (r - rs) * (r - rs) + (g - gs) * (g - gs) + (b - bs) * (b - bs);
    if (diff < best) {
      best = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function fitsPaletteScore(tilePixels12, palette32, offset) {
  let score = 0, remainingColors = freeColorsInPalette(palette32, offset);
  const remappedColors = {};
  for (let i = 0; i < tilePixels12.length; i++) {
    // Perfect match?
    if (findColorIndex(tilePixels12[i], palette32, offset) >= 0) {
      score += 2;
    }
    else {
      // Give points if we can remap the color
      if (remappedColors[tilePixels12[i]]) {
        score += 2;
      } else if (remainingColors > 0) {
        remappedColors[tilePixels12[i]] = true;
        remainingColors -= 1;
        score += 1;
      }
    }
  }
  return score;
}

// Looks up graphically what tiles are free (all empty) to determine the number of actually used tiles
function countUsedTiles(tilesetBitmap, tileset) {
  const totalTiles = tilesInTileset(tileset);
  let result = 0;
  for (let t = 0; t < totalTiles; t++) {
    const {x, y} = posInTileset(tileset, t);
    let found = false;
    for (let j = 0; j < tileset.th && !found; j++)
      for (let i = 0; i < tileset.tw && !found; i++)
        found = tilesetBitmap.getPixel(x + i, y + j) > 0;
    if (found) result = t + 1;
  }
  return result;
}

function convertTile(multiPalette, pngData, pngWidth, x, y, w, h) {
  const pixels12 = new Array(w * h);

  // Pack the colors of the tile and posterize it (12 bits)
  for (let j = 0; j < h; j++) {
    let imgIndex = (y + j) * pngWidth + x;
    for (let i = 0; i < w; i++, imgIndex++) {
      const color32 = colorArrayToColor32(pngData[imgIndex * 4], pngData[imgIndex * 4 + 1], pngData[imgIndex * 4 + 2]);
      pixels12[j * w + i] = posterize(color32);
    }
  }

  // Now map the tile to one of the palettes.
  let bestPalette = 0, bestScore = -1;
  for (let i = 0; i < multiPalette.length / COLORS_IN_PALETTE; i++) {
    const score = fitsPaletteScore(pixels12, multiPalette, i * COLORS_IN_PALETTE);
    if (score > bestScore) {
      bestPalette = i;
      bestScore = score;
    }
  }

  // Now we can add any required color to the palette in question and convert the pixel12 array from true color to numbers
  for (let i = 0; i < pixels12.length; i++) {
    let pixelNo = findColorIndex(pixels12[i], multiPalette, bestPalette * COLORS_IN_PALETTE);
    if (pixelNo === -1) {
      pixelNo =  assignFirstFreeColorOrClosest(multiPalette, bestPalette * COLORS_IN_PALETTE, pixels12[i]);
    }
    pixels12[i] = pixelNo;
  }

  return {pixels4: pixels12, paletteNo: bestPalette};
}

// Important: doesn't check the total tiles, and may create tiles beyond the limit of the tileset!
function findOrCreateTile(tilesetBitmap, tileset, tilePixels4, existingTiles, maxTiles) {
  for (let t = 0; t < existingTiles; t++) {
    const {x, y} = posInTileset(tileset, t);
    let matches = true;
    for (let j = 0; j < tileset.th && matches; j++)
      for (let i = 0; i < tileset.tw && matches; i++)
        matches = tilesetBitmap.getPixel(x + i, y + j) === tilePixels4[tileset.tw * j + i];
    if (matches) return { tileNo: t, existingTiles };
  }

  if (existingTiles >= maxTiles) return { tooMany: true };

  // Add the tile if there's no exact match
  const {x, y} = posInTileset(tileset, existingTiles);
  for (let j = 0; j < tileset.th; j++)
    for (let i = 0; i < tileset.tw; i++)
      tilesetBitmap.setPixel(x + i, y + j, tilePixels4[tileset.tw * j + i]);
  return { tileNo: existingTiles, existingTiles: existingTiles + 1 };
}

export function importMap(png, tilesetName) {
  const tileset = spriteNamed(tilesetName);
  if (!tileset.tw || !tileset.th) {
    return { error: `Sprite doesn't have a tile size. Go to SPRITES, select it and set the TW and TH properties. Remember to make the size (W/H) dividable by the tile size.` };
  }

  const tilesWide = Math.ceil(png.width / tileset.tw);
  const tilesTall = Math.ceil(png.height / tileset.th);
  const maxTiles = tilesInTileset(tileset);
  const tilesetBitmap = cloneBitmapFromArea('sprite', tileset);
  const paletteBitmap = cloneBitmapFromArea('palette', paletteNamed(tileset.pal));
  let usedTiles = countUsedTiles(tilesetBitmap, tileset);
  const map = new Array(tilesWide * tilesTall);
  const multiPalette = posterizePalette(paletteBitmap.pixels);

  for (let j = 0; j < tilesTall; j++) {
    for (let i = 0; i < tilesWide; i++) {
      const { pixels4, paletteNo } = convertTile(multiPalette, png.data, png.width, i * tileset.tw, j * tileset.th, tileset.tw, tileset.th);
      const { tileNo, existingTiles, tooMany } = findOrCreateTile(tilesetBitmap, tileset, pixels4, usedTiles, maxTiles);
      if (tooMany) {
        return {error: `This tileset doesn't have enough room to store the tiles. Increase its size and try again (go to SPRITES, select the tileset and increase the W and H).`};
      }
      usedTiles = existingTiles;
      map[tilesWide * j + i] = tileNo | paletteNo << TILE_PAL_SHIFT;
    }
  }

  // Rewrite the tileset data
  const operations = [
    makeImageWriteOperation('sprite', tilesetBitmap, null),
    makeImageWriteOperation('palette', paletteBitmap, null),
  ];
  return { pixels: map, width: tilesWide, height: tilesTall, pal: tileset.pal, til: tilesetName, operations };
}

