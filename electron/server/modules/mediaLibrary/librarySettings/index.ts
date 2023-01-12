import { deepMerge, event } from '@s/utils'
import init from '@s/utils/init'
const { libraryIndex } = init
import fs from 'fs'
import path from 'path'
import { logger } from '@s/utils/logger'
import { diffArrays, diffJson } from 'diff'

const librarySettingsList = {
    library: {
        type: 'cellGroup',
        name: 'library',
        cells: [
            // { name: '媒体库路径', value: '媒体库名' }
        ],
    },
    source: {
        type: 'cellGroup',
        name: 'source',
        cells: [
            {
                type: 'radios',
                name: 'title',
                value: 'dandan',
                radios: {
                    dandan: { name: '弹弹Play', value: 'dandan' },
                    tmdb: { name: 'TMDB', value: 'tmdb' },
                    local: { name: '本地', value: 'local' },
                    ignore: { name: '忽略', value: '' },
                },
            },
            {
                type: 'radios',
                name: 'episode',
                value: 'dandan',
                radios: {
                    dandan: { name: '弹弹Play', value: 'dandan' },
                    tmdb: { name: 'TMDB', value: 'tmdb' },
                    local: { name: '本地', value: 'local' },
                    ignore: { name: '忽略', value: '' },
                },
            },
            {
                type: 'radios',
                name: 'poster',
                value: 'dandan',
                radios: {
                    dandan: { name: '弹弹Play', value: 'dandan' },
                    tmdb: { name: 'TMDB', value: 'tmdb' },
                    local: { name: '本地', value: 'local' },
                    ignore: { name: '忽略', value: '' },
                },
            },
            {
                type: 'radios',
                name: 'date',
                value: 'dandan',
                radios: {
                    dandan: { name: '弹弹Play', value: 'dandan' },
                    tmdb: { name: 'TMDB', value: 'tmdb' },
                    local: { name: '本地', value: 'local' },
                    ignore: { name: '忽略', value: '' },
                },
            },
            {
                type: 'radios',
                name: 'type',
                value: 'dandan',
                radios: {
                    dandan: { name: '弹弹Play', value: 'dandan' },
                    tmdb: { name: 'TMDB', value: 'tmdb' },
                    local: { name: '本地', value: 'local' },
                    ignore: { name: '忽略', value: '' },
                },
            },
            {
                type: 'radios',
                name: 'rating',
                value: 'dandan',
                radios: {
                    dandan: { name: '弹弹Play', value: 'dandan' },
                    tmdb: { name: 'TMDB', value: 'tmdb' },
                    local: { name: '本地', value: 'local' },
                    ignore: { name: '忽略', value: '' },
                },
            },
            {
                type: 'radios',
                name: 'hash',
                value: 'dandan',
                radios: {
                    dandan: { name: '弹弹Play', value: 'dandan' },
                    // tmdb: { name: "TMDB", value: 'tmdb' },
                    local: { name: '本地', value: 'local' },
                    ignore: { name: '忽略', value: '' },
                },
            },
            {
                type: 'radios',
                name: 'season',
                value: 'dandan',
                radios: {
                    dandan: { name: '弹弹Play', value: 'dandan' },
                    tmdb: { name: 'TMDB', value: 'tmdb' },
                    local: { name: '本地', value: 'local' },
                    ignore: { name: '忽略', value: '' },
                },
            },
            // {
            //     type: 'radios', name: 'art', value: 'dandan', radios: {
            //         dandan: { name: '弹弹Play', value: 'dandan' },
            //         tmdb: { name: "TMDB", value: 'tmdb' },
            //         local: { name: '本地', value: 'local' }
            //         ,ignore:{name:'忽略',value:''}
            //     }
            // },
            { name: 'dandanplayId', value: 'dandanplayId' },
        ],
    },
}
let first = true
let librarySettings = {}
try {
    librarySettings = JSON.parse(fs.readFileSync(init.librarySettingsPath, 'utf8'))
    updateLibrarySettings(librarySettings)
} catch (error) {
    for (const key in librarySettingsList) {
        if (librarySettingsList[key].type == 'cellGroup') {
            librarySettings[librarySettingsList[key].name] = {}
            for (const k in librarySettingsList[key].cells) {
                librarySettings[librarySettingsList[key].name][
                    librarySettingsList[key].cells[k].name
                ] = librarySettingsList[key].cells[k].value
            }
        } else if (librarySettingsList[key].name) {
            librarySettings[librarySettingsList[key].name] = librarySettingsList[key].value
        } else {
            librarySettings[key] = librarySettingsList[key]
        }
    }
}
if (first) {
    logger.info('librarySettings init', librarySettings)
    first = false
}

//更新媒体库设置
function updateLibrarySettings(newSettings = librarySettings) {
    logger.debug('updateLibrarySettings start', newSettings)
    for (const key in newSettings.library) {
        if (key === '') {
            delete newSettings.library[key]
            break
        }
        //检查媒体库路径
        try {
            console.log(path.resolve(key))
            fs.accessSync(path.resolve(key))
        } catch (error) {
            return false
        }
        //处理留空命名
        if (newSettings.library[key] == '') {
            newSettings.library[key] = path.basename(key)
        }
        //通过path统一路径名
        if (key != path.resolve(key)) {
            newSettings.library[path.resolve(key)] = newSettings.library[key]
            delete newSettings.library[key]
        }
    }

    //检查删改
    const oldLibrary = librarySettings.library
    const newLibrary = newSettings.library
    const change = diffArrays(Object.keys(oldLibrary).sort(), Object.keys(newLibrary).sort())
    logger.debug('updateLibrarySettings', change)
    const added = change.filter((v) => v.added).flatMap((v) => v.value)
    const removed = change.filter((v) => v.removed).flatMap((v) => v.value)
    // console.log(added, removed);
    //删除libraryIndex下对应信息
    removed.forEach((pathVal) => {
        if (oldLibrary[pathVal]) {
            const oldIndex = libraryIndex.children.findIndex((val) => val.path == pathVal)
            if (oldIndex != -1) {
                libraryIndex.children.splice(oldIndex, 1)
            }
            delete oldLibrary[pathVal]
        }
    })
    //触发更新
    added.forEach((v) => {
        event.emit('addLibrary', v, newLibrary[v])
    })

    deepMerge(librarySettings, newSettings)
    //修改libraryIndex下媒体库名
    libraryIndex.children.forEach((v) => {
        if (librarySettings.library[v.path]) {
            v.label = librarySettings.library[v.path]
        }
    })

    //更新librarySettingsList
    const newList = {}
    for (const key in librarySettings) {
        newList[key] = { cells: [] }
        for (const k in librarySettings[key]) {
            if (key == 'library') {
                newList[key].cells.push({ name: librarySettings[key][k], value: k })
            } else if (key == 'source') {
                newList[key].cells.push({ name: k, value: librarySettings[key][k] })
            }
        }
    }
    delete librarySettingsList.library.cells
    deepMerge(librarySettingsList, newList, { keyword: 'name' })

    try {
        fs.writeFileSync(init.librarySettingsPath, JSON.stringify(librarySettings, null, '\t'))
    } catch (error) {}
    try {
        fs.writeFileSync(init.libraryIndexPath, JSON.stringify(libraryIndex, null, '\t'))
    } catch (error) {}
    logger.debug('updateLibrarySettings end', newSettings)
    return librarySettingsList
}

export { librarySettings, librarySettingsList, updateLibrarySettings }
