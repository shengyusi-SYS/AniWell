export default function useListenLifecycle(name: string) {
    const start = window.performance.now()
    console.log('useListenLifecycle~~~~~~~~~~~~~~~~~~~' + name)
    onBeforeMount(() => console.log(name + ' - onBeforeMount'))
    onMounted(() => console.log(name + ' - onMounted'))
    onBeforeUpdate(() => console.log(name + ' - onBeforeUpdate'))
    onUpdated(() => console.log(name + ' - onUpdated'))
    onBeforeUnmount(() => console.log(name + ' - onBeforeUnmount'))
    onUnmounted(() => console.log('onUnmounted =======================' + name))
    onErrorCaptured(() => console.log(name + ' - onErrorCaptured'))
    onActivated(() => console.log(name + ' - onActivated'))
    onDeactivated(() => console.log(name + ' - onDeactivated'))
    onBeforeRouteUpdate(() => console.log(name + ' - onBeforeRouteUpdate'))
}
