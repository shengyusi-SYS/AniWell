import { defineStore } from 'pinia'

export const useGlobalStore = defineStore('counter', () => {
    const theme = reactive({
        testHeight: '30em',
        backgroundColor: '#2a2a2a',
        backgroundColorL1: '#3a3a3a',
        backgroundColorD1: '#1a1a1a',
        fontSize: '16px',
        fontSizeB1: '24px',
        fontSizeS1: '10px',
        fontColor: '#999',
        fontColorTitle: '#fff',
        fontColorSecondary: '#66',
        cardShadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
        cardShadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
        cardAspectRatio: 0.75,
    })
    return { theme }
})
