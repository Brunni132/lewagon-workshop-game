const { addColors, blank, config, image,map,multiPalette,palette,sprite,tileset, readTmx,tiledMap, global } = require('../tools/gfxConverter/dsl.js');

const SCREEN_WIDTH = 256, SCREEN_HEIGHT = 256;

// Set debug: true (recommended) to generate a sample.png file that shows the layout of the video memory
config({ compact: true, debug: false }, () => {
	palette('mario', () => {
		tileset('mario', image('mario.png'), 16, 16);
	});

	palette('level1', () => {
		tiledMap('level1', 'mario-1-1', { tileWidth: 16, tileHeight: 16, tilesetWidth: 16, tilesetHeight: 16 });
	});

	palette('bg1', () => {
		tiledMap('bg1', 'bg-1-1', { tileWidth: 8, tileHeight: 8, tilesetWidth: 16, tilesetHeight: 16 });
	});

	palette('text', () => {
		tileset('text', 'defaultFont.png', 8, 8, () => {
			map('text', blank(Math.ceil(SCREEN_WIDTH / 8), Math.ceil(SCREEN_HEIGHT / 8)));
		});
	});
});
