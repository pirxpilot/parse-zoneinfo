var should = require('should');
var parse = require('../');

parse.PREFIX = __dirname;

describe('parse', function () {

  it('should parse America/Boise', function (done) {
    var reference = require('./tzdata.json');

    parse('America/Boise', function(err, tzinfo) {
      should.exist(tzinfo);
      tzinfo.should.eql(reference);
      done(err);
    });
  });

});
