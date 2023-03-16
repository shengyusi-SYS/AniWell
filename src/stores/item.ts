import { reqItemSrc } from '@v/api'
import { testVideoMime } from '@v/utils'
import { defineStore } from 'pinia'
import { libraryData } from './library'
import { useVideoPlayerStore } from './videoPlayer'
import router from '@v/router'
const videoStore = useVideoPlayerStore()
export const useItemStore = defineStore('item', () => {
    async function setItemList(
        items: libraryData[],
        {
            libName,
            display,
            start = 0,
        }: {
            libName: string
            display: string
            start?: number
        },
    ) {
        if (display === 'video') {
            try {
                videoStore.itemList = items
                await router.push({ name: 'videoPlayer', query: router.currentRoute.value.query })
            } catch (error) {
                console.log(error)
            }
        }
    }

    return { setItemList }
})
