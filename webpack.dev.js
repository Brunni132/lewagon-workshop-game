const path = require('path');

module.exports = {
	entry: './src/game-main.js',
	devtool: 'inline-source-map',
	devServer: {
		open: true
	},
	resolve: {
		extensions: [ '.js' ]
	},
	output: {
		path: path.resolve(__dirname, 'build'),
		publicPath: '/build/',
		filename: 'game.bundle.js'
	},
	mode: 'development',
	watch: true
};
