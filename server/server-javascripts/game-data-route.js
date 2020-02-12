const express = require('express');
const router = express.Router();
const fs = require('fs');
const PNG = require('pngjs').PNG;

// Serve game code for read/write
router.get('/code/game-main.js', (req, res, next) => {
  fs.readFile('src/game-main.js', (err, text) => res.send(text));
});

router.post('/code/game-main.js', (req, res, next) => {
  fs.writeFile('src/game-main.js', req.body, (err, result) => {
    res.sendStatus(200);
  });
});

router.get('/editor-config.json', (req, res, next) => {
	fs.readFile('editor-config.json', (err, text) => res.send(text));
});

router.post('/editor-config.json', (req, res, next) => {
	fs.writeFile('editor-config.json', req.body, (err, result) => {
		res.sendStatus(200);
	});
});

router.get('/game.json', (req, res, next) => {
  fs.readFile('dist/game.json', (err, text) => res.send(text));
});

router.post('/game.json', (req, res, next) => {
  fs.writeFile('dist/game.json', req.body, (err, result) => {
    res.sendStatus(200);
  });
});

router.get('/palettes.png', (req, res, next) => {
  fs.createReadStream('dist/palettes.png')
    .pipe(new PNG())
    .on('parsed', function(png) {
      const width = this.width;
      const height = Math.min(32, this.height);
      res.set('X-Image-Details', JSON.stringify({width, height}));
      res.end(this.data.subarray(0, width * height * 4), 'binary');
    });
});

router.post('/palettes.png', (req, res, next) => {
  fs.writeFile('dist/palettes.png', req.rawBody, (err, result) => {
    res.sendStatus(200);
  });
});

router.get('/sprites.png', (req, res, next) => {
  fs.createReadStream('dist/sprites.png')
    .pipe(new PNG())
    .on('parsed', function(png) {
      const { width, height } = this;
      res.set('X-Image-Details', JSON.stringify({width, height}));
      res.end(this.data, 'binary');
    });
});

router.post('/sprites.png', (req, res, next) => {
  fs.writeFile('dist/sprites.png', req.rawBody, (err, result) => {
    res.sendStatus(200);
  });
});

router.get('/maps.png', (req, res, next) => {
  fs.createReadStream('dist/maps.png')
    .pipe(new PNG())
    .on('parsed', function(png) {
      const { width, height } = this;
      res.set('X-Image-Details', JSON.stringify({width, height}));
      res.end(this.data, 'binary');
    });
});

router.post('/maps.png', (req, res, next) => {
  fs.writeFile('dist/maps.png', req.rawBody, (err, result) => {
    res.sendStatus(200);
  });
});

module.exports = router;
