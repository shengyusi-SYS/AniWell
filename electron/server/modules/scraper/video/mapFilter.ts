import { dotGet } from '@s/utils'
import { AppendedMetadata } from './filterAndAppend'
import { ScraperResult, FileMetadata } from '@s/store/library'
type fileMetadata = FileMetadata & {
    fileInfo: AppendedMetadata
}
export default function filter(fileMetaData: fileMetadata, mapName: string, mapTarget: string) {
    const mapValue = dotGet(fileMetaData, mapTarget)
    if (mapValue == undefined) {
        return
    }
    switch (mapName) {
        case 'poster':
            break

        default:
            break
    }
    return mapValue
}
