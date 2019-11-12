import {startGame, vdp, color} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock, TextLayer} from './utils';

function collidesAtPosition(left, top) {
	return getMapBlock('level1', Math.floor(left / 16), Math.floor(top / 16))
		=== 38;
}

function *main() {
	const textLayer = new TextLayer();
	const input = vdp.input;
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

	vdp.configBackdropColor('#59f');

	while (true) {
		vdp.drawBackgroundTilemap('level1');
		vdp.drawObject(vdp.sprite('mario').tile(6), mario.left, mario.top);

		mario.verticalVelocity += 0.1;
		mario.left += mario.horizontalVelocity;
		mario.top += mario.verticalVelocity;

		while (collidesAtPosition(mario.left, mario.bottom)) {
			mario.verticalVelocity = 0;
			mario.top -= 1;
		}

		if (input.hasToggledDown(input.Key.Up)) {
			mario.verticalVelocity = -3.5;
		}

		if (input.isDown(input.Key.Left)) {
			mario.horizontalVelocity = -1;
		} else if (input.isDown(input.Key.Right)) {
			mario.horizontalVelocity = +1;
		} else {
			mario.horizontalVelocity = 0;
		}

		textLayer.drawText(0, 29, `x: ${mario.left.toFixed(2)}, y: ${mario.top.toFixed(2)}, vy: ${mario.verticalVelocity.toFixed(2)} `);
		textLayer.draw();
		yield;
	}
}

startGame('#glCanvas', vdp => main(vdp));
