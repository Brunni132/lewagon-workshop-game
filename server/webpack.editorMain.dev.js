const path = require('path');

module.exports = {
	entry: {
		app: ['./server/client-javascripts/editor-main.js']
	},
	devtool: 'inline-source-map',
  plugins: [],
	output: {
		path: path.resolve(__dirname, 'server/public/client-javascripts'),
		filename: 'editor-main-client.bundle.js'
	},
	mode: 'development',
};
