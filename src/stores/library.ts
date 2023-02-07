import { defineStore } from 'pinia'
import { reqLibrary } from '@v/api'
export interface CardData {
    title: string
    poster: string
    note?: string
    itemId?: string
    type?: string
    path?: string
    children?: Array<CardData>
}
export const useLibraryStore = defineStore('counter', () => {
    let cardData: CardData = reactive({ title: '', poster: '', children: [] })
    function replace(newData: CardData) {
        cardData.title = 'rr'
        console.log(cardData)
        cardData = { a: '' }
        console.log(cardData)
    }

    const clear = () => (cardData.length = 0)
    const query = async (catagory: string, itemId?: string) => {
        const res = await reqLibrary(catagory, itemId)
        replace(res)
    }
    return { cardData, replace }
})
