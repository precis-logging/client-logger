var os = require('os');
var utils = require('./utils');
var async = require('async');
var util = require('util');
var stringify = require('json-stringify-safe');

var noop = function(){};
var noopOrError = function(err){
  if(err){
    throw err;
  }
};

var TRACE = 10;
var DEBUG = 20;
var INFO = 30;
var WARN = 40;
var ERROR = 50;
var FATAL = 60;

var DEFAULT_LOG_LEVELS = {
    trace: TRACE,
    debug: DEBUG,
    info: INFO,
    warn: WARN,
    error: ERROR,
    fatal: FATAL
  };

var makeLogEmitter = function(level){
  return function(){
    var args = Array.prototype.slice.call(arguments);
    args.unshift(level);
    return this.log.apply(this, args);
  };
};

var Logger = function(options){
  options = options || {};
  this.adapters = (options.adapters||Logger.adapters).map(function(Adapter){
    if(Array.isArray(Adapter)){
      return Adapter.map(function(Adapter){
        return new Adapter(options);
      });
    }
    return new Adapter(options);
  });
  this.logLevels = options.logLevels || Logger.logLevels;
  Object.keys(this.logLevels).forEach(function(level){
    this[level] = makeLogEmitter(this.logLevels[level]);
  }.bind(this));
};

Logger.adapters = [];
Logger.logLevels = DEFAULT_LOG_LEVELS;

Logger.prototype.getLogLevel = function(levelText){
  return this.logLevels[levelText.toLowerCase()]||levelText;
};

var flatten = function(items){
  var res = items.reduce(function(p, v){
    Object.keys(v).forEach(function(key){
      p[key] = v[key];
    });
    return p;
  }, {});
  return res;
};

var mkRecord = function(level, args){
  var uArgs = [{
    level: level,
    v: 0
  }].concat(args).concat([{
    time: new Date(),
    hostname: os.hostname(),
    pid: process.pid
  }]);
  var msg = '';
  uArgs = uArgs.map(function(arg){
    var type = typeof(arg);
    if(type==='string' || type==='boolean' || type==='number'){
      msg = !!msg?msg+'\t'+arg:arg;
      return {
        msg: msg
      };
    }
    if(Array.isArray(arg)){
      return {
        arr: arg
      };
    }
    if(arg instanceof Error){
      return {
        err: {
          message: arg.toString(),
          stack: arg.stack,
          inspect: util.inspect(arg)
        }
      };
    }
    if(Buffer.isBuffer(arg)){
      return {
        buf: util.inspect(arg)
      };
    }
    return arg;
  });
  if(msg){
    uArgs.push({
      msg: msg
    });
  }
  var res = JSON.parse(stringify(flatten(uArgs)));
  return res;
};

Logger.prototype.log = function(callback){
  var args = Array.prototype.slice.call(arguments);
  var level = args.shift();
  var cb = typeof(args[args.length-1])==='function'?args.pop():noopOrError;
  var data = mkRecord(level, args);
  var errors = [];
  async.each(this.adapters, function(adapter, next){
    if(Array.isArray(adapter)){
      return adapter[0].push.call(adapter[0], data, function(err){
        if(err && adapter[1]){
          return adapter[1].push.call(adapter[1], data, function(err){
            return next();
          });
        }
        return next();
      });
    }
    return adapter.push.call(adapter, data, function(){
      next();
    });
  }, function(){
    if(errors.length){
      return cb(errors);
    }
    return cb();
  });
};

Logger.prototype.child = function(base){
  var master = this;
  var child = function(callback){
    var args = Array.prototype.slice.call(arguments);
    var level = args.shift();
    var cb = typeof(args[args.length-1])==='function'?args.pop():noopOrError;
    var data = mkRecord(level, args);
    var adata = utils.extend(true, {}, base, data);
    var errors = [];
    async.each(master.adapters, function(adapter, next){
      if(Array.isArray(adapter)){
        return adapter[0].push.call(adapter[0], data, function(err){
          if(err && adapter[1]){
            return adapter[1].push.call(adapter[1], data, function(err){
              return next();
            });
          }
          return next();
        });
      }
      return adapter.push.call(adapter, adata, function(){
        next();
      });
    }, function(){
      if(errors.length){
        return cb(errors);
      }
      return cb();
    });
  };

  Object.keys(this.logLevels).forEach(function(level){
    child[level] = function(){
        var args = Array.prototype.slice.call(arguments);
        args.unshift(level);
        return child.apply(this, args);
      };
  }.bind(this));

  return child;
};

module.exports = {
  Logger: Logger
};
