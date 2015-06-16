Precis File Logger
===

A file based logger for precis, really a building block for the other loggers.

If your looking for an advanced logger, look to Bunyan, otherwise this gives you
a basic file logger.

Built in Adapters
===

ConsoleAdapter
===

Not enabled by default, can be enabled by either adding to Logger.adapters or
to each logger instance using:
```
var Logger = require('precis-client-logger').Logger;
var FileAdapter = require('precis-file-adapter').FileAdapter;
var ConsoleAdapter = require('precis-console-adapter').ConsoleAdapter;

var logger = new Logger({
  adapters: [FileAdapter, ConsoleAdapter]
});
```

Takes options from the options.console object passed to the Logger instance.

The options are passed directly to util.inspect.

Default options:
```
{
  color: true,
  showHidden: true,
  dept: null
}
```
