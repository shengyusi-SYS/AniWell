import { join } from 'path'
import paths from './envPath'
import logForjs from 'log4js'

const config = {
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
        transcode: {
            type: 'dateFile',
            filename: join(paths.log, 'transcode.log'),
            pattern: '.yyyy-MM-dd',
            layout: {
                type: 'pattern',
                pattern: '[%d{ISO8601}][%5p %z %c] %m',
            },
            compress: true,
        },
        maxTranscode: {
            type: 'logLevelFilter',
            appender: 'transcode',
            level: 'debug',
            maxLevel: 'error',
        },
        scrape: {
            type: 'dateFile',
            filename: join(paths.log, 'scrape.log'),
            pattern: '.yyyy-MM-dd',
            layout: {
                type: 'pattern',
                pattern: '[%d{ISO8601}][%5p %z %c] %m',
            },
            compress: true,
        },
        maxScrape: {
            type: 'logLevelFilter',
            appender: 'allScrape',
            level: 'debug',
            maxLevel: 'error',
        },
    },
    categories: {
        default: {
            appenders: ['console', 'maxInfo', 'minError'],
            level: 'info',
        },
        http: {
            appenders: ['http'],
            level: 'all',
        },
        transcode: {
            appenders: ['transcode'],
            level: 'info',
        },
        scrape: {
            appenders: ['scrape'],
            level: 'info',
        },
    },
}
export const log4js = logForjs.configure(config)
export const logger = log4js.getLogger('default')
export const transcodeLogger = log4js.getLogger('maxTranscode')
export const scrapeLogger = log4js.getLogger('maxScrape')
export const httpLogger = log4js.getLogger('http')
export const changeLevel = async (debug = false) => {
    const cat = config.categories
    for (const key in cat) {
        if (['default', 'transcode', 'scrape'].includes(key)) {
            if (debug === false) {
                cat[key].level = 'info'
            } else if (debug === true) {
                cat[key].level = 'debug'
            }
        }
    }
    log4js.configure(config)
    logger.debug('changeLevel~~~~~~~~~~~~~~~~~~~~~~~~~~')
}
