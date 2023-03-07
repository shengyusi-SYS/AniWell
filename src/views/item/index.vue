<script setup lang="ts">
import useListenLifecycle from '@v/hooks/useListenLifecycle'
const router = useRouter()
// const display = router.currentRoute.value.query.display
// if (display === 'video') {
//     router.push({ name: 'videoPlayer', query: router.currentRoute.value.query })
// }
useListenLifecycle('Item')
</script>

<script lang="ts">
export default {
    name: 'Item',
}
</script>

<template>
    <div class="item-base">
        <RouterView></RouterView>
    </div>
</template>

<style lang="less" scoped>
.item-base {
}
</style>
