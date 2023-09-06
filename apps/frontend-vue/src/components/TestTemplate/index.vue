<script setup lang="ts">
import useListenLifecycle from '@v/hooks/useListenLifecycle'
useListenLifecycle('test')
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
