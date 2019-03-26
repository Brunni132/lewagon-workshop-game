const path = require('path');
//const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
	entry: './src/game-main.js',
	devtool: false,
	resolve: {
		extensions: [ '.js' ]
	},
	output: {
		path: path.resolve(__dirname, 'build'),
		publicPath: '/build/',
		filename: 'game.bundle.js'
	},
//plugins: [
//new CopyWebpackPlugin([
//{from: 'index.html', to: './'},
//])
//],
	mode: 'production',
	//optimization: {
	//	minimizer: [new TerserPlugin({
	//		sourceMap: false,
	//		terserOptions: {
	//			mangle: {
	//				properties: {
	//					regex: /^.+$/,
	//				},
	//			},
	//			compress: true,
	//			"mangle.properties": true
	//		},
	//	})],
	//},
};
