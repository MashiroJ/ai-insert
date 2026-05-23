import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { VueLoaderPlugin } from 'rspack-vue-loader';
import { uiInspect } from '@ui-inspect/rspack-plugin';

export default defineConfig({
  entry: './src/main.ts',
  experiments: {
    css: true,
  },
  output: {
    filename: '[name].[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.vue', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.[jt]s$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.vue$/,
        loader: 'rspack-vue-loader',
        options: {
          experimentalInlineMatchResource: true,
        },
      },
      {
        test: /\.css$/,
        type: 'css',
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new rspack.HtmlRspackPlugin({
      template: './index.html',
      title: 'AI Inspect Rspack Vue Example',
    }),
    uiInspect(),
  ],
  devServer: {
    port: 3201,
    hot: true,
  },
});
