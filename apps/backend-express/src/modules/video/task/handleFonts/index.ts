import path from 'path'
import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'
import { VideoInfo } from '../getVideoInfo'
import fontsStore, { fontInfo } from '@s/store/fonts'

async function handleFonts(videoInfo: VideoInfo) {
    try {
        logger.debug('handleFonts start')

        const filePath = videoInfo.filePath
        const boxPath = path.dirname(filePath)

        let fontsList: Array<fontInfo> = await fontsStore.get(boxPath)
        logger.debug('handleFonts fontsList', [fontsList])
        if (fontsList == undefined || fontsList.length === 0) {
            try {
                fontsList = await fontsStore.scan(boxPath)
            } catch (error) {
                logger.error('handleFonts error', error)
            }
        }

        videoInfo.fontsList = fontsList

        logger.debug('handleFonts end', fontsList)
        return fontsList
    } catch (error) {
        logger.error('handleFonts error', error)
        return []
    }
}
export default handleFonts
