const fs = require('fs');
const path = require('path');
try { fs.accessSync(path.join('log')) }
catch (error) { fs.mkdirSync(path.join('log')) }

let config = {
    "appenders": {
        "console": {
            "type": "console"
        },
        "trace": {
            "type": "file",
            "filename": "log/access.log",
            "maxLogSize ": 31457280
        },
        "http": {
            "type": "logLevelFilter",
            "appender": "trace",
            "level": "trace",
            "maxLevel": "trace"
        },
        "info": {
            "type": "dateFile",
            "filename": "log/app-info.log",
            "pattern": ".yyyy-MM-dd",
            "layout": {
                "type": "pattern",
                "pattern": "[%d{ISO8601}][%5p %z %c] %m"
            },
            "compress": true
        },
        "maxInfo": {
            "type": "logLevelFilter",
            "appender": "info",
            "level": "debug",
            "maxLevel": "info"
        },
        "error": {
            "type": "dateFile",
            "filename": "log/app-error.log",
            "pattern": ".yyyy-MM-dd",
            "layout": {
                "type": "pattern",
                "pattern": "[%d{ISO8601}][%5p %z %c] %m"
            },
            "compress": true
        },
        "minError": {
            "type": "logLevelFilter",
            "appender": "error",
            "level": "error"
        },
        "allTranscode": {
            "type": "dateFile",
            "filename": "log/transcode.log",
            "pattern": ".yyyy-MM-dd",
            "layout": {
                "type": "pattern",
                "pattern": "[%d{ISO8601}][%5p %z %c] %m"
            },
            "compress": true
        },
        "transcode": {
            "type": "logLevelFilter",
            "appender": "allTranscode",
            "level": "debug"
        }
    },
    "categories": {
        "default": {
            "appenders": [
                "console",
                "maxInfo",
                "minError"
            ],
            "level": "all"
        },
        "http": {
            "appenders": [
                "http"
            ],
            "level": "all"
        },
        "transcode": {
            "appenders": [
                "transcode"
            ],
            "level": "all"
        }
    }
}
const log4js = require('log4js');
log4js.configure(config);
const logger = log4js.getLogger('maxInfo')
const transcodeLogger = log4js.getLogger('transcode')
module.exports = {
    log4js,
    logger,
    transcodeLogger
}