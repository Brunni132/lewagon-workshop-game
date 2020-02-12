export class CanvasImageData {
  constructor(canvasContext, width, height) {
    this.offscreenCanvas = document.createElement('canvas');
    this.setSize(canvasContext, width, height);
  }

  // ------------------------------ CONFIGURING ---------------------------------

  // Clears the screen and reconfigures the canvas size (trivial if no change in size)
  setSize(canvasContext, width, height) {
    if (width === this.width && height === this.height) return this.clear();

    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.offscreenCanvasContext = this.offscreenCanvas.getContext('2d');
		this.width = width;
		this.height = height;

    if (!width || !height) {
    	this.imgData = this.color = this.color8 = this.color32 = null;
		} else {
    	this.imgData = canvasContext.createImageData(width, height);
			const byteLength =  this.imgData.data.length;
			this.color = new ArrayBuffer(byteLength);
			this.color8 = new Uint8ClampedArray(this.color);
			this.color32 = new Uint32Array(this.color);
		}
  }

  // Using
  clear() {
  	if (this.color32) this.color32.fill(0);
  }

  isDrawable() {
  	return this.width > 0 && this.height > 0;
	}

  getCanvasForDrawing() {
  	if (this.color8) {
			this.imgData.data.set(this.color8);
			this.offscreenCanvasContext.putImageData(this.imgData, 0, 0);
		}
    return this.offscreenCanvas;
  }

  setPixel(x, y, color) {
    this.color32[this.width * y + x] = color;
  }
}

