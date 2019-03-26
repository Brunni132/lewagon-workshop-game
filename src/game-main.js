import {startGame, VDP} from "../lib/vdp-lib";

/** @param {VDP} vdp */
function *main(vdp) {
	let loop = 0, angle = 0;

	vdp.configBackdropColor('#20f');

	while (true) {
		const mario = vdp.sprite('mario').tile(loop % 7);
		vdp.drawObject(mario, 0, 0);

		angle += 0.01;
		loop = loop + 1;
		yield;
	}
}

startGame('#glCanvas', vdp => main(vdp));
