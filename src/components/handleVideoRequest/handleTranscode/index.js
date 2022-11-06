const generateFFmpegCommand = require('./generateFFmpegCommand');
const generateM3U8 = require('./generateM3U8');
const generateTsQueue = require('./generateTsQueue');
async function handleTranscode(method,videoInfo,subtitleList) {
    let {targetBitrate,targetResolution} = method
    let commandTemplate = await generateFFmpegCommand()
    let result = await Promise.all(generateM3U8(videoInfo),generateTsQueue(videoInfo, subtitleList))
    FFmpegProcess = result[1]
    return FFmpegProcess
}