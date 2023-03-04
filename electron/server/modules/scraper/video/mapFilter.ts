import { dotGet } from '@s/utils'
import { AppendedMetadata } from './filterAndAppend'
import { ScraperResult, FileMetadata, DirMetadata } from '@s/store/library'
type fileMetadata = FileMetadata & {
    baseInfo: AppendedMetadata
}
export default function filter(
    metaData: fileMetadata | DirMetadata,
    mapName: string,
    mapTarget: string,
) {
    const mapValue = dotGet(metaData, mapTarget)
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
