import { Ref } from 'vue'
export function useElementSize(element: Ref<HTMLElement>) {
    const elSize = reactive({
        elWidth: 1080,
        elHeight: 1920,
        elTop: 0,
        elLeft: 0,
    })

    onMounted(() => {
        window.onresize = () => {
            elSize.elWidth = element.value.clientWidth
            elSize.elHeight = element.value.clientHeight
            elSize.elTop = element.value.clientTop
            elSize.elLeft = element.value.clientLeft
        }
    })
    onUnmounted(() => {
        window.onresize = null
    })
    return elSize
}
