const getVideoInfo = require('./getVideoInfo');
const handleSubtitles = require('./handleSubtitles');
const selectMethod = require('./selectMethod');
const handleHlsRequest = require('./handleHlsRequest');
const handleTranscode = require('./handleTranscode');
async function handleVideoRequest(res,params) {
    let {filePath,bitrate,autoBitrate,resolution}=params
    let videoInfo = await getVideoInfo(filePath)
    let subtitleList = await handleSubtitles(filePath)
    let method = selectMethod(params,videoInfo,subtitleList)
    method = {name:'transcode',targetBitrate:5,targetResolution:'1080p',exist:false}
    let handler
    if (method.name == 'direct') {
    } else if (method.name == 'transcode') {
        if (method.exist) {
        }else{
           let FFmpegProcess =  await handleTranscode(method,videoInfo,subtitleList)
           handler=handleHlsRequest().setFFmpegProcess(FFmpegProcess)
        }
    }
    res.send("Ok.")
    return handler
}

module.exports = handleVideoRequest(res,filePath)