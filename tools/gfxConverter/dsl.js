const assert = require('assert');
const fs = require('fs');
const { Map, Tileset } = require('./maps');
const { Sprite } = require('./sprite');
const Texture = require('./texture');
const { g_config, Palette } = require("./palette");
const { readTmx, writeTmx } = require("./tiled");
const { MasterPack } = require("./masterpack");

// User accessible
let conv = null;
let currentPalette = null;
let currentPaletteMultiple = null;
let currentTileset = null;
let paletteNamed = {};
let spriteNamed = {};
let tilesetNamed = {};
let mapNamed = {};

// System-only
function checkConv() {
	assert(conv, 'config({ compact: true, debug: true, hiColorMode: false }, () => { ... }); should come first in your program');
}

// User
function addColors(contents) {
	assert(currentPalette, 'addColors must be inside palette');
	assert(!currentPaletteMultiple, 'addColors doesn\'t support multiple palettes');
	if (typeof contents === 'string') contents = image(contents);
	if (Array.isArray(contents)) {
		currentPalette.addColors(contents, 0);
	}
	else if (contents instanceof Texture) {
		const colors = [];
		contents.forEachPixel((pixel) => {
			if (pixel >>> 24 > 0 && colors.indexOf(pixel) === -1) colors.push(pixel);
		});
		currentPalette.addColors(colors, 0);
	}
	else {
		assert(false, `unsupported addColors arg ${contents}`);
	}
}

function blank(...params) {
	return { type: 'blank', params };
}

function config(params, cb) {
	assert(!conv, 'config(…) can only be present once and at the top of the document');
	conv = new MasterPack(params);
	cb();
	conv.pack(g_config.debug);
	conv = null;
}

function image(name) {
	return Texture.fromPng32(name);
}

function map(name, contents, opts, cb) {
	if (name instanceof Map) {
		conv.addMap(name);
		mapNamed[name.name] = name;
		return;
	}

	let result;
	if (g_config.debug) console.log(`Processing map ${name}`);
	assert(!!currentPalette, 'cannot define map outside of palette block');
	assert(!!currentTileset, 'cannot define map outside of tileset block');
	if (typeof contents === 'string') contents = image(contents);
	if (typeof opts === 'function') [cb, opts] = [opts, null];
	opts = opts || {};
	if (contents.type === 'blank') {
		const { params } = contents;
		assert(params.length === 2, 'Expects 2 params to blank(…) inside map');
		result = Map.blank(name, params[0], params[1], currentTileset);
	}
	else if (contents instanceof Texture) {
		result = Map.fromImage(name, contents, currentTileset, opts.tolerance || 0);
	}
	else {
		assert(false, `unsupported map arg ${contents}`);
	}

	conv.addMap(result);
	mapNamed[name] = result;
	if (cb) cb(result);
}

function multiPalette(name, contents, cb) {
	checkConv();
	assert(!currentPalette && !currentPaletteMultiple, 'nested palettes not supported');
	if (typeof contents === 'string') contents = image(contents);

	if (contents instanceof Texture) {
		const numPalettes = contents.height;
		currentPaletteMultiple = conv.createPalette(name, 0, numPalettes);
		paletteNamed[name] = currentPaletteMultiple;
		assert(contents.width < currentPaletteMultiple.maxColors, `Too many colors for multipalette ${name} (max ${currentPaletteMultiple.maxColors - 1}, has ${contents.width})`);
		// Add initial colors
		contents.forEachPixel((color, x, y) => {
			currentPaletteMultiple.pixelNumberInsidePalette(color, true, y);
		});
	}
	else {
		assert(false, `unsupported palettes arg ${contents}`);
	}
	cb(currentPaletteMultiple);
	currentPaletteMultiple = null;
}

function palette(name, cb) {
	checkConv();
	assert(!currentPalette && !currentPaletteMultiple, 'nested palettes not supported');
	currentPalette = conv.createPalette(name);
	paletteNamed[name] = currentPalette;
	cb(currentPalette);
	currentPalette = null;
}

function sprite(name, contents) {
	if (name instanceof Sprite) {
		conv.addSprite(name);
		spriteNamed[name.name] = name;
		return;
	}

	let result;
	if (g_config.debug) console.log(`Processing sprite ${name}`);
	assert(!!currentPalette, 'cannot define sprite outside of palette block');
	if (typeof contents === 'string') contents = image(contents);
	if (contents.type === 'blank') {
		assert(false, 'blank sprites not supported yet');
	}
	else if (contents instanceof Texture) {
		result = Sprite.fromImage(name, contents, currentPalette);
	}
	else {
		assert(false, `unsupported sprite arg ${contents}`);
	}

	conv.addSprite(result);
	spriteNamed[name] = result;
}

function tileset(name, contents, tileWidth, tileHeight, opts, cb) {
	if (name instanceof Tileset) {
		conv.addTileset(name);
		tilesetNamed[name.name] = name;
		return;
	}

	let result;
	if (g_config.debug) console.log(`Processing tileset ${name}`);
	assert(!!currentPalette, 'cannot define tileset outside of palette block');
	if (typeof contents === 'string') contents = image(contents);
	if (typeof opts === 'function') [cb, opts] = [opts, null];
	opts = opts || {};
	if (contents.type === 'blank') {
		const { params } = contents;
		assert(params.length === 2, 'Expects 2 params to blank(…) inside tileset');
		result = Tileset.blank(name, tileWidth, tileHeight, params[0], params[1], currentPalette);
	}
	else if (contents instanceof Texture) {
		const conversionOpts = { tilesetWidth: opts.tilesetWidth };
		result = Tileset.fromImage(name, contents, tileWidth, tileHeight, currentPalette, conversionOpts);
	}
	else {
		assert(false, `unsupported tileset arg ${contents}`);
	}

	conv.addTileset(result);
	tilesetNamed[name] = result;
	currentTileset = result;
	if (cb) cb(result);
	currentTileset = null;
}

function tiledMap(name, fileNameBase, opts, cb) {
	assert(currentPalette || currentPaletteMultiple, 'cannot define tmx map outside of palette block');
	assert(!currentTileset, 'cannot define TMX map inside of tileset');
	opts = opts || {};
	if (g_config.debug) console.log(`Processing TMX map ${name}`);

	assert(opts.tileWidth && opts.tileHeight, 'tmxMap requires tileWidth and tileHeight');

	const tmxFileName = `${fileNameBase}.tmx`;

	// Start with conversion if necessary
	if (!fs.existsSync(tmxFileName)) {
		const originalImageFname = `${fileNameBase}.png`;
		const tolerance = opts.tolerance || 0;
		console.log(`TMX file ${tmxFileName} not found, creating from ${originalImageFname}`);
		assert(fs.existsSync(originalImageFname), `Map ${tmxFileName} not found, neither an image to build from, ${originalImageFname}. Please create one.`);
		assert(opts.tilesetWidth && opts.tilesetHeight, `Map ${tmxFileName} not found, specify tilesetWidth and tilesetHeight to build a tileset`);

		const palette = new Palette(name, 65536);
		const tileset = Tileset.blank(name, opts.tileWidth, opts.tileHeight, opts.tilesetWidth, opts.tilesetHeight, palette);
		const map = Map.fromImage(name, Texture.fromPng32(originalImageFname), tileset, tolerance);
		writeTmx(fileNameBase, map);
	}

	// Add these two to the conversion
	//const map = readTmx(fileNameBase, name, currentPaletteMultiple || currentPalette);
	const tmx = new readTmx(tmxFileName);
	const tileset = tmx.readTileset(name, currentPaletteMultiple || currentPalette);
	const map = tmx.readMap(name, tileset);

	conv.addTileset(tileset);
	tilesetNamed[tileset.name] = tileset;
	conv.addMap(map);
	mapNamed[map.name] = map;

	if (cb) cb(map);
}

function _restart() {
	conv = null;
	currentPalette = null;
	currentPaletteMultiple = null;
	currentTileset = null;
	paletteNamed = {};
	spriteNamed = {};
	tilesetNamed = {};
	mapNamed = {};
}

module.exports = {
	get global() {
		return { conv, paletteNamed, spriteNamed, tilesetNamed, mapNamed }
	},
	addColors,
	blank,
	config,
	image,
	map,
	multiPalette,
	palette,
	readTmx: (tmxFileName) => new readTmx(tmxFileName),
	sprite,
	tileset,
	tiledMap,
	_restart
};
