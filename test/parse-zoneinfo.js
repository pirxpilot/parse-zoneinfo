var assert = require('assert');
var parse = require('../');

parse.PREFIX = __dirname;

describe('parse', function () {

  it('should parse America/Boise', function (done) {
    var reference = require('./tzdata.json');

    parse('America/Boise', function(err, tzinfo) {
      assert(tzinfo);
      assert.deepEqual(tzinfo, reference);
      done(err);
    });
  });

});
