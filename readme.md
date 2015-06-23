Precis Client Logger
===

The base client logger for Precis, really a building block that you add adapters
to to do the actual logging.

Usage
---

```
var Hapi = require('hapi');
var request = require('request');
var fs = require('fs');
var path = require('path');
var Boom = require('boom');

var Logger = require('precis-client-logger').Logger;
var ConsoleAdapter = require('precis-console-adapter').ConsoleAdapter;
// You have to install the adapters you want to use
var FileAdapter = require('precis-file-adapter').FileAdapter;
var HTTPCapture = require('precis-client-logger').HTTPCapture;
// HAPI8 and HAPI6 captures are provided
var HAPICapture = require('precis-client-logger').HAPI8Capture;

var logger = new Logger({
  adapters: [ConsoleAdapter, FileAdapter]
});

// Capture all outbound HTTP and HTTPS activities
HTTPCapture(require('http'), logger);
HTTPCapture(require('https'), logger);

var PORT = 8080;

var started = function(){
  logger.info('Server started on port http://localhost:'+PORT);
};

var server = new Hapi.Server();
server.connection({port: PORT});

// Capture all Hapi activities
HAPICapture(server, {logger: logger});

var servePage = function(pages, reply){
  var page = Array.isArray(pages)?pages.join('/'):(pages||'index.html').toString();
  var fileName = path.resolve(__dirname, './site/', page);
  fs.stat(fileName, function(err, data){
    if(err){
      return reply(Boom.wrap(err, 400));
    }
    reply.file(fileName);
  });
};

// Setup some basic routes
... etc ...

server.start(started);
```
