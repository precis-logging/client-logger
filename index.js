var Hapi6Capture = require('./lib/hapi6-capture');
var Hapi8Capture = require('./lib/hapi8-capture');
var HttpCapture = require('./lib/http-capture');

module.exports = {
  Logger: require('./lib/logger').Logger,
  HAPI6Capture: Hapi6Capture.capture,
  HAPI6Register: Hapi6Capture.register,
  HAPI8Capture: Hapi8Capture.capture,
  HAPI8Register: Hapi8Capture.register,
  HAPICapture: Hapi8Capture.capture,
  HAPIRegister: Hapi8Capture.register,
  HTTPCapture: HttpCapture.capture,
  captureUtils: require('./lib/capture-utils'),
};
