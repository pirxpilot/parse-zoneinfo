const test = require('node:test');
const parse = require('../lib/parse-zoneinfo');

parse.PREFIX = __dirname;

test('should parse America/Boise', async t => {
  const reference = require('./tzdata.json');

  const tzinfo = await parse('America/Boise');
  t.assert.deepEqual(tzinfo, reference);
});
