import {startGame, vdp} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock} from './utils';

function collidesAtPosition(left, top) {
	return getMapBlock('level1', Math.floor(left / 16), Math.floor(top / 16))
		=== 38;
}

function *main() {
	const mario = {
		left: 0,
		top: 0,
		width: 16,
		height: 16,
		get right() { return this.left + this.width; },
		get bottom() { return this.top + this.height; },
		horizontalVelocity: 0,
		verticalVelocity: 0,
	};

	const input = vdp.input;
	vdp.configBackdropColor('#59f');

	while (true) {
		vdp.drawBackgroundTilemap('level1');
		vdp.drawObject(vdp.sprite('mario').tile(6), mario.left, mario.top);

		mario.left += mario.horizontalVelocity;
		mario.top += mario.verticalVelocity;

		mario.verticalVelocity += 0.1;
		while (collidesAtPosition(mario.left, mario.bottom)) {
			mario.verticalVelocity = 0;
			mario.top -= 1;
		}

		// if (input.isDown(input.Key.Up)) {
		// 	mario.top -= 1;
		// }
		// if (input.isDown(input.Key.Down)) {
		// 	mario.top += 1;
		// }
		if (input.isDown(input.Key.Left)) {
			mario.left -= 1;
		}
		if (input.isDown(input.Key.Right)) {
			mario.left += 1;
		}


		yield;
	}
}

startGame('#glCanvas', vdp => main(vdp));
