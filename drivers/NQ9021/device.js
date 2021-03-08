/* eslint-disable radix */
/* eslint-disable max-len */

'use strict';

// const Homey = require('homey');
const { ZwaveDevice } = require('homey-zwavedriver');
// eslint-disable-next-line no-unused-vars
const util = require('util');

class PowerMeterNQ9021 extends ZwaveDevice {

  async onNodeInit({ node }) {
    this.log(' ### PowerMeter_NQ9021 start');
    // await super.onMeshInit();

    this.enableDebug();
    // super.enableDebug();
    // this.printNode();
    this.lastReport = {
      TimeStamp: undefined,
      Value: undefined,
    };

    this.registerCapability('measure_battery', 'BATTERY', { getOpts: { getOnOnline: true } });

    this.registerCapability('meter_power', 'METER', {
      getOpts: {
        // pollInterval: 600, // =60*60*1000 in ms = once per hour is enough
        // pollMultiplication: 1000,
        // pollInterval: 'wakeup_interval',
        getOnOnline: true,
      },
      reportParserOverride: true,
      reportParserV2: report => {
        this.log(`Report firing..${util.inspect(report, false, 4)}`);
        const val = parseFloat(report['Meter Value (Parsed)']);
        const valTime = Date.now();
        this.log(`Parsed value:${val}`);
        try {
          this.log(`valTime=${valTime}`, `val=${val}`);
          this.log(`lastTime=${this.lastReport.TimeStamp}`, `lastVal=${this.lastReport.Value}`);
          if (this.lastReport.TimeStamp && this.lastReport.Value) {
            const diffTime = parseFloat((valTime - this.lastReport.TimeStamp)); // dT [ms]
            this.log(`Diff time:${diffTime / 1000} [s]`);
            if (diffTime > 10) {
              // const diffVal = parseFloat((val - this.lastReport.Value) * 1000); // dW [Wh]
              // this.log(`diffVal [Wh]=${diffVal}, diffTime [s]=${diffTime}`);
              const diff = parseFloat(parseFloat(parseFloat(val * 1000 - this.lastReport.Value * 1000) * 3600) / diffTime); // P [W]
              this.log(`diff=P [W]=${diff}`);
              this.setCapabilityValue('measure_power', Math.round(diff * 100) / 100);
              this.lastReport.TimeStamp = valTime;
              this.lastReport.Value = val;
            }
          } else {
            this.lastReport.TimeStamp = valTime;
            this.lastReport.Value = val;
          }
        } catch (err) {
          this.error(`Error setting value:${err}`);
          Promise.reject(err);
        }
        return val;
      },
    });

    /*     , {
          getOpts: {
            pollInterval: 600, // =60*60*1000 in ms = once per hour is enough
            pollMultiplication: 1000,
            // pollInterval: "wakeup_interval",
            getOnOnline: true,
          },
        }); */

    /*     this.registerCapabilityListener('meter_power', (value, opts) => {
          this.log('value', value);
          this.log('opts', opts);
          return Promise.resolve();
        }); */

    /*     this.registerReportListener(
          'METER',
          'METER_REPORT',
          report => {
            this.log('Report - fired:', util.inspect(report));
            const val = parseFloat(report['Meter Value (Parsed)']);
            this.log(`Parsed value:${val}`);
            if (val !== this.lastReport.Value) {
              // this.setCapabilityValue("meter_power", val);
              try {
                const valTime = Date.now();
                this.log(`valTime=${valTime}`, `val=${val}`);
                this.log(`lastTime=${this.lastReport.TimeStamp}`, `lastVal=${this.lastReport.Value}`);
                if (this.lastReport.TimeStamp && this.lastReport.Value) {
                  const diffVal = parseFloat((val - this.lastReport.Value) * 1000); // dW [Wh]
                  const diffTime = parseFloat(
                    (valTime - this.lastReport.TimeStamp) / 1000, // dT [s]
                  );
                  this.log(`diffVal [Wh]=${diffVal}, diffTime [s]=${diffTime}`);
                  if (diffVal > 0 && diffTime > 0) {
                    const diff = parseFloat((diffVal * diffTime) / 3600); // P [W]
                    this.log(`diff=P [W]=${diff}`);
                    if (diff > 0) this.setCapabilityValue('measure_power', Math.round(diff * 100) / 100);
                  }
                }
                this.lastReport.TimeStamp = valTime;
                this.lastReport.Value = val;
              } catch (err) {
                this.error(`Error setting value:${err}`);
                // reject(err);
              }
            }
            return Promise.resolve();
          },
        );
     */
    const value = new Date();
    const dateArray = Buffer.alloc(7);
    dateArray[0] = parseInt(value.getUTCFullYear() / 100);
    dateArray[1] = parseInt(value.getUTCFullYear() % 100);
    dateArray[2] = parseInt(value.getUTCMonth() + 1);
    dateArray[3] = parseInt(value.getUTCDate());
    dateArray[4] = parseInt(value.getUTCHours());
    dateArray[5] = parseInt(value.getUTCMinutes());
    dateArray[6] = parseInt(value.getUTCSeconds()); // var dateArray = new ArrayBuffer(7);
    this.log(' ### PowerMeter_NQ9021 finish');
    return node.CommandClass.COMMAND_CLASS_TIME_PARAMETERS.TIME_PARAMETERS_SET(dateArray).then(this.log(' ### PowerMeter_NQ9021 set time OK')).catch(err => {
      this.error(` ### PowerMeter_NQ9021 set time error ${err}`);
    });
  }

}

module.exports = PowerMeterNQ9021;
