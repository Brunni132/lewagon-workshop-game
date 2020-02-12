import {mat3} from "gl-matrix";
import {CanvasImageData} from "../canvas-image-data";
import {
  drawTile32,
  paletteNamed,
  paletteSubarrayFromPaletteName,
  spriteNamed,
  tilesInTileset,
  tilesWideInTileset
} from "../api";
import {CanvasComponent, FUNCTIONS} from "./canvas-component";
import {makeSelectionRectangle} from "../math-utils";
import {makeCssColor} from "../page-utils";

export const TILE_MASK = 0x0fff, TILE_PRIO_SHIFT = 12, TILE_PAL_SHIFT = 13, TILE_PAL_MASK = 7;

export class TileSelectorComponent extends CanvasComponent {
  constructor(canvas, parentSelector) {
  	super(canvas, parentSelector);
    this.cacheBitmapDirty = true;
    this.sizeDirty = true;
    this.rectStart = null;
    mat3.identity(this.transform);
    this.allowMultiSelection = false;
    // Called with (width, height, cells) when content is copied (if allowMultiSelection is false, returns a 1x1 rect with one cell)
    this.onselect = null;

    this.element('.tile-pal').oninput = () => this.selectRect();
    this.element('.tile-no').oninput = () => {
      this.selectNextTile(0);
    }
  }

	notifyBitmapImageChanged() {
		this.cacheBitmapDirty = true;
		this.updateUI();
	}

	setTileset(tileset, palette) {
		if (this.tilesetName === tileset && this.paletteName === palette) return;
		this.cacheBitmapDirty = true;
		this.tilesetName = tileset;
		this.paletteName = palette;
		this.rectStart = null;
		this.updateUI();
	}

	deselectTile() {
		this.rectStart = null;
    this.element('.tile-no').value = -1;
		this.updateUI();
	}

	selectNextPalette(direction) {
		const tilePal = this.element('.tile-pal');
		tilePal.value = Math.min(tilePal.max, Math.max(tilePal.min, parseInt(tilePal.value) + direction));
		this.selectRect();
	}

	// Updates the selection using the tile into question
	selectNextTile(direction) {
  	const tileNo = this.element('.tile-no');
		this.selectTile(Math.min(tileNo.max, Math.max(tileNo.min, parseInt(tileNo.value) + direction)) | this.getPaletteMask());
		this.selectRect();
	}

	// Updates the UI to reflect the selected tile
	selectTile(tileNo) {
    const paletteNo = tileNo >> TILE_PAL_SHIFT & TILE_PAL_MASK;
  	const { x, y } = this.positionForTile(tileNo & TILE_MASK);
  	this.rectStart = [x, y];
  	this.rectEnd = this.rectStart.map(p => p + 1);
    this.element('.tile-pal').value = paletteNo;
  	this.updateUI();
	}

	onRender(dt) {
		if (this.sizeDirty) {
			if (!this.resizeCanvas()) return;
			if (!this.cacheBitmap) {
				this.cacheBitmap = new CanvasImageData(this.context, this.width, this.height);
				this.cacheBitmapDirty = true;
			}
			else if (this.width !== this.cacheBitmap.width || this.height !== this.cacheBitmap.height) {
				this.cacheBitmap.setSize(this.context, this.width, this.height);
				this.cacheBitmapDirty = true;
			}
		}

		const { context } = this;
		const { width, height } = this.canvas;
		context.fillStyle = '#d0d0d0';
		context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		context.fillRect(0, 0, width, height);

		this.renderCacheBitmap();
		context.drawImage(this.cacheBitmap.getCanvasForDrawing(), 0, 0);
		this.drawSelectionRectangle(context);
	}

	// ------------------------------ PRIVATE ---------------------------------
  getPaletteMask() { return this.element('.tile-pal').value << TILE_PAL_SHIFT; }

  renderCacheBitmap() {
    if (!this.cacheBitmapDirty) return;

    const palette = paletteSubarrayFromPaletteName(this.paletteName);
    const tileset = spriteNamed(this.tilesetName);
    const tilesWide = Math.min(Math.floor(this.width / tileset.tw), tilesWideInTileset(tileset));
    const tilesTall = Math.ceil(tilesInTileset(tileset) / tilesWide);
    let tileNo = 0;

    this.cacheBitmap.clear();
    for (let y = 0; y < tilesTall; y++)
      for (let x = 0; x < tilesWide; x++, tileNo++)
        drawTile32(this.cacheBitmap, x * tileset.tw, y * tileset.th, palette, tileset, tileNo);
    this.cacheBitmapDirty = false;
  }

	getSelectionRectangle() {
		if (!this.rectStart) return null;
		let [x0, y0] = this.rectStart, [x1, y1] = this.rectEnd;
		return makeSelectionRectangle(x0, y0, x1, y1);
	}

	drawSelectionRectangle(context) {
		if (this.rectStart) {
			const rect = this.getSelectionRectangle();
      const lineColor = this.blink([255, 255, 128, 1], [255, 0, 0, 1], 1000, FUNCTIONS.linear);
			let [x0, y0] = this.posOnScreen([rect.x0, rect.y0]);
			let [x1, y1] = this.posOnScreen([rect.x1, rect.y1]);
			const tileset = spriteNamed(this.tilesetName);
			this.drawDashedRectangle(context, x0 * tileset.tw, y0 * tileset.th, x1 * tileset.tw, y1 * tileset.th, makeCssColor(lineColor));
		}
	}

	getSingleTileSelectedIfAny() {
  	const rect = this.getSelectionRectangle();
  	if (rect && rect.width === 1 && rect.height === 1) {
  		return this.tileAtPosition(rect.x0, rect.y0);
		}
  	return -1;
	}

	roundPosToTile(posVec2) {
		const tileset = spriteNamed(this.tilesetName);
  	return [Math.floor(posVec2[0] / tileset.tw), Math.floor(posVec2[1] / tileset.th)];
	}

	positionForTile(tileNo) {
		const tileset = spriteNamed(this.tilesetName);
		const tilesWide = Math.min(Math.floor(this.width / tileset.tw), tilesWideInTileset(tileset));
		return { x: tileNo % tilesWide, y: Math.floor(tileNo / tilesWide) };
	}

	tileAtPosition(x, y) {
		const tileset = spriteNamed(this.tilesetName);
		const tilesWide = Math.min(Math.floor(this.width / tileset.tw), tilesWideInTileset(tileset));
		const tileNo = x + y * tilesWide;
		return (tileNo < tilesInTileset(tileset) && x < tilesWide) ? tileNo : -1;
	}

	updateUI() {
  	if (!this.tilesetName) return;
  	const tile = this.getSingleTileSelectedIfAny();
  	const tilePal = this.element('.tile-pal'), tileNo = this.element('.tile-no');
		const tileset = spriteNamed(this.tilesetName);
  	tileNo.value = tile;
		tileNo.max = tilesInTileset(tileset) - 1;
  	tilePal.disabled = tileNo.disabled = tile < 0;
    tilePal.max = paletteNamed(this.paletteName).h - 1;
    tilePal.value = Math.min(tilePal.value, tilePal.max);
	}

	selectRect() {
  	const rect = this.getSelectionRectangle();
  	const paletteMask = this.getPaletteMask();
  	if (rect) {
			const cells = new Array(rect.width * rect.height);
			let cell = 0;
			for (let j = rect.y0; j < rect.y1; j++)
				for (let i = rect.x0; i < rect.x1; i++, cell++)
					cells[cell] = this.tileAtPosition(i, j) | paletteMask;
			this.onselect(rect.width, rect.height, cells);
		}
	}

	// ------------------------------ OVERRIDE ---------------------------------
  get dpr() { return 1; }

	onMouseDown(e, mousePos) {
  	const pos = this.roundPosToTile(this.posInTransformedImage(mousePos));
  	if (this.tileAtPosition(pos[0], pos[1]) < 0) return;
		this.rectStart = pos;
		this.rectEnd = pos.map(e => e + 1);
		if (this.allowMultiSelection) {
			this.isDown = true;
		} else {
			this.updateUI();
			this.selectRect();
		}
	}

	onMouseMove(e, mousePos) {
		if (this.rectStart && this.isDown) {
			const pos = this.roundPosToTile(this.posInTransformedImage(mousePos));
			if (this.tileAtPosition(pos[0], pos[1]) < 0) return;
			this.rectEnd = pos.map(e => e + 1);
		}
	}

	onMouseOut(e) {
  	if (this.isDown) this.rectStart = null;
  	this.isDown = false;
	}

	onMouseUp(e) {
  	if (this.isDown) {
			this.updateUI();
			this.selectRect();
			this.isDown = false;
		}
	}

  onResize() {
    this.sizeDirty = true;
  }
}
