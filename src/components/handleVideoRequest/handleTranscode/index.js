const {logger} = require('../../../utils/logger');
const generateFFmpegCommand = require('./generateFFmpegCommand');
const {generateM3U8} = require('./generateM3U8');
const {generateTsQueue} = require('./generateTsQueue');
async function handleTranscode(videoInfo,subtitleList) {
    try {
        logger.debug('handleTranscode','start',videoInfo,subtitleList)
        await generateM3U8(videoInfo)
        let videoIndex = videoInfo.videoIndex
        let commandTemplate = await generateFFmpegCommand(videoInfo, subtitleList)
        let FFmpegProcess = await generateTsQueue(videoInfo,commandTemplate)
        logger.debug('handleTranscode','end',FFmpegProcess['index0'])
        return FFmpegProcess
    } catch (error) {
        logger.error('handleTranscode',error)
    }

}
module.exports = handleTranscode