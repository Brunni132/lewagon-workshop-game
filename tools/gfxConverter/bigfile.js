/**
 * @typedef {Object} BigFile~Palette
 * @property y {number} V position of palette (color units)
 * @property w {number} count (color units)
 * @property h {number} number of rows (consecutive palettes)
 */

/**
 * @typedef {Object} BigFile~Sprite
 * @property x {number} U position in the sprite texture (pixels)
 * @property y {number} V position in the sprite texture (pixels)
 * @property w {number} width of sprite or tileset as a whole (pixels)
 * @property h {number} height of sprite or tileset as a whole (pixels)
 * @property tw {number} tile width (pixels) if it's a tileset
 * @property th {number} tile height (pixels) if it's a tileset
 * @property tiles {number} number of used tiles in this tileset
 * @property hicol {number} whether it's a high-color (8 bit) tile (1=yes, 0=4-bit)
 * @property pal {string} palette name
 */

/**
 * @typedef {Object} BigFile~Map
 * @property x {number} U position in the map texture (cells)
 * @property y {number} V position in the map texture (cells)
 * @property w {number} width of sprite (pixels)
 * @property h {number} height of sprite (pixels)
 * @property til {string} name of the tileset (BigFile~Sprite)
 * @property pal {string} name of the first palette (ignores that in the tileset)
 */

/**
 * @typedef {Object} BigFile~GameInfo
 * @property paletteBpp {number} 12 or 32 (the palette.png is either a 4-bit PNG without transparency or a 8-bit PNG with RGBA)
 */

/**
 * @typedef {Object} BigFile
 * @property info {BigFile~GameInfo}
 * @property pals {Object.<string, BigFilePalette>}
 * @property sprites {Object.<string, BigFileSprite>}
 * @property maps {Object.<string, BigFileMap>}
 */
