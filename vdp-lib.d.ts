import { mat3, mat4, vec2 } from 'gl-matrix';

declare class VdpMap {
	x: number;
	y: number;
	w: number;
	h: number;
	designTileset: string;
	designPalette: string;
	constructor(x: number, y: number, w: number, h: number, designTileset: string, designPalette: string);
	offset(x: number, y: number, w: number, h: number): VdpMap;
}
declare class VdpPalette {
	y: number;
	w: number;
	h: number;
	constructor(y: number, w: number, h: number);
	offset(y: number, w: number, h: number): VdpPalette;
}
declare class VdpSprite {
	x: number;
	y: number;
	w: number;
	h: number;
	tw: number;
	th: number;
	tiles: number;
	hiColor: boolean;
	designPalette: string;
	constructor(x: number, y: number, w: number, h: number, tw: number, th: number, tiles: number, hiColor: boolean, designPalette: string);
	offset(x: number, y: number, w: number, h: number): VdpSprite;
	/**
	 * Modifies this instance of VdpSprite (not the original) to target a given tile in a tileset.
	 * @throws {Error} if this sprite is not a tileset.
	 * @param no tile number to target.
	 * @returns {VdpSprite} this
	 */
	tile(no: number): VdpSprite;
}
declare class Array2D {
	/** @property array View as an array, where you can for example do array.forEach((value, index) => { ... }). */
	array: Uint8Array | Uint16Array | Uint32Array;
	width: number;
	height: number;
	constructor(buffer: Uint8Array | Uint16Array | Uint32Array, width: number, height: number);
	getElement(x: number, y: number): number;
	setElement(x: number, y: number, value: number): void;
}
export declare class color {
	/**
	 * Extract a 32-bit color, made by color.make or as gotten by readPalette, into it's red, green, blue and alpha
	 * sub-components.
	 * @param c color (32 bits)
	 * @param [bitsPerComponent=8] {number} can be 2, 3, 4, 5 to return a reduced color value (x bits per component)
	 * @returns {{r: number, g: number, b: number, a: number}}
	 */
	static extract(c: number, bitsPerComponent?: number): {
		a: number;
		b: number;
		r: number;
		g: number;
	};
	/**
	 * You can use make( { r: …, g: …, …} ), make(r, g, b) or make('#rgb'). Components are between 0 and 255.
	 * @param r {number|{r: number, g: number, b: number, a: number}} red component or color as extracted with
	 * color.extract().
	 * @param [g] {number} green component
	 * @param [b] {number} blue component
	 * @param [a=255] {number} alpha component (not used, only required to make a conceptually valid color)
	 * @returns {number} resulting color (a 32-bit number in the form of 0xaabbggrr)
	 */
	static make(r: number | {
		r: number;
		g: number;
		b: number;
		a: number;
	} | string, g?: number, b?: number, a?: number): number;
	/**
	 * Same as make but with colors components between 0 and 1 (floating point).
	 * @param r {number} red component
	 * @param g {number} green component
	 * @param b {number} blue component
	 * @param [a=1] {number} alpha component (not used, only required to make a conceptually valid color)
	 * @returns {number} a color
	 */
	static makeFromFloat(r: number, g: number, b: number, a?: number): number;
	static makeFromHsl(col: {
		h: number;
		s: number;
		l: number;
	}): number;
	/**
	 * Extends a 16 bit RGBA color into a 32 bit RGBA color. Note that 0xRGBA will produce 0xAABBGGRR, reversing the byte
	 * order as OpenGL expects it.
	 * @param col {number}
	 * @returns {number}
	 */
	static extendColor12(col: number): number;
	/**
	 * @param c {number} color to affect
	 * @param bitsPerComponent {number} can be 2, 3, 4, 5 to return a reduced color value (x bits per component)
	 */
	static posterize(c: number, bitsPerComponent: number): number;
	/**
	 * Reverses the byte order of a RGBA color.
	 * @param col {number}
	 * @returns {number}
	 */
	static reversecolor(col: number): number;
	static toHsl(col: number): {
		h: number;
		s: number;
		l: number;
	};
	static add(c: number, d: number): number;
	static sub(c: number, d: number): number;
	static mul(c: number, d: number): number;
	static blend(c: number, d: number, factor: number): number;
}
declare enum Key {
	Up = 0,
	Down = 1,
	Left = 2,
	Right = 3,
	A = 4,
	B = 5,
	L = 6,
	R = 7,
	Start = 8,
	Select = 9,
	NumKeys = 10
}
declare class Input {
	private readonly keyState;
	Key: typeof Key;
	constructor();
	/**
	 * @param key {number} key to check for
	 * @returns {boolean} whether the key just toggled from released to pressed this frame.
	 */
	hasToggledDown(key: Key): boolean;
	/**
	 * @param key {number} key to check for
	 * @returns {boolean} whether the key just toggled from pressed to released this frame.
	 */
	hasToggledUp(key: Key): boolean;
	/**
	 * @param key {number} key to check for
	 * @returns {boolean} whether the key is currently down. True from the moment the user presses the key until he
	 * releases it.
	 */
	isDown(key: Key): boolean;
	/**
	 * Marks all newly pressed keys as held if they're still held.
	 */
	_process(): void;
	/**
	 * Returns -1 if the key doesn't map to an existing key, or the index of the key (Key).
	 */
	private _translateKeyEvent;
}
export declare type TransparencyConfigOperation = 'add' | 'sub';
declare enum CopySource {
	current = 0,
	rom = 1,
	blank = 2
}
declare class LineTransformationArray {
	_assignedId: number;
	buffer: Float32Array;
	length: number;
	constructor();
	getLine(lineNo: number): Float32Array;
	identityAll(): void;
	identityLine(lineNo: number): void;
	resetAll(): void;
	resetLine(lineNo: number): void;
	rotateLine(lineNo: number, radians: number): void;
	scaleLine(lineNo: number, scaleXY: number[]): void;
	setLine(lineNo: number, transformation: mat3): void;
	translateLine(lineNo: number, moveXY: number[]): void;
	transformVector(lineNo: number, vectorXY: number): {
		x: number;
		y: number;
	};
	transformVectorInverse(lineNo: number, vectorXY: number): {
		x: number;
		y: number;
	};
	/** @internal */
	private _getLine;
}
declare class LineColorArray {
	buffer: Float32Array;
	length: number;
	targetPaletteNumber: number;
	targetPaletteIndex: number;
	constructor(targetPaletteIndex: number, targetPaletteNumber: number);
	setAll(_color: number): void;
	setLine(lineNo: number, _color: number): void;
}
export declare class VDP {
	_gl: WebGLRenderingContext;
	_gameData: any;
	_mapProgram: any;
	_modelViewMatrix: mat3;
	_projectionMatrix: mat4;
	_spriteProgram: any;
	_opaquePolyProgram: any;
	_mapTexture: WebGLTexture;
	_paletteTexture: WebGLTexture;
	_spriteTexture: WebGLTexture;
	_otherTexture: WebGLTexture;
	_paletteBpp: any;
	private _fadeColor;
	private _bgTransparency;
	private _objTransparency;
	private _bgBuffer;
	private _tbgBuffer;
	private _obj0Buffer;
	private _obj1Buffer;
	private _stats;
	private _frameStarted;
	private _romSpriteTex;
	private _shadowSpriteTex;
	private _romPaletteTex;
	private _shadowPaletteTex;
	private _romMapTex;
	private _shadowMapTex;
	private _nextLinescrollBuffer;
	private _usedBgPixels;
	private _usedObjCells;
	private _usedVramWrites;
	vec2: typeof vec2;
	mat3: typeof mat3;
	input: Input;
	LineColorArray: typeof LineColorArray;
	LineTransformationArray: typeof LineTransformationArray;
	CopySource: typeof CopySource;
	color: typeof color;
	constructor(canvas: HTMLCanvasElement, imageDirectory: string, done: () => void);
	/**
	 * Configures the backdrop (background color that is always present).
	 * Note that the backdrop is exactly the first color of the first palette. You can therefore modify it by writing
	 * to that palette color too. It can become handy when you are doing fades by modifying all colors.
	 * @param c backdrop color
	 */
	configBackdropColor(c: number | string): void;
	/**
	 * Configure transparent background effect.
	 * @param opts
	 * @param opts.op 'add' or 'sub'
	 * @param opts.blendSrc source tint (quantity of color to take from the blending object)
	 * @param opts.blendDst destination tint (quantity of color to take from the backbuffer when mixing)
	 */
	configBackgroundTransparency(opts: {
		op: TransparencyConfigOperation;
		blendSrc: number | string;
		blendDst: number | string;
	}): void;
	/**
	 * Configures up to 4 colors that are replaced every line by another palette color.
	 * @param {LineColorArray[]} colorTable
	 */
	configColorSwap(colorTable: LineColorArray[]): void;
	/**
	 * Configures the display options. Can only be called at the beginning of the program or after a frame has been
	 * rendered, not in the middle.
	 * @param [opts] {Object}
	 * @param [opts.extraSprites] {boolean} whether to enable the extra sprite mode. This will limit to only one BG layer
	 * (which can be transparent), but allow 512 sprites instead of 256, and twice the pixel count (covering up to two
	 * times the screen).
	 */
	configDisplay(opts?: {
		extraSprites?: boolean;
	}): void;
	/**
	 * Configures the fade.
	 * @params opts {Object}
	 * @param [opts.color] destination color (suggested black or white).
	 * @param opts.factor between 0 and 255. 0 means disabled, 255 means fully covered. The fade is only visible in
	 * increments of 16 (i.e. 1-15 is equivalent to 0).
	 */
	configFade(opts: {
		color?: number | string;
		factor: number;
	}): void;
	/**
	 * Configure effect for transparent sprites.
	 * @param opts
	 * @param opts.op 'add' or 'sub'
	 * @param opts.blendSrc source tint (quantity of color to take from the blending object)
	 * @param opts.blendDst destination tint (quantity of color to take from the backbuffer when mixing)
	 */
	configObjectTransparency(opts: {
		op: TransparencyConfigOperation;
		blendSrc: number | string;
		blendDst: number | string;
	}): void;
	/**
	 * @param map map to draw (e.g. vdp.map('level1') or just 'level1')
	 * @param [opts]
	 * @param opts.palette specific base palette to use (for the normal tiles). Keep in mind that individual map tiles may use the next 15 palettes by setting the bits 12-15 of the tile number.
	 * @param opts.scrollX horizontal scrolling
	 * @param opts.scrollY vertical scrolling
	 * @param opts.winX left coordinate on the screen to start drawing from (default to 0)
	 * @param opts.winY top coordinate on the screen to start drawing from (default to 0)
	 * @param opts.winW width after which to stop drawing (defaults to SCREEN_WIDTH)
	 * @param opts.winH height after which to stop drawing (defaults to SCREEN_HEIGHT)
	 * @param opts.lineTransform {LineTransformationArray} per-line transformation array
	 * @param opts.wrap whether to wrap the map at the bounds (defaults to true)
	 * @param opts.tileset custom tileset to use.
	 * @param opts.transparent
	 * @param opts.prio z-order
	 */
	drawBackgroundTilemap(map: VdpMap | string, opts?: {
		palette?: string | VdpPalette;
		scrollX?: number;
		scrollY?: number;
		winX?: number;
		winY?: number;
		winW?: number;
		winH?: number;
		lineTransform?: LineTransformationArray;
		wrap?: boolean;
		tileset?: string | VdpSprite;
		transparent?: boolean;
		prio?: number;
	}): void;
	/**
	 * @param sprite {string|VdpSprite} sprite to draw (e.g. vdp.sprite('plumber') or just 'plumber')
	 * @param x position (X coord)
	 * @param y position (Y coord)
	 * @param [opts]
	 * @param opts.palette specific palette to use (otherwise just uses the design palette of the sprite)
	 * @param opts.width width on the screen (stretches the sprite compared to sprite.w)
	 * @param opts.height height on the screen (stretches the sprite compared to sprite.h)
	 * @param opts.prio priority of the sprite. By default sprites have a priority of 1 (whereas BGs use 0). Note
	 * that a sprite having the same priority as a BG will appear BEHIND the BG. This allows you to hide objects behind
	 * background planes.
	 * @param opts.transparent whether this is a OBJ1 type sprite (with color effects)
	 */
	drawObject(sprite: any, x: any, y: any, opts?: {
		palette?: string | VdpPalette;
		width?: number;
		height?: number;
		prio?: number;
		transparent?: boolean;
		flipH?: boolean;
		flipV?: boolean;
	}): void;
	map(name: string): VdpMap;
	palette(name: string): VdpPalette;
	/**
	 * @param map name of the map (or map itself). You may also query an arbitrary portion of the map
	 * memory using new VdpMap(…) or offset an existing map, using vdp.map('myMap').offset(…).
	 * @param source set to vdp.SOURCE_BLANK if you don't care about the current content of
	 * the memory (you're going to write only and you need a buffer for that), vdp.SOURCE_CURRENT to read the current
	 * contents of the memory (as was written the last time with writeMap) or vdp.SOURCE_ROM to get the original data
	 * as downloaded from the cartridge.
	 * @return a Array2D containing the map data (buffer member is a Uint16Array), each element being the tile number
	 * in the tileset.
	 */
	readMap(map: string | VdpMap, source?: CopySource): Array2D;
	/**
	 * @param palette name of the palette (or palette itself). You may also query an arbitrary portion
	 * of the palette memory using new VdpPalette(…) or offset an existing map, using vdp.map('myMap').offset(…).
	 * @param source look at readMap for more info.
	 * @return {Array2D} an array containing the color entries, encoded as 0xAABBGGRR
	 */
	readPalette(palette: string | VdpPalette, source?: CopySource): Array2D;
	/**
	 * @param x
	 * @param y
	 * @param w
	 * @param h
	 * @param source look at readMap for more info.
	 * @return a Array2D that contains color entries, encoded as 0xAABBGGRR
	 */
	readPaletteMemory(x: number, y: number, w: number, h: number, source?: CopySource): Array2D;
	/**
	 * @param sprite name of the sprite (or sprite itself). You may also query an arbitrary portion of the
	 * sprite memory using new VdpSprite(…) or offset an existing sprite, using vdp.sprite('mySprite').offset(…).
	 * @param source look at readMap for more info.
	 * @return a Array2D containing the tileset data. For hi-color sprites, each entry represents one pixel.
	 * For lo-color sprites, each entry corresponds to two packed pixels, of 4 bits each.
	 */
	readSprite(sprite: string | VdpSprite, source?: CopySource): Array2D;
	readonly screenHeight: number;
	readonly screenWidth: number;
	sprite(name: string): VdpSprite;
	/**
	 * @param map {string|VdpMap} name of the map (or map itself). You may also write to an arbitrary portion of the map
	 * memory using new VdpMap(…) or offset an existing map, using vdp.map('myMap').offset(…).
	 * @param data {Array2D} map data to write (use readMap to create a buffer like that)
	 */
	writeMap(map: string | VdpMap, data: Array2D): void;
	/**
	 * @param palette
	 * @param data {Array2D} color entries, encoded as 0xAABBGGRR
	 */
	writePalette(palette: string | VdpPalette, data: Array2D): void;
	/**
	 *
	 * @param x
	 * @param y
	 * @param w
	 * @param h
	 * @param data {Array2D} color entries, encoded as 0xAABBGGRR
	 */
	writePaletteMemory(x: number, y: number, w: number, h: number, data: Array2D): void;
	/**
	 * @param sprite name of the sprite (or sprite itself). You may also write to an arbitrary portion
	 * of the sprite memory using new VdpSprite(…) or offset an existing sprite, using vdp.sprite('mySprite').offset(…).
	 * @param data {Array2D} the new data. For hi-color sprites, each entry represents one pixel. For lo-color sprites,
	 * each entry corresponds to two packed pixels, of 4 bits each.
	 */
	writeSprite(sprite: string | VdpSprite, data: Array2D): void;
	private _applyTransparencyConfig;
	private _computeStats;
	/**
	 * Renders the machine in the current state. Only available for the extended version of the GPU.
	 */
	private _doRender;
	/**
	 * @returns {number} the frame "cost" (i.e. how many frames it takes to "render" based on the stats). 1 means normal,
	 * 2 means that it will run 30 FPS, 3 = 20 FPS, etc.
	 * @private
	 */
	_endFrame(): number;
	private _getMap;
	private _getPalette;
	private _getSprite;
	/**
	 * Get and reset the VDP stats.
	 */
	_getStats(): {
		peakOBJ: number;
		peakBG: number;
		peakVramWrites: number;
	};
	private _initContext;
	private _initMatrices;
	_startFrame(): void;
}
export declare let vdp: VDP;
export declare function startStandalone(resourceDirectory: string, scriptFile: string): void;
export declare function startGame(canvasSelector: string, loadedCb: (vdp: VDP) => IterableIterator<void>): void;