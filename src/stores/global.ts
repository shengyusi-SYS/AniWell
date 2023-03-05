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

export const useGlobalStore = defineStore('global', () => {
    const windowsSize = useWindowSize()

    const clientState = reactive({
        minWidthCheck: useMediaQuery('(min-width: 426px)'),
        minHeightCheck: useMediaQuery('(min-height: 426px)'),
        isPreferredDark: useMediaQuery('(prefers-color-scheme: dark)'),
    })

    const isDesktop = computed(() => clientState.minHeightCheck && clientState.minWidthCheck)

    const rootEl = ref()

    const useCss = (key: string, init: string) => {
        const css = useCssVar(key, rootEl)
        css.value = init
        return css
    }

    const theme = reactive({
        windowsWidth: windowsSize.width,
        testHeight: '30em',
        backgroundColor: '#2a2a2a',
        backgroundColorL1: '#3a3a3a',
        backgroundColorD1: '#1a1a1a',
        fontSize: ref('16px'),
        fontSizeB1: '24px',
        fontSizeS1: '10px',
        fontColor: '#999',
        fontColorTitle: '#fff',
        fontColorSecondary: '#66',
        cardShadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
        cardShadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
        cardAspectRatio: 16 / 9,
        libraryWidth: 1920,
        libraryHeight: 0,
        libraryFontSizePercent: 1,
        libraryColumnNum: isDesktop ? 5 : 2,
        libraryGutterPercent: 2,
        libraryItemAspectRatio: 0.75,
        libraryPageSize: 20,
    })

    const themeMap: { [themeName: string]: string } = {
        backgroundColor: '--el-bg-color',
        backgroundColorD1: '--el-bg-color-overlay',
        backgroundColorL1: '--el-bg-color-page',
    }

    const initTheme = () => {
        let global = localStorage.getItem('global')
        global = global ? JSON.parse(global) : null
        if (typeof global === 'object' && global.theme) {
            const userTheme = global.theme as object
            for (const themeName in userTheme) {
                const userThemeVlaue = userTheme[themeName]
                if (themeMap[themeName]) {
                    const varName = themeMap[themeName]
                    const userValue = userTheme[themeName]
                    theme[themeName] = useCss(varName, userValue)
                } else {
                    theme[themeName] = userThemeVlaue
                }
            }
        } else return
    }

    const defaultLibraryConfig: LibraryConfig = {
        dir: {
            sort: ['asc'],
            sortBy: ['title'],
            start: 0,
            end: 20,
        },
        box0: {
            sort: ['asc', 'asc'],
            sortBy: ['order', 'episode'],
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

    const libraryConfig: Ref<{
        [libName: string]: LibraryConfig
    }> = ref({})

    return { rootEl, theme, initTheme, clientState, isDesktop, libraryConfig, defaultLibraryConfig }
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
        let local
        try {
            local = JSON.parse(localStorage.getItem('globalData'))
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
