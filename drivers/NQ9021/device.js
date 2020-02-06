"use strict";

const Homey = require("homey");
const ZwaveDevice = require("homey-meshdriver").ZwaveDevice;
const util = require("util");

class PowerMeter_NQ9021 extends ZwaveDevice {
  async onMeshInit() {
    this.log(" ### PowerMeter_NQ9021 start");
    //await super.onMeshInit();

    this.enableDebug();
    //super.enableDebug();
    this.printNode();
    this.lastReport = {
      TimeStamp: undefined,
      Value: undefined
    };
    this.registerCapability("measure_battery", "BATTERY", {
      getOpts: {
        pollInterval: 600, // =60*60*1000 in ms = once per hour is enough
        pollMultiplication: 1000,
        //pollInterval: "wakeup_interval",
        getOnOnline: true
      }
    });
    //const setPollInterval = 300000;
    //pollInterval: 'wakeup_interval',

    /*
    this.registerCapability("meter_power", "METER", {
      getOpts: {
        pollInterval: 300,
        pollMultiplication: 1000,
        getOnOnline: true
      }
    });


    if (!this.hasCapability("time_set")) {
      await this.addCapability("time_set");
    }

    this.registerCapability("time_set", "TIME_PARAMETERS", {
      getOpts: {
        pollInterval: 300,
        pollMultiplication: 1000,
        getOnOnline: true
      }
    });
    
    this.registerCapability("meter_power", "METER", {
      getOpts: {
        pollInterval: 600,
        pollMultiplication: 1000,
        //pollInterval: "wakeup_interval",
        getOnOnline: true
      }
    });
    */

    this.registerCapability("meter_power", "METER", {
      getOpts: {
        pollInterval: 600,
        pollMultiplication: 1000,
        getOnOnline: true
      },
      getParserV2: () => ({
        "Sensor Type": "Electric meter",
        Properties1: {
          Scale: 2
        }
      }),
      reportParserV2: report => {
        this.log("Report firing.." + util.inspect(report, false, 4));
        let val = parseFloat(report["Meter Value (Parsed)"]);
        if (val !== this.lastReport.Value) {
          //this.setCapabilityValue("meter_power", val);
          try {
            let valTime = Date.now();
            this.log("valTime=" + valTime, "val=" + val);
            this.log("lastTime=" + this.lastReport.TimeStamp, "lastVal=" + this.lastReport.Value);
            if (this.lastReport.TimeStamp && this.lastReport.Value) {
              var diffVal = parseFloat((val - this.lastReport.Value) * 1000); // dW [Wh]
              var diffTime = parseFloat(
                (valTime - this.lastReport.TimeStamp) / 1000 //dT [s]
              );
              this.log("diffVal [Wh]=" + diffVal + ", diffTime [s]=" + diffTime);
              if (diffVal > 0 && diffTime > 0) {
                var diff = parseFloat((diffVal * diffTime) / 3600); // P [W]
                this.log("diff=P [W]=" + diff);
                if (diff > 0) this.setCapabilityValue("measure_power", Math.round(diff * 100) / 100);
              }
            }
            this.lastReport.TimeStamp = valTime;
            this.lastReport.Value = val;
          } catch (err) {
            this.error("Error setting value:" + err);
            //reject(err);
          }
        }
        this.setTimeParams().catch(err => {
          var err_text = " ### promise error setting date: " + err;
          this.error(err_text);
          return new Error(err_text);
        });
        return val;
      }
    });

    this.on("online", online => {
      this.log("Online");
      if (online) {
        this.setCapabilityValue("time_set", new Date().toLocaleString());
      }
    });

    this.setCapabilityValue("meter_power", null);
    this.setCapabilityValue("measure_power", null);
    this.setCapabilityValue("measure_battery", null);
    //this.setCapabilityValue("time_set", null);

    this.setTimeParams()
      .then(this.log(" ### date successfully set"))
      .catch(err => {
        var err_text = " ### promise error setting date: " + err;
        this.error(err_text);
        return new Error(err_text);
      });

    Promise.all([this.refreshCapabilityValue("measure_battery", "BATTERY"), this.refreshCapabilityValue("meter_power", "METER")])
      //.then(this.log(" ### refreshed capabilities"))
      .catch(err => {
        var err_text = " ### promise error getting meter_power: " + err;
        this.error(err_text);
        return new Error(err_text);
      });
    //this.refreshCapabilityValue("measure_power", "METER");

    let NQ9021_reset_meter_run_listener = async args => {
      let result = await args.device.node.CommandClass.COMMAND_CLASS_METER.METER_RESET({});
      if (result !== "TRANSMIT_COMPLETE_OK") {
        var err_text = " ### promise error reset meter: " + result;
        this.error(err_text);
        return new Error(err_text);
      }
      this.lastReport.TimeStamp = undefined;
      this.lastReport.Value = undefined;
    };
    let actionNQ9021_reset_meter = new Homey.FlowCardAction("NQ9021_reset_meter");
    actionNQ9021_reset_meter.register().registerRunListener(NQ9021_reset_meter_run_listener);

    this.log(" ### listener running");

    //this.printNode();
    this.log(" ### onMeshInit finish");
  }

  async setTimeParams() {
    let value = new Date();
    var dateArray = new Buffer(7);
    dateArray[0] = parseInt(value.getUTCFullYear() / 100);
    dateArray[1] = parseInt(value.getUTCFullYear() % 100);
    dateArray[2] = parseInt(value.getUTCMonth() + 1);
    dateArray[3] = parseInt(value.getUTCDate());
    dateArray[4] = parseInt(value.getUTCHours());
    dateArray[5] = parseInt(value.getUTCMinutes());
    dateArray[6] = parseInt(value.getUTCSeconds());
    //var dateArray = [{ Year: parseInt(value.getUTCFullYear()) }, parseInt(value.getUTCMonth() + 1), parseInt(value.getUTCDate()), parseInt(value.getUTCHours()), parseInt(value.getUTCMinutes()), parseInt(value.getUTCSeconds())];
    //var dateArray = new Array([0, 0, 0, 0, 0, 0, 0]);
    //var dateArray = new ArrayBuffer(7);
    this.log("Date array:" + util.inspect(dateArray));
    //return new Promise((resolve, reject) => {
    const CC_TimeSet = await this.getCommandClass("TIME_PARAMETERS");
    if (CC_TimeSet instanceof Error) Promise.reject(new Error("failed_to_get_time_params_command_class"));
    if (typeof CC_TimeSet.TIME_PARAMETERS_SET !== "function") Promise.reject(new Error("time_params_set_funcion_unavailable"));
    this.log("Setting time param:" + value);
    return CC_TimeSet.TIME_PARAMETERS_SET(dateArray);

    //});
  }
}

module.exports = PowerMeter_NQ9021;
