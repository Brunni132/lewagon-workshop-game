const path = require('path');
//const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './server/client-javascripts/editor-main.js',
  devtool: false,
  resolve: {
    extensions: [ '.js' ]
  },
  output: {
		path: path.resolve(__dirname, 'public/client-javascripts'),
		filename: 'editor-main-client.bundle.js'
  },
  mode: 'production',
};
