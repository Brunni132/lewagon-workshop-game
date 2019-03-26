const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Texture = require("./texture");
const { Tileset, Map } = require("./maps");
const xml2js = require('xml2js');
const utils = require('./utils');

//function findMainLayer(layer) {
//	if (Array.isArray(layer)) {
//		const result = layer.find(l => l['$'].name === 'MainTileLayer');
//		assert(result, `No layer named MainTileLayer in ${JSON.stringify(layer)}`);
//		return result;
//	}
//	return layer;
//}

/**
 *
 * @param fileNameBase {string}
 * @param name {string} name of the tileset/map
 * @param palette {Palette} destination palette (can have multiple rows)
 * @returns {Map}
 */
//function readTmx(fileNameBase, name, palette) {
//	const tmxFileName = `${fileNameBase}.tmx`;
//	let resultMap = null;
//
//	new xml2js.Parser().parseString(fs.readFileSync(tmxFileName), (err, result) => {
//		const json = result.map;
//		//console.dir(json.tileset[0]);
//		const mapWidth = parseInt(json['$'].width);
//		const mapHeight = parseInt(json['$'].height);
//		//const tilesetName = json.tileset[0]['$'].name;
//		const tileWidth = parseInt(json.tileset[0]['$'].tilewidth);
//		const tileHeight = parseInt(json.tileset[0]['$'].tileheight);
//		const jsonImage = json.tileset[0].image[0]['$'];
//		const layer = findMainLayer(json.layer);
//		const imagePath = path.join(path.dirname(fileNameBase), jsonImage.source);
//		const tileset = Tileset.fromImage(name, Texture.fromPng32(imagePath), tileWidth, tileHeight, palette);
//		resultMap = Map.blank(name, mapWidth, mapHeight, tileset);
//
//		assert(layer.data[0]['$'].encoding === 'csv', `Only CSV encoding is supported (map ${name})`);
//		const layerData = layer.data[0]['_'].split(',');
//		let i = 0;
//		for (let y = 0; y < mapHeight; y++) {
//			for (let x = 0; x < mapWidth; x++) {
//				const tileNo = layerData[i++] - 1;
//				const paletteFlags = tileset.tiles[tileNo].paletteIndex << 13;
//				resultMap.setTile(x, y, tileNo | paletteFlags);
//			}
//		}
//	});
//	return resultMap;
//}

function readTmx(tmxFileName) {
	new xml2js.Parser().parseString(fs.readFileSync(tmxFileName), (err, result) => {
		const json = result.map;
		this.json = result;

		this.getTileset = (name) => {
			for (let i = 0; i < json.tileset.length; i++) {
				if (json.tileset[i]['$'].name === name) {
					return json.tileset[i];
				}
			}
			throw new Error(`Tileset layer ${name} not found in ${json}`);
		};

		this.getLayer = (name) => {
			for (let i = 0; i < json.layer.length; i++) {
				if (json.layer[i]['$'].name === name) {
					return json.layer[i];
				}
			}
			throw new Error(`Map layer ${name} not found in ${json}`);
		};

		this.readMap = (layerName, tileset, opts = {}) => {
			const mapWidth = parseInt(json['$'].width);
			const mapHeight = parseInt(json['$'].height);
			const layer = this.getLayer(layerName);
			const tilesetLayer = this.getTileset(tileset.name);
			const tilesetFirstTile = typeof opts.firstTile === 'number' ? opts.firstTile : parseInt(tilesetLayer['$'].firstgid);
			const resultMap = Map.blank(layerName, mapWidth, mapHeight, tileset);

			assert(layer.data[0]['$'].encoding === 'csv', `Only CSV encoding is supported (map ${layerName})`);
			const layerData = layer.data[0]['_'].split(',');
			let i = 0, warned = false;
			for (let y = 0; y < mapHeight; y++) {
				for (let x = 0; x < mapWidth; x++) {
					const tileNo = Math.max(0, layerData[i++] - tilesetFirstTile);
					if (tileNo >= 4096 && !warned) {
						console.log(`More than 4096 tiles in map ${layerName}`.formatAs(utils.FG_RED));
						warned = true;
					}
					const paletteFlags = tileset.tiles[tileNo].paletteIndex << 13;
					resultMap.setTile(x, y, tileNo | paletteFlags);
				}
			}
			return resultMap;
		};

		this.readTileset = (tilesetNameInTmx, palette, opts = {}) => {
			const tilesetLayer = this.getTileset(tilesetNameInTmx);
			const jsonImage = tilesetLayer.image[0]['$'];
			const imagePath = path.join(path.dirname(tmxFileName), jsonImage.source);
			const tileWidth = parseInt(tilesetLayer['$'].tilewidth);
			const tileHeight = parseInt(tilesetLayer['$'].tileheight);
			const tilesetName = tilesetLayer['$'].name;
			return Tileset.fromImage(tilesetName, Texture.fromPng32(imagePath), tileWidth, tileHeight, palette, {tilesetWidth: opts.tilesetWidth});
		};

		this.updateTileset = (tilesetNameInTmx, tileset, opts = {}) => {
			const tilesetLayer = this.getTileset(tilesetNameInTmx);
			const tilesetFirstTile = typeof opts.firstTile === 'number' ? opts.firstTile : parseInt(tilesetLayer['$'].firstgid);
			const tilesetFileName = `${tilesetNameInTmx}-til.png`;
			const palette = tileset.palette;
			// Make an image for the tileset
			const destImageIndexed = Texture.blank(tilesetFileName, tileset.usedWidth, tileset.usedHeight, 8);
			tileset.copyToTexture(destImageIndexed, 0, 0);

			// Make a true color version and write it
			const destImageTrueColor = Texture.blank(tilesetFileName, destImageIndexed.width, destImageIndexed.height, 32);
			destImageIndexed.forEachPixel((color, x, y) => {
				destImageTrueColor.setPixel(x, y, palette.colorRows[0][color]);
			});
			destImageTrueColor.writeToPng(path.join(path.dirname(tmxFileName), tilesetFileName));

			if (opts.alsoUpdateInTmx) {
				Object.assign(tilesetLayer['$'], {
					"firstgid": tilesetFirstTile,
					"name": tileset.name,
					"tilewidth": tileset.tileWidth,
					"tileheight": tileset.tileHeight
				});
			}
		};

		this.updateMap = (layerName, map, opts = {}) => {
			const tilesetLayer = this.getTileset(map.tileset.name);
			const tilesetFirstTile = typeof opts.firstTile === 'number' ? opts.firstTile : parseInt(tilesetLayer['$'].firstgid);
			let csvEncodedMap = '';
			map.mapData.forEachPixel((cell, x, y) => {
				csvEncodedMap += `${cell + tilesetFirstTile},`;
			});
			csvEncodedMap = csvEncodedMap.substring(0, csvEncodedMap.length - 1);

			const mapLayer = this.getLayer(layerName);
			Object.assign(mapLayer, {
				"$": {"name": map.name, "width": map.width, "height": map.height},
				"data": [{"_": csvEncodedMap, "$": {"encoding": "csv"}}]
			});
		};

		this.writeTmx = (fileName) => {
			fileName = fileName || tmxFileName;
			const xml = new xml2js.Builder().buildObject(result);
			fs.writeFileSync(fileName, xml);
		};
	});
}


/**
 * @param fileNameBase {string}
 * @param map {Map}
 */
function writeTmx(fileNameBase, map) {
	/** @type {Tileset} */
	const tileset = map.tileset;
	assert(map.tileset.palette.numRows === 1, 'Only single-palette maps supported for now');
	/** @type {Palette} */
	const palette = map.tileset.palette;
	const tilesetFileName = `${fileNameBase}-til.png`;
	const tmxFileName = `${fileNameBase}.tmx`;

	// Make an image for the tileset
	const destImageIndexed = Texture.blank(tilesetFileName, tileset.usedWidth, tileset.usedHeight, 8);
	tileset.copyToTexture(destImageIndexed, 0, 0);

	// Make a true color version and write it
	const destImageTrueColor = Texture.blank(tilesetFileName, destImageIndexed.width, destImageIndexed.height, 32);
	destImageIndexed.forEachPixel((color, x, y) => {
		destImageTrueColor.setPixel(x, y, palette.colorRows[0][color]);
	});
	destImageTrueColor.writeToPng(tilesetFileName);

	let csvEncodedMap = '';
	map.mapData.forEachPixel((cell, x, y) => {
		csvEncodedMap += `${cell+1},`;
	});
	csvEncodedMap = csvEncodedMap.substring(0, csvEncodedMap.length - 1);

	const baseMap = {
		"map": {
			"$": {
				"version": "1.0",
				"orientation": "orthogonal",
				"width": map.width,
				"height": map.height,
				"tilewidth": tileset.tileWidth,
				"tileheight": tileset.tileHeight
			},
			"tileset": [{
				"$": {
					"firstgid": "1",
					"name": tileset.name,
					"tilewidth": tileset.tileWidth,
					"tileheight": tileset.tileHeight
				},
				"image": [{
					"$": {
						"source": path.basename(tilesetFileName),
						"width": destImageTrueColor.width,
						"height": destImageTrueColor.height
					}
				}]
			}],
			"layer": [{
				"$": {"name": map.name, "width": map.width, "height": map.height},
				"data": [{"_": csvEncodedMap, "$": {"encoding": "csv"}}]
			}]
		}
	};
	const xml = new xml2js.Builder().buildObject(baseMap);
	fs.writeFileSync(tmxFileName, xml);
}


module.exports = {
	readTmx,
	writeTmx
};
