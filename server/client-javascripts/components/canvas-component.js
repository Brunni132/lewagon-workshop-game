import {mat3, vec2} from "gl-matrix";
import {Component} from "../component";

export const add = (vecA, vecB) => vec2.add(vec2.create(), vecA, vecB);
export const floorPos = array => array.map(a => Math.floor(a));
export const invert = mat => mat3.invert(mat3.create(), mat);
export const neg = vec => vec2.negate(vec2.create(), vec);
export const subtract = (vecA, vecB) => vec2.sub(vec2.create(), vecA, vecB);
export const transform = (vec, mat) => vec2.transformMat3(vec2.create(), vec, mat);
export const translate = (mat, vec) => mat3.translate(mat, mat, vec);

export const FUNCTIONS = {
	sawtooth: p => p,
	linear: p => p < 0.5 ? p * 2 : (1 - p) * 2,
	sin: p => Math.sin(p * Math.PI),
};
export const MIN_DISTANCE_FOR_MOVE = 10;

export class CanvasComponent extends Component {
	constructor(canvas, parentSelector) {
		super(parentSelector);
		this.canvas = canvas;
		this.context = canvas.getContext('2d');
		this.transform = mat3.create();
		this.lastTime = new Date().getTime();
		mat3.identity(this.transform);
		this.canvas.onwheel = e => this.onMouseWheel(e, this.mouseClientPos(e));
		this.canvas.ondblclick = e => this.onDoubleClick(e, this.mouseClientPos(e));
		this.canvas.onmousedown = e => this.onMouseDown(e, this.mouseClientPos(e));
		this.canvas.onmousemove = e => this.onMouseMove(e, this.mouseClientPos(e));
		this.canvas.onmouseup = e => this.onMouseUp(e, this.mouseClientPos(e));
		this.canvas.onmouseout = e => this.onMouseOut(e);
		this.canvas.oncontextmenu = event => event.preventDefault();
	}

	// Trigger a render from outside
	render() {
		const time = new Date().getTime();
		const dt = time - this.lastTime;
		this.lastTime = time;
		this.onRender(dt);
	}

	blink(startArray, endArray, periodMs, fn = FUNCTIONS.sin) {
		const remainder = this.lastTime % periodMs;
		const factor = fn(remainder / periodMs);
		return startArray.map((start, i) => (1 - factor) * start + endArray[i] * factor);
	}

	drawDashedRectangle(context, x0, y0, x1, y1, strokeColor = '#fff', backgroundColor = null) {
		context.lineWidth = 2;
		context.setLineDash([5, 3]);
		context.lineDashOffset = this.blink([0], [7.999], 1000, FUNCTIONS.sawtooth)[0];
		context.strokeStyle = 'rgba(0,0,0,0.5)';
		context.strokeRect(x0 + 1, y0 + 1, x1 - x0 - 1, y1 - y0 - 1);
		context.strokeStyle = strokeColor;
		context.strokeRect(x0, y0, x1 - x0 - 1, y1 - y0 - 1);
		if (backgroundColor) {
			context.fillStyle = backgroundColor;
			context.fillRect(x0, y0, x1 - x0 - 1, y1 - y0 - 1);
		}
		context.setLineDash([]);
	}

	distanceInTransformedImage(screenDistance) {
		const invTransform = invert(this.transform);
		return subtract(transform(screenDistance, invTransform), transform([0, 0], invTransform));
	}

  distanceOnScreen(imageDistance) {
    return subtract(transform(imageDistance, this.transform), transform([0, 0], this.transform));
  }

	mouseClientPos(event) {
		const rect = this.canvas.getBoundingClientRect();
		return vec2.fromValues(event.clientX - rect.left, event.clientY - rect.top);
	}

	// Returns in image coords (from screen coords)
	posInTransformedImage(pos) {
		return transform(pos, invert(this.transform));
	}

	// Returns in image coords (from image coords)
	posOnScreen(pos) {
		return transform(pos, this.transform);
	}

	// Returns whether the canvas is present on the screen
	resizeCanvas() {
		const { width, height } = this.canvas.parentNode.getBoundingClientRect();
		if (!width || !height) return false; // not yet present on the screen, try again later
		this.width = width | 0;
		this.height = height | 0;
		this.canvas.width = this.width * this.dpr;
		this.canvas.height = this.height * this.dpr;
		this.canvas.style.width = `${this.width}px`;
		this.canvas.style.height = `${this.height}px`;
		return true;
	}

	get dpr() { return window.devicePixelRatio || 1; }

	onMouseWheel(e, mousePos) {}
	onDoubleClick(e, mousePos) {}
	onMouseDown(e, mousePos) {}
	onMouseMove(e, mousePos) {}
	onMouseUp(e, mousePos) {}
	onMouseOut(e) {}
	onRender(dt) {}
}
