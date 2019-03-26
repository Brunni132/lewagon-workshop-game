const assert = require('assert');
const fs = require('fs'), PNG = require('pngjs').PNG;

class Texture {
	/**
	 * @param name {string}
	 * @param width {number}
	 * @param height {number}
	 * @param bitDepth {number}
	 */
	constructor(name, width, height, bitDepth) {
		this.name = name;
		this.width = width;
		this.height = height;
		this.depth = bitDepth;

		assert(this.depth === 4 || this.depth === 8 || this.depth === 16 || this.depth === 32);
		this.pixelData = new Array(this.width * this.height);
	}

	/**
	 * @param name {string}
	 * @param width {number}
	 * @param height {number}
	 * @param bitDepth {number}
	 * @returns {Texture}
	 */
	static blank(name, width, height, bitDepth) {
		return new Texture(name, width, height, bitDepth);
	}

	/**
	 * Read a png and interprets it as a 8 bit texture (each RGBA component is one pixel in the resulting texture, which
	 * has 4x the width of the original texture).
	 * @param srcFileName {string}
	 * @returns {Texture}
	 */
	static fromPng8(srcFileName) {
		const data = fs.readFileSync(srcFileName);
		const png = PNG.sync.read(data);
		const result = new Texture(srcFileName, png.width * 4, png.height, 8);
		for (let x = 0; x < png.height * png.width * 4; x++) {
			result.pixelData[x] = png.data[x];
		}
		return result;
	}

	/**
	 * Read a png and interprets it as a 16 bit texture (each RG and BA component make two pixels in the resulting
	 * texture, which has 2x the width of the original texture).
	 * @param srcFileName {string}
	 * @returns {Texture}
	 */
	static fromPng16(srcFileName) {
		const data = fs.readFileSync(srcFileName);
		const png = PNG.sync.read(data);
		const result = new Texture(srcFileName, png.width * 2, png.height, 16);
		let y = 0;
		for (let x = 0; x < png.height * png.width * 4; x += 2) {
			result.pixelData[y++] = png.data[x] + (png.data[x + 1] << 8);
		}
		return result;
	}

	/**
	 * Read a png as a 32 bit texture directly. Same width as original.
	 * @param srcFileName {string}
	 * @returns {Texture}
	 */
	static fromPng32(srcFileName) {
		const data = fs.readFileSync(srcFileName);
		const png = PNG.sync.read(data);
		const result = new Texture(srcFileName, png.width, png.height, 32);
		let y = 0;
		for (let x = 0; x < png.height * png.width * 4; x += 4) {
			result.pixelData[y++] = png.data[x] + (png.data[x + 1] << 8) + (png.data[x + 2] << 16) + (png.data[x + 3] << 24);
		}
		return result;
	}

	/**
	 * @param cb {function(number, number)}
	 */
	forEachPixelLinear(cb) {
		for (let x = 0; x < this.width * this.height; x++) {
			cb(this.pixelData[x], x);
		}
	}

	/**
	 * @param cb {function(number, number, number)}
	 */
	forEachPixel(cb) {
		let z = 0;
		for (let y = 0; y < this.height; y++)
			for (let x = 0; x < this.width; x++) {
				cb(this.pixelData[z++], x, y);
			}
	}

	/**
	 * @param x {number}
	 * @param y {number}
	 * @returns {number}
	 */
	getPixel(x, y) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
		return this.pixelData[y * this.width + x];
	}

	/**
	 * Alias for subtexture.
	 * @param x {number}
	 * @param y {number}
	 * @param width {number}
	 * @param height {number}
	 * @returns {Texture}
	 */
	rect(x, y, width, height) {
		return this.subtexture(x, y, width, height);
	}

	/**
	 * @param x {number}
	 * @param y {number}
	 * @param width {number}
	 * @param height {number}
	 * @returns {Texture}
	 */
	subtexture(x, y, width, height) {
		const result = Texture.blank(this.name + '[]', width, height, this.depth);
		for (let j = 0; j < result.height; j++) {
			for (let i = 0; i < result.width; i++) {
				result.setPixel(i, j, this.getPixel(i + x, j + y));
			}
		}
		return result;
	}

	/**
	 * @param x {number}
	 * @param y {number}
	 * @param pix {number}
	 */
	setPixel(x, y, pix) {
		// To treat as unsigned
		if (this.depth < 32 && (pix >>> this.depth) !== 0) {
			throw new Error(`${pix} too big to be written to a ${this.depth}bpp texture`);
		}
		//noinspection JSSuspiciousNameCombination
		this.pixelData[Math.floor(y) * this.width + Math.floor(x)] = pix;
	}

	/**
	 * Writes the texture as a PNG file. Depending on the BPP, the texture will be smaller than the width specified.
	 * For instance, a 1024x1024, 8bpp texture will be written to the disk as a 256x1024, 32bpp texture.
	 * @param destFileName {string}
	 */
	writeToPng(destFileName) {
		assert(Math.floor(this.width * this.depth / 32) === this.width * this.depth / 32, `${Math.floor(this.width * this.depth / 32)} !== ${this.width * this.depth / 32} in tex ${this.name}`);

		const mapPng = new PNG({
			width: Math.floor(this.width * this.depth / 32),
			height: this.height,
			filterType: -1,
			colorType: 6,
			deflateLevel: 9
		});

		let dstIdx = 0;
		for (let x = 0; x < this.height * this.width; x++) {
			if (this.depth === 4) {
				// 2 pixels packed in one, big endian
				mapPng.data[dstIdx++] = (this.pixelData[x + 1] & 0xf) | (this.pixelData[x] & 0xf) << 4;
				x++;
			} else {
				mapPng.data[dstIdx++] = this.pixelData[x] & 0xff;
				if (this.depth >= 16) mapPng.data[dstIdx++] = (this.pixelData[x] >>> 8) & 0xff;
				if (this.depth >= 24) mapPng.data[dstIdx++] = (this.pixelData[x] >>> 16) & 0xff;
				if (this.depth >= 32) mapPng.data[dstIdx++] = (this.pixelData[x] >>> 24) & 0xff;
			}
		}

		//mapPng.pack().pipe(fs.createWriteStream(destFileName));
		fs.writeFileSync(destFileName, PNG.sync.write(mapPng));
	}
}

module.exports = Texture;
