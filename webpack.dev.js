const path = require('path');
const WatchFilesPlugin = require('webpack-watch-files-plugin').default;

module.exports = {
	entry: './src/game-main.js',
	devtool: 'inline-source-map',
	devServer: {
		open: true
	},
	plugins: [
		new WatchFilesPlugin({ // TODO doesn't trigger HRM, debug…
			files: [
				'./build/game.json'
			]
		})
	],
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
