import { logger } from './logger'
import os from 'os'
import child_process from 'child_process'

const osPlatform: string = os.type() == 'Linux' ? 'lin' : os.type() == 'Windows_NT' ? 'win' : ''
let gpus = {}

if (osPlatform == 'win') {
    const output = child_process
        .execSync('wmic path Win32_VideoController get /format:list')
        .toString()
    const cards = output.trim().split('\r\r\n\r\r')
    cards.forEach((card, i) => {
        const lines = card.split('\n')
        let cardName = ''
        let cardID = ''
        for (const line of lines) {
            if (line.includes('=')) {
                const [key, value] = line.split('=')
                if (key == 'Caption') {
                    cardName = i + ':' + value.trim()
                }
                if (key == 'PNPDeviceID') {
                    const val = value.trim().match(/VEN_\w{4}/)
                    cardID = val ? `:,vendor=0x${val[0].replace('VEN_', '')}` : ''
                }
            }
        }
        gpus[cardName] = cardID
    })
}
if (osPlatform == 'lin') {
    gpus = {
        intel: ':,driver=iHD,kernel_driver=i915',
        amd: ``,
        nvidia: ``,
        vaapi: `:/dev/dri/renderD128`,
    }
}

logger.info('gpus', gpus)
export default gpus
