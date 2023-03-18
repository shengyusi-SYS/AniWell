import { defineStore } from 'pinia'
import { useWindowSize, useMediaQuery } from '@vueuse/core'
import { useCssVar, UseCssVarOptions } from '@vueuse/core'
import { Ref } from 'vue'
import { boxLevel, resultType } from './library'
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
    column: number
    columnGutter: number
    rowGutter: number
    pageSize: number
    shadow: string
    shadowHover: string
    fontSize: number
    fontSizeTitle: number
    fontSizeLabel: number
    fontColor: string
    fontColorTitle: string
    fontColorLabel: string
    aspectRatio: number
    textAlign: string
    custom?: {
        backgroundImage?: string
    }
}

export type LibraryTheme = {
    [key in resultType]: CardTheme
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
    base: BaseTheme
    library: {
        [libName: string]: LibraryTheme
    }
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

export const useGlobalStore = defineStore('global', () => {
    const clientState = reactive({
        minWidthCheck: useMediaQuery('(min-width: 426px)'),
        minHeightCheck: useMediaQuery('(min-height: 426px)'),
        isPreferredDark: useMediaQuery('(prefers-color-scheme: dark)'),
    })

    const isDesktop = computed(() => clientState.minHeightCheck && clientState.minWidthCheck)

    const def = <T>(a: T, b: T) => (isDesktop.value ? a : b)

    const defaultLibraryTheme: LibraryTheme = {
        dir: {
            column: def(5, 1),
            columnGutter: 2,
            rowGutter: def(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: def(1, 0.8),
            fontSizeTitle: 1.5,
            fontSizeLabel: 1,
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 3 / 4,
            textAlign: 'center',
        },
        box0: {
            column: def(5, 1),
            columnGutter: 2,
            rowGutter: def(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: def(1, 0.8),
            fontSizeTitle: 1.5,
            fontSizeLabel: 1,
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 3 / 4,
            textAlign: 'center',
        },
        box1: {
            column: def(5, 1),
            columnGutter: 2,
            rowGutter: def(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: def(1, 0.8),
            fontSizeTitle: 1.5,
            fontSizeLabel: 1,
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 3 / 4,
            textAlign: 'center',
        },
        box2: {
            column: def(5, 1),
            columnGutter: 2,
            rowGutter: def(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: def(1, 0.8),
            fontSizeTitle: 1.5,
            fontSizeLabel: 1,
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 3 / 4,
            textAlign: 'center',
        },
        box3: {
            column: def(5, 1),
            columnGutter: 2,
            rowGutter: def(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: def(1, 0.8),
            fontSizeTitle: 1.5,
            fontSizeLabel: 1,
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 3 / 4,
            textAlign: 'center',
        },
        item: {
            column: def(5, 2),
            columnGutter: 2,
            rowGutter: def(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: def(1, 0.8),
            fontSizeTitle: def(1.2, 1.5),
            fontSizeLabel: def(0.8, 1),
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 16 / 9,
            textAlign: 'center',
        },
    }

    const theme: Ref<Theme> = ref({
        base: {
            backgroundColor: '#2a2a2a',
            backgroundColorL1: '#3a3a3a',
            backgroundColorD1: '#1a1a1a',
            fontSize: '1.6rem',
            fontColor: '#999',
            fontColorL1: '#fff',
            fontColorD1: '#666',
        },
        library: {},
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
            const userTheme = global.theme as Theme
            if (userTheme) theme.value = userTheme
        } else return
    }

    const setLibraryTheme = (libName: any) => {
        if (libName && !theme.value.library[libName]) {
            theme.value.library[libName] = defaultLibraryTheme
            return
        }
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
    serverDelay: reactive({
        list: [] as Array<string | number>,
        add(delay: number) {
            if (this.list.length > 100) {
                this.list.pop()
            }
            this.list.unshift(delay)
        },
    }),
    appElement: ref(),
    alertMessages: ref(''),
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
