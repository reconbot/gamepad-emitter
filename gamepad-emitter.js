"use strict";

// Make sure you're using the bundle in your browser!
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

// Lots of this code is taken from http://www.html5rocks.com/en/tutorials/doodles/gamepad/
// This works in chrome but your gamepad must be plugged in when you open chrome
var GamepadEmitter = function (opt) {
  if (!(this instanceof GamepadEmitter)) {
    return new GamepadEmitter(opt);
  }

  EventEmitter.call(this);

  opt = opt || {};
  this.deadZone = opt.deadZone === undefined ? 0.1 : opt.deadZone;

  this.gamepad = null;
  this.previousRead = {};
  // bind the read loop
  this.loop = this.loop.bind(this);

  // On chrome you poll
  if (navigator.webkitGetGamepads) {
    this.pollForDevice = this.pollForDevice.bind(this);
    this.pollForDevice();
  } else {
    // On firefox we have an event
    window.addEventListener('MozGamepadConnected', this.waitForDevice.bind(this));
  }
};

inherits(GamepadEmitter, EventEmitter);

GamepadEmitter.prototype.pollForDevice = function () {
  this.gamepad = navigator.webkitGetGamepads()[0];
  if (this.gamepad) {
    return this.ready();
  }
  requestAnimationFrame(this.pollForDevice);
};

GamepadEmitter.prototype.waitForDevice = function (e) {
  this.gamepad = e.gamepad;
  if (this.gamepad) {
    this.ready();
  }
};

GamepadEmitter.prototype.ready = function () {
  this.emit('ready', this.gamepad);
  this.loop();
};

GamepadEmitter.prototype.disconnect = function () {
  this.previousRead = {};
  this.emit('disconnect');
};

GamepadEmitter.prototype.loop = function () {
  // Chrome needs you to call getGamepadsevery time, firefox doesn't not afaik
  if (navigator.webkitGetGamepads) {
    var gamepad2 = navigator.webkitGetGamepads()[0];
    // probably a disconnect event
    if (!gamepad2) {
      return this.disconnect();
    }
  }

  window.requestAnimationFrame(this.loop);

  var gamepad = this.gamepad;
  var previousRead = this.previousRead;

  // Skip if no updates
  if (gamepad.timestamp && gamepad.timestamp === previousRead.timestamp) {
    return;
  }

  previousRead.timestamp = gamepad.timestamp;

  gamepad.buttons.forEach(function (buttonValue, index) {
    var id = 'button-' + index;
    if (this.compareValues(previousRead[id], buttonValue)) {
      this.emit(id, buttonValue);
    }
    previousRead[id] = buttonValue;
  }, this);

  gamepad.axes.forEach(function (axesValue, index) {
    var id = 'axes-' + index;
    if (this.compareValues(previousRead[id], axesValue)) {
      this.emit(id, axesValue);
    }
    previousRead[id] = axesValue;
  }, this);

  this.gamepad = gamepad;
};

GamepadEmitter.prototype.compareValues = function (previousValue, value) {
  if (previousValue === undefined) {
    return false;
  }
  if (Math.abs(previousValue) <= this.deadZone) {
    previousValue = 0;
  }
  if (Math.abs(value) <= this.deadZone) {
    value = 0;
  }

  return previousValue !== value;
};

module.exports = GamepadEmitter;
