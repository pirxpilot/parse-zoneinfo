var fs = require('fs');

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

  function readUInt8() {
    return buffer.readUInt8(buffer_idx++);
  }

  function readInt8() {
    return buffer.readUInt8(buffer_idx++);
  }

  function readInt32() {
    var l = buffer.readInt32BE(buffer_idx);
    buffer_idx += 4;
    return l;
  }

  function readInt8Array(len) {
    var r = [];
    while(len--) {
      r.push(readInt8());
    }
    return r;
  }

  function readUInt8Array(len) {
    var r = [];
    while(len--) {
      r.push(readUInt8());
    }
    return r;
  }

  function readInt32Array(len) {
    var r = [];
    while(len--) {
      r.push(readInt32());
    }
    return r;
  }

  function readString(len) {
    var
      start = buffer_idx,
      end = start + len;
      buffer_idx = end;
    return buffer.slice(start, end).toString('ascii');
  }

  function readTTInfo() {
    var
      gmtoff = readInt32(),
      isdst = readInt8(),
      abbrind = readInt8();

    return [gmtoff, isdst, abbrind];
  }

  // From tzfile(5):
  //
  // The time zone information files used by tzset(3)
  // begin with the magic characters "TZif" to identify
  // them as time zone information files, followed by
  // sixteen bytes reserved for future use, followed by
  // six four-byte values of type long, written in a
  // ``standard'' byte order (the high-order  byte
  // of the value is written first).
  if (readString(4) !== 'TZif') {
    return;
  }

  //ignore 16 bytes
  buffer_idx = 20;
  // The number of UTC/local indicators stored in the file.
  var _ttisgmtct = readInt32();
  // The number of standard/wall indicators stored in the file.
  var _ttisstdct = readInt32();
  // The number of leap seconds for which data is
  // stored in the file.
  var _leapct = readInt32();
  // The number of "transition times" for which data
  // is stored in the file.
  var _timect = readInt32();
  // The number of "local time types" for which data
  // is stored in the file (must not be zero).
  var _typect = readInt32();
  // The  number  of  characters  of "time zone
  // abbreviation strings" stored in the file.
  var _charct = readInt32();

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
  tzinfo.trans_list = readInt32Array(_timect);

  // Next come tzh_timecnt one-byte values of type unsigned
  // char; each one tells which of the different types of
  // ``local time'' types described in the file is associated
  // with the same-indexed transition time. These values
  // serve as indices into an array of ttinfo structures that
  // appears next in the file.
  tzinfo.trans_idx = readUInt8Array(_timect);

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
    _ttinfo.push(readTTInfo());
  }


  var _abbr = readString(_charct);


  // Then there are tzh_leapcnt pairs of four-byte
  // values, written in  standard byte  order;  the
  // first  value  of  each pair gives the time (as
  // returned by time(2)) at which a leap second
  // occurs;  the  second  gives the  total  number of
  // leap seconds to be applied after the given time.
  // The pairs of values are sorted in ascending order
  // by time.

  // not using _leap - at the moment
  // var _leap = readInt32Array(_leapct * 2) ;

  // just move counter instead
  buffer_idx += _leapct * 8;


  // Then there are tzh_ttisstdcnt standard/wall
  // indicators, each stored as a one-byte value;
  // they tell whether the transition times associated
  // with local time types were specified as standard
  // time or wall clock time, and are used when
  // a time zone file is used in handling POSIX-style
  // time zone environment variables.
  var _isstd = readInt8Array(_ttisstdct);


  // Finally, there are tzh_ttisgmtcnt UTC/local
  // indicators, each stored as a one-byte value;
  // they tell whether the transition times associated
  // with local time types were specified as UTC or
  // local time, and are used when a time zone file
  // is used in handling POSIX-style time zone envi-
  // ronment variables.
  var _isgmt = readUInt8Array(_ttisgmtct);

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
