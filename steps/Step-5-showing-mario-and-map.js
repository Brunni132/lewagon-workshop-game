import {vdp, color} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock, TextLayer} from './utils';

export function *main() {
	vdp.configBackdropColor('#59f');

	while (true) {
		vdp.drawBackgroundTilemap('level1');
		vdp.drawObject(vdp.sprite('mario').tile(6), 0, 0);
		yield;
	}
}