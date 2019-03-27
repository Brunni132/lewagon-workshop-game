import {startGame, vdp} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock} from './utils';

const tileSize = 16;

function collidesAt(x, y) {
	const blockX = Math.floor(x / tileSize);
	const blockY = Math.floor(y / tileSize);
	// A wall block?
	return getMapBlock('level1', blockX, blockY) === 38;
}

function *main() {
	const input = vdp.input;

	const mario = {
		left: 0,
		top: 0,
		width: vdp.sprite('mario').tile(6).w,
		height: vdp.sprite('mario').tile(6).h,
		get right() { return this.left + this.width; },
		get bottom() { return this.top + this.height; },
		horizontalVelocity: 0,
		verticalVelocity: 0
	};
	const acceleration = 0.5;

	vdp.configBackdropColor('#084');

	while (true) {
		vdp.drawBackgroundTilemap('level1');
		// We need to use the tile no 6 for the standing Mario
		vdp.drawObject(vdp.sprite('mario').tile(6), mario.left, mario.top);

		if (input.isDown(input.Key.Left)) mario.horizontalVelocity -= acceleration;
		else if (input.isDown(input.Key.Right)) mario.horizontalVelocity += acceleration;
		else mario.horizontalVelocity *= 0.9;

		if (input.isDown(input.Key.Up)) mario.verticalVelocity -= acceleration;
		else if (input.isDown(input.Key.Down)) mario.verticalVelocity += acceleration;
		else mario.verticalVelocity *= 0.9;

		mario.horizontalVelocity = clamp(mario.horizontalVelocity, -4, +4);
		mario.verticalVelocity = clamp(mario.verticalVelocity, -4, +4);

		mario.left += mario.horizontalVelocity;
		while (collidesAt(mario.right, mario.top) || collidesAt(mario.right, mario.bottom)) {
			mario.left -= 1;
			mario.horizontalVelocity = 0;
		}
		while (collidesAt(mario.left, mario.top) || collidesAt(mario.left, mario.bottom)) {
			mario.left += 1;
			mario.horizontalVelocity = 0;
		}

		mario.top += mario.verticalVelocity;
		while (collidesAt(mario.left, mario.bottom) || collidesAt(mario.right, mario.bottom)) {
			mario.top -= 1;
			mario.verticalVelocity = 0;
		}
		while (collidesAt(mario.left, mario.top) || collidesAt(mario.right, mario.top)) {
			mario.top += 1;
			mario.verticalVelocity = 0;
		}

		yield;
	}
}

startGame('#glCanvas', vdp => main(vdp));
