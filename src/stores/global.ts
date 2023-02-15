import { defineStore } from 'pinia'
import { useWindowSize, useMediaQuery } from '@vueuse/core'
import { useCssVar, UseCssVarOptions } from '@vueuse/core'

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

    const libraryConfig = reactive({})

    return { rootEl, theme, initTheme, clientState, isDesktop }
})

export const globalCache = {
    loggedIn: false,
}

const globalData = {
    first: false,
    salt: '',
    username: '',
}

export const proxyGlobalData = new Proxy(globalData, {
    get(target, prop) {
        const local = localStorage.getItem('globalData')
        if (local) {
            target = JSON.parse(local)
        }
        return target[prop]
    },
    set(target, prop, value) {
        switch (prop) {
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
        target[prop] = value
        localStorage.setItem('globalData', JSON.stringify(target))
        return true
    },
})
