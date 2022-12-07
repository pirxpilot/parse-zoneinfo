const assert = require('assert');
const parse = require('../');

parse.PREFIX = __dirname;

describe('parse', () => {

  it('should parse America/Boise', async function () {
    const reference = require('./tzdata.json');

    const tzinfo = await parse('America/Boise');
    assert.deepEqual(tzinfo, reference);
  });

});
