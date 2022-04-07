const express = require('express');
const path = require('path');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const ejs = require('ejs'); // for pkg to include it

const editorRouter = require('./server-javascripts/editor-route');
const gameDataRouter = require('./server-javascripts/game-data-route');

const app = express();
const port = 3000;
let openUrls = false;

const readConfigOptions = () => {
  process.argv.slice(2).forEach((v) => {
    if (/open/.test(v)) openUrls = true;
    else console.error(`Unrecognized argument ${v}`);
  });
};

const configureWebpackForGame = () => {
  const config = require('../webpack.game.dev.js');
  const webpackHotMiddleware = require('webpack-hot-middleware');

  // reload=true:Enable auto reloading when changing JS files or content
  // timeout=1000:Time from disconnecting from server to reconnecting
  config.entry.app.unshift('webpack-hot-middleware/client?reload=true&timeout=1000');
  config.plugins.push(new webpack.HotModuleReplacementPlugin());

  // Webpack + middlewares for hot reloading
  const compiler = webpack(config);
  app.use(webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath
  }));
  app.use(webpackHotMiddleware(compiler));

  // Game is served at the root for compatibility with the editorless version
  app.use(express.static('./'));
};

const configureWebpackForEditorMain = () => {
  const compiler = webpack(require('./webpack.editorMain.dev.js'));
  app.use(webpackDevMiddleware(compiler, {
    publicPath: '/editor/client-javascripts'
  }));
  app.use('/editor/client-javascripts', express.static('./public/client-javascripts'));
};

const configureEditor = () => {
  const bodyParser = require('body-parser');
  const cookieParser = require('cookie-parser');
  const createError = require('http-errors');
  const logger = require('morgan');
  const sassMiddleware = require('node-sass-middleware');

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');

  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  // Necessary to simply get text as a response (?)
  app.use(bodyParser.text({ type: 'text/plain' }));
  // Catch all the rest as binary
  app.use(bodyParser.raw({ verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      if (!req.rawBody) req.rawBody = buf;
      else req.rawBody = Buffer.concat(req.rawBody, buf);
    }
  }, type: '*/*', limit: '4mb' }));

  app.use(cookieParser());
  app.use(sassMiddleware({
    src: path.join(__dirname, 'stylesheets'),
    dest: path.join(__dirname, 'public/stylesheets'),
    prefix: '/editor/stylesheets',
    indentedSyntax: true, // true = .sass and false = .scss
    sourceMap: true,
  }));
  app.use('/editor', express.static(path.join(__dirname, 'public')));
  app.use('/editor', editorRouter);
  app.use('/game-data', gameDataRouter);

// catch 404 and forward to error handler
  app.use(function(req, res, next) {
    next(createError(404));
  });

  // error handler
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error-view.ejs');
  });
};

readConfigOptions();
configureWebpackForGame();
configureWebpackForEditorMain();
configureEditor();

app.listen(port, () => {
  if (openUrls) {
    require('open')('http://localhost:3000/editor');
  }
});
