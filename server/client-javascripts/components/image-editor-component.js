import {
  createCanvas2DEmptyPattern,
  isInputComponent,
  makeCssColor,
  mouseEventShouldMove
} from "../page-utils";
import {mat3, vec2} from 'gl-matrix';
import {CanvasImageData} from "../canvas-image-data";
import {
  add,
  CanvasComponent,
  floorPos,
  FUNCTIONS, invert,
  MIN_DISTANCE_FOR_MOVE,
  neg,
  subtract,
  transform,
  translate
} from "./canvas-component";
import {makeRectangle, makeRectangleWH, makeSelectionRectangle} from "../math-utils";
import {setStatusText} from "../controller";
import {showMultiSelectDialog} from "./multiselect-dialog-component";

export class ImageEditorComponent extends CanvasComponent {
  constructor(canvas, parentSelector) {
    super(canvas, parentSelector);
    this.backgroundPattern = this.context.createPattern(createCanvas2DEmptyPattern(), 'repeat');
    this.bitmapImage = null;
    // Called when tool is 'select' and an indicator is selected
    this.onselectitem = null;
    // Called when tool is 'select' and an indicator is double-clicked
    this.onedititem = null;
    // Called when tool is 'pen' and an item in the visible area is clicked
    this.onpenwrite = null;
    // Called when tool is 'pen' and the secondary click is pressed (with true on mouse down, false on mouse up)
    this.onswitchtosecondarytool = null;
    // Called after a successful paste. Can return true to prevent.
    this.onbakepastedimage = null;
    // Called with (cacheBitmap, x, y, pixel)
    this.ondrawpixel = null;
    // If non-null, replaces ondrawpixel when drawing the full image (cacheBitmap, visibleArea). Should return a list in the following format: [{opacity: 1, bitmap: cacheBitmap}]
    this.ondrawimage = null;
    this.onrequestpathcolor = null;
    // Called when tool is 'eyedropper'
    this.oneyedropper = null;
    // Called when tool is 'cloner'
    this.oncloner = null;
    // Called with (x, y) mouse positions when tool is 'brush'
    this.onbrushpasted = null;
    // Called with ([indicator-index], move-x, move-y) when tool is 'move'
    this.onmovetool = null;
    // Called when tool is 'move' and something is selected (not moved)
    this.onmoveselect = null;
    // Called with (x, y) when tool is 'place'
    this.onplacetool = null;
    // Called on click with any other tool
    this.onothertool = null;
    this.brushBitmap = null;
    this.visibleArea = makeRectangle();
    this.tool = 'select';
    this.pastedImage = null;
    // 'zoom', 'scroll', 'none'
    this.panMode = 'zoom';
    this.lastMousePos = [0, 0];
    // Software-rendered to this
    this.cacheBitmap = null;
    this.cacheBitmapDirty = true;
    this.writePathBuffer = null;
    this.renderImageList = [];
  }

  cancelPaste() {
    this.pastedImage = null;
    this.notifyBitmapImageChanged();
  }

  focusArea(x, y, w, h, onlyHorizontal, centerOnIt) {
    // Zoom so that the area fills the screen
    const ratio = this.pixelW / this.pixelH;
    mat3.identity(this.transform);
    const reqZoomFactor = Math.min(
      this.width / ((this.posOnScreen([x + w, y])[0] - this.posOnScreen([x, y])[0]) * ratio),
      onlyHorizontal ? Infinity : (this.height / (this.posOnScreen([x, y + h])[1] - this.posOnScreen([x, y])[1])));
    mat3.scale(this.transform, this.transform, [reqZoomFactor * ratio, reqZoomFactor]);
    if (!centerOnIt) this.ensureTransformInVisibleArea();
    else this.ensureTransformInArea({ x0: x, y0: y, x1: x + w, y1: y + h })
  }

  getSelectedIndicator() {
    return this.bitmapImage.indicators.find(i => i.highlighted);
  }

  // Necessary to get a nice rectangle of minimum 1x1. Not used in move mode which uses pixel selection.
  getSelectionRectangle() {
    if (!this.rectStart) return null;
    let [x0, y0] = this.rectStart, [x1, y1] = this.rectEnd;
    return makeSelectionRectangle(x0, y0, x1, y1, this.tool === 'move' ? 0 : 1);
  }

  getSuggestedPastePosition() {
    const start = this.posInTransformedImage([0, 0]);
    return {
      x: Math.ceil(Math.max(start[0], this.visibleArea.x0)),
      y: Math.ceil(Math.max(start[1], this.visibleArea.y0))
    };
  }

  // Tells that the bitmap (this.bitmapImage) has been modified, and the internal caches flushed
  notifyBitmapImageChanged() {
    this.cacheBitmapDirty = true;
  }

  onCopy() {
    if (this.tool === 'rect' && this.rectStart) {
      const result = { rect: this.getSelectionRectangle() };
      this.clearSelection();
      return result;
    } else if (this.tool === 'select') {
      const selected = this.getSelectedIndicator();
      if (selected) {
        return {
          indicator: selected,
          rect: makeRectangleWH(selected.x, selected.y, selected.w, selected.h)
        };
      }
    }
    return null;
  }

  onKeyDown(e) {
    if (e.key === 'Enter' && this.pastedImage) {
      this.bakePastedImage();
    } else if (e.key === 'Escape' && this.pastedImage) {
      this.cancelPaste();
    } else if (e.key === 'Z' && !e.metaKey && !e.ctrlKey) {
      this.resetZoom();
    } else if (e.key === 'y' && !e.metaKey && !e.ctrlKey) {
      this.zoomAt(this.lastMousePos, 0.9);
    } else if (e.key === 'z' && !e.metaKey && !e.ctrlKey) {
      this.zoomAt(this.lastMousePos, 1.1);
    } else if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
      const selected = this.bitmapImage.indicators.find(i => i.highlighted);
      if (selected) this.focusArea(selected.x, selected.y, selected.w, selected.h, false, true);
    }
    else return false;
    return true;
  }

  onChangeState(goingForward) {
    if (!goingForward) this.cancelPaste();
  }

  // Image: {x, y, width, height, pixels}
  pasteImage(image) {
    if (image.width > this.visibleArea.width || image.height > this.visibleArea.height) {
      return alert(`Image too big to paste here (${image.width}x${image.height}, available ${this.visibleArea.width}x${this.visibleArea.height})`);
    }
    const indicator = image.indicator ? {...image.indicator} : null;
    this.pastedImage = { ...image, indicator };
    this.clearSelection();
    this.notifyBitmapImageChanged();
  }

  onRender(dt) {
    const { context, dpr } = this;
    const { width, height } = this.canvas;

    // Pattern background, scaled according to device pixel ratio
    context.fillStyle = '#d0d0d0';
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillRect(0, 0, width, height);

    if (!this.bitmapImage) return;

    this.renderCachedBitmap(context);

    const topLeft = transform([this.visibleArea.x0, this.visibleArea.y0], this.transform);
    const bottomRight = transform([this.visibleArea.x1, this.visibleArea.y1], this.transform);
    context.fillStyle = this.backgroundPattern;
    context.fillRect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
    context.transform(this.transform[0], this.transform[1], this.transform[3], this.transform[4], this.transform[6], this.transform[7]);

    context.imageSmoothingEnabled = false;

    this.renderImageList.forEach(p => {
      context.globalAlpha = p.opacity;
      context.drawImage(p.bitmap.getCanvasForDrawing(), this.visibleArea.x0, this.visibleArea.y0,
        p.bitmap.width / this.pixelW, p.bitmap.height / this.pixelH);
    });

    if (['brush', 'place'].includes(this.tool) && this.brushBitmap.isDrawable()) {
      let pos = this.posInTransformedImage(this.lastMousePos);
      if (this.tool === 'brush') pos = floorPos(pos);
      context.globalAlpha = this.blink([0], [1], 1000)[0];
      context.drawImage(this.brushBitmap.getCanvasForDrawing(), pos[0], pos[1], this.brushBitmap.width / this.pixelW, this.brushBitmap.height / this.pixelH);
      // To have a fixed line width (not dependent on transform)
      const posStart = transform(pos, this.transform);
      const posEnd = transform([pos[0] + this.brushBitmap.width / this.pixelW, pos[1] + this.brushBitmap.height / this.pixelH], this.transform);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawDashedRectangle(context, posStart[0], posStart[1], posEnd[0], posEnd[1], '#ff0');
      context.globalAlpha = 1;
    }

    // Draw indicators
    context.font = 'Arial 8px';
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.bitmapImage.indicators.forEach(i => this.drawIndicator(i));

    if (this.pastedImage && this.pastedImage.indicator) {
      this.pastedImage.indicator.x = this.pastedImage.x;
      this.pastedImage.indicator.y = this.pastedImage.y;
      this.pastedImage.indicator.highlighted = false;
      this.drawIndicator(this.pastedImage.indicator, true);
    }
    else {
      this.drawPastedImageRectangle(context);
    }
    this.drawSelectionRectangle(context);
  }

  resetVisibleArea() {
    this.setVisibleArea(0, 0, this.bitmapImage.width, this.bitmapImage.height);
  }

  resetZoom() {
    this.setVisibleArea(this.visibleArea.x0, this.visibleArea.y0, this.visibleArea.width, this.visibleArea.height);
  }

  // Bitmap image is created in api.js (width, height, image, getPixel) and has a `indicators` field
  // which is an array of (x, y, w, h, text, highlighted)
  setBitmapImage(bitmapImage) {
    const needsInitialization = !this.bitmapImage;
    this.bitmapImage = bitmapImage;
    this.pixelW = this.bitmapImage.pixelsPerPixelW || 1;
    this.pixelH = this.bitmapImage.pixelsPerPixelH || 1;

    if (needsInitialization) {
      this.cacheBitmap = new CanvasImageData(this.context, this.bitmapImage.width * this.pixelW, this.bitmapImage.height * this.pixelH);
      mat3.identity(this.transform);
      this.resetVisibleArea();
    }
  }

  setTool(tool) {
    if (this.tool === tool) return;
    this.tool = tool;
    this.clearSelection();
  }

  setVisibleArea(x, y, w, h, focusOnIt = true, preserveZoom = false) {
    if (preserveZoom) {
      translate(this.transform, [this.visibleArea.x0 - x, this.visibleArea.y0 - y]);
    }
    Object.assign(this.visibleArea, { x0: x, y0: y, x1: x + w, y1: y + h });
    if (focusOnIt) this.focusArea(x, y, w, h, this.panMode === 'scroll');
    else this.ensureTransformInVisibleArea();
    this.notifyBitmapImageChanged();
  }

  // ------------------------------ PRIVATE ---------------------------------
  bakePastedImage() {
    if (this.onbakepastedimage && !this.onbakepastedimage(this.pastedImage)) {
      this.cancelPaste();
    }
  }

  clearSelection() {
    this.rectStart = null;
  }

  getHighlighted() {
    return this.bitmapImage.indicators.filter(i => i.highlighted);
  }

  getHighlightedIndices() {
    const indices = [];
    this.bitmapImage.indicators.forEach((i, index) => {
      if (i.highlighted) indices.push(index);
    });
    return indices;
  }

  dehighlightAll() {
    this.bitmapImage.indicators.forEach(i => i.highlighted = false);
  }

  drawIndicator(indicator, pasted) {
    if (indicator.indType === 'object' && !indicator.highlighted) return;
    //if (indicator.x + indicator.w <= this.visibleArea.x0 || indicator.y + indicator.h <= this.visibleArea.y0 || indicator.x >= this.visibleArea.x1 || indicator.y >= this.visibleArea.y1) return;

    const { context } = this;
    const { width, height } = this.canvas;
    const indicatorPos = [indicator.x, indicator.y];
    if (indicator.indType === 'object') {
    	indicatorPos[0] += this.visibleArea.x0;
			indicatorPos[1] += this.visibleArea.y0;
		}
    const start = this.posOnScreen([indicatorPos[0], indicatorPos[1]]);
    const end = this.posOnScreen([indicatorPos[0] + indicator.w, indicatorPos[1] + indicator.h]);
    const x0 = start[0], y0 = start[1], x1 = end[0], y1 = end[1];
    // Outside of screen
    if (x1 < 0 || y1 < 0 || x0 >= width || y0 >= height) return;

    const gradient = context.createLinearGradient(x0, y0, x0, y1);
    let draw = true;
    if (pasted) {
      const lineColor = this.blink([255, 255, 255, 1], [0, 128, 64, 1], 1000, FUNCTIONS.linear);
      gradient.addColorStop(0, makeCssColor(lineColor));
      gradient.addColorStop(1, makeCssColor(lineColor));
      context.lineDashOffset = this.blink([0], [7.999], 300, FUNCTIONS.sawtooth)[0];
      context.setLineDash([5, 3]);
    } else if (indicator.highlighted && !(this.pastedImage && this.pastedImage.indicator)) {
      const colorTop = this.blink([128, 128, 0, 1], [255, 255, 128, 1], 1000);
      const colorBottom = this.blink([255, 0, 0, 1], [255, 128, 0, 1], 1000);
      gradient.addColorStop(0, makeCssColor(colorTop));
      gradient.addColorStop(1, makeCssColor(colorBottom));
      context.lineDashOffset = this.blink([0], [7.999], 300, FUNCTIONS.sawtooth)[0];
      context.setLineDash([5, 3]);
    } else if (!indicator.focused) {
      gradient.addColorStop(0, '#def');
      gradient.addColorStop(1, '#08f');
      context.setLineDash([]);
    } else {
      draw = false;
    }

    if (draw) {
      context.strokeStyle = gradient;
      context.lineWidth = 2;

      context.fillStyle = gradient;
      context.strokeRect(x0, y0, x1 - x0, y1 - y0);
      context.setLineDash([]);

      if (indicator.text) {
        context.strokeStyle = '#000';
        context.strokeText(indicator.text, x0 + 2, y0 + 8);
        context.fillText(indicator.text, x0 + 2, y0 + 8);
      }
    }

    if (indicator.selected && indicator.tw && indicator.th) {
      context.strokeStyle = '#def';
      context.lineWidth = 2;
      context.beginPath();
      // In focused mode of sprites/alike, we will just draw the lines separating the sprites
      for (let y = 0; y + indicator.th <= indicator.h; y += indicator.th)
        for (let x = 0; x + indicator.tw <= indicator.w; x += indicator.tw) {
          const start = this.posOnScreen([indicator.x + x + indicator.tw, indicator.y + y]);
          const end = this.posOnScreen([indicator.x + x, indicator.y + y + indicator.th]);
          context.moveTo(start[0], start[1]);
          if (x + indicator.tw < indicator.w) context.lineTo(start[0], end[1]);
          context.moveTo(start[0], end[1]);
          if (y + indicator.th < indicator.h) context.lineTo(end[0], end[1]);
        }
      context.stroke();
    }
  }

  drawPastedImageRectangle(context) {
    if (!this.pastedImage) return;
    const lineColor = this.blink([255, 255, 255, 1], [0, 128, 64, 1], 1000, FUNCTIONS.linear);
    let [x0, y0] = this.posOnScreen([this.pastedImage.x, this.pastedImage.y]);
    let [x1, y1] = this.posOnScreen([this.pastedImage.x + this.pastedImage.width, this.pastedImage.y + this.pastedImage.height]);
    this.drawDashedRectangle(context, x0, y0, x1, y1, makeCssColor(lineColor));
  }

  drawSelectionRectangle(context) {
    if (this.rectStart) {
      const rect = this.getSelectionRectangle();
      let [x0, y0] = this.posOnScreen([rect.x0, rect.y0]);
      let [x1, y1] = this.posOnScreen([rect.x1, rect.y1]);
      this.drawDashedRectangle(context, x0, y0, x1, y1, '#fff', this.tool === 'cloner' ? 'rgba(0, 0, 255, 0.5)' : null);
    }
  }

  posInTransformedImageClamped(pos) {
    const [x, y] = this.posInTransformedImage(pos);
    return [
      Math.min(this.visibleArea.x1 - 1, Math.max(this.visibleArea.x0, x)),
      Math.min(this.visibleArea.y1 - 1, Math.max(this.visibleArea.y0, y))
    ];
  }

  ensureTransformInVisibleArea() {
    this.ensureTransformInArea(this.visibleArea);
  }

  ensureTransformInArea(visibleArea) {
    const sizeInPixels = subtract(
      this.posOnScreen([visibleArea.x1, visibleArea.y1]),
      this.posOnScreen([visibleArea.x0, visibleArea.y0]));
    const visible = [Math.min(sizeInPixels[0], this.width), Math.min(sizeInPixels[1], this.height)];
    const offset = [(this.width - visible[0]) / 2, (this.height - visible[1]) / 2];

    let posInImage = this.posInTransformedImage([this.width - offset[0], this.height - offset[1]]);
    if (posInImage[0] > visibleArea.x1) translate(this.transform, [posInImage[0] - visibleArea.x1, 0]);
    if (posInImage[1] > visibleArea.y1) translate(this.transform, [0, posInImage[1] - visibleArea.y1]);

    posInImage = this.posInTransformedImage([offset[0], offset[1]]);
    if (posInImage[0] < visibleArea.x0) translate(this.transform, [posInImage[0] - visibleArea.x0, 0]);
    if (posInImage[1] < visibleArea.y0) translate(this.transform, [0, posInImage[1] - visibleArea.y0]);
  }

  indicatorAtPosition(x, y) {
    return this.indicatorsAtPosition(x, y)[0];
  }

  indicatorsAtPosition(x, y) {
    return [...this.bitmapImage.indicators].reverse().filter(i =>
      x >= i.x && y >= i.y && x < i.x + i.w && y < i.y + i.h);
  }

  indicatorsInRect(rect) {
    return this.bitmapImage.indicators.filter(i =>
      i.x + i.w > rect.x0 && i.x < rect.x1 && i.y + i.h > rect.y0 && i.y < rect.y1);
  }

  inPastedImage(x, y) {
    return x >= this.pastedImage.x && y >= this.pastedImage.y && x < this.pastedImage.x + this.pastedImage.width && y < this.pastedImage.y + this.pastedImage.height;
  }

  inVisibleArea(x, y) {
    return x >= this.visibleArea.x0 && x < this.visibleArea.x1 && y >= this.visibleArea.y0 && y < this.visibleArea.y1;
  }

  isRectTool() { return ['rect', 'cloner'].includes(this.tool); }

  concatenateMoveToWriteBuffer(pos) {
    const prev = this.writePathBuffer.slice(this.writePathBuffer.length - 2);
    while (pos[0] !== prev[0] || pos[1] !== prev[1]) {
      // Interpolate move to avoid spots when moving too fast
      for (let i = 0; i < 2; i++) {
        if (pos[i] > prev[i]) prev[i]++;
        else if (pos[i] < prev[i]) prev[i]--;
      }
      this.writePathBuffer = this.writePathBuffer.concat([...prev]);
      this.ondrawpixel(this.cacheBitmap, prev[0] - this.visibleArea.x0, prev[1] - this.visibleArea.y0, this.onrequestpathcolor());
    }
  }

  onDoubleClick(e, mousePos) {
    if (this.tool === 'select') {
      const imagePosition = this.posInTransformedImage(mousePos);
      const indicator = this.indicatorAtPosition(imagePosition[0], imagePosition[1]);
      if (this.onedititem && indicator) this.onedititem(indicator);
    }
  }

  onMouseDown(e, mousePos) {
    // onMouseDown can be called again in case the tool changes immediately (right click, etc.)
    if (!this.isDown) {
      this.isDown = true;
      this.hasMoved = false;
      this.switchedToSecondaryTool = false;
      this.draggedPastedImagePos = this.draggingPastedImage = null;
      this.moveModeLastPos = null;
    }
    if (mouseEventShouldMove(e)) {
      this.moveLastPos = mousePos;
      e.preventDefault(); // middle click triggers a move tool on Windows
    } else if (this.pastedImage && e.button === 0) {
      const transformed = this.posInTransformedImage(mousePos);
      if (this.inPastedImage(transformed[0], transformed[1])) {
        this.draggingPastedImage = transformed;
        // Copy to avoid floating point in pastedImage.x/y
        this.draggedPastedImagePos = [this.pastedImage.x, this.pastedImage.y];
      } else {
        this.bakePastedImage();
        this.isDown = false;
      }
    } else if (this.tool === 'move') {
      const imagePosition = this.posInTransformedImage(mousePos);
      const indicator = this.indicatorAtPosition(imagePosition[0], imagePosition[1]);
      if (indicator) {
        if (e.ctrlKey) {
          this.hasMoved = false;
          indicator.highlighted = !indicator.highlighted;
        } else {
          // We need an extra move to start moving the selection if it's a new selection, not if it was already selected (this is to prevent moving accidentally when you just want to select the item, but when the item is already selected we want to allow precise movement)
          this.hasMoved = indicator.highlighted;
          if (!indicator.highlighted) this.dehighlightAll();
          indicator.highlighted = true;
          this.moveModeInitialPos = this.moveModeLastPos = imagePosition;
        }
        this.onmoveselect(this.getHighlightedIndices());
      } else {
        if (!e.ctrlKey) this.dehighlightAll();
        this.onmoveselect(this.getHighlightedIndices());
        this.rectStart = this.rectEnd = imagePosition;
        this.moveModeInitialPos = null;
        this.onMouseMove(e, mousePos);
      }
    } else if (this.isRectTool()) {
      this.rectStart = floorPos(this.posInTransformedImageClamped(mousePos));
      this.onMouseMove(e, mousePos);
    } else if (this.tool === 'place') {
      const pos = this.posInTransformedImage(mousePos);
      this.brushBitmap.isDrawable() && this.onplacetool(Math.round(pos[0] * this.pixelW), Math.round(pos[1] * this.pixelH));
    } else if (this.tool === 'brush') {
      if (e.button === 2 && this.onswitchtosecondarytool) {
        this.switchedToSecondaryTool = true;
        this.onswitchtosecondarytool(true);
        return this.onMouseDown(e, mousePos);
      }
      const pos = floorPos(this.posInTransformedImage(mousePos));
      this.brushBitmap.isDrawable() && this.onbrushpasted(pos[0], pos[1]);
    } else if (this.tool === 'eyedropper') {
      this.onMouseMove(e, mousePos);
    } else if (this.tool === 'pen') {
      const pos = this.posInTransformedImage(mousePos).map(p => Math.floor(p));
      if (!this.inVisibleArea(pos[0], pos[1])) return;
      if (e.button === 2 && this.onswitchtosecondarytool) {
        this.switchedToSecondaryTool = true;
        this.onswitchtosecondarytool(true);
        return this.onMouseDown(e, mousePos);
      }
      this.writePathBuffer = [...pos];
      this.ondrawpixel(this.cacheBitmap, pos[0] - this.visibleArea.x0, pos[1] - this.visibleArea.y0, this.onrequestpathcolor());
    } else if (this.tool === 'select') {
      const imagePosition = this.posInTransformedImage(mousePos);
      const imagePixelX = imagePosition[0] | 0, imagePixelY = imagePosition[1] | 0;
      if (!this.inVisibleArea(imagePixelX, imagePixelY)) {
        return this.onselectitem(null);
      }
      const indicators = this.indicatorsAtPosition(imagePosition[0], imagePosition[1]);
      if (indicators.length > 1) {
        showMultiSelectDialog(indicators, i => this.onselectitem(indicators[i]));
      } else {
        this.onselectitem(indicators[0]);
      }
    } else {
      const pos = floorPos(this.posInTransformedImageClamped(mousePos));
      this.onothertool && this.onothertool(this.tool, pos[0], pos[1]);
    }
  }

  onMouseMove(e, mousePos) {
    this.lastMousePos = mousePos;
    if (!this.isDown) return;
    if (this.draggingPastedImage) {
      const transformed = this.posInTransformedImage(mousePos);
      const dist = subtract(transformed, this.draggingPastedImage);
      this.draggedPastedImagePos = add(this.draggedPastedImagePos, dist);
      this.pastedImage.x = Math.round(this.draggedPastedImagePos[0]);
      this.pastedImage.y = Math.round(this.draggedPastedImagePos[1]);
      setStatusText(`Pasting at (${this.pastedImage.x}, ${this.pastedImage.y})`);
      this.draggingPastedImage = transformed;
      this.notifyBitmapImageChanged();
    } else if (this.moveLastPos) {
      const dist = subtract(mousePos, this.moveLastPos);
      // Require sensible movement else we consider it as a click
      if (!this.hasMoved && vec2.length(dist) < MIN_DISTANCE_FOR_MOVE) return;
      // Move view
      translate(this.transform, this.distanceInTransformedImage(dist));
      if (this.panMode === 'scroll') this.ensureTransformInVisibleArea();
      this.moveLastPos = mousePos;
      this.hasMoved = true;
    } else if (this.tool === 'move') {
      if (this.moveModeInitialPos) {
        const imagePosition = this.posInTransformedImage(mousePos);
        const dist = this.distanceOnScreen(subtract(imagePosition, this.moveModeLastPos));
        if (!this.hasMoved && vec2.length(dist) < MIN_DISTANCE_FOR_MOVE) return;
        this.getHighlighted().forEach(i => {
          i.x += imagePosition[0] - this.moveModeLastPos[0];
          i.y += imagePosition[1] - this.moveModeLastPos[1];
        });
        this.moveModeLastPos = imagePosition;
        this.hasMoved = true;
      } else {
        this.rectEnd = this.posInTransformedImage(mousePos);
      }
    } else if (this.isRectTool()) {
      this.rectEnd = floorPos(this.posInTransformedImageClamped(mousePos)).map(e => e + 1);
      if (this.tool === 'rect') {
        const sel = this.getSelectionRectangle();
        sel && setStatusText(`Rect size: ${sel.width}x${sel.height} (pos: ${sel.x0 - this.visibleArea.x0}, ${sel.y0 - this.visibleArea.y0})`);
      }
    } else if (this.tool === 'eyedropper') {
      const pos = this.posInTransformedImage(mousePos).map(p => Math.floor(p));
      this.oneyedropper && this.oneyedropper(pos[0], pos[1]);
    } else if (this.writePathBuffer) {
      // Pen mode
      const pos = this.posInTransformedImage(mousePos).map(p => Math.floor(p));
      if (!this.inVisibleArea(pos[0], pos[1])) return;
      this.concatenateMoveToWriteBuffer(pos);
    }
  }

  onMouseOut(e) {
    if (this.writePathBuffer) this.onpenwrite && this.onpenwrite(this.writePathBuffer);
    if (this.tool === 'move' && this.rectStart) {
      const indicators = this.indicatorsInRect(this.getSelectionRectangle());
      indicators.forEach(i => i.highlighted = true);
      this.onmoveselect(this.getHighlightedIndices());
      this.clearSelection();
    } else if (this.tool === 'cloner' && this.rectStart) {
      this.oncloner && this.oncloner(this.getSelectionRectangle());
      this.clearSelection();
      // Cloner always revert to brush tool
      this.onswitchtosecondarytool && this.onswitchtosecondarytool(false);
    }
    this.moveLastPos = this.isDown = this.writePathBuffer = null;
    this.hasMoved = false;
    if (this.switchedToSecondaryTool) this.onswitchtosecondarytool(false);
  }

  onMouseUp(e) {
    if (!this.isDown) return;
    if (this.tool === 'move' && this.hasMoved && this.moveModeLastPos) {
      const move = subtract(this.moveModeLastPos, this.moveModeInitialPos);
      this.onmovetool(this.getHighlightedIndices(), move[0] * this.pixelW, move[1] * this.pixelH);
    }
    this.onMouseOut(e);
  }

  onMouseWheel(e, mousePos) {
    if (this.panMode === 'scroll') {
      translate(this.transform, this.distanceInTransformedImage([0, -e.deltaY / 2]));
      this.ensureTransformInVisibleArea();
    }
    else if (this.panMode === 'zoom') {
      this.zoomAt(mousePos, e.deltaY > 0 ? 0.8 : 1.25);
    }
    e.preventDefault();
  }

  onResize() {
    this.resizeCanvas();
    if (this.bitmapImage) {
      if (this.panMode === 'scroll') this.focusArea(this.visibleArea.x0, 0, this.visibleArea.x1, 0, true);
      this.ensureTransformInVisibleArea();
    }
  }

  renderCachedBitmap(context) {
    if (!this.cacheBitmapDirty) return;
    this.cacheBitmapDirty = false;

    // We resize the bitmap to save memory and draw it at the position visibleArea.x/y0 because there's nothing outside of those boundaries
    this.cacheBitmap.setSize(context, this.visibleArea.width * this.pixelW, this.visibleArea.height * this.pixelH);
    if (this.ondrawimage) {
      this.renderImageList = this.ondrawimage(this.cacheBitmap, this.visibleArea);
      return;
    }

    this.renderImageList = [{bitmap: this.cacheBitmap, opacity: 1}];

    for (let y = this.visibleArea.y0; y < this.visibleArea.y1; y++) {
      for (let x = this.visibleArea.x0; x < this.visibleArea.x1; x++) {
        let pixel;
        if (this.pastedImage && this.inPastedImage(x, y)) {
          pixel = this.pastedImage.pixels[x - this.pastedImage.x + this.pastedImage.width * (y - this.pastedImage.y)];
        } else {
          pixel = this.bitmapImage.getPixel(x, y);
        }
        if (pixel < 0) continue;
        this.ondrawpixel(this.cacheBitmap, x - this.visibleArea.x0, y - this.visibleArea.y0, pixel);
      }
    }
  }

  zoomAt(mousePos, factor) {
    const imagePosition = this.posInTransformedImage(mousePos);
    translate(this.transform, imagePosition);
    mat3.scale(this.transform, this.transform, [factor, factor]);
    translate(this.transform, neg(imagePosition));
  }
}
