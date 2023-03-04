import { defineStore } from 'pinia'
import { reqLibrary } from '@v/api'
export interface CardData {
    title: string
    poster: string
    label: string
    note?: string
    itemId?: string
    episode?: number
    type?: string
    path?: string
    result?: string
    total: number
    start: number
    pageSize: number
    children?: Array<CardData>
}

export const useLibraryStore = defineStore('library', () => {
    const libraryData = ref({} as CardData)

    const query = async ({
        category = '',
        path = '',
        start = 0,
        end = 20,
    }: {
        category?: string
        path?: string
        start?: number
        end?: number
    }) => {
        const newData = await reqLibrary(category, path, {
            start,
            end,
        })
        libraryData.value = newData
    }
    return { libraryData, query }
})
