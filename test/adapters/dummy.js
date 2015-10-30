var noop = function(){};

var DummyAdapter = function(options){
  this.items = [];
  this.afterPush = options.afterPush || noop;
  this.forceError = !!options.forceError;
};

DummyAdapter.prototype.push = function(obj, next){
  if(this.forceError){
    return next(new Error('Forced Error'));
  }
  this.items.push(obj);
  this.afterPush(obj);
  return next();
};

module.exports = DummyAdapter;
