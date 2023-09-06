import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'
import fs from 'fs'
import path, { dirname, join } from 'path'
import os from 'os'
import gpus from './getGPU'
import paths from './envPath'
import settings from '@s/store/settings'
import pkg from '../../../../package.json'
import { createCertificate } from '@s/utils/certificate'
import { FFmpegInstaller } from '@s/utils/media'

class Init {
    osPlatform: string = os.type() == 'Linux' ? 'lin' : os.type() == 'Windows_NT' ? 'win' : 'mac'

    ffmpegSuffix: string = os.type() == 'Linux' ? '' : os.type() == 'Windows_NT' ? '.exe' : ''

    ffmpegPath: string = './'

    ffprobePath: string = './'

    ssl = {
        cert: '',
        key: '',
    }

    gpus = gpus

    inited = false

    APPNAME = pkg.name

    VERSION = pkg.version

    init = async () => {
        this.setFFmpeg()
        this.setSSL()
    }

    private setFFmpeg(): boolean {
        if (FFmpegInstaller.checkFile()) {
            this.ffmpegPath = FFmpegInstaller.ffmpegPath
            this.ffprobePath = FFmpegInstaller.ffproberPath
            settings.server.ffmpegPath = dirname(FFmpegInstaller.ffmpegPath)
            logger.info('ffmpeg founded in ' + FFmpegInstaller.ffmpegPath)
            return true
        } else {
            logger.error('ffmpeg not found,please install')
            settings.server.ffmpegPath = './'
            return false
        }
    }

    private setSSL() {
        try {
            this.ssl.cert = fs.readFileSync(settings.server.cert, 'utf8')
            this.ssl.key = fs.readFileSync(settings.server.key, 'utf8')
        } catch (error) {
            const defaultSSLPath = path.resolve(paths.data, 'ssl')
            try {
                fs.mkdirSync(defaultSSLPath)
            } catch (error: any) {
                if (error?.code !== 'EEXIST') logger.error('mkdir defaultSSLPath', error)
            }
            try {
                const cert = createCertificate()
                this.ssl = cert
                fs.writeFileSync(join(defaultSSLPath, 'domain.pem'), cert.cert)
                fs.writeFileSync(join(defaultSSLPath, 'domain.key'), cert.key)
                logger.info('init 已创建自签名证书')
            } catch (error) {
                logger.fatal('init 写入自签名证书失败', error)
            }
        }
    }
}

const init = new Init()
await init.init()
export default init
