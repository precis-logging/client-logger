var util = require('util');
var url = require('url');

var utils = require('./capture-utils');
var after = utils.after;
var before = utils.before;
var clone = utils.clone;
var counter = utils.counter;
var inspect = utils.inspect;
var noop = utils.noop;

var depth = 0;

var reCaptureBody = /(json|html|text)/i;

var capture = function(lib, logger){
  after(lib, 'request', function(opts){
    depth++;
    var obj = opts.source;
    var request = opts.result;
    var args= Array.prototype.slice.call(opts.args);
    var options = args[0];

    options = typeof(options)==='string'||options instanceof String?url.parse(options):options;

    var port = +(options.port || options.protocol==='https:'?443:80);
    var protocol = options.protocol||(port===443?'https:':'http:');
    var conversationId = (options.headers||{})['Conversation-ID'];

    var req = {
          protocol: protocol,
          host: options.host,
          port: port,
          hostname: options.hostname,
          hash: options.hash,
          search: options.search,
          query: options.query,
          pathname: options.pathname||((options.path||'').split('?').shift()),
          path: options.path,
          href: options.href,
          method: options.method,
          headers: clone(options.headers),
          queueDepth: depth
        };
    var url = protocol+'//'+
          (req.hostname||req.host)+
          (req.port ? ':' + req.port : '')+
          (req.path || '/');

    before(request, 'emit', function(opts){
      var event = opts.args[0];
      if(event!=='error'){
        return;
      }
      var error = opts.args[1];
      var pkt = {
            conversationId: conversationId,
            direction: 'outbound',
            method: req.method,
            url: url,
            req: req,
            error: error
          };
      if(error.stack){
        pkt.error = error.toString();
        pkt.stack = error.stack;
      }
      logger.error(pkt);
    });
  });

  before(lib, 'request', function(opts){
    var obj = opts.source;
    var args= Array.prototype.slice.call(opts.args);
    var options = args[0];

    if(options && options.headers){
      // Ignore websockets
      if(options.headers['Upgrade'] == 'websocket'){
        return;
      }
      // Ignore calls out to the logger
      if(options.headers['X-Logging-Agent']){
        return;
      }
    }

    options = typeof(options)==='string'||options instanceof String?url.parse(options):options;

    var port = options.port ? parseInt(options.port) : (options.protocol==='https:'?443:80);
    var protocol = options.protocol ? options.protocol : (port===443?'https:':'http:');
    var conversationId = (options.headers||{})['Conversation-ID'];
    var req = {
          protocol: protocol,
          host: options.host,
          port: port,
          hostname: options.hostname,
          hash: options.hash,
          search: options.search,
          query: options.query,
          pathname: options.pathname||((options.path||'').split('?').shift()),
          path: options.path,
          href: options.href,
          method: options.method,
          headers: clone(options.headers)
        };
    var url = protocol+'//'+
          (req.hostname||req.host)+
          (req.port ? ':' + req.port : '')+
          (req.path || '/');
    var started = new Date();
    var start = counter();

    logger.info({
        conversationId: conversationId,
        direction: 'outbound',
        method: req.method,
        url: url,
        req: req,
        start: start,
        started: started,
        queueDepth: depth
      });

    var cb = typeof(args[args.length-1])==='function'?args.pop():noop;
    args.push(function injectedCallbackHandler(resp){
      depth--;
      var res = {
            headers: resp.headers,
            trailers: resp.trailers,
            statusCode: resp.statusCode,
            complete: resp.complete
          };
      if(!resp.complete){
        var firstBlock = counter();
        var captureBody = !!reCaptureBody.exec(res.headers['content-type']||res.headers['Content-Type']);
        var body = '';
        before(resp, 'emit', function(opts){
          var obj = opts.source;
          var args= Array.prototype.slice.call(opts.args);
          var event = args.shift();
          var cb = typeof(args[args.length-1])==='function'?args.pop():noop;
          if(event === 'error'){
            var error = args[0];
            var pkt = {
                  conversationId: conversationId,
                  direction: 'outbound',
                  method: req.method,
                  url: url,
                  req: req,
                  res: res,
                  start: start,
                  error: error,
                  started: started,
                  queueDepth: depth
                };
            if(error.stack){
              pkt.error = error.toString();
              pkt.stack = error.stack;
            }
            logger.error(pkt);
            return cb.apply(opts.source, arguments);
          }
          if(event === 'data' && captureBody){
            body += args[0].toString();
            return cb.apply(opts.source, arguments);
          }
          if(event === 'end'){
            var finish = counter();
            var completed = new Date();
            if(body){
              try{
                res.payload = JSON.parse(body);
              }catch(e){
                res.payload = body;
              }
            }
            res.complete = true;
            logger.info({
                conversationId: conversationId,
                direction: 'outbound',
                method: req.method,
                url: url,
                req: req,
                res: res,
                start: start,
                started: started,
                firstBlock: firstBlock,
                complete: finish,
                completed: completed,
                duration: (finish-start),
                queueDepth: depth
              });
          }
          return cb.apply(opts.source, arguments);
        });
        return cb.apply(opts.source, arguments);
      }
      var finish = counter();
      var completed = new Date();
      logger.info({
          conversationId: conversationId,
          direction: 'outbound',
          method: req.method,
          url: url,
          req: req,
          res: res,
          start: start,
          started: started,
          complete: finish,
          completed: completed,
          duration: (finish-start),
          queueDepth: depth
        });
      return cb.apply(opts.source, arguments);
    });

    return args;
  });
};

var queueDepth = function(){
  return depth;
};

module.exports = {
  capture: capture,
  queueDepth: queueDepth,
};
