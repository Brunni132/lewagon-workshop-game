const assert = require('assert');
const utils = require('./utils');

// TODO Florian -- move and make part of conv
const g_config = {};
const ALLOW_MORE_COLORS = true;

// TODO Florian -- merge with color module
function posterize(c, bitsPerComponent) {
	if (bitsPerComponent === 2) {
		let hiBits = (c >>> 6 & 0x01010101) | (c >>> 7 & 0x01010101);
		hiBits |= hiBits << 1;
		c = c >>> 6 & 0x03030303;
		return hiBits | hiBits << 2 | c << 4 | c << 6;
	} else if (bitsPerComponent === 3) {
		const hiBits = c >>> 6 & 0x03030303;
		c = (c >>> 5 & 0x07070707);
		return c | c << 5 | c << 2 | hiBits;
	} else if (bitsPerComponent === 4) {
		c = (c >>> 4 & 0x0f0f0f0f);
		return c | c << 4;
	} else if (bitsPerComponent === 5) {
		const hiBits = (c >>> 5 & 0x07070707);
		c = (c >>> 3 & 0x1f1f1f1f);
		return c << 3 | hiBits;
	}
	return c;
}

class Palette {

	/**
	 * @param {string} name
	 * @param {number} numColors
	 * @param {number} numRows
	 */
	constructor(name, numColors = 0, numRows = 1) {
		/** @type {number[][]} */
		this.colorRows = []; // First color is always transparent (RGBA 0000)
		for (let i = 0; i < numRows; i++) this.colorRows.push([0]);
		/** @type {number} */
		this.maxColors = numColors || (g_config.hiColorMode ? 256 : 16);
		/** @type {number} */
		this.numRows = numRows;
		/** @type {string} */
		this.name = name;
		/** @type {Boolean} */
		this.alreadyWarned = false;
	}

	/**
	 * @param colorArray {Array<number>} must already be in destinationFormat! (call toDestinationFormat first)
	 * @param rowNo {number}
	 */
	addColors(colorArray, rowNo) {
		if (rowNo < 0 || rowNo >= this.numRows) throw new Error(`Invalid row (0-${this.numRows-1})`);
		if (colorArray.length + this.colorRows[rowNo].length > this.maxColors) {
			throw new Error(`Can't add ${colorArray.length} colors to palette ${this.name}, would extend ${this.maxColors}`);
		}
		colorArray.forEach(c => {
			if (c >>> 24 === 0) {
				throw new Error(`Can't add color ${c} to palette ${this.name}: alpha needs to be non-zero`);
			}
			this.colorRows[rowNo].push(this.toDesintationFormat(c));
		});
	}

	/**
	 * @param {Texture} destTexture in the destination pixel format for the colors (16 or 32-bit)
	 * @param {number} x
	 * @param {number} y
	 * @return {BigFile~Palette}
	 */
	copyToTexture(destTexture, x, y) {
		for (let row = 0; row < this.numRows; row++) {
			if (x + this.colorRows[row].length > destTexture.width) {
				throw new Error(`Too many colors in palette ${this.name} to fit in ${destTexture.width} texture`);
			}

			for (let i = 0; i < this.colorRows[row].length; i++) {
				destTexture.setPixel(x + i, y + row, this.colorRows[row][i]);
			}
		}

		if (this.numRows === 1) return { y, w: this.colorRows[0].length, h: 1 };
		return { y, w: this.maxColors, h: this.numRows };
	}

	/**
	 * May return -1 if the color is not found and allowCreate = false or palette is full.
	 * @param {number} color 32-bit color
	 * @param {boolean} [allowCreate=true]
	 * @param {number} [rowNo=0]
	 * @returns {number} the number inside the palette if this color already existed, or the number of the closest color.
	 * If the color doesn't have an exact equivalent and allowCreate = false, returns -1.
	 */
	pixelNumberInsidePalette(color, allowCreate = true, rowNo = 0) {
		const colors = this.colorRows[rowNo];
		color = this.toDesintationFormat(color);

		const noAlpha = color >>> 24 === 0;
		const found = colors.findIndex(c => c === color || (noAlpha && (c >>> 24 === 0)));
		if (found >= 0 || !allowCreate) return found;

		if (colors.length < this.maxColors) {
			colors.push(color);
			return colors.length - 1;
		}

		if (ALLOW_MORE_COLORS && !this.alreadyWarned) {
			console.log(`Max ${this.maxColors} colors exceeded in ${this.name}`.formatAs(utils.FG_RED));
			this.alreadyWarned = true;
		}
		assert(ALLOW_MORE_COLORS, 'Exceeded color count in palette');

		// Approximate color (index 0 is excluded as it's transparent)
		let best = 1 << 24, bestIdx = 1;
		const rs = color & 0xff, gs = color >> 8 & 0xff, bs = color >> 16 & 0xff;
		for (let i = 1; i < colors.length; i++) {
			const r = colors[i] & 0xff, g = colors[i] >>  8 & 0xff, b = colors[i] >> 16 & 0xff;
			const diff = (r - rs) * (r - rs) + (g - gs) * (g - gs) + (b - bs) * (b - bs);
			if (diff < best) {
				best = diff;
				bestIdx = i;
			}
		}
		return bestIdx;
	}

	/**
	 * @param color {number}
	 * @returns {number}
	 */
	toDesintationFormat(color) {
		return posterize(color, g_config.paletteBpp);
	}
}

module.exports = {
	g_config,
	Palette
};
