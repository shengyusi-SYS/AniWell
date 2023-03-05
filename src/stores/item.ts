import { testVideoMime } from '@v/utils'
import { defineStore } from 'pinia'
import { libraryData } from './library'
export const useItemStore = defineStore('item', () => {
    async function generatePlaylist(items: libraryData[]) {
        const playlist = []
        console.log(items)

        for (let index = 0; index < items.length; index++) {
            const item = items[index]
            try {
                const method = (await testVideoMime(item.mime)) ? 'direct' : 'transcode'
                console.log(item.mime, method)
            } catch (error) {}
        }
    }

    return { generatePlaylist }
})
