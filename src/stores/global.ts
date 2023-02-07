import { defineStore } from 'pinia'
import { useWindowSize, useMediaQuery } from '@vueuse/core'

export const useGlobalStore = defineStore('counter', () => {
    const windowsSize = useWindowSize()

    const clientState = reactive({
        minWidthCheck: useMediaQuery('(min-width: 426px)'),
        minHeightCheck: useMediaQuery('(min-height: 426px)'),
        isPreferredDark: useMediaQuery('(prefers-color-scheme: dark)'),
    })

    const isDesktop = computed(() => clientState.minHeightCheck && clientState.minWidthCheck)

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
        cardAspectRatio: 0.75,
        libraryWidth: 1920,
        libraryHeight: 0,
        libraryFontSizePercent: 1,
        libraryColumnNum: isDesktop ? 5 : 2,
        libraryGutterPercent: 2,
    })

    return { theme, clientState, isDesktop }
})
