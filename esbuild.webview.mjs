import { build, context } from 'esbuild';
import { copyFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');

const jsOptions = {
  entryPoints: ['src/webview/index.tsx'],
  bundle: true,
  outfile: 'out/webview.js',
  format: 'iife',
  minify: !isWatch,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  target: 'es2020',
};

const cssOptions = {
  entryPoints: ['src/webview/styles.css'],
  bundle: true,
  outfile: 'out/webview.css',
  minify: !isWatch,
};

if (isWatch) {
  const [jsCtx, cssCtx] = await Promise.all([
    context(jsOptions),
    context(cssOptions),
  ]);
  await Promise.all([jsCtx.watch(), cssCtx.watch()]);
  console.log('Watching webview...');
} else {
  await Promise.all([build(jsOptions), build(cssOptions)]);
}

copyFileSync('src/webview/index.html', 'out/webview.html');
