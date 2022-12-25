<script setup lang="ts">
const test = ref('asd')
</script>

<script lang="ts">
export default {
    name: 'Welcome',
}
</script>

<template>
    <div class="welcome-base col">
        <div>welcome</div>
        <OInput v-model="test" title="fwaddaw" justify="center" radius="6px" mode="stacked" />
        <OInput v-model="test" title="vrfdsff" justify="center" radius="6px" mode="multiRow" />
        <OInput v-model="test" title="gtrbrwf" justify="center" radius="6px" mode="singleRow"
            ><template #left><IEpFold /></template><template #right>ferggr</template></OInput
        >
    </div>
</template>

<style lang="less" scoped>
.welcome-base {
    width: 100%;
    height: 100%;
    background-color: #f7f8fa;
}
</style>
