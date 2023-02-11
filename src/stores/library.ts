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
export const useLibraryStore = defineStore('counter', () => {
    return {}
})
