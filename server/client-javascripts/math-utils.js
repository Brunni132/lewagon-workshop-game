// Creates a rectangle driven by its x0,y0,x1,y1 coords, with auto width/height computation
export function makeRectangle(props = {}) {
	return {
		...props,
		get width() { return this.x1 - this.x0; },
		get height() { return this.y1 - this.y0; },
	};
}

export function makeRectangleWH(x, y, w, h) {
  return makeRectangle({x0: x, y0: y, x1: x + w, y1: y + h});
}

export function makeSelectionRectangle(x0, y0, x1, y1, minSize = 1) {
	if (x0 >= x1) [x0, x1] = [x1 - minSize, x0 + minSize];
	if (y0 >= y1) [y0, y1] = [y1 - minSize, y0 + minSize];
	return makeRectangle({ x0, y0, x1, y1 });
}

export function modulus(x, y) {
  x = x % y;
  if (x < 0) return x + y;
  return x;
}

export function range(x, y) {
  return Array(y - x).fill(0).map((v, i) => i + x);
}
