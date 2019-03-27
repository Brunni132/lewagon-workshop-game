import { vdp } from './game-main';

function readMapBlock(name, x, y) {
	const mapData = vdp.readMap(vdp.map(name).offset(x, y, 1, 1));
	return mapData.array[0];
}

function writeMapBlock(name, x, y, newValue) {
	const mapAddress = vdp.map(name).offset(x, y, 1, 1);
	const mapData = vdp.readMap(mapAddress);
	mapData.array[0] = newValue;
	vdp.writeMap(mapAddress, mapData);
}
