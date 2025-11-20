'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',

  entry: path.resolve(__dirname, 'src/index.ts'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    library: {
      type: 'commonjs'
    },
    devtoolModuleFilenameTemplate: info => {
      const absPath = info.absoluteResourcePath;

      // For our TypeScript source files, return absolute path from workspace root
      if (absPath.includes('/extension/src/')) {
        const srcIndex = absPath.indexOf('/extension/src/');
        const workspaceRelativePath = 'extension/' + absPath.substring(srcIndex + '/extension/'.length);
        return workspaceRelativePath;
      } else if (absPath.includes('\\extension\\src\\')) {
        const srcIndex = absPath.indexOf('\\extension\\src\\');
        const workspaceRelativePath = 'extension/' + absPath.substring(srcIndex + '\\extension\\'.length).replace(/\\/g, '/');
        return workspaceRelativePath;
      }

      // For node_modules and other external files, use standard relative path
      const rel = path.relative(__dirname, absPath);
      return path.posix.join('..', rel.replace(/\\/g, '/'));
    }
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode',
    'utf-8-validate': 'utf-8-validate',
    bufferutil: 'bufferutil'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    symlinks: true
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                module: 'es6',
                sourceMap: true
              }
            }
          }
        ]
      }
    ]
  }
};

module.exports = config;
