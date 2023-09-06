import { defineStore } from 'pinia'
import { Ref } from 'vue'
import { libraryData } from '@v/stores/library'

export const useVideoPlayerStore = defineStore('videoPlayer', () => {
	const itemList: libraryData[] = []
	return { itemList }
})
