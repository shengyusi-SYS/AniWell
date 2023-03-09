import { defineStore } from 'pinia'
import { useWindowSize, useMediaQuery } from '@vueuse/core'
import { useCssVar, UseCssVarOptions } from '@vueuse/core'
import { Ref } from 'vue'
import { boxLevel } from './library'
import { LibQuery } from '@v/api'

export interface LibraryConfig {
    [boxLevel: string]: sortConfig & {}
}

export interface sortConfig {
    sort?: LibQuery['sort']
    sortBy?: LibQuery['sortBy']
    start?: number
    end?: number
}

export interface CardTheme {
    fontSizeTitle: number
    fontSizeLabel: number
    fontColor: string
    fontColorTitle: string
    fontColorLabel: string
    aspectRatio: number
}

export interface LibraryTheme {
    grid: {
        width: number | Ref<number>
        height: number | Ref<number>
        column: number | Ref<number>
        gutter: string | Ref<string>
        pageSize: number | Ref<number>
        shadow: string | Ref<string>
        shadowHover: string | Ref<string>
    }
    dir: CardTheme
    box0: CardTheme
    box1: CardTheme
    box2: CardTheme
    box3: CardTheme
    item: CardTheme
}

export interface BaseTheme {
    backgroundColor: string
    backgroundColorL1: string
    backgroundColorD1: string
    fontSize: string
    fontColor: string
    fontColorL1: string
    fontColorD1: string
    [baseThemeName: string]: string | Ref<string>
}

export interface Theme {
    windowsSize: {
        width: Ref<number>
        height: Ref<number>
    }
    base: BaseTheme
    current: LibraryTheme
    [libName: string]: LibraryTheme | BaseTheme | object //to fix
}

export const defaultLibraryConfig: LibraryConfig = {
    dir: {
        sort: ['asc'],
        sortBy: ['title'],
        start: 0,
        end: 20,
    },
    box0: {
        sort: ['asc', 'asc'],
        sortBy: ['order'],
        start: 0,
        end: 20,
    },
    box1: {
        sort: ['asc'],
        sortBy: ['title'],
        start: 0,
        end: 20,
    },
    box2: {
        sort: ['asc'],
        sortBy: ['title'],
        start: 0,
        end: 20,
    },
    box3: {
        sort: ['asc'],
        sortBy: ['title'],
        start: 0,
        end: 20,
    },
}

const defaultLibraryTheme: LibraryTheme = {
    grid: {
        width: 1920,
        height: 0,
        column: 3,
        gutter: '2em',
        pageSize: 20,
        shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
        shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
    },
    dir: {
        fontSizeTitle: 2,
        fontSizeLabel: 1.5,
        fontColor: '#999',
        fontColorTitle: '#fff',
        fontColorLabel: '#999',
        aspectRatio: 3 / 4,
    },
    box0: {
        fontSizeTitle: 2,
        fontSizeLabel: 1.5,
        fontColor: '#999',
        fontColorTitle: '#fff',
        fontColorLabel: '#999',
        aspectRatio: 3 / 4,
    },
    box1: {
        fontSizeTitle: 2,
        fontSizeLabel: 1.5,
        fontColor: '#999',
        fontColorTitle: '#fff',
        fontColorLabel: '#999',
        aspectRatio: 3 / 4,
    },
    box2: {
        fontSizeTitle: 2,
        fontSizeLabel: 1.5,
        fontColor: '#999',
        fontColorTitle: '#fff',
        fontColorLabel: '#999',
        aspectRatio: 3 / 4,
    },
    box3: {
        fontSizeTitle: 2,
        fontSizeLabel: 1.5,
        fontColor: '#999',
        fontColorTitle: '#fff',
        fontColorLabel: '#999',
        aspectRatio: 3 / 4,
    },
    item: {
        fontSizeTitle: 2,
        fontSizeLabel: 1.5,
        fontColor: '#999',
        fontColorTitle: '#fff',
        fontColorLabel: '#999',
        aspectRatio: 16 / 9,
    },
}

export const useGlobalStore = defineStore('global', () => {
    const clientState = reactive({
        minWidthCheck: useMediaQuery('(min-width: 426px)'),
        minHeightCheck: useMediaQuery('(min-height: 426px)'),
        isPreferredDark: useMediaQuery('(prefers-color-scheme: dark)'),
    })

    const isDesktop = computed(() => clientState.minHeightCheck && clientState.minWidthCheck)

    defaultLibraryTheme.grid.column = isDesktop.value ? 5 : 2

    const theme: Ref<Theme> = ref({
        windowsSize: useWindowSize(),
        base: {
            backgroundColor: '#2a2a2a',
            backgroundColorL1: '#3a3a3a',
            backgroundColorD1: '#1a1a1a',
            fontSize: '1.6rem',
            fontColor: '#999',
            fontColorL1: '#fff',
            fontColorD1: '#666',
        },
        current: defaultLibraryTheme,
    })

    const baseThemeMap: { [varName: string]: string } = {
        '--el-bg-color': 'backgroundColor',
        '--el-bg-color-overlay': 'backgroundColorD1',
        '--el-bg-color-page': 'backgroundColorL1',
    }

    const initTheme = () => {
        const savedGlobal = localStorage.getItem('global') || false
        const global = savedGlobal ? JSON.parse(savedGlobal) : false
        if (typeof global === 'object' && global.theme) {
            const userTheme = global.theme.base as BaseTheme
            if (userTheme) theme.value.base = userTheme
        } else return
    }

    const setLibraryTheme = (libName: any) => {
        theme.value.current = (theme.value[libName] as LibraryTheme) || defaultLibraryTheme
    }

    const libraryConfig: Ref<{
        [libName: string]: LibraryConfig
    }> = ref({})

    return {
        theme,
        initTheme,
        clientState,
        isDesktop,
        libraryConfig,
        setLibraryTheme,
        baseThemeMap,
    }
})

export const globalCache = {
    loggedIn: false,
    electronEnv: Boolean(window.electronAPI),
    serverPort: window.electronAPI ? await window.electronAPI.getServerPort() : undefined,
    serverLog: reactive({
        list: [] as Array<string | number>,
        info(log: string | number) {
            if (this.list.length > 100) {
                this.list.pop()
            }
            this.list.unshift(log)
        },
    }),
}

const globalData = {
    first: false,
    salt: '',
    username: '',
}
const inited = false
export const proxyGlobalData = new Proxy(globalData, {
    get(target, key) {
        if (inited) {
            return Reflect.get(target, key)
        }

        try {
            const local = JSON.parse(localStorage.getItem('globalData'))
            Reflect.set(target, key, local)
            return Reflect.get(local, key)
        } catch (error) {
            localStorage.setItem('globalData', JSON.stringify(target))
            return Reflect.get(target, key)
        }
    },
    set(target, key, value) {
        switch (key) {
            case 'first':
                if (typeof value !== 'boolean') {
                    throw new Error('TypeError:need boolean')
                }
                break
            case 'salt':
                if (typeof value !== 'string') {
                    throw new Error('TypeError:need string')
                }
                break
            case 'username':
                if (typeof value !== 'string') {
                    throw new Error('TypeError:need string')
                }
                break
        }
        localStorage.setItem('globalData', JSON.stringify(target))
        return Reflect.set(target, key, value)
    },
})
