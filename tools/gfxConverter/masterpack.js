const BigFile = require('./bigfile');
const fs = require('fs');
const Texture = require("./texture");
const { g_config, Palette } = require("./palette");
const utils = require('./utils');

class MasterPackBaker {

	/**
	 * @param {Texture} destTexture
	 * @param {number} horizAlignment how many texels to align to (for instance, you should align 4-bit words to 8 texels since
	 * they will be packed as 32-bit RGBA words in the final texture).
	 */
	constructor(destTexture, horizAlignment) {
		this.currentLineX = 0;
		this.currentLineY = 0;
		this.currentLineHeight = 0;
		this.width = destTexture.width;
		this.height = destTexture.height;
		this.destTexture = destTexture;
		/** @type {number} */
		this.alignment = horizAlignment;
	}

	/**
	 * @param width {number}
	 * @param height {number}
	 * @param name {string}
	 * @param cb {function(Texture, number, number)}
	 */
	bake(width, height, name, cb) {
		// Need a new line?
		if (this.remainingSpace().x < width) {
			this.startNewLine();
		}
		if (this.remainingSpace().y < height) {
			throw new Error(`Not enough space to add sprite ${name} of ${width}x${height} on sprite list (now at ${this.currentLineX}, ${this.currentLineY})`);
		}

		// Copy on dest texture
		const x = this.currentLineX, y = this.currentLineY;
		cb(this.destTexture, x, y);

		this.currentLineX += width;
		this.currentLineHeight = Math.max(this.currentLineHeight, height);

		if (this.alignment > 0) {
			this.currentLineX = utils.alignToUpperDivider(this.currentLineX, this.alignment);
		}
	}

	/**
	 * @return {number} between 0 (empty) and 1 (full).
	 */
	memoryUsage() {
		const usageX = this.currentLineX / this.width;
		return this.currentLineY / this.height + usageX * (this.currentLineHeight / this.height);
	}

	/**
	 * Remaining space on the current line.
	 * @returns {{x: number, y: number}}
	 */
	remainingSpace() {
		return {x: this.width - this.currentLineX, y: this.height - this.currentLineY};
	}

	startNewLine() {
		this.currentLineX = 0;
		this.currentLineY += this.currentLineHeight;
		this.currentLineHeight = 0;
	}
}

// TODO Florian -- Maybe this should just reference a list of maps, palettes and sprites (mutable) then pack the thing at the end?
class MasterPack {

	/**
	 * Lo-color mode: 8192x1024 sprites (4 MB), 256x16 RGBA4444 color RAM (8 kB), 2048x1024 maps (4 MB)
	 * Hi-color mode: 4096x1024 sprites (4 MB), 256x256 RGBA8888 color RAM (256 kB), 2048x1024 maps (4 MB)
	 * @param opts {Object}
	 * @param [opts.compact=true] {boolean} use a smaller video memory (512 kB)
	 * @param [opts.debug=false] {boolean} outputs additional data for debugging purpose
	 * @param [opts.paletteBpp=4] {number} uses that number of bits per component; can be set to 2, 3, 4, 5 or 8.
	 * Allows to spare memory and colors.
	 * @param [opts.hiColorMode=false] {boolean} if true, colors are 8 bits per pixel and palettes have 256 colors;
	 * if false they are 4 bits per pixel and palettes have 16 colors.
 	 */
	constructor(opts) {
		g_config.hiColorMode = opts.hasOwnProperty('hiColorMode') ? opts.hiColorMode : false;
		g_config.paletteBpp = opts.hasOwnProperty('_paletteBpp') ? opts._paletteBpp : 4;
		g_config.debug = !!opts.debug;

		if (!opts.compact) {
			/** @type {Texture} */
			this.mapTex = Texture.blank('maps', 2048, 1024, 16);
			/** @type {Texture} */
			this.spriteTex = Texture.blank('sprites', g_config.hiColorMode ? 4096 : 8192, 1024, g_config.hiColorMode ? 8 : 4);
		} else {
			this.mapTex = Texture.blank('maps', 512, 512, 16);
			this.spriteTex = Texture.blank('sprites', g_config.hiColorMode ? 1024 : 2048, 512, g_config.hiColorMode ? 8 : 4);
		}
		/** @type {Texture} */
		this.paletteTex = Texture.blank('palettes', g_config.hiColorMode ? 256 : 16, g_config.hiColorMode ? 64 : 256, 32);

		/** @type {Palette[]} */
		this.palettes = [];
		/** @type {Sprite[]} */
		this.sprites = [];
		/** @type {Tileset[]} */
		this.tilesets = [];
		/** @type {Map[]} */
		this.maps = [];
	}

	/**
	 * Adds a new map, which shouldn't change from there. Create via Map.*.
	 * @param map {Map}
	 */
	addMap(map) {
		if (this.maps.indexOf(map) >= 0) return;
		this.maps.push(map);
	}

	/**
	 * Adds a new sprite, which shouldn't change from there. Create it via Sprite.fromImage().
	 * @param sprite {Sprite}
	 */
	addSprite(sprite) {
		if (this.sprites.indexOf(sprite) >= 0) return;
		this.sprites.push(sprite);
	}

	/**
	 * Adds a tileset, which shouldn't change from there. Create it via Tileset.blank().
	 * @param tileset {Tileset}
	 */
	addTileset(tileset) {
		if (this.tilesets.indexOf(tileset) >= 0) return;
		this.tilesets.push(tileset);
	}

	/**
	 * Creates a palette and adds it to the build.
	 * @param name {string} palette name
	 * @param {number} [maxColors=0] max number of colors
	 * @param {number} [rows=1] for multiple palettes
	 * @returns {Palette} the newly created palette.
	 */
	createPalette(name, maxColors = 0, rows = 1) {
		const result = new Palette(name, maxColors, rows);
		this.palettes.push(result);
		return result;
	}

	/**
	 * Finds the palette at a given location.
	 * @param {BigFile} bigFile
	 * @param x
	 * @param y
	 * @return {Palette | null}
	 */
	findPaletteAt(bigFile, x, y) {
		const result = Object.values(bigFile.sprites).find((entry) => {
			return x >= entry.x && x < entry.x + entry.w && y >= entry.y && y < entry.y + entry.h;
		});
		if (result) return this.paletteNamed(result.pal);
		return null;
	}

	/**
	 * @param writeSample {boolean}
	 */
	pack(writeSample) {
		/** @type {BigFile} */
		const resultJson = { pals: {}, sprites: {}, maps: {}, data: {}, info: {
				paletteBpp: g_config.paletteBpp
			}};

		// Convert all palettes to the palette tex
		let paletteY = 0;
		for (let i = 0; i < this.palettes.length; i++) {
			if (this.palettes[i]) {
				if (paletteY + this.palettes[i].numRows > this.paletteTex.height) throw new Error(`Too many palettes, failed while adding ${this.palettes[i].name} (max ${this.paletteTex.height})`);
				resultJson.pals[this.palettes[i].name] = this.palettes[i].copyToTexture(this.paletteTex, 0, paletteY);
				paletteY += this.palettes[i].numRows;
			}
		}

		// Bake sprites
		const spriteBaker = new MasterPackBaker(this.spriteTex, g_config.hiColorMode ? 4 : 8);
		for (let i = 0; i < this.sprites.length; i++) {
			const s = this.sprites[i];
			spriteBaker.bake(s.width, s.height, s.name, (destTexture, x, y) => {
				s.copyToTexture(destTexture, x, y);
				resultJson.sprites[s.name] = { x, y, w: s.width, h: s.height, hicol: g_config.hiColorMode ? 1 : 0, pal: s.palette.name };
			});
		}

		// Tilesets too
		for (let i = 0; i < this.tilesets.length; i++) {
			const tileset = this.tilesets[i];
			spriteBaker.bake(tileset.usedWidth, tileset.usedHeight, tileset.name, (destTexture, x, y) => {
				tileset.copyToTexture(destTexture, x, y);
				resultJson.sprites[tileset.name] = { x, y, w: tileset.usedWidth, h: tileset.usedHeight, tw: tileset.tileWidth, th: tileset.tileHeight, tiles: tileset.tiles.length, hicol: g_config.hiColorMode ? 1 : 0, pal: tileset.palette.name };
			});
		}

		// Bake maps
		const mapBaker = new MasterPackBaker(this.mapTex, 2);
		for (let i = 0; i < this.maps.length; i++) {
			const m = this.maps[i];
			mapBaker.bake(m.width, m.height, m.name, (destTexture, x, y) => {
				m.copyToTexture(destTexture, x, y);
				resultJson.maps[m.name] = { x, y, w: m.width, h: m.height, til: m.tileset.name, pal: m.tileset.palette.name };
			});
		}

		console.log(`Sprite usage: ${(100 * spriteBaker.memoryUsage()).toFixed(2)}%`.formatAs(utils.BRIGHT, utils.FG_CYAN));
		//console.log(masterSpriteList.spriteEntries.map(e => ({ x: e.x, y: e.y, w: e.width, h: e.height, pal: e.designPalette.name })));
		console.log(`Palette usage: ${(100 * (this.palettes.length / this.paletteTex.height)).toFixed(2)}%`.formatAs(utils.BRIGHT, utils.FG_CYAN));
		console.log(`Map usage: ${(100 * mapBaker.memoryUsage()).toFixed(2)}%`.formatAs(utils.BRIGHT, utils.FG_CYAN));

		// Write all textures
		console.log('Writing game data…');
		if (!fs.existsSync('../build')) fs.mkdirSync('../build');
		fs.writeFileSync('../build/game.json', JSON.stringify(resultJson), function(err) {
				if (err) throw err;
				console.log('complete');
			}
		);
		this.mapTex.writeToPng('../build/maps.png');
		this.spriteTex.writeToPng('../build/sprites.png');
		this.paletteTex.writeToPng('../build/palettes.png');
		if (writeSample) {
			console.log('Writing sample.png (optional & long, consider setting debug: false in gfx/packer-main.js)');
			this.writeSampleImage(resultJson, '../sample.png');
		}
	}

	/**
	 * @param name {string}
	 * @returns {Palette|null}
	 */
	paletteNamed(name) {
		return this.palettes.find(pal => pal.name === name);
	}

	/**
	 * @param fileName {string}
	 * @param resultJson {BigFile}
	 */
	writeSampleImage(resultJson, fileName) {
		// Use only one palette
		const defaultPal = this.palettes[0];
		const result = new Texture('sample', this.spriteTex.width, this.spriteTex.height, 32);
		this.spriteTex.forEachPixel((pix, x, y) => {
			const palette = this.findPaletteAt(resultJson, x, y) || defaultPal;
			result.setPixel(x, y, palette.colorRows[0][pix]);
		});
		result.writeToPng(fileName);
	}
}

module.exports = {
	MasterPack
};
