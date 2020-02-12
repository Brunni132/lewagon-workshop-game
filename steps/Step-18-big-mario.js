import {vdp, input, color, vec2, mat3} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock, TextLayer} from './utils';

function collidesAtPosition(left, top) {
	const collidables = [38, 11, 12, 18, 19, 24, 25, 16, 13];
	return collidables.includes(getMapBlock('level1', Math.floor(left / 16), Math.floor(top / 16)));
}

export function *main() {
	const mario = {
		left: 0,
		top: 0,
		width: 16,
		height: 32,
		get right() { return this.left + this.width; },
		get bottom() { return this.top + this.height; },
		horizontalVelocity: 0,
		verticalVelocity: 0,
		facingLeft: false,
		animation: 0,
		get grounded() {
			return collidesAtPosition(mario.left, mario.bottom + 2) || collidesAtPosition(mario.right, mario.bottom + 2);
		},
		get sprite() {
			const sprite = vdp.sprite('mario');
			if (!this.grounded) {
				return sprite.tile(4); // jumping pose
			}
			if (this.horizontalVelocity === 0) {
				return sprite.tile(6); // standing pose
			}
			return sprite.tile(Math.floor(this.animation * 0.1) % 3); // 0-2: walking
		}
	};
	const camera = {
		left: 0,
		top: 0,
		centerAroundMario() {
			this.left = Math.max(this.left, mario.left - 100);
		},
	};
	let loop = 0;

	vdp.configBackdropColor('#59f');

	while (true) {
		camera.centerAroundMario();
		vdp.drawBackgroundTilemap('bg1', { scrollX: camera.left / 2, scrollY: camera.top });
		vdp.drawBackgroundTilemap('level1', { scrollX: camera.left, scrollY: camera.top, winH: 224 });
		vdp.drawObject(mario.sprite, mario.left - camera.left, mario.top - camera.top, {
			flipH: mario.facingLeft, width: mario.width, height: mario.height
		});

		const colorTable = new vdp.LineColorArray(0, 0);
		const skyBlue = color.make('#59f'), white = color.make('#fff');
		for (let i = 0; i < vdp.screenHeight; i++) {
			colorTable.setLine(i, color.blend(skyBlue, white, i / vdp.screenHeight));
		}
		vdp.configColorSwap([colorTable]);

		const shiningBlockColors = [
			color.make('#f93'),
			color.make('#f93'),
			color.make('#c50'),
			color.make('#810'),
			color.make('#810'),
			color.make('#c50')
		];
		const colorIndex = Math.floor(loop / 12) % shiningBlockColors.length;
		const pal = vdp.readPalette('level1');
		pal.array[7] = shiningBlockColors[colorIndex];
		vdp.writePalette('level1', pal);

		loop += 1;
		mario.animation += 1;
		mario.verticalVelocity += 0.1;

		mario.top += mario.verticalVelocity;
		while (collidesAtPosition(mario.left, mario.bottom) || collidesAtPosition(mario.right, mario.bottom)) {
			mario.verticalVelocity = 0;
			mario.top -= 1;
		}
		while (collidesAtPosition(mario.left, mario.top) || collidesAtPosition(mario.right, mario.top)) {
			mario.verticalVelocity = 0;
			mario.top += 1;
		}

		mario.left += mario.horizontalVelocity;
		while (collidesAtPosition(mario.left, mario.top) || collidesAtPosition(mario.left, mario.bottom)) {
			mario.horizontalVelocity = 0;
			mario.left += 1;
		}
		while (collidesAtPosition(mario.right, mario.top) || collidesAtPosition(mario.right, mario.bottom)) {
			mario.horizontalVelocity = 0;
			mario.left -= 1;
		}

		if (input.hasToggledDown(input.Key.Up) && mario.grounded) {
			mario.verticalVelocity = -3.8;
		}

		if (input.isDown(input.Key.Left)) {
			mario.horizontalVelocity = -1;
			mario.facingLeft = true;
		} else if (input.isDown(input.Key.Right)) {
			mario.horizontalVelocity = +1;
			mario.facingLeft = false;
		} else {
			mario.horizontalVelocity = 0;
		}

		// Mario cannot go left to the camera
		mario.left = Math.max(mario.left, camera.left);
		yield;
	}
}
