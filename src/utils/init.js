const logger = require('../utils/logger').logger;
const fs = require('fs');
const path = require('path');
const Ffmpeg = require('fluent-ffmpeg');
const os = require('os');
var osPlatform
var ffmpegSuffix
switch (os.type()) {
    case 'Linux':
        osPlatform = 'lin'
        break;
    case 'Darwin':
        osPlatform = 'mac'
        break;
    case 'Windows_NT':
        osPlatform = 'win'
        ffmpegSuffix = '.exe'
        break
}

var settings = {
    qbHost: 'http://localhost:8080',
    serverPort: 9009,
    tempPath: os.tmpdir(),
    ffmpegPath: './',
    dandanplayPath: '',
    cert: './ssl/domain.pem',
    key: './ssl/domain.key',
    secure: false,
    // burnSubtitle: true,
    // forceTranscode: false,
    share: false,
    platform: 'nvidia',
    encode: 'h264',
    bitrate: 5,
    autoBitrate: false,
    advAccel: true,
    customInputCommand: '',
    customOutputCommand: '',
}
const settingsList = {
    qbHost: { type: 'text' },
    tempPath: { type: 'text' },
    cert: { type: 'text' },
    key: { type: 'text' },
    ffmpegPath: { type: 'text' },
    dandanplayPath: { type: 'text' },
    secure: { type: 'switch' },
    burnSubtitle: { type: 'switch' },
    forceTranscode: { type: 'switch' },
    share: { type: 'switch' },
    autoBitrate: { type: 'switch' },
    platform: { type: 'radio' },
    encode: { type: 'radio' },
    customInputCommand: { type: 'textarea' },
    customOutputCommand: { type: 'textarea' },
    serverPort: { type: 'number' },
    bitrate: { type: 'number' },
}

try {
    fs.accessSync('./settings.json')
    try {
        var newSettings = JSON.parse(fs.readFileSync('./settings.json'))
        if (newSettings) {
            settings = Object.assign(settings, newSettings)
            fs.writeFileSync('./settings.json', JSON.stringify(settings, '', '\t'))
            fs.writeFileSync(path.resolve(settings.tempPath, './settings_backup.json'), JSON.stringify(settings, '', '\t'))
            logger.debug('init', '已加载本地配置', settings);
        } else {
            newSettings = JSON.parse(fs.readFileSync(path.resolve(settings.tempPath, './settings_backup.json')))
            settings = Object.assign(settings, newSettings)
            logger.debug('init', '配置项错误，请检查1');
        }
        if (settings.ffmpegPath) {
            try {
                Ffmpeg.setFfmpegPath(path.resolve(settings.ffmpegPath, `ffmpeg${ffmpegSuffix}`))
                Ffmpeg.setFfprobePath(path.resolve(settings.ffmpegPath, `ffprobe${ffmpegSuffix}`))
                logger.debug('debug', path.resolve(settings.ffmpegPath, `ffmpeg${ffmpegSuffix}`));
            } catch (error) {
                logger.debug('init', 'ffmpeg路径错误，请检查2');
            }
        }
    } catch (error) {
        logger.debug('init', '配置项错误，请检查2', error);
    }
} catch (error) {
    try {
        const defaultDandanplayPath = path.resolve(os.homedir(), 'AppData', 'Roaming', '弹弹play')
        fs.accessSync(path.resolve(defaultDandanplayPath, 'library.json'))
        logger.debug('init', '在默认位置找到弹弹play');
        settings.dandanplayPath = defaultDandanplayPath
    } catch (error) {
        logger.debug('init', '未在默认位置找到弹弹play');
    }
    try {
        let defaultFFmpegPath
        if (osPlatform == 'win') {
            defaultFFmpegPath = path.resolve(__dirname, 'thirdParty', 'win')
            try {
                fs.accessSync(path.resolve(defaultFFmpegPath, 'ffmpeg.exe'))
                settings.ffmpegPath = defaultFFmpegPath
            } catch (error) {
            }
        }
        if (osPlatform == 'lin') {
            defaultFFmpegPath = path.resolve('/usr/share/jellyfin-ffmpeg/')
            try {
                fs.accessSync(path.resolve(defaultFFmpegPath, 'ffmpeg'))
                settings.ffmpegPath = defaultFFmpegPath
                logger.debug('init', '已在默认位置找到ffmpeg')
            } catch (error) {
                logger.error('error', '未在默认位置找到ffmpeg')
            }
        }
    } catch (error) {

    }
    // settings.dir = __dirname
    // settings.base = path.resolve('')
    try {
        fs.accessSync('./temp')
    } catch (error) {
        fs.mkdirSync('./temp')
    }
    fs.writeFileSync('./settings.json', JSON.stringify(settings, '', '\t'))
    logger.debug('init', '已写入默认配置');
}
// logger.debug('debug',settings);
//转发配置
var proxySettings = {
    target: settings.qbHost,
    changeOrigin: false,
    secure: settings.secure,
    ssl: {
    }
}
try {
    proxySettings.ssl.cert = fs.readFileSync(settings.cert, 'utf8')
    proxySettings.ssl.key = fs.readFileSync(settings.key, 'utf8')
} catch (error) {
    logger.error('error', error);
}


var libraryIndex = { allSeason: {}, episodes: {}, collections: {} }


// const specialCharacter = ['\\', '$', '(', ')', '*', '+', '.', '[', '?', '^', '{', '|']
try {
    fs.stat('./temp/backup.json', (err) => { })
    libraryIndex = JSON.parse(fs.readFileSync('./libraryIndex.json'))
    logger.debug('debug', '已加载匹配数据');
} catch (error) {
    // logger.debug('debug',error);
}

module.exports = {
    settings,
    Ffmpeg,
    proxySettings,
    libraryIndex,
    osPlatform,
    ffmpegSuffix
}
