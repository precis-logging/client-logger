var noop = function(){};

var counter = (function(){
  var getNanoSeconds = function getNanoSeconds(){
      hr = process.hrtime();
      return hr[0] * 1e9 + hr[1];
    };
  var loadTime = getNanoSeconds();
  return function(from){
    var v = (getNanoSeconds()-loadTime) / 1e6;
    return from?v-from:v;
  };
})();

var after = function(obj, methods, callback){
  if(!(methods instanceof Array)){
    methods = [methods];
  }
  methods.forEach(function(name){
    if(!obj[name]){
      return;
    }
    obj[name] = (function(handler){
      return function(){
        var res = handler.apply(this, arguments);

        return callback({
          source: this,
          args: arguments,
          result: res
        }) || res;
      };
    })(obj[name]);
  });
};

var before = function(obj, methods, callback){
  if(!(methods instanceof Array)){
    methods = [methods];
  }
  methods.forEach(function(name){
    if(!obj[name]){
      return;
    }
    obj[name] = (function(handler){
      return function(){
        var args = callback({
          source: this,
          args: arguments
        });
        return handler.apply(this, args||arguments);
      };
    })(obj[name]);
  });
};

var clone = function(src){
  var res = {};
  var keys = Object.keys(src||{});
  keys.forEach(function(key){
    res[key]=src[key];
  });
  return res;
};

var inspect = function(o, depth){
  if(arguments.length===1){
    depth = 1;
  }
  return {
    keys: Object.keys(o||{}),
    details: util.inspect(o, {depth: depth, showHidden: true, colors: false})
  };
};

module.exports = {
  after: after,
  before: before,
  clone: clone,
  counter: counter,
  inspect: inspect,
  noop: noop,
};
