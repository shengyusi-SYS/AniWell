const {logger} = require('../../../utils/logger');
const generateFFmpegCommand = require('./generateFFmpegCommand');
const hlsProcessController = require('./hlsProcessController');
const {generateM3U8} = require('./generateM3U8');
async function handleTranscode(videoInfo,subtitleList) {
    try {
        // logger.debug('handleTranscode','start',videoInfo,subtitleList)
        await generateM3U8(videoInfo)
        let commandTemplate = await generateFFmpegCommand(videoInfo, subtitleList)
        let HlsProcessController = new hlsProcessController(videoInfo,commandTemplate)
        logger.debug('handleTranscode','end')
        return HlsProcessController
    } catch (error) {
        logger.error('handleTranscode',error)
    }

}
module.exports = handleTranscode