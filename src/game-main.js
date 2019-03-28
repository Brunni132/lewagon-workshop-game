import {startGame, vdp} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock} from './utils';

function *main() {
	vdp.configBackdropColor('#59f');

	while (true) {
		yield;
	}
}

startGame('#glCanvas', vdp => main(vdp));
