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
        ffmpegSuffix = ''
        break;
    case 'Darwin':
        osPlatform = 'mac'
        break;
    case 'Windows_NT':
        osPlatform = 'win'
        ffmpegSuffix = '.exe'
        break
}

const settingsList = {
    qbHost: { type: 'text', name: 'qbHost', value: 'http://localhost:8080', placeholder: 'http://localhost:8080' },
    serverPort: { type: 'number', name: 'serverPort', value: 9009, placeholder: '9009' },
    tempPath: { type: 'text', name: 'tempPath', value: os.tmpdir(), placeholder: os.tmpdir() },
    ffmpegPath: { type: 'text', name: 'ffmpegPath', value: path.resolve(__dirname, `../thirdParty/${osPlatform}`), placeholder: path.resolve(__dirname, `../thirdParty/${osPlatform}`) },
    // dandanplayPath: { type: 'text', name: 'dandanplayPath', value: '', placeholder: '' },
    cert: { type: 'text', name: 'cert', value: './ssl/domain.pem', placeholder: './ssl/domain.pem' },
    key: { type: 'text', name: 'key', value: './ssl/domain.key', placeholder: './ssl/domain.key' },
    // burnSubtitle: { type: 'switch',name:'burnSubtitle',value:'' },
    secure: { type: 'switch', name: 'secure', value: false },
    share: { type: 'switch', name: 'share', value: false },
    bitrate: { type: 'number', name: 'bitrate', value: '5', placeholder: '5' },
    autoBitrate: { type: 'switch', name: 'autoBitrate', value: false },
    advAccel: { type: 'switch', name: 'advAccel', value: true },
    platform: { type: 'radios', name: 'platform', value: 'nvidia', placeholder: '', radios: { nvidia: { name: 'nvidia', value: 'nvidia' }, intel: { name: 'intel', value: 'intel' }, amd: { name: 'amd', value: 'amd' }, vaapi: { name: 'vaapi', value: 'vaapi' } } },
    encode: { type: 'radios', name: 'encode', value: 'h264', placeholder: '', radios: { h264: { name: 'h264', value: 'h264' }, h265: { name: 'h265', value: 'h265' } } },
    tmdbKey: { type: 'text', name: 'tmdbKey', value: '', placeholder: 'TMDB API KEY' },
    customInputCommand: { type: 'textarea', name: 'customInputCommand', value: '', placeholder: '指令设定请参考readme文档，勿轻易修改' },
    customOutputCommand: { type: 'textarea', name: 'customOutputCommand', value: '', placeholder: '指令设定请参考readme文档，勿轻易修改' },
    debug: { type: 'switch', name: 'debug', value: false },
}
var settings = {}
for (const key in settingsList) {
    settings[settingsList[key].name] = settingsList[key].value
}



function mergeSettings(settingsList = settingsList, settings = settings, newSettings) {
    settings = Object.assign(settings, newSettings)
    // console.log(settings);
    for (const key in settings) {
        settingsList[key].value = settings[key]
    }
}

try {
    fs.accessSync('./settings.json')
    try {
        var newSettings = JSON.parse(fs.readFileSync('./settings.json'))
        if (newSettings) {
            mergeSettings(settingsList, settings, newSettings)
            fs.writeFileSync('./settings.json', JSON.stringify(settings, '', '\t'))
            fs.writeFileSync(path.resolve(settings.tempPath, './settings_backup.json'), JSON.stringify(settings, '', '\t'))
            logger.info('init', '已加载本地配置', settings);
        } else {
            newSettings = JSON.parse(fs.readFileSync(path.resolve(settings.tempPath, './settings_backup.json')))
            mergeSettings(settingsList, settings, newSettings)
            logger.info('init', '配置项错误，请检查1');
        }
        if (settings.ffmpegPath) {
            try {
                Ffmpeg.setFfmpegPath(path.resolve(settings.ffmpegPath, `ffmpeg${ffmpegSuffix}`))
                Ffmpeg.setFfprobePath(path.resolve(settings.ffmpegPath, `ffprobe${ffmpegSuffix}`))
                logger.info('init', path.resolve(settings.ffmpegPath, `ffmpeg${ffmpegSuffix}`));
            } catch (error) {
                logger.info('init', 'ffmpeg路径错误，请检查2');
            }
        }
    } catch (error) {
        logger.info('init', '配置项错误，请检查2', error);
    }
} catch (error) {
    // try {
    //     const defaultDandanplayPath = path.resolve(os.homedir(), 'AppData', 'Roaming', '弹弹play')
    //     fs.accessSync(path.resolve(defaultDandanplayPath, 'library.json'))
    //     logger.debug('init', '在默认位置找到弹弹play');
    //     settings.dandanplayPath = defaultDandanplayPath
    // } catch (error) {
    //     logger.debug('init', '未在默认位置找到弹弹play');
    // }
    try {
        let defaultFFmpegPath
        if (osPlatform == 'win') {
            defaultFFmpegPath = path.resolve(__dirname, '../thirdParty', 'win')
            fs.accessSync(path.resolve(defaultFFmpegPath, 'ffmpeg.exe'))
            settings.ffmpegPath = defaultFFmpegPath
            logger.info('init ffmpeg win', '已在默认位置找到ffmpeg')
        }else if (osPlatform == 'lin') {
            defaultFFmpegPath = path.resolve('/usr/share/jellyfin-ffmpeg/')
            fs.accessSync(path.resolve(defaultFFmpegPath, 'ffmpeg'))
            settings.ffmpegPath = defaultFFmpegPath
            logger.info('init ffmpeg lin', '已在默认位置找到ffmpeg')
        }
    } catch (error) {
        settings.ffmpegPath = ''
        logger.error('init ffmpeg', '未在默认位置找到ffmpeg')
    }
    // settings.dir = __dirname
    // settings.base = path.resolve('')
    try {
        fs.accessSync('./temp')
    } catch (error) {
        fs.mkdirSync('./temp')
    }
    mergeSettings(settingsList, settings)
    fs.writeFileSync('./settings.json', JSON.stringify(settings, '', '\t'))
    logger.debug('init', '已写入默认配置')
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
    logger.error('error ssl', error);
}


var libraryIndex = { label: 'libraryIndex', children: [] }
try {
    libraryIndex = JSON.parse(fs.readFileSync('./libraryIndex.json'))
    logger.info('debug', '已加载媒体库');
} catch (error) {
    logger.info('debug', '媒体库不存在');
}
if (!libraryIndex || !libraryIndex.children || !libraryIndex.label) {
    libraryIndex = { label: 'libraryIndex', children: [] }
    // console.log('init');
}

// const specialCharacter = ['\\', '$', '(', ')', '*', '+', '.', '[', '?', '^', '{', '|']

module.exports = {
    settings,
    settingsList,
    Ffmpeg,
    proxySettings,
    libraryIndex,
    osPlatform,
    ffmpegSuffix,
    mergeSettings
}
module.exports.gpus = require('./getGPU')

