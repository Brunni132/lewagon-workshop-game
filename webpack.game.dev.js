const path = require('path');
const WatchFilesPlugin = require('webpack-watch-files-plugin').default;

module.exports = {
	entry: {
		app: ['./main.js']
	},
	devtool: 'inline-source-map',
	devServer: {
		port: 3000,
		open: true,
	},
	plugins: [
		new WatchFilesPlugin({ // TODO doesn't trigger HRM, debug…
			files: [
				'./dist/game.json'
			]
		})
	],
	resolve: {
		extensions: [ '.js' ]
	},
	output: {
		path: path.resolve(__dirname, 'dist'),
		publicPath: '/dist/',
		filename: 'game.bundle.js'
	},
	mode: 'development',
	watch: true
};
