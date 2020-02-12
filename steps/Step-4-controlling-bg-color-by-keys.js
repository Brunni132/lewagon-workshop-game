import {vdp, input, color, vec2, mat3} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock, TextLayer} from './utils';

export function *main() {
	let red = 0.5;
	const textLayer = new TextLayer();

	while (true) {
		vdp.configBackdropColor(color.makeFromFloat(red, 0, 0));

		if (vdp.input.isDown(vdp.input.Key.Left)) {
			red -= 0.01;
		} else if (vdp.input.isDown(vdp.input.Key.Right)) {
			red += 0.01;
		}

		textLayer.drawText(0, 0, `Red: ${red.toFixed(2)} `);
		textLayer.draw();
		yield;
	}
}
