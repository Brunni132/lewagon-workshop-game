import {vdp, color} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock, TextLayer} from './utils';

export function *main() {
	let loop = 0;

	while (true) {
		vdp.configBackdropColor(color.makeFromFloat(loop, 0, 0));
		loop += 0.01; // 0.01 each 1/60th of a second = 1 (full red) after ~1.6 sec
		yield;
	}
}