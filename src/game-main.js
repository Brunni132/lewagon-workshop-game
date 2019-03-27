import {startGame, vdp} from "../lib/vdp-lib";

function *main() {
	vdp.configBackdropColor('#084');

	while (true) {
		yield;
	}
}

startGame('#glCanvas', vdp => main());
