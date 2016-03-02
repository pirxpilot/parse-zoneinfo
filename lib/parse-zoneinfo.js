var fs = require('fs');
var jspack = require('jspack').jspack;

module.exports = parse;
module.exports.PREFIX = '/usr/share/zoneinfo';



function parse(name, fn) {

  var filename = parse.PREFIX + '/' + name;

  fs.readFile(filename, function(err, buffer) {
    if (err) {
      return fn(err);
    }
    var tzinfo = parseBuffer(buffer);
    if (!tzinfo) {
      return fn('invalid file format');
    }
    fn(null, tzinfo);
  });
}


/*
  initial version of parseBuffer was copied from zoneinfo package license MIT
  https://github.com/gsmcwhirter/node-zoneinfo/blob/master/index.js
*/
function parseBuffer(buffer) {

  var buffer_idx = 0;

  // From tzfile(5):
  //
  // The time zone information files used by tzset(3)
  // begin with the magic characters "TZif" to identify
  // them as time zone information files, followed by
  // sixteen bytes reserved for future use, followed by
  // six four-byte values of type long, written in a
  // ``standard'' byte order (the high-order  byte
  // of the value is written first).
  if (buffer.slice(0,4).toString('ascii') !== 'TZif') {
    return;
  }

  //ignore 16 bytes
  buffer_idx = 20;
  var tmp = jspack.Unpack('>6l', buffer.slice(buffer_idx, buffer_idx + 24));
  buffer_idx += 24;
  // The number of UTC/local indicators stored in the file.
  var _ttisgmtct = tmp[0];
  // The number of standard/wall indicators stored in the file.
  var _ttisstdct = tmp[1];
  // The number of leap seconds for which data is
  // stored in the file.
  var _leapct = tmp[2];
  // The number of "transition times" for which data
  // is stored in the file.
  var _timect = tmp[3];
  // The number of "local time types" for which data
  // is stored in the file (must not be zero).
  var _typect = tmp[4];
  // The  number  of  characters  of "time zone
  // abbreviation strings" stored in the file.
  var _charct = tmp[5];

  var tzinfo = {
    trans_list: null,
    trans_idx: null,
    ttinfo_list: null,
    ttinfo_std: null,
    ttinfo_dst: null,
    ttinfo_before: null
  };

  // The above header is followed by tzh_timecnt four-byte
  // values  of  type long,  sorted  in ascending order.
  // These values are written in ``standard'' byte order.
  // Each is used as a transition time (as  returned  by
  // time(2)) at which the rules for computing local time
  // change.
  if (_timect) {
    tzinfo.trans_list = jspack.Unpack('>' + _timect + 'l', buffer.slice(buffer_idx, buffer_idx + (_timect * 4)));
    buffer_idx += (_timect * 4);
  } else {
    tzinfo.trans_list = [];
  }

  // Next come tzh_timecnt one-byte values of type unsigned
  // char; each one tells which of the different types of
  // ``local time'' types described in the file is associated
  // with the same-indexed transition time. These values
  // serve as indices into an array of ttinfo structures that
  // appears next in the file.
  if (_timect) {
    tzinfo.trans_idx = jspack.Unpack('>' + _timect + 'B', buffer.slice(buffer_idx, buffer_idx + _timect));
    buffer_idx += _timect;
  } else {
    tzinfo.trans_idx = [];
  }


  // Each ttinfo structure is written as a four-byte value
  // for tt_gmtoff  of  type long,  in  a  standard  byte
  // order, followed  by a one-byte value for tt_isdst
  // and a one-byte  value  for  tt_abbrind.   In  each
  // structure, tt_gmtoff  gives  the  number  of
  // seconds to be added to UTC, tt_isdst tells whether
  // tm_isdst should be set by  localtime(3),  and
  // tt_abbrind serves  as an index into the array of
  // time zone abbreviation characters that follow the
  // ttinfo structure(s) in the file.

  var _ttinfo = [];
  for (var i = 0; i < _typect; i++) {
    _ttinfo.push(jspack.Unpack('>lbb', buffer.slice(buffer_idx, buffer_idx + 6)));
    buffer_idx += 6;
  }


  var _abbr = buffer.slice(buffer_idx, buffer_idx + _charct).toString();
  buffer_idx += _charct;


  // Then there are tzh_leapcnt pairs of four-byte
  // values, written in  standard byte  order;  the
  // first  value  of  each pair gives the time (as
  // returned by time(2)) at which a leap second
  // occurs;  the  second  gives the  total  number of
  // leap seconds to be applied after the given time.
  // The pairs of values are sorted in ascending order
  // by time.

  var _leap = null;
  if (_leapct) {
    _leap = jspack.Unpack('>' + (_leapct * 2) + 'l', buffer.slice(buffer_idx, buffer_idx + (_leapct * 8)));
    buffer_idx += _leapct * 8;
  }


  // Then there are tzh_ttisstdcnt standard/wall
  // indicators, each stored as a one-byte value;
  // they tell whether the transition times associated
  // with local time types were specified as standard
  // time or wall clock time, and are used when
  // a time zone file is used in handling POSIX-style
  // time zone environment variables.
  var _isstd = null;
  if (_ttisstdct) {
    _isstd = jspack.Unpack('>' + _ttisstdct + 'b', buffer.slice(buffer_idx, buffer_idx + _ttisstdct));
    buffer_idx += _ttisstdct;
  }


  // Finally, there are tzh_ttisgmtcnt UTC/local
  // indicators, each stored as a one-byte value;
  // they tell whether the transition times associated
  // with local time types were specified as UTC or
  // local time, and are used when a time zone file
  // is used in handling POSIX-style time zone envi-
  // ronment variables.
  var _isgmt = null;
  if (_ttisgmtct) {
    _isgmt = jspack.Unpack('>' + _ttisgmtct + 'b', buffer.slice(buffer_idx, buffer_idx + _ttisgmtct));
    buffer_idx += _ttisgmtct;
  }


  //finished reading

  tzinfo.ttinfo_list = [];
  _ttinfo.forEach(function (item, index) {
    item[0] = Math.floor(item[0] / 60);

    tzinfo.ttinfo_list.push({
      offset: item[0],
      isdst: item[1],
      abbr: _abbr.slice(item[2], _abbr.indexOf('\x00',item[2])),
      isstd: _ttisstdct > index && _isstd[index] !== 0,
      isgmt: _ttisgmtct > index && _isgmt[index] !== 0
    });
  });

  // Replace ttinfo indexes for ttinfo objects.
  tzinfo.trans_idx = tzinfo.trans_idx.map(function (item) {
    return tzinfo.ttinfo_list[item];
  });

  // Set standard, dst, and before ttinfos. before will be
  // used when a given time is before any transitions,
  // and will be set to the first non-dst ttinfo, or to
  // the first dst, if all of them are dst.
  if (tzinfo.ttinfo_list.length) {
    if (!tzinfo.trans_list.length) {
      tzinfo.ttinfo_std = tzinfo.ttinfo_first = tzinfo.ttinfo_list[0];
    } else {
      for (var j = _timect - 1; j > -1; j--) {
        var tti = tzinfo.trans_idx[j];
        if (!tzinfo.ttinfo_std && !tti.isdst) {
          tzinfo.ttinfo_std = tti;
        } else if (!tzinfo.ttinfo_dst && tti.isdst) {
          tzinfo.ttinfo_dst = tti;
        }

        if (tzinfo.ttinfo_dst && tzinfo.ttinfo_std) {
          break;
        }
      }

      if (tzinfo.ttinfo_dst && !tzinfo.ttinfo_std) {
        tzinfo.ttinfo_std = tzinfo.ttinfo_dst;
      }

      for (var k in tzinfo.ttinfo_list) {
        if (!tzinfo.ttinfo_list[k].isdst) {
          tzinfo.ttinfo_before = tzinfo.ttinfo_list[k];
          break;
        }
      }

      if (!tzinfo.ttinfo_before) {
        tzinfo.ttinfo_before = tzinfo.ttinfo_list[0];
      }
    }
  }

  return tzinfo;
}
