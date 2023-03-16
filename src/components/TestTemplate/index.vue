<script setup lang="ts">
import useListenLifeCycle from '@v/hooks/useListenLifeCycle'
useListenLifeCycle('test')
</script>

<script lang="ts">
export default {
    name: 'TestTemplate',
}
</script>

<template>
    <div class="testTemplate-base">TestTemplate</div>
</template>

<style lang="less" scoped>
.testTemplate-base {
}
</style>
