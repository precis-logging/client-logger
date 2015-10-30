var assert = require('assert');
var DummyAdapter = require('./adapters/dummy');
var Logger = require('../index.js').Logger;

/*
var TRACE = 10;
var DEBUG = 20;
var INFO = 30;
var WARN = 40;
var ERROR = 50;
var FATAL = 60;
*/
describe('Logger Basic Tests', function(){
  var logLevels = [
      'trace',
      'debug',
      'info',
      'warn',
      'error',
      'fatal',
    ];
  describe('Basic Logging Tests', function(){
    var logger = new Logger({
      adapters: [
          DummyAdapter
        ]
    });
    var testBasic = function(level){
      it('Should log '+level+' messages', function(done){
        logger.adapters[0].afterPush = function(){
          done();
        };
        logger[level]('test');
      });
    };
    logLevels.forEach(function(level){
      testBasic(level);
    });
    logger.adapters[0].afterPush = null;
  });

  describe('Child Logging Tests', function(){
    var logger = new Logger({
      adapters: [
          DummyAdapter
        ]
    });
    var child = logger.child({child: true});
    var testChild = function(level){
      it('Should log '+level+' messages', function(done){
        logger.adapters[0].afterPush = function(data){
          assert(data.child, 'No child data found');
          done();
        };
        child[level]('test');
      });
    };
    logLevels.forEach(function(level){
      testChild(level);
    });
    logger.adapters[0].afterPush = null;
    it('The master should not retain the child\'s custom data', function(done){
      logger.adapters[0].afterPush = function(data){
        assert(!data.child, 'Child data found');
        done();
      };
      logger.debug('test');
    });
    logger.adapters[0].afterPush = null;
  });
});
