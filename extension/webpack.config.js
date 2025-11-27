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
    devtoolModuleFilenameTemplate: '../[resource-path]'
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

// cf. https://github.com/TypeFox/monaco-languageclient/blob/067681adb1c283bfc9a85db989e79bd06599f3a7/docs/guides/troubleshooting.md#webpack-worker-issues
/**@type {import('webpack').Configuration}*/
const monacoWorkerConfig = {
  entry: {
    editor: './node_modules/@codingame/monaco-vscode-editor-api/esm/vs/editor/editor.worker.js'
    // textmate: './node_modules/@codingame/monaco-vscode-textmate-service-override/worker.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './assets/monaco-workers')
  },
  mode: 'production',
  performance: {
    hints: false
  }
};

module.exports = [config, monacoWorkerConfig];
