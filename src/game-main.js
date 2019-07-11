import {startGame, vdp, color} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock, TextLayer} from './utils';

function *main() {
	vdp.configBackdropColor('#59f');

	while (true) {
		yield;
	}
}

startGame('#glCanvas', vdp => main(vdp));
