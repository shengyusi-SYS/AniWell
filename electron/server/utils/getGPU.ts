import { logger } from './logger'
import os from 'os'
import { spawnSync } from 'child_process'

const osPlatform: string = os.type() == 'Linux' ? 'lin' : os.type() == 'Windows_NT' ? 'win' : ''
let gpus = {}

if (osPlatform == 'win') {
    const output = spawnSync('wmic', ['path Win32_VideoController get /format:list'], {
        shell: true,
        cwd: 'C:\\Windows\\System32\\wbem',
    }).stdout.toString('utf8')
    logger.debug('gpus output', output)
    const com = /Caption=(?<caption>.+)(.|\s)*?PNPDeviceID=PCI\\VEN_(?<deviceID>\w{4})(.|\n)+?/g
    const cards = output.matchAll(com)
    let i = 0
    for (const match of cards) {
        const cardName = i++ + ':' + match.groups.caption
        const cardID = `:,vendor=0x${match.groups.deviceID}`
        gpus[cardName] = cardID
    }
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
