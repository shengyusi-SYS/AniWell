import Store from 'electron-store'
import paths from '@s/utils/envPath'
import path from 'path'
import { readFile } from 'fs/promises'
import { deepProxy, shallowProxy } from './global'
import throttle from 'lodash/throttle'
import { type } from 'os'
import { searchLeaf } from '@s/utils'

//用于刮削判断层级(如需要回溯判断)和前端决定展示方法，不可留空
export type resultType =
    | 'item' //item表示最基本的刮削结果，如一集视频、一首音乐、一部漫画(很多图片一起)、一本小说(很多分册)，在前端表现为点击后会跳转到相应的处理页面，如视频/音乐播放器、漫画/小说阅读器，即使children中还有item也会忽略，具体处理由前端决定
    | boxLevel
    | 'dir' //dir为普通文件夹，与item仅有层级相关性，层级超过box3或等于库根路径时强制为dir
export type boxLevel = //box类与item有刮削结果相关性

        | 'box0' //box后的数字表示距离item的层级，如一个包含一季12集视频的文件夹就是box0
        | 'box1' //包含三个季也就是3个box0的文件夹就是box1，再往上就是box2，
        | 'box2'
        | 'box3' //box3为预留
export interface libraryConfig {
    library: {}
    [scraperName: string]: {
        overwrite?: boolean
    }
}

export interface Ilibrary {
    [libraryName: string]: {
        name: string //库名，唯一
        rootPath: string //库根路径，为用户添加库时选定的路径
        flatFile: {
            //扁平化存储，方便刮削时发请求、以及库的查询与更新
            [path: string]: FileMetadata
        }
        flatDir: {
            //文件夹列表
            [path: string]: DirMetadata
        }
        mapFile: MapRule //flat到mapResult的映射方法，key为ScraperResult的属性名，value为FileMetadata中的属性名
        mapDir: MapRule
        tree: LibraryTree //方便读取结果给前端
        config: libraryConfig
        progress?: {
            step: string
            target: string
            current: number
            total: number
        }
    }
}

export interface FileMetadata {
    baseInfo: {
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
        mapResult: MapResult //经过map规则映射后的最终的刮削结果，也是客户端获取library时读取的对象
        //刮削器结果,来自网络
        [scraperName: string]: ScraperResult
    }
    userInfo: {
        //用户自定信息
        [key: string]: string
    }
}

export interface DirMetadata {
    baseInfo: {
        path: string
        result: resultType
        title: string
        children: string[] //子项路径字符串
    }
    scraperInfo: {
        mapResult: MapResult & {
            children: string[]
        }
        [scraperName: string]: ScraperResult
    }
    userInfo: {
        [key: string]: string
    }
}

export interface ScraperResult {
    title?: string //前端展示的名称，刮削时产生，默认为不带后缀的文件名或文件夹名
    result?: resultType
    display?: string //result为item时必要，与前端展示功能对应，当前可用:"video"
    poster?: string //海报图绝对路径
    parentTitle?: string //用于判断box类的title
    [key: string]: unknown //预留，用于不同result时的附加刮削信息，具体展示由前端决定
}

export interface MapResult extends ScraperResult {
    title: string
    path: string
    result: resultType
    order: number
    locked?: boolean //用于防止覆写用户设定
}

export type MapRule = { [key in MapResult as string]: string } & MapResult

export interface LibraryTree extends MapResult {
    //前端参考基准
    label: string
    children?: Array<LibraryTree>
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
    // if (method === 'delete') {
    //     console.log(method, key)
    // store.delete()
    // }
    save()
})

export default library

export async function getLibrary(libName: string, libPath?: string): Promise<LibraryTree> {
    if (!libName) {
        const overview = {
            label: 'overview',
            children: [],
        }
        for (const libraryName in library) {
            const targetLibrary = library[libraryName]

            // console.log(libraryName, targetLibraryRootDir)
            const targetLibraryRootDir = searchLeaf(targetLibrary.tree, targetLibrary.rootPath)
            if (targetLibraryRootDir) {
                const result = {
                    ...targetLibraryRootDir,
                    title: libraryName,
                    children: targetLibraryRootDir.children
                        .filter((val, ind) => ind < 10)
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

export async function getItem(libName: string, itemPath: string) {
    return library[libName].flatFile[itemPath] || library[libName].flatDir[itemPath]
}
