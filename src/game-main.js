import {startGame, vdp} from "../lib/vdp-lib";
import {getMapBlock, setMapBlock} from './utils';

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
	};
	const moveSpeed = 1;

	vdp.configBackdropColor('#084');

	while (true) {
		vdp.drawBackgroundTilemap('level1');
		// We need to use the tile no 6 for the standing Mario
		vdp.drawObject(vdp.sprite('mario').tile(6), mario.left, mario.top);

		const movement = {
			x: 0,
			y: 0
		};
		if (input.isDown(input.Key.Left)) movement.x -= moveSpeed;
		if (input.isDown(input.Key.Right)) movement.x += moveSpeed;
		if (input.isDown(input.Key.Up)) movement.y -= moveSpeed;
		if (input.isDown(input.Key.Down)) movement.y += moveSpeed;

		mario.left += movement.x;
		while (collidesAt(mario.right, mario.top) || collidesAt(mario.right, mario.bottom)) {
			mario.left -= 1;
		}
		while (collidesAt(mario.left, mario.top) || collidesAt(mario.left, mario.bottom)) {
			mario.left += 1;
		}

		mario.top += movement.y;
		while (collidesAt(mario.left, mario.bottom) || collidesAt(mario.right, mario.bottom)) {
			mario.top -= 1;
		}
		while (collidesAt(mario.left, mario.top) || collidesAt(mario.right, mario.top)) {
			mario.top += 1;
		}

		yield;
	}
}

startGame('#glCanvas', vdp => main(vdp));
