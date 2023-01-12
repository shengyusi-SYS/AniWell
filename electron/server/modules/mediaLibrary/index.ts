import dandanplayScraper from './dandanplayScraper'
import { access, writeFile, readFile } from 'fs/promises'
import { getFileType, TaskPool, appedDirTree, event, searchLeaf, Tree } from '@s/utils'
import { logger } from '@s/utils/logger'
import path from 'path'
import { diffWords } from 'diff'
import xml2js from 'xml2js'
import init from '@s/utils/init'
const { libraryIndex, libraryIndexPath } = init
import settings from '@s/store/settings'
export interface MediaLeaf extends Tree {
    title?: string
    poster?: string
}

const xmlBuilder = new xml2js.Builder()
const taskQueue = new TaskPool(1)

event.on('addLibrary', (libraryPath, libraryName) => {
    taskQueue.task(async () => await initMediaLibrary(libraryPath, libraryName))
})

//新建和更新媒体库，初次为全量更新，默认为增量更新（由existTree判断）
async function initMediaLibrary(libraryPath = '', libraryName = '', update = false) {
    try {
        logger.info('initMediaLibrary start', libraryPath, libraryName)
        //默认命名
        if (!libraryName) {
            libraryName = path.basename(libraryPath)
        }

        const libraryRootDir = libraryPath

        //检查已有数据，没有则新建，存入libraryIndex.children
        let existTree = searchLeaf(libraryIndex, libraryRootDir)
        if (!existTree) {
            existTree = { label: libraryName, path: libraryRootDir, children: [] }
            libraryIndex.children.push(existTree)
        }

        //弹弹play进行第一遍刮削
        await dandanplayScraper(path.resolve(libraryRootDir), existTree, { update })

        //dandanplayScraper是对existTree进行修改，而existTree已存入libraryIndex
        await writeFile(libraryIndexPath, JSON.stringify(libraryIndex, null, '\t'))

        //tmdb进行第二遍刮削，待完成

        logger.info('initMediaLibrary end', libraryPath, libraryName)
        return
    } catch (error) {
        logger.error('initMediaLibrary', error)
    }
}

//清理磁盘上不存在的媒体信息
async function cleanLibrary() {
    logger.info('cleanLibrary start')
    await writeFile(
        path.resolve(settings.get('tempPath'), 'libraryIndex_backup.json'),
        JSON.stringify(libraryIndex, null, '\t'),
    )
    async function clean(dirTree) {
        const queue = []
        const tempChildren = []
        dirTree.children.forEach((v) => {
            queue.push(
                new Promise(async (resolve, reject) => {
                    try {
                        const itemPath = path.resolve(dirTree.path, v.label)
                        await access(itemPath)
                        tempChildren.push(v)
                        await clean(v)
                    } catch (error) {}
                    resolve(null)
                }),
            )
        })
        dirTree.children = tempChildren
        await Promise.all(queue)
    }
    const allQueue = []
    libraryIndex.children.forEach((v) => {
        allQueue.push(clean(v))
    })
    await Promise.all(allQueue)
    await writeFile(libraryIndexPath, JSON.stringify(libraryIndex, null, '\t'))
    logger.info('cleanLibrary end')
}

//计算媒体库根目录，防止多层嵌套导致异步任务效率低下甚至出错，然而函数本身效率不高:-(，暂未实装，看反馈决定
async function getLibraryRootDir(dirPath = '') {
    try {
        let libraryRootDir = ''
        let compared = false
        await appedDirTree(
            dirPath,
            {},
            {
                fileFilter: async (filePath) => {
                    const res = await getFileType(filePath)
                    if (res == 'video') {
                        if (!libraryRootDir) {
                            libraryRootDir = path.dirname(filePath)
                        } else {
                            if (libraryRootDir != path.dirname(filePath)) {
                                libraryRootDir = diffWords(
                                    libraryRootDir,
                                    path.dirname(filePath),
                                )[0].value
                                compared = true
                            }
                        }
                        return true
                    } else return false
                },
                appendFileInfo: buildEmptyNfo,
            },
        )
        if (!compared) {
            libraryRootDir = path.dirname(libraryRootDir)
        }
        return libraryRootDir
    } catch (error) {}
}

//新建空的nfo文件
async function buildEmptyNfo(filePath) {
    const nfoPath = path.resolve(path.dirname(filePath), `${path.parse(filePath).name}.nfo`)
    try {
        await readFile(nfoPath)
        console.log('has', nfoPath)
    } catch (error) {
        const emptyInfo = {
            episodedetails: {
                title: path.basename(filePath),
                original_filename: path.basename(filePath),
            },
        }
        await writeFile(nfoPath, xmlBuilder.buildObject(emptyInfo))
    }
}

export { initMediaLibrary, cleanLibrary }
