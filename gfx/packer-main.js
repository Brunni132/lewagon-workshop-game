const { addColors, blank, config, image,map,multiPalette,palette,sprite,tileset, readTmx,tiledMap, global } = require('../tools/gfxConverter/dsl.js');

const SCREEN_WIDTH = 256, SCREEN_HEIGHT = 256;

// Set debug: true (recommended) to generate a sample.png file that shows the layout of the video memory
config({ compact: true, debug: false }, () => {
	palette('mario', () => {
		tileset('mario', image('mario.png'), 16, 16);
	});
});
