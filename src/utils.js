import {startGame, vdp} from "../lib/vdp-lib";

export class TextLayer {
	constructor() {
		this.mapDef = vdp.map('text').offset(0, 0, 32, 32);
		this.map = vdp.readMap(this.mapDef, vdp.CopySource.blank);
	}
	drawText(x, y, text) {
		for (let i = 0; i < text.length; i++) this.map.setElement(x + i, y, text.charCodeAt(i) - 32);
		vdp.writeMap(this.mapDef, this.map);
	}
	draw() {
		vdp.drawBackgroundTilemap(this.mapDef);
	}
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function getMapBlock(name, x, y) {
	const mapData = vdp.readMap(vdp.map(name).offset(x, y, 1, 1));
	return mapData.array[0];
}

export function setMapBlock(name, x, y, newValue) {
	const mapAddress = vdp.map(name).offset(x, y, 1, 1);
	const mapData = vdp.readMap(mapAddress);
	mapData.array[0] = newValue;
	vdp.writeMap(mapAddress, mapData);
}

