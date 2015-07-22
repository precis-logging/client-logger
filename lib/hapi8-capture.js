var utils = require('./capture-utils');
var counter = utils.counter;
var noop = utils.noop;

var depth = 0;

var LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

var logEvent = function logEvent(ctx, data, request){
  var obj = {};
  var type = typeof((data||{}).data);

  if(request){
    obj.direction = 'inbound';
    if(!request._timings){
      depth++;
      request._timings = {
        start: counter(),
        started: new Date()
      };
    }
    obj.start = request._timings.start;
    obj.started = request._timings.started;
    if(request.response){
      if(!request._responseClosed){
        depth--;
      }
      if(request._responseClosed){
        obj.closed = request._responseClosed;
      }
      request._responseClosed = (request._responseClosed || 0) + 1;
      obj.complete = counter();
      obj.completed = new Date();
      obj.duration = obj.complete-obj.start;
    }

    obj.conversationId = request.id;
    obj.url = request.url.path;
    obj.method = request.method.toUpperCase();

    obj.req = {};
    if(ctx.includePayload && request && request.payload){
      obj.req.payload = request.payload;
    }

    if(ctx.includeParams && request && request.params && Object.keys(request.params).length){
      obj.req.params = request.params;
    }

    if(ctx.includeHeaders && request && request.headers){
      obj.req.headers = request.headers;
    }

    if(ctx.includeResponse && request && request.response){
      var res = {}, include = false;
      if(request.response.statusCode){
        res.statusCode = request.response.statusCode;
        include = true;
      }
      if(request.response.headers){
        res.headers = request.response.headers;
        include = true;
      }
      if(request.response.source){
        try{
          res.payload = typeof(request.response.source)==='object'?
            JSON.parse(JSON.stringify(request.response.source)):
            request.response.source;
            include = true;
        }catch(e){
        }
      }
      if(include){
        obj.res = res;
      }
    }
  }

  if(ctx.includeTags && obj.tags){
    obj.tags = ctx.joinTags ? data.tags.join(ctx.joinTags) : data.tags;
  }

  if(type!=='string'&&type!=='undefined'&&ctx.includeData){
    obj.data = ctx.mergeData?utils.extend(obj, data.data):data.data;
  }

  if(type==='undefined'&&ctx.skipUndefined){
    return;
  }

  if(type==='string'){
    return ctx.log[ctx.level](obj, data.data);
  }

  obj.queueDepth = depth;

  ctx.log[ctx.level](obj);
};

var setDefault = function setDefault(on, member, value){
  if(typeof(on[member])==='undefined'){
    on[member] = value;
  }
};

var capturer = function capture(server, options, next){
  if(!options.logger){
    return next(new Error('options.logger required'));
  }
  var log = options.logger;
  var handler = options.handler||noop;

  setDefault(options, 'includeTags', true);
  setDefault(options, 'includeData', true);
  setDefault(options, 'mergeData', false);
  setDefault(options, 'skipUndefined', false);
  setDefault(options, 'joinTags', false);
  setDefault(options, 'includePayload', true);
  setDefault(options, 'includeParams', true);
  setDefault(options, 'includeResponse', true);
  setDefault(options, 'includeHeaders', true);

  server.ext('onRequest', function(request, reply){
    var ctx = {
      level: 'info',
      log: log,
      includeTags: options.includeTags,
      includeData: options.includeData,
      mergeData: options.mergeData,
      skipUndefined: options.skipUndefined,
      includePayload: options.includePayload,
      includeParams: options.includeParams,
      includeResponse: options.includeResponse,
      includeHeaders: options.includeHeaders,
      joinTags: options.joinTags,
      event: 'onRequest'
    };
    var _log = request.log;
    request.log = function(){
      _log.apply(request, arguments);
    };
    request.logger = log.child?log.child({conversationId: request.id}, true):log;
    LOG_LEVELS.forEach(function(level){
      if(!request.log[level]){
        level = 'info';
      }
      request.log[level]=request.logger[level].bind(request.logger);
    });
    request.log['unknownError']=request.logger.error.bind(request.logger);
    logEvent(ctx, null, request);
    return reply.continue();
  });

  server.on('log', function(data, tags){
    var ctx = {
      level: tags.error?'error':'info',
      log: log,
      includeTags: options.includeTags,
      includeData: options.includeData,
      mergeData: options.mergeData,
      skipUndefined: options.skipUndefined,
      includePayload: options.includePayload,
      includeParams: options.includeParams,
      includeResponse: options.includeResponse,
      includeHeaders: options.includeHeaders,
      joinTags: options.joinTags
    };
    if(tags.error){
      ctx.error = data.toString();
      ctx.stack = data.stack;
    }
    if(handler.call(ctx, 'log', data, tags)){
      return;
    }
    logEvent(ctx, data);
  });

  server.on('request', function(request, data, tags){
    var ctx = {
      level: tags.error?'warn':'info',
      log: log,
      includeTags: options.includeTags,
      includeData: options.includeData,
      mergeData: options.mergeData,
      skipUndefined: options.skipUndefined,
      includePayload: options.includePayload,
      includeParams: options.includeParams,
      includeResponse: options.includeResponse,
      includeHeaders: options.includeHeaders,
      joinTags: options.joinTags,
      event: 'request'
    };
    if(tags.error){
      ctx.error = data.toString();
      ctx.stack = data.stack;
    }
    if(handler.call(ctx, 'request', request, data, tags)){
      return;
    }
    logEvent(ctx, data, request);
  });

  server.on('response', function(request, data){
    var ctx = {
      level: 'info',
      log: log,
      includeTags: options.includeTags,
      includeData: options.includeData,
      mergeData: options.mergeData,
      skipUndefined: options.skipUndefined,
      includePayload: options.includePayload,
      includeParams: options.includeParams,
      includeResponse: options.includeResponse,
      includeHeaders: options.includeHeaders,
      joinTags: options.joinTags,
      event: 'response'
    };
    if(handler.call(ctx, 'request', request, data, {})){
      return;
    }
    logEvent(ctx, data, request);
  });

  server.on('request-internal', function(request, data, tags){
    var ctx = {
      level: tags.error?'error':'info',
      log: log,
      includeTags: options.includeTags,
      includeData: options.includeData,
      mergeData: options.mergeData,
      skipUndefined: options.skipUndefined,
      includePayload: options.includePayload,
      includeParams: options.includeParams,
      includeResponse: options.includeResponse,
      includeHeaders: options.includeHeaders,
      joinTags: options.joinTags,
      event: 'request-internal'
    };
    if(tags.error){
      ctx.error = data.toString();
      ctx.stack = data.stack;
    }
    if(handler.call(ctx, 'log', data, tags)){
      return;
    }
    logEvent(ctx, data);
  });

  server.on('request-error', function(request, err) {
    var ctx = {
      level: tags.error?'error':'info',
      log: log,
      includeTags: options.includeTags,
      includeData: options.includeData,
      mergeData: options.mergeData,
      skipUndefined: options.skipUndefined,
      includePayload: options.includePayload,
      includeParams: options.includeParams,
      includeResponse: options.includeResponse,
      includeHeaders: options.includeHeaders,
      joinTags: options.joinTags,
      event: 'request-internal'
    };

    if (handler.call(ctx, 'request-error', request, err)) {
      return;
    }

    logEvent(ctx, err, request);
  });

  (next||noop)();
};

capturer.attributes = {
  pkg: require('../package.json'),
  name: 'precis-client-logger'
};

var capture = function(server, options, next){
  next = next || noop;
  capturer(server, options, next);
};

module.exports = {
  register: capturer,
  capture: capture
};
