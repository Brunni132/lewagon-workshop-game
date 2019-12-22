import {vdp, color} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock, TextLayer} from './utils';

export function *main() {
	vdp.configBackdropColor('#59f');

	while (true) {
		yield;
	}
}