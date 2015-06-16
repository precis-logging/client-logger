var HapiCapture = require('./lib/hapi-capture');
var HttpCapture = require('./lib/http-capture');

module.exports = {
  Logger: require('./lib/logger').Logger,
  HAPICapture: HapiCapture.capture,
  HAPIRegister: HapiCapture.register,
  HTTPCapture: HttpCapture.capture,
  captureUtils: require('./lib/capture-utils'),
};
