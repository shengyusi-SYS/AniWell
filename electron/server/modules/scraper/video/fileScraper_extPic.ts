import { AppendedMetadata } from './filterAndAppend'
import { ScraperResult, FileMetadata } from '@s/store/library'
import { extractPicture } from '@s/utils/media'
import { LibraryStore } from '@s/store/library'
import { scrapeLogger } from '@s/utils/logger'
import type { TaskProgressController } from '..'
type fileMetadata = FileMetadata & {
    baseInfo: AppendedMetadata
}
export const scraperName = 'extPic'

export default async function scraper(library: LibraryStore['']) {
    scrapeLogger.info('extPic start')

    const flatFile = library.flatFile
    const overwrite = library.config[scraperName]?.overwrite

    const progressController: TaskProgressController = this.progressController
    if (progressController) {
        progressController.setStage({
            stageName: 'extPic',
            stageTotal: Object.keys(flatFile).length,
        })
    }
    for (const filePath in flatFile) {
        progressController.setCurrent({ currentName: filePath })
        const poster = await extractPicture({ inputPath: filePath, overwrite })
        if (poster) {
            const fileMetadata = flatFile[filePath]
            fileMetadata.scraperInfo[scraperName] = {
                poster,
            }
        }
    }
}
