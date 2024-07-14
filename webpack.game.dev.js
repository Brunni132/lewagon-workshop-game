import { resolve as _resolve } from 'path';
import WatchFilesPlugin from 'webpack-watch-files-plugin';

export const entry = {
	app: ['./main.js']
};
export const devtool = 'inline-source-map';
export const devServer = {
	port: 3000,
	open: true,
};
export const plugins = [
	new WatchFilesPlugin({
		files: [
			'./dist/game.json'
		]
	})
];
export const resolve = {
	extensions: ['.js']
};
export const output = {
	path: _resolve(__dirname, 'dist'),
	publicPath: '/dist/',
	filename: 'game.bundle.js'
};
export const mode = 'development';
export const watch = true;
