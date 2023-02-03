import fs from 'fs'
import { resolve, join } from 'path'
import paths from './envPath'
try {
    fs.mkdirSync(paths.log)
} catch (error) {}
import logForJs from 'log4js'
class Logger {
    private config = {
        appenders: {
            console: {
                type: 'console',
            },
            trace: {
                type: 'file',
                filename: join(paths.log, 'access.log'),
                'maxLogSize ': 31457280,
            },
            http: {
                type: 'logLevelFilter',
                appender: 'trace',
                level: 'trace',
                maxLevel: 'trace',
            },
            info: {
                type: 'dateFile',
                filename: join(paths.log, 'app-info.log'),
                pattern: '.yyyy-MM-dd',
                layout: {
                    type: 'pattern',
                    pattern: '[%d{ISO8601}][%5p %z %c] %m',
                },
                compress: true,
            },
            maxInfo: {
                type: 'logLevelFilter',
                appender: 'info',
                level: 'debug',
                maxLevel: 'info',
            },
            error: {
                type: 'dateFile',
                filename: join(paths.log, 'app-error.log'),
                pattern: '.yyyy-MM-dd',
                layout: {
                    type: 'pattern',
                    pattern: '[%d{ISO8601}][%5p %z %c] %m',
                },
                compress: true,
            },
            minError: {
                type: 'logLevelFilter',
                appender: 'error',
                level: 'error',
            },
            allTranscode: {
                type: 'dateFile',
                filename: join(paths.log, 'transcode.log'),
                pattern: '.yyyy-MM-dd',
                layout: {
                    type: 'pattern',
                    pattern: '[%d{ISO8601}][%5p %z %c] %m',
                },
                compress: true,
            },
            transcode: {
                type: 'logLevelFilter',
                appender: 'allTranscode',
                level: 'debug',
            },
            allScrape: {
                type: 'dateFile',
                filename: join(paths.log, 'scrape.log'),
                pattern: '.yyyy-MM-dd',
                layout: {
                    type: 'pattern',
                    pattern: '[%d{ISO8601}][%5p %z %c] %m',
                },
                compress: true,
            },
            scrape: {
                type: 'logLevelFilter',
                appender: 'allScrape',
                level: 'debug',
            },
        },
        categories: {
            default: {
                appenders: ['console', 'maxInfo', 'minError'],
                level: 'all',
            },
            http: {
                appenders: ['http'],
                level: 'all',
            },
            transcode: {
                appenders: ['transcode'],
                level: 'all',
            },
            scrape: {
                appenders: ['scrape'],
                level: 'all',
            },
        },
    }
    public log4js = logForJs
    public logger = this.log4js.getLogger('maxInfo')
    public transcodeLogger = this.log4js.getLogger('transcode')
    public scrapeLogger = this.log4js.getLogger('scrape')
    public httpLogger = this.log4js.getLogger('http')
    constructor() {
        this.changeLevel()
    }
    public changeLevel = async () => {
        try {
            var debug = JSON.parse(
                fs.readFileSync(resolve(paths.config, 'settings.json'), 'utf8'),
            ).debug
            if (debug) {
                console.log('已开启debug模式')
            }
        } catch (error) {
            debug = true
            console.log('初次使用默认开启debug')
        }
        const cat = this.config.categories
        for (const key in cat) {
            if (['maxInfo', 'transcode', 'scrape'].includes(key)) {
                if (debug === false) {
                    cat[key].level = 'info'
                } else if (debug === true) {
                    cat[key].level = 'debug'
                }
            }
        }
        this.log4js.configure(this.config)
        this.logger = this.log4js.getLogger('maxInfo')
        this.transcodeLogger = this.log4js.getLogger('transcode')
        this.scrapeLogger = this.log4js.getLogger('scrape')
        this.httpLogger = this.log4js.getLogger('http')
        this.logger.debug('changeLevel~~~~~~~~~~~~~~~~~~~~~~~~~~')
    }
}

export const { log4js, logger, transcodeLogger, scrapeLogger, httpLogger, changeLevel } =
    new Logger()
