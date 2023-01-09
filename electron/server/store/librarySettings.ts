import Store from 'electron-store'
import paths from '@s/utils/envPath'
import { TransformConfig, Simple, Complex } from '@s/utils/transformConfig'

interface librarySettings {
    library: { [key: string]: string }
    source: {
        title: 'dandan' | 'tmdb' | 'local' | ''
        episode: 'dandan' | 'tmdb' | 'local' | ''
        poster: 'dandan' | 'tmdb' | 'local' | ''
        date: 'dandan' | 'tmdb' | 'local' | ''
        type: 'dandan' | 'tmdb' | 'local' | ''
        rating: 'dandan' | 'tmdb' | 'local' | ''
        hash: 'dandan' | 'tmdb' | 'local' | ''
        season: 'dandan' | 'tmdb' | 'local' | ''
        dandanplayId: 'dandanplayId'
        art: 'dandan' | 'tmdb' | 'local' | ''
    }
}

const librarySettingsList: Complex = {
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
            { type: 'normal', name: 'dandanplayId', value: 'dandanplayId' },
        ],
    },
}

export const librarySettingsTransformer = new TransformConfig(librarySettingsList)
const defaults = librarySettingsTransformer.simple as unknown as librarySettings

export const librarySettings = new Store({
    name: 'librarySettings',
    cwd: paths.config,
    defaults,
})
// export const librarySettingsUpdater = (newSettings) => {
//     for (const key in newSettings) {
//         if (Object.prototype.hasOwnProperty.call(newSettings, key)) {
//             librarySettings.set(key, newSettings[key])
//         }
//     }
// }
