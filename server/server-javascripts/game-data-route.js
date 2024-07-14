import { Router } from 'express';
const router = Router();
import { readFile, writeFile, createReadStream } from 'fs';
import { PNG } from 'pngjs';
import { sync } from 'touch';

function forceHrmGameUpdate() {
  sync('src/game-main.js')
}

// Serve game code for read/write
router.get('/code/game-main.js', (req, res, next) => {
  readFile('src/game-main.js', (err, text) => res.send(text));
});

router.post('/code/game-main.js', (req, res, next) => {
  writeFile('src/game-main.js', req.body, (err, result) => {
    res.sendStatus(200);
  });
});

router.get('/editor-config.json', (req, res, next) => {
	readFile('editor-config.json', (err, text) => res.send(text));
});

router.post('/editor-config.json', (req, res, next) => {
	writeFile('editor-config.json', req.body, (err, result) => {
		res.sendStatus(200);
    forceHrmGameUpdate();
	});
});

router.get('/game.json', (req, res, next) => {
  readFile('dist/game.json', (err, text) => res.send(text));
});

router.post('/game.json', (req, res, next) => {
  writeFile('dist/game.json', req.body, (err, result) => {
    res.sendStatus(200);
    forceHrmGameUpdate();
  });
});

router.get('/palettes.png', (req, res, next) => {
  createReadStream('dist/palettes.png')
    .pipe(new PNG())
    .on('parsed', function(png) {
      const width = this.width;
      const height = Math.min(32, this.height);
      res.set('X-Image-Details', JSON.stringify({width, height}));
      res.end(this.data.subarray(0, width * height * 4), 'binary');
    });
});

router.post('/palettes.png', (req, res, next) => {
  writeFile('dist/palettes.png', req.rawBody, (err, result) => {
    res.sendStatus(200);
    forceHrmGameUpdate();
  });
});

router.get('/sprites.png', (req, res, next) => {
  createReadStream('dist/sprites.png')
    .pipe(new PNG())
    .on('parsed', function(png) {
      const { width, height } = this;
      res.set('X-Image-Details', JSON.stringify({width, height}));
      res.end(this.data, 'binary');
    });
});

router.post('/sprites.png', (req, res, next) => {
  writeFile('dist/sprites.png', req.rawBody, (err, result) => {
    res.sendStatus(200);
    forceHrmGameUpdate();
  });
});

router.get('/maps.png', (req, res, next) => {
  createReadStream('dist/maps.png')
    .pipe(new PNG())
    .on('parsed', function(png) {
      const { width, height } = this;
      res.set('X-Image-Details', JSON.stringify({width, height}));
      res.end(this.data, 'binary');
    });
});

router.post('/maps.png', (req, res, next) => {
  writeFile('dist/maps.png', req.rawBody, (err, result) => {
    res.sendStatus(200);
    forceHrmGameUpdate();
  });
});

export default router;
