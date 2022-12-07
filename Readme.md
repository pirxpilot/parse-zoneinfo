[![NPM version][npm-image]][npm-url]
[![Build Status][build-image]][build-url]
[![Dependency Status][deps-image]][deps-url]

# parse-zoneinfo

Async parser for binary tzdata zoneinfo files. Parsing function extracted from [zoneinfo].

## Install

```sh
$ npm install --save parse-zoneinfo
```

## Usage

```js
const parse = require('parse-zoneinfo');

const tzdata = await parse('America/Boise');
console.log(tzdata);
```

## License

MIT © [Damian Krzeminski](https://pirxpilot.me)

[zoneinfo]: https://www.npmjs.com/package/zoneinfo

[npm-image]: https://img.shields.io/npm/v/parse-zoneinfo
[npm-url]: https://npmjs.org/package/parse-zoneinfo

[build-url]: https://github.com/pirxpilot/parse-zoneinfo/actions/workflows/check.yaml
[build-image]: https://img.shields.io/github/workflow/status/pirxpilot/parse-zoneinfo/check

[deps-image]: https://img.shields.io/librariesio/release/npm/parse-zoneinfo
[deps-url]: https://libraries.io/npm/parse-zoneinfo
