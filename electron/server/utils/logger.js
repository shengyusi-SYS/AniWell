const fs = require("fs");
const path = require("path");
try {
  fs.accessSync(path.join("log"));
} catch (error) {
  fs.mkdirSync(path.join("log"));
}
try {
  var debug = JSON.parse(fs.readFileSync("./settings.json")).debug;
  if (debug) {
    console.log("已开启debug模式");
  }
} catch (error) {
  debug = true;
  console.log("初次使用默认开启debug");
}
let config = {
  appenders: {
    console: {
      type: "console",
    },
    trace: {
      type: "file",
      filename: "log/access.log",
      "maxLogSize ": 31457280,
    },
    http: {
      type: "logLevelFilter",
      appender: "trace",
      level: "trace",
      maxLevel: "trace",
    },
    info: {
      type: "dateFile",
      filename: "log/app-info.log",
      pattern: ".yyyy-MM-dd",
      layout: {
        type: "pattern",
        pattern: "[%d{ISO8601}][%5p %z %c] %m",
      },
      compress: true,
    },
    maxInfo: {
      type: "logLevelFilter",
      appender: "info",
      level: "debug",
      maxLevel: "info",
    },
    error: {
      type: "dateFile",
      filename: "log/app-error.log",
      pattern: ".yyyy-MM-dd",
      layout: {
        type: "pattern",
        pattern: "[%d{ISO8601}][%5p %z %c] %m",
      },
      compress: true,
    },
    minError: {
      type: "logLevelFilter",
      appender: "error",
      level: "error",
    },
    allTranscode: {
      type: "dateFile",
      filename: "log/transcode.log",
      pattern: ".yyyy-MM-dd",
      layout: {
        type: "pattern",
        pattern: "[%d{ISO8601}][%5p %z %c] %m",
      },
      compress: true,
    },
    transcode: {
      type: "logLevelFilter",
      appender: "allTranscode",
      level: "debug",
    },
    allScrape: {
      type: "dateFile",
      filename: "log/scrape.log",
      pattern: ".yyyy-MM-dd",
      layout: {
        type: "pattern",
        pattern: "[%d{ISO8601}][%5p %z %c] %m",
      },
      compress: true,
    },
    scrape: {
      type: "logLevelFilter",
      appender: "allScrape",
      level: "debug",
    },
  },
  categories: {
    default: {
      appenders: ["console", "maxInfo", "minError"],
      level: "all",
    },
    http: {
      appenders: ["http"],
      level: "all",
    },
    transcode: {
      appenders: ["transcode"],
      level: "all",
    },
    scrape: {
      appenders: ["scrape"],
      level: "all",
    },
  },
};
if (debug === false) {
  let cat = config.categories;
  for (const key in cat) {
    cat[key].level = "info";
  }
}
const log4js = require("log4js");
log4js.configure(config);
const logger = log4js.getLogger("maxInfo");
const transcodeLogger = log4js.getLogger("transcode");
const scrapeLogger = log4js.getLogger("scrape");
export { log4js, logger, transcodeLogger, scrapeLogger };
