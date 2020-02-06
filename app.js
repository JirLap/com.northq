'use strict';

const Homey = require('homey');
//require('inspector').open(9229, '0.0.0.0', true);

class NorthQZwave extends Homey.App {
  onInit() {
    this.log('NorthQ Z-wave app is running...');
  }
}

module.exports = NorthQZwave;
