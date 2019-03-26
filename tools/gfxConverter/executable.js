const fs = require('fs');
const path = require('path');
const { _restart } = require('./dsl');
const { watch } = require('./watcher');
const utils = require('./utils');
const args = process.argv.slice(2);
let noWatch = false, noServer = false;

function packGfx() {
	_restart();
	try {
		let code = fs.readFileSync('packer-main.js', 'utf-8');
		//code = code.replace(/^import .*?;/gm, '').replace(/.*?require\(.*?;/gm, '');
		//code = `(function({conv,currentPalette,currentPaletteMultiple,currentTileset,paletteNamed,spriteNamed,tilesetNamed,mapNamed,addColors,blank,config,image,map,multiPalette,palette,sprite,tileset,tiledMap}){${code}})`;
		code = code.replace(/\.\.\/tools\/gfxConverter\//g, './');
		code = `(function(){${code}})`;
		eval(code)();
		console.log(`[${new Date().toLocaleTimeString()}] Done. You can reload the webpage.`.formatAs(utils.BRIGHT, utils.FG_GREEN));
	} catch (err) {
		console.error('Error evaluating your code!'.formatAs(utils.BRIGHT, utils.FG_RED), err);
		if (fs.existsSync('../build/game.json')) fs.unlinkSync('../build/game.json');
	}
}

const projectDir = process.cwd();
const gfxDir = 'gfx';
args.forEach((v) => {
	if (/help/.test(v)) {
		console.log(`Usage: packer [no-server] [no-watch]`);
		process.exit();
	}
	else if (/no-server/.test(v)) noServer = true;
	else if (/no-watch/.test(v)) noWatch = true;
	else console.error(`Unrecognized argument ${v}`.formatAs(utils.FG_RED));
});

process.chdir(gfxDir);
console.log('Packing graphics into build directory…');
packGfx();

if (!noServer) {
	const express = require('express');
	const app = express();
	const port = 8080;
	app.use(express.static(projectDir));
	app.listen(port, () => console.log(`Open your browser to: http://localhost:${port}/`));
	if (noWatch) {
		console.log('After you\'ve made changes to graphics, close and rerun this app'.formatAs(utils.BRIGHT, utils.FG_GREEN));
	}
}

if (!noWatch) {
	watch(path.join(projectDir, gfxDir), () => {
		console.log(`Triggered reload because of change in ${gfxDir} directory`);
		packGfx();
	});
	console.log(`Watching for changes on your ${gfxDir} directory; will automatically rebuild.`);
}
