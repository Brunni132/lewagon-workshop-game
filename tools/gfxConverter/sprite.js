/**
 * Similar to Tileset.
 * @see {Tileset}
 */
class Sprite {

	/**
	 * @param {string} name
	 * @param {number} width
	 * @param {number} height
	 * @param {Palette} palette
	 */
	constructor(name, width, height, palette) {
		// TODO Florian -- A sprite should just be a tileset with one entry. Get rid of all that…
		this.name = name;
		this.width = width;
		this.height = height;
		this.palette = palette;
		/** @type {Array} */
		this.pixelData = new Array(this.width * this.height);
	}

	/**
	 * @param {string} name
	 * @param {Texture} texture
	 * @param {Palette} palette
	 * @return {Sprite}
	 */
	static fromImage(name, texture, palette) {
		const result = new Sprite(name, texture.width, texture.height, palette);
		texture.forEachPixel((pixel, x, y) => {
			// Add colors to the palette (or find them if they're already)
			result.pixelData[y * result.width + x] = palette.pixelNumberInsidePalette(pixel);
		});
		return result;
	}

	/**
	 * @param {Texture} destTexture destination sprite texture receiving texel data (4 or 8 bit).
	 * @param {number} x
	 * @param {number} y
	 */
	copyToTexture(destTexture, x, y) {
		let k = 0;
		for (let j = 0; j < this.height; j++) {
			for (let i = 0; i < this.width; i++) {
				destTexture.setPixel(x + i, y + j, this.pixelData[k++]);
			}
		}
	}
}

module.exports = {
	Sprite
};
