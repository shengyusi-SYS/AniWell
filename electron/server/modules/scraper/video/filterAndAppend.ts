import {
    getMediaInfo,
    getVideoMimeType,
    getScreenedMediaInfo,
    ScreenedMediaInfo,
} from '@s/utils/media'
import { getFileType, vidoeHash } from '@s/utils'
import { FileMetadata } from '@s/store/library'

type fileInfo = FileMetadata['fileInfo']
export interface AppendedMetadata extends fileInfo, ScreenedMediaInfo {
    hash: string
    mime?: string
}
export default async function filterAndAppend(filePath: string) {
    try {
        const firstFilter = (await getFileType(filePath))?.type === 'video'
        if (!firstFilter) {
            return
        }
        const mediaInfo = (await getScreenedMediaInfo(filePath)) as AppendedMetadata
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
