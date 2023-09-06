import library, {
    LibraryStore,
    resultType,
    boxLevel,
    MapRule,
    libraryConfig,
    LibraryTree,
    MapResult,
} from '@s/store/library'
import { TaskPool } from '@s/utils'
import { searchLeaf } from '@s/utils/tree'
import { cutVideo } from '@s/utils/media'
import { kill } from 'process'
import Video from 'web-worker:../scraper/video/videoScraper.ts'
import { Worker } from 'worker_threads'
import { Scraper } from '../scraper'

const video = new Video() as unknown as Worker
video.postMessage({ method: cutVideo.toString() })
video.on('message', (msg) => {
    console.log('message', msg, msg instanceof Error)
})
video.on('exit', (code) => {
    console.log(code)
})
setTimeout(() => {
    video.postMessage({ method: {} })
}, 1000)

export interface ScraperConfig {
    rootPath: string
    name: string
    category: 'video' | 'anime'
    mapFile?: MapRule
    mapDir?: MapRule
    config?: libraryConfig
}

class LibraryManager {
    taskPool = new TaskPool(1)
    async buildLibrary({ libraryRootPath, libraryName, scraperName, scraperConfig }) {
        const scrapeTask = () =>
            new Promise<void>((resolve, reject) => {
                const scraper = new Scraper()
                scraper.load(scraperName, scraperConfig)
            })
    }
    async getLibrary(libName?: string, libPath?: string): Promise<LibraryTree> {
        if (!libName) {
            const overview: LibraryTree = {
                libName: 'overview',
                children: [],
                label: '',
                title: '',
                path: '',
                result: 'dir',
            }
            for (const libraryName in library) {
                const targetLibrary = library[libraryName]
                const targetLibraryRootDir = searchLeaf(targetLibrary.tree, targetLibrary.rootPath)
                if (targetLibraryRootDir) {
                    const result = {
                        ...targetLibraryRootDir,
                        libName: libraryName,
                        children: targetLibraryRootDir?.children
                            ?.filter((val, ind) => ind < 10)
                            .map((v) => {
                                return { ...v, children: null }
                            }),
                    }
                    overview.children.push(result)
                }
            }
            return overview
        } else {
            if (!library[libName]) {
                return undefined
            }
            const targetLibrary = library[libName]
            const targetLibraryRootDir = searchLeaf(
                targetLibrary.tree,
                libPath || targetLibrary.rootPath,
            )
            if (targetLibraryRootDir) {
                const result = {
                    libName,
                    ...targetLibraryRootDir,
                    children: targetLibraryRootDir.children.map((v) => {
                        return { ...v, children: null }
                    }),
                }
                return result
            }
            return undefined
        }
    }

    async getItem(libName: string, itemPath: string) {
        return library[libName].flatFile[itemPath] || library[libName].flatDir[itemPath]
    }
}

export default new LibraryManager()
