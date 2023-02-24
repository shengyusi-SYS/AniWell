<script setup lang="ts">
import useListenLifecycle from '@v/hooks/useListenLifecycle'

useListenLifecycle('Settings')
</script>

<script lang="ts">
export default {
    name: 'Settings',
}
</script>

<template>
    <div class="settings-base">Settings</div>
</template>

<style lang="less" scoped>
.settings-base {
}
</style>
