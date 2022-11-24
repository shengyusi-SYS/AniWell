const dandanplayScraper = require('./dandanplayScraper')
const { access, writeFile, readFile } = require('fs/promises');
const { getFileType, TaskPool, appedDirTree, event, searchLeaf } = require('../../utils');
const { scrapeLogger, logger } = require('../../utils/logger');
const path = require('path');
const { diffWords } = require('diff');
const xml2js = require('xml2js');
const { libraryIndex } = require('../../utils/init');

const xmlBuilder = new xml2js.Builder();
const taskQueue = new TaskPool(1)

event.on('addLibrary', (libraryPath, libraryName) => {
    taskQueue.task(async () => await initMediaLibrary(libraryPath, libraryName))
})

//新建和更新媒体库，初次为全量更新，默认为增量更新（由existTree判断）
async function initMediaLibrary(libraryPath = '', libraryName = '',update=false) {
    try {
        logger.info('initMediaLibrary start', libraryPath, libraryName)
        //默认命名
        if (!libraryName) {
            libraryName = path.basename(libraryPath)
        }

        let libraryRootDir = libraryPath

        //检查已有数据，没有则新建，存入libraryIndex.children
        let existTree = searchLeaf(libraryIndex, libraryRootDir)
        if (!existTree) {
            existTree = { label: libraryName, path: libraryRootDir, children: [] }
            libraryIndex.children.push(existTree)
        }

        //弹弹play进行第一遍刮削
        await dandanplayScraper(path.resolve(libraryRootDir), existTree,{update})

        //dandanplayScraper是对existTree进行修改，而existTree已存入libraryIndex
        await writeFile('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))

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
    await writeFile('./temp/libraryIndex_backup.json', JSON.stringify(libraryIndex, '', '\t'))
    async function clean(dirTree) {
        let queue = []
        let tempChildren = []
        dirTree.children.forEach(v => {
            queue.push(new Promise(async (resolve, reject) => {
                try {
                    let itemPath = path.resolve(dirTree.path, v.label)
                    await access(itemPath)
                    tempChildren.push(v)
                    await clean(v)
                } catch (error) { }
                resolve()
            }))
        })
        dirTree.children = tempChildren
        await Promise.all(queue)
    }
    let allQueue = []
    libraryIndex.children.forEach(v => {
        allQueue.push(clean(v))
    })
    await Promise.all(allQueue)
    await writeFile('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))
    logger.info('cleanLibrary end')
}

//计算媒体库根目录，防止多层嵌套导致异步任务效率低下甚至出错，然而函数本身效率不高:-(，暂未实装，看反馈决定
async function getLibraryRootDir(dirPath = '') {
    try {
        let libraryRootDir = ''
        let compared = false
        await appedDirTree(dirPath, {}, {
            fileFilter: async (filePath) => {
                let res = await getFileType(filePath)
                if (res == 'video') {
                    if (!libraryRootDir) {
                        libraryRootDir = path.dirname(filePath)
                    } else {
                        if (libraryRootDir != path.dirname(filePath)) {
                            libraryRootDir = diffWords(libraryRootDir, path.dirname(filePath))[0].value
                            compared = true
                        }
                    }
                    return true
                } else return false
            },
            appendFileInfo: buildEmptyNfo,
        })
        if (!compared) {
            libraryRootDir = path.dirname(libraryRootDir)
        }
        return libraryRootDir
    } catch (error) {
    }
}

//新建空的nfo文件
async function buildEmptyNfo(filePath) {
    const nfoPath = path.resolve(path.dirname(filePath), `${path.parse(filePath).name}.nfo`)
    try {
        await readFile(nfoPath)
        console.log('has', nfoPath);
    } catch (error) {
        let emptyInfo = {
            episodedetails: {
                title: path.basename(filePath),
                original_filename: path.basename(filePath),
            }
        }
        await writeFile(nfoPath, xmlBuilder.buildObject(emptyInfo))
    }
}



module.exports = { initMediaLibrary, cleanLibrary }