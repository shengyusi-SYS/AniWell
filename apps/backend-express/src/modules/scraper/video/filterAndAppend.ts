import {
    getMediaInfo,
    getVideoMimeType,
    getScreenedMediaInfo,
    ScreenedMediaInfo,
} from '@s/utils/media'
import { getFileType, vidoeHash } from '@s/utils'
import { FileMetadata } from '@s/store/library'
import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'

type baseInfo = FileMetadata['baseInfo']
export interface AppendedMetadata extends baseInfo, ScreenedMediaInfo {
    hash: string
    mime?: string
}
export default async function filterAndAppend(filePath: string) {
    try {
        const typeFilter = (await getFileType(filePath))?.type === 'video'
        if (!typeFilter) {
            return
        }
        const mediaInfo = { hash: '', mime: '', pixFmt: '' }
        try {
            mediaInfo.hash = await vidoeHash(filePath)
            mediaInfo.mime = await getVideoMimeType(filePath)
            const screenedMediaInfo = (await getScreenedMediaInfo(filePath)) as AppendedMetadata
            mediaInfo.pixFmt = screenedMediaInfo.vidoeStream.pix_fmt
            scrapeLogger.debug('filterAndAppend mediaInfo', filePath, mediaInfo)
        } catch (error) {
            scrapeLogger.error('filterAndAppend mediaInfo', filePath, mediaInfo, error)
        }

        return mediaInfo
    } catch (error) {
        scrapeLogger.error('filterAndAppend', filePath, error)
        return
    }
}
