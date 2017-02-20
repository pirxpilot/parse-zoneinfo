[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Dependency Status][gemnasium-image]][gemnasium-url]

# parse-zoneinfo

Async parser for binary tzdata zoneinfo files. Parsing function extracted from [zoneinfo].

## Install

```sh
$ npm install --save parse-zoneinfo
```

## Usage

```js
var parse = require('parse-zoneinfo');

parse('America/Boise', function(err, tzdata) {
  console.log(tzdata);
});
```

## License

MIT © [Damian Krzeminski](https://pirxpilot.me)

[zoneinfo]: https://www.npmjs.com/package/zoneinfo

[npm-image]: https://img.shields.io/npm/v/parse-zoneinfo.svg
[npm-url]: https://npmjs.org/package/parse-zoneinfo

[travis-url]: https://travis-ci.org/pirxpilot/parse-zoneinfo
[travis-image]: https://img.shields.io/travis/pirxpilot/parse-zoneinfo.svg

[gemnasium-image]: https://img.shields.io/gemnasium/pirxpilot/parse-zoneinfo.svg
[gemnasium-url]: https://gemnasium.com/pirxpilot/parse-zoneinfo
