#!/usr/bin/env node

/*!
 * Copyright 2020 Andrea Giammarchi, @WebReflection
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. 
 */

const {mkdir, readdir, readFile, stat, writeFile} = require('fs');
const {dirname, join, resolve} = require('path');

const {transform} = require('@babel/core');

const argv = process.argv.slice(2);
const paths = argv.filter(arg => !/^--no-(?:interop|default)$/.test(arg));
const noInterop = paths.length < argv.length;
const [source, dest] = paths;

if (source && dest) {

  const CommonJS = JSON.stringify({type: 'commonjs'});
  const created = new Set;
  const cwd = process.cwd();
  const options = {
    plugins: [
      '@babel/plugin-syntax-import-meta',
      ['@babel/plugin-transform-modules-commonjs', {noInterop}],
      ['dynamic-import-node', {noInterop}]
    ]
  };

  const check = (source, dest) => {
    stat(source, (err, stats) => {
      if (err)
        unable2(`retrieve ${source} stats`, err);
      if (stats.isDirectory())
        dir(source, dest);
      else if (stats.isFile())
        write(source, dest);
    });
  };

  const dir = (source, dest) => {
    readdir(source, (err, files) => {
      if (err)
        unable2(`read ${source} as directory`, err);
      files.forEach(file => {
        if (
          !/^(?:\.|node_modules)/.test(file) &&
          /\.(?:c|m)?js$/.test(file)
        )
          check(join(source, file), join(dest, file));
      });
    });
  };

  const fixMeta = (code, chunks = []) =>
    code
      .replace(
        /([`"'])(?:(?=(\\?))\2.)*?\1/g,
        chunk => `\x01ucjs${chunks.push(chunk) - 1}`
      )
      .replace(
        /\bimport\.meta\b/g,
        "({url: require('url').pathToFileURL(__filename).href})"
      )
      .replace(/\x01ucjs(\d+)/g, (_, i) => chunks[i])
    ;

  const unable2 = (path, err) => {
    console.error(`\x1b[1mWarning\x1b[0m: unable to ${path}`);
    console.error(err);
    process.exit(1);
  };

  const write = (source, dest) => {
    readFile(source, (err, data) => {
      if (err)
        unable2(`read ${source} content`, err);
      transform(data.toString(), options, (err, result) => {
        if (err)
          unable2(`parse ${source} code`, err);
        const save = err => {
          const js = dest.replace(/\.mjs$/, '.js');
          if (err)
            unable2(`mark ${js} as CommonJS`, err);
          writeFile(js, fixMeta(result.code), err => {
            if (err)
              unable2(`write on ${js} file`, err);
          });
        };
        const destDir = dirname(dest);
        if (created.has(destDir))
          save(null);
        else {
          created.add(destDir);
          mkdir(destDir, {recursive: true}, err => {
            if (err)
              unable2(`create ${destDir} folder`, err);
            const pkg = join(destDir, 'package.json');
            stat(pkg, err => {
              if (err)
                writeFile(pkg, CommonJS, save);
              else
                save(null);
            });
          });
        }
      });
    });
  };

  check(resolve(cwd, source), resolve(cwd, dest));
}
else {
  const {description, version} = require(join(__dirname, 'package.json'));
  console.log(`
\x1b[1m${description}\x1b[0m v${version}
\x1b[2musage:\x1b[0m
  ucjs source.js dest.js
  ucjs --no-interop source_dir dest_dir
\x1b[2moptions:\x1b[0m
  --no-interop  \x1b[2m# avoid import/export related bloat\x1b[0m
  --no-default  \x1b[2m# alias for --no-interop\x1b[0m
`);
}
