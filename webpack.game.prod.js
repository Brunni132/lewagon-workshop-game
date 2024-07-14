import { resolve as _resolve } from 'path';
//const CopyWebpackPlugin = require('copy-webpack-plugin');
import TerserPlugin from 'terser-webpack-plugin';

export const entry = './main.js';
export const devtool = false;
export const resolve = {
  extensions: ['.js']
};
export const output = {
  path: _resolve(__dirname, 'dist'),
  filename: 'game.bundle.js'
};
export const mode = 'production';
