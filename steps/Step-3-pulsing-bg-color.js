import {vdp, input, color, vec2, mat3} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock, TextLayer} from './utils';

export function *main() {
	let loop = 0;

	while (true) {
		const red = Math.sin(loop);
		vdp.configBackdropColor(color.makeFromFloat(red, 0, 0));
		loop += 0.05;
		yield;
	}
}
