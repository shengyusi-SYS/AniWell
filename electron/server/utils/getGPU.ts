import { logger } from './logger'
import wmi from 'node-wmi'
import os from 'os'
const osPlatform: string = os.type() == 'Linux' ? 'lin' : os.type() == 'Windows_NT' ? 'win' : ''
let gpus
async function getGPU() {
    if (osPlatform == 'win') {
        return new Promise((r, j) => {
            wmi.Query(
                {
                    class: 'Win32_VideoController',
                },
                function (err, info) {
                    if (err) {
                        return j(err)
                    }
                    const gpu = {}
                    info.forEach((v) => {
                        gpu[v.Caption] = `:,vendor=0x${v.PNPDeviceID.match(/VEN_\w{4}/)[0].replace(
                            'VEN_',
                            '',
                        )}`
                    })
                    return r(gpu)
                },
            )
        })
    }
    if (osPlatform == 'lin') {
        return Promise.resolve({
            intel: ':,driver=iHD,kernel_driver=i915',
            amd: ``,
            nvidia: ``,
            vaapi: `:/dev/dri/renderD128`,
        })
    }
}
getGPU()
    .then((result) => {
        gpus = result
        logger.info('gpus', gpus)
    })
    .catch((err) => {
        logger.error('gpuErr', err)
    })
export default gpus
