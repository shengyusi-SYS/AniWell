import {
    getMediaInfo,
    getVideoMimeType,
    getScreenedMediaInfo,
    ScreenedMediaInfo,
} from '@s/utils/media'
import { getFileType, vidoeHash } from '@s/utils'
import { FileMetadata } from '@s/store/library'

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
        // const mediaInfo = (await getScreenedMediaInfo(filePath)) as AppendedMetadata
        const mediaInfo = { hash: '', mime: '' }
        if (mediaInfo) {
            try {
                mediaInfo.hash = await vidoeHash(filePath)
                mediaInfo.mime = await getVideoMimeType(filePath)
            } catch (error) {}
            return mediaInfo
        } else {
            return
        }
    } catch (error) {
        return
    }
}
