import {vdp, color} from "../lib/vdp-lib";
import {clamp, getMapBlock, setMapBlock, TextLayer} from './utils';

export function *main() {
	const textLayer = new TextLayer();
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

		mario.top += 1;

		textLayer.drawText(0, 29, `x: ${mario.left.toFixed(2)}, y: ${mario.top.toFixed(2)} `);
		textLayer.draw();
		yield;
	}
}