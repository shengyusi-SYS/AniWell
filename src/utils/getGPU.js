var wmi = require('node-wmi');
function getGPU(osPlatform) {
    if (osPlatform == 'win') {
        return new Promise((r,j)=>{
            wmi.Query({
                class: 'Win32_VideoController'
            }, function (err, info) {
                if (err) {
                    return j(err)
                }
                let gpu = {}
                info.forEach(v => {
                    gpu[v.Caption] =`:,vendor=0x${v.PNPDeviceID.match(/VEN_\w{4}/)[0].replace('VEN_', '')}`
                });
                return r(gpu)
            })
        })
    }
    if (osPlatform == 'lin') {
        return Promise.resolve({
            intel:':,driver=iHD,kernel_driver=i915',
            amd:``,
            nvidia:``,
            vaapi:`:/dev/dri/renderD128`
        })
    }
}
module.exports = getGPU
