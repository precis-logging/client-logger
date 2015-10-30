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
describe('Logger Fallback Tests', function(){
  var logLevels = [
      'trace',
      'debug',
      'info',
      'warn',
      'error',
      'fatal',
    ];
  describe('Basic Fallback Logging', function(){
    var logger = new Logger({
      adapters: [
          [DummyAdapter, DummyAdapter]
        ]
    });
    logger.adapters[0][0].forceError = true;
    describe('Fallback Logging Tests', function(){
      var testChildLog = function(level){
        it('Should log '+level+' messages to backup logger but not primary logger', function(done){
          logger.adapters[0][0].afterPush = function(){
            return done('Logger 0 called when logger 1 should have been called!');
          };
          logger.adapters[0][1].afterPush = function(){
            done();
          };
          logger[level]('test');
        });
      };
      logLevels.forEach(testChildLog);
    });
  });
  describe('Child Fallback Logging', function(){
    var logger = new Logger({
      adapters: [
          [DummyAdapter, DummyAdapter]
        ]
    });
    var child = logger.child({child: true});
    logger.adapters[0][0].forceError = true;
    describe('Fallback Logging Tests', function(){
      var testChildLog = function(level){
        it('Should log '+level+' messages to backup logger but not primary logger', function(done){
          logger.adapters[0][0].afterPush = function(){
            return done('Logger 0 called when logger 1 should have been called!');
          };
          logger.adapters[0][1].afterPush = function(){
            done();
          };
          child[level]('test');
        });
      };
      logLevels.forEach(testChildLog);
    });
  });
});
