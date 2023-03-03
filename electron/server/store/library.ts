import Store from 'electron-store'
import paths from '@s/utils/envPath'
import path from 'path'
import { readFile } from 'fs/promises'
import { deepProxy, shallowProxy } from './global'
import throttle from 'lodash/throttle'

//用于刮削判断层级(如需要回溯判断)和前端决定展示方法，不可留空
export type resultType =
    | 'item' //item表示最基本的刮削结果，如一集视频、一首音乐、一部漫画(很多图片一起)、一本小说(很多分册)，在前端表现为点击后会跳转到相应的处理页面，如视频/音乐播放器、漫画/小说阅读器，即使children中还有item也会忽略，具体处理由前端决定
    | boxLevel
    | 'dir' //dir为普通文件夹，与item仅有层级相关性
export type boxLevel =
    | 'box0' //box后的数字表示距离item的层级，如一个包含一季12集视频的文件夹就是box0
    | 'box1' //包含三个季也就是3个box0的文件夹就是box1，再往上就是box2，
    | 'box2'
    | 'box3' //box3为预留

export interface Ilibrary {
    [libraryName: string]: {
        name: string //库名，唯一
        type: string //库类名如'video' | 'music' | '...'，与前端
        rootPath: string
        flatFile: {
            //扁平化存储，方便刮削时发请求、以及库的查询与更新
            [path: string]: FileMetadata
        }
        flatDir: {
            //刮削时，result为box类时，在此存储一份，方便查询与更新，不含children
            [path: string]: ScraperResult & {
                path: string
                usersInfo: { [key: string]: string }
                children: string[]
            }
        }
        map: ScraperResult & {
            //flat到tree的映射方法，，key为ScraperResult的属性名，value为FileMetadata中的属性名
            //示例见刮削流程图
            result?: string
            [key: string]: string
        }
        config: {
            library: {}
            [scraperName: string]: {
                overwrite?: boolean
            }
        }
    }
}

export interface FileMetadata {
    fileInfo: {
        //文件信息，来自文件本身或经过一定的本地处理得到(无需网络请求)
        path: string
        size: number
        result: 'item'
        atime: Date //访问
        mtime: Date //修改文件
        ctime: Date //修改状态
        birthtime: Date //创建
    }
    scraperInfo: {
        //刮削器结果,来自网络
        map: ScraperResult
        [scraperName: string]: ScraperResult
    }
    usersInfo: {
        //用户自定结果
        [key: string]: string
    }
}

export interface ScraperResult {
    title?: string //前端展示的名称，刮削时产生，留空则默认等同label
    result?: resultType
    poster?: string //海报图绝对路径
    type?: string //默认等同库类名，为可能的混合刮削预留
    parentTitle?: string
    [key: string]: unknown //预留，用于不同result时的附加刮削信息，具体展示由前端决定
}

export interface Tree extends ScraperResult {
    path: string //文件(夹)绝对路径，省得计算路径
    label: string //path.basename的结果，在当前层级中唯一
    children: Array<Tree>
}

const store = new Store({
    name: 'library',
    cwd: paths.data,
    defaults: {},
})

const save = throttle(() => {
    store.clear()
    store.set(library)
    console.log('saved')
}, 3000)
const library: Ilibrary = shallowProxy(store.store, (method, { target, key }) => {
    if (method === 'delete') {
        console.log(method, key)
        // store.delete()
    }
    save()
})

export default library

function getChildren() {}

export async function getLibrary(libName: string) {
    if (!libName) {
        const overview = {
            label: 'overview',
            children: [],
        }
        for (const libraryName in library) {
            const targetLibrary = library[libraryName]
            const targetLibraryRootDir = JSON.parse(
                JSON.stringify(targetLibrary.flatDir[targetLibrary.rootPath]),
            )
            if (targetLibraryRootDir.result === 'box0') {
                targetLibraryRootDir.children = targetLibraryRootDir.children
                    .filter((v, i) => i < 10)
                    .map((filePath) => targetLibrary.flatFile[filePath].scraperInfo.map)
            } else {
                targetLibraryRootDir.children = targetLibraryRootDir.children
                    .filter((v, i) => i < 10)
                    .map((dirPath) => targetLibrary.flatDir[dirPath])
            }
            overview.children.push(targetLibraryRootDir)
        }
        return overview
    } else {
        if (!library[libName]) {
            return undefined
        }
        const targetLibrary = library[libName]
        const targetLibraryRootDir = JSON.parse(
            JSON.stringify(targetLibrary.flatDir[targetLibrary.rootPath]),
        )
        if (targetLibraryRootDir.result === 'box0') {
            targetLibraryRootDir.children = targetLibraryRootDir.children.map(
                (filePath) => targetLibrary.flatFile[filePath].scraperInfo.map,
            )
        } else {
            targetLibraryRootDir.children = targetLibraryRootDir.children.map(
                (dirPath) => targetLibrary.flatDir[dirPath],
            )
        }
        return targetLibraryRootDir
    }
}
