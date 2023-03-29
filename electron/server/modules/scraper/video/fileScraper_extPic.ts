import { AppendedMetadata } from './filterAndAppend'
import { ScraperResult, FileMetadata } from '@s/store/library'
import { extractPicture } from '@s/utils/media'
import { LibraryStore } from '@s/store/library'
type fileMetadata = FileMetadata & {
    baseInfo: AppendedMetadata
}
export const scraperName = 'extPic'

export default async function scraper(library: LibraryStore['']) {
    const flatFile = library.flatFile
    const overwrite = library.config[scraperName]?.overwrite
    for (const filePath in flatFile) {
        const poster = await extractPicture({ inputPath: filePath, overwrite })
        if (poster) {
            const fileMetadata = flatFile[filePath]
            fileMetadata.scraperInfo[scraperName] = {
                poster,
            }
        }
    }
}
