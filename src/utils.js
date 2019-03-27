import {startGame, vdp} from "../lib/vdp-lib";


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
