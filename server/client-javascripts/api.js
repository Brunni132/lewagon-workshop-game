import {UndoBuffer} from "./undo-buffer";
import {restoreFunction} from "./editor-main";
import {TILE_MASK, TILE_PAL_MASK, TILE_PAL_SHIFT} from "./components/tile-selector-component";
import {PNG} from "pngjs/browser";
import {pixels32ToPng} from "./page-utils";

function normalizePositions(list, width, height, allowedProps) {
  Object.values(list).forEach(v => {
    if (v.x < 0) v.x = 0;
    if (v.y < 0) v.y = 0;
    if (v.x + v.width > width) v.w = width - v.x;
    if (v.y + v.height > height) v.h = height - v.y;
    Object.keys(v).forEach(key => {
      if (!allowedProps.includes(key)) delete v[key];
    });
  });
}

function validateGameResources() {
  normalizePositions(gameResourceData.pals, paletteBitmap.width, paletteBitmap.height, ['x', 'y', 'w', 'h']);
  normalizePositions(gameResourceData.sprites, spriteBitmap.width, spriteBitmap.height, ['x', 'y', 'w', 'h', 'pal', 'tw', 'th']);
  normalizePositions(gameResourceData.maps, mapBitmap.width, mapBitmap.height, ['x', 'y', 'w', 'h', 'til', 'pal', 'type']);
  delete gameResourceData.data;
  gameResourceData.info = {};
}

async function postText(path, text) {
  return await window.fetch(path, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    contentType: 'text/plain',
    body: text
  });
}

async function postImage(path, bitmap) {
  const png = new PNG({width: bitmap.originalWidth, height: bitmap.originalHeight});
  pixels32ToPng(png.data, new Uint32Array(bitmap.pixels.buffer));
  const blob = new Blob([PNG.sync.write(png)], {type : 'image/png'});
  return await window.fetch(path, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    contentType: 'application/binary',
    body: blob
  });
}

// Doesn't save the code (this is left to the code controller)
export async function saveGameResources() {
  validateGameResources();
  await postText('/game-data/game.json', JSON.stringify(gameResourceData));
  await postImage('/game-data/palettes.png', paletteBitmap);
  await postImage('/game-data/sprites.png', spriteBitmap);
  await postImage('/game-data/maps.png', mapBitmap);
}

export async function saveEditorConfig() {
	postText('/game-data/editor-config.json', JSON.stringify(editorConfig));
}

export async function fetchEditorConfig() {
	try {
		const res = await window.fetch('/game-data/editor-config.json');
		Object.assign(editorConfig, JSON.parse(await res.text()));
	} catch (e) {
		console.error('Error fetching editor config', e);
	}
}

export async function postGameCode(code) {
  gameCode = code;
  await postText('/game-data/code/game-main.js', gameCode);
}

export async function updateGameCode({ force = false } = {}) {
  if (gameCode && !force) return gameCode;
  const res = await window.fetch('/game-data/code/game-main.js');
  if (!res.ok) throw Error('Unable to fetch game code');
  return gameCode = await res.text();
}

export async function updateGameResourceData({ force = false } = {}) {
  if (gameResourceData && !force) return gameResourceData;
  const res = await window.fetch('/game-data/game.json');
  if (!res.ok) throw Error('Unable to fetch game resource file');
  return gameResourceData = JSON.parse(await res.text());
}

export async function updatePaletteBitmap({ force = false } = {}) {
  if (paletteBitmap && !force) return paletteBitmap;
  const res = await window.fetch('/game-data/palettes.png');
  if (!res.ok) throw Error('Unable to fetch game palettes file');

  const details = JSON.parse(res.headers.get('X-Image-Details'));
  return paletteBitmap = {
    ...details,
    originalWidth: details.width,
    originalHeight: details.height,
    pixels: new Uint32Array(await res.arrayBuffer()),
    getPixel: function (x, y) {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
      return this.pixels[this.width * y + x];
    },
    setPixel: function (x, y, color) {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height || (x === 0 && y > 0)) return -1;
      this.pixels[this.width * y + x] = color;
    }
  };
}

export async function updateSpriteBitmap({ force = false } = {}) {
  if (spriteBitmap && !force) return spriteBitmap;
  const res = await window.fetch('/game-data/sprites.png');
  if (!res.ok) throw Error('Unable to fetch game sprites file');

  const details = JSON.parse(res.headers.get('X-Image-Details'));
  return spriteBitmap = {
    originalWidth: details.width,
    originalHeight: details.height,
    width: details.width * 8,
    height: details.height,
    pixels: new Uint8Array(await res.arrayBuffer()),
    getPixel: function (x, y) {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
      if ((x & 1) === 1) return this.pixels[Math.floor(this.width / 2) * y + Math.floor(x / 2)] & 0xf;
      else return this.pixels[Math.floor(this.width / 2) * y + Math.floor(x / 2)] >> 4;
    },
    setPixel: function (x, y, color) {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
      const index = Math.floor(this.width / 2) * y + Math.floor(x / 2);
      if ((x & 1) === 1) this.pixels[index] = (this.pixels[index] & 0xf0) | (color & 0xf);
      else this.pixels[index] = (this.pixels[index] & 0x0f) | (color & 0xf) << 4;
    }
  };
}

export async function updateMapBitmap({ force = false } = {}) {
  if (mapBitmap && !force) return mapBitmap;
  const res = await window.fetch('/game-data/maps.png');
  if (!res.ok) throw Error('Unable to fetch game maps file');

  const details = JSON.parse(res.headers.get('X-Image-Details'));
  return mapBitmap = {
    originalWidth: details.width,
    originalHeight: details.height,
    width: details.width * 2,
    height: details.height,
    pixels: new Uint16Array(await res.arrayBuffer()),
    getPixel: function (x, y) {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
      return this.pixels[this.width * y + x];
    },
    setPixel: function (x, y, color) {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
      this.pixels[this.width * y + x] = color;
    },
    getObjectJSON: function (x0, y0, w, h) {
      // Read from the map
      const data16 = new Uint16Array(w * h);
      let i = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++, i++)
          data16[i] = this.getPixel(x0 + x, y + y0);

      // Decode JSON
      const data8 = new Uint8Array(data16.buffer);
      let json = '';
      for (let i = 0; i < data8.length && data8[i] > 0; i++)
        json += String.fromCharCode(data8[i]);

      try {
        return JSON.parse(json);
      } catch (e) {
        console.log('Parse error in JSON', e);
        return [];
      }
    },
    setObjectJSON: function (x0, y0, w, h, json) {
      // Convert JSON to binary (8 bits)
      const resultBinary = new Uint8Array(w * h * 2);
      if (json.length > resultBinary.length) {
        alert(`Too much data in JSON for map size (${json.length} > ${resultBinary.length}). Not applying modification.`);
        return false;
      }

      for (let i = 0; i < json.length; i++) {
        if (json.charCodeAt(i) >= 256) {
          alert(`Unsupported character ${json[i]} in object data. Not applying modification.`);
          return false;
        }
        resultBinary[i] = json.charCodeAt(i);
      }

      // Write on the map
      const data16 = new Uint16Array(resultBinary.buffer);
      let i = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++, i++)
          this.setPixel(x0 + x, y0 + y, data16[i]);
      return true;
    }
  };
}

export function paletteNamed(name) {
  const result = gameResourceData.pals[name];
  if (result) {
    result.x = 0;
    result.w = 16;
  }
  return result;
}

export function spriteNamed(name) {
  return gameResourceData.sprites[name];
}

export function mapNamed(name) {
  return gameResourceData.maps[name];
}

export function itemsInRect(items, rect) {
  return Object.keys(items).filter(k =>
    items[k].x + items[k].w > rect.x0 && items[k].x < rect.x1 && items[k].y + items[k].h > rect.y0 && items[k].y < rect.y1);
}

export function findValidName(name, inObjects) {
  if (!inObjects[name]) return name;
  for (let i = 1; true; i++) {
    const newName = `${name}-${i}`;
    if (!inObjects[newName]) return newName;
  }
}

export function tilesWideInTileset(tileset) {
  return Math.floor(tileset.w / tileset.tw);
}

export function tilesInTileset(tileset) {
  return Math.min(TILE_MASK + 1,  tilesWideInTileset(tileset) * Math.floor(tileset.h / tileset.th));
}

export function paletteSubarrayFromPaletteName(paletteName) {
  const pal = paletteNamed(paletteName);
  return paletteBitmap.pixels.subarray(pal.y * 16, pal.y * 16 + pal.h * 16);
}

export function posInTileset(tileset, no) {
	const columnsPerRow = Math.floor(tileset.w / tileset.tw);
	const col = no % columnsPerRow;
	const row = Math.floor(no / columnsPerRow);
	return { x: col * tileset.tw, y: row * tileset.th };
}

export function posInSpriteBitmap(tileset, no) {
	const { x, y } = posInTileset(tileset, no);
	return { x: x + tileset.x, y: y + tileset.y };
}

export function drawTile32(canvasImageData, xDest, yDest, palette, tileset, tileNo, supportTransparency = false) {
  const paletteOffset = ((tileNo >>> TILE_PAL_SHIFT) & TILE_PAL_MASK) * 16;
	const {x, y} = posInSpriteBitmap(tileset, tileNo & TILE_MASK);
	if (!supportTransparency) {
    for (let j = 0; j < tileset.th; j++)
      for (let i = 0; i < tileset.tw; i++) {
				const pix = spriteBitmap.getPixel(x + i, y + j);
        canvasImageData.setPixel(xDest + i, yDest + j, pix > 0 ? palette[paletteOffset + pix] : 0);
      }
  } else {
    for (let j = 0; j < tileset.th; j++)
      for (let i = 0; i < tileset.tw; i++) {
        const pix = spriteBitmap.getPixel(x + i, y + j);
        if (!pix) continue;
        canvasImageData.setPixel(xDest + i, yDest + j, palette[paletteOffset + pix]);
      }
  }
}

// Operation API
export const g_undoBuffer = new UndoBuffer(restoreFunction);

function makeRestoreFunctionWithCurrentState(types) {
  const data = {};
  if (types.includes('palette')) {
    data.palImage = paletteBitmap.pixels.slice(0);
    data.pals = JSON.stringify(gameResourceData.pals);
  } else if (types.includes('sprite')) {
    data.spriteImage = spriteBitmap.pixels.slice(0);
    data.sprites = JSON.stringify(gameResourceData.sprites);
	} else if (types.includes('map')) {
		data.mapImage = mapBitmap.pixels.slice(0);
		data.maps = JSON.stringify(gameResourceData.maps);
  }

  return () => {
    if (data.palImage) {
      for (let i = 0; i < data.palImage.length; i++) paletteBitmap.pixels[i] = data.palImage[i];
      gameResourceData.pals = JSON.parse(data.pals);
    }
    if (data.spriteImage) {
      for (let i = 0; i < data.spriteImage.length; i++) spriteBitmap.pixels[i] = data.spriteImage[i];
      gameResourceData.sprites = JSON.parse(data.sprites);
    }
		if (data.mapImage) {
			for (let i = 0; i < data.mapImage.length; i++) mapBitmap.pixels[i] = data.mapImage[i];
			gameResourceData.maps = JSON.parse(data.maps);
		}
  };
}

export function arrayForType(type) {
	if (type === 'palette') return gameResourceData.pals;
	if (type === 'sprite') return gameResourceData.sprites;
	if (type === 'map') return gameResourceData.maps;
}

function bitmapForType(type) {
  if (type === 'palette') return paletteBitmap;
  if (type === 'sprite') return spriteBitmap;
	if (type === 'map') return mapBitmap;
}

export function makePenWriteOperation(type, color, pathList) {
  if (pathList.length === 0) return null;
  return {
    type,
    execute: () => {
      for (let i = 0; i < pathList.length; i += 2)
        bitmapForType(type).setPixel(pathList[i], pathList[i + 1], color);
    }
  };
}

export function makePenWriteMulticolorOperation(type, pathList) {
  if (pathList.length === 0) return null;
  return {
    type,
    execute: () => {
      for (let i = 0; i < pathList.length; i += 3)
        bitmapForType(type).setPixel(pathList[i], pathList[i + 1], pathList[i + 2]);
    }
  };
}

export function makeFloodFillOperation(type, x, y, color, visibleArea) {
  return {
    type,
    execute: () => {
      const bitmap = bitmapForType(type);
      const targetColor = bitmap.getPixel(x, y);
      const ops = [{x, y}];
      let current;
      while ((current = ops.pop())) {
        const {x, y} = current;
        const pixel = bitmap.getPixel(x, y);
        if (x >= visibleArea.x0 && x < visibleArea.x1 && y >= visibleArea.y0 && y < visibleArea.y1 && pixel === targetColor) {
          bitmap.setPixel(x, y, color);

          ops.unshift({x: x + 1, y: y});
          ops.unshift({x: x - 1, y: y});
          ops.unshift({x: x, y: y + 1});
          ops.unshift({x: x, y: y - 1});
        }
      }
    }
  };
}

export function makeClearRectOperation(type, rect) {
  return {
    type,
    execute: () => {
      for (let y = rect.y0; y < rect.y1; y++)
        for (let x = rect.x0; x < rect.x1; x++)
          bitmapForType(type).setPixel(x, y, 0);
    }
  };
}

export function makeImageWriteOperation(type, image, visibleArea) {
  return {
    type,
    execute: () => {
      let i = 0;
      for (let y = image.y; y < image.y + image.height; y++)
        for (let x = image.x; x < image.x + image.width; x++, i++) {
          if (!visibleArea || x >= visibleArea.x0 && x < visibleArea.x1 && y >= visibleArea.y0 && y < visibleArea.y1) {
            bitmapForType(type).setPixel(x, y, image.pixels[i]);
          }
        }
    }
  };
}

export function makePropertyWriteOperation(type, name, prop, value) {
  return {
    type,
    execute: () => {
			const array = arrayForType(type);
      array[name][prop] = value;
    }
  };
}

export function makeRenameOperation(type, originalName, newName) {
  return {
    type,
    execute: () => {
      const array = arrayForType(type);
      array[newName] = array[originalName];
      delete array[originalName];
    }
  };
}

export function makeDeleteOperation(type, name) {
  return {
    type,
    execute: () => {
			const array = arrayForType(type);
      delete array[name];
    }
  };
}

export function makeCreateOperation(type, name, properties) {
  return {
    type,
    execute: () => {
			const array = arrayForType(type);
      name = findValidName(name, array);
      array[name] = properties;
    }
  };
}

export function makeObjectChangeOperation(name, newJson) {
  const json = JSON.stringify(newJson);
  return {
    type: 'map',
    execute: () => {
      const map = gameResourceData.maps[name];
      if (map.type !== 'object') {
        return alert(`Map ${name} is not of object type, refusing object change operation.`);
      }
      mapBitmap.setObjectJSON(map.x, map.y, map.w, map.h, json);
    }
  };
}

export function cloneBitmapFromArea(type, {x, y, w, h}) {
  const width = w, height = h;
  const bitmap = bitmapForType(type);
  const pixels = new Array(width * height);

  for (let j = 0; j < height; j++)
    for (let i = 0; i < width; i++)
      pixels[j * width + i] = bitmap.getPixel(x + i, y + j);

  return {
    x, y, width, height, pixels,
    getPixel: function (x, y) {
      return this.pixels[y * this.width + x];
    },
    setPixel: function (x, y, color) {
      this.pixels[y * this.width + x] = color;
    }
  };
}

let pendingOperations = [];

function runPendingOperations() {
  const operations = pendingOperations;
  pendingOperations = [];
  const step = {
    execute: () => operations.forEach(o => o.execute()),
    reverse: makeRestoreFunctionWithCurrentState(operations.map(o => o.type))
  };
  g_undoBuffer.saveStep(step);
  step.execute();
  // Not really a restore, but we just ask the controller to update everything
  restoreFunction(true);
}

// Can run one operation or an array of linked operations (undone/redone atomically)
export function runOperation(operation) {
  if (!operation) return;
  if (Array.isArray(operation)) {
    operation.forEach(op => runOperation(op));
    return;
  }

  const hadPendingOp = pendingOperations.length > 0;
  pendingOperations.push(operation);
  if (!hadPendingOp) setTimeout(runPendingOperations, 0);
}

export let gameCode, gameResourceData, paletteBitmap, spriteBitmap, mapBitmap;
export const editorConfig = {
	useClipboard: false,
	usePinkTransparency: false,
};
