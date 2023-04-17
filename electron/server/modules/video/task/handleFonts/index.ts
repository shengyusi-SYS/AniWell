import path from 'path'
import { logger } from '@s/utils/logger'
import { VideoInfo } from '../getVideoInfo'
import fontsStore, { fontInfo } from '@s/store/fonts'

async function handleFonts(videoInfo: VideoInfo) {
    try {
        logger.debug('handleFonts start')

        const filePath = videoInfo.filePath
        const boxPath = path.dirname(filePath)

        let fontsList: Array<fontInfo> = fontsStore.get(boxPath)
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
