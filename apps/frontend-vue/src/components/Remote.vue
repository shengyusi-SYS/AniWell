<script setup lang="ts">
import { loadRemoteModule } from '@v/utils'

const { remote: remoteName } = defineProps<{ remote: string }>()

const RemoteComponent = await loadRemoteModule(remoteName)
</script>

<template>
    <RemoteComponent></RemoteComponent>
</template>

<style lang="less" scoped></style>
