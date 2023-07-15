<script setup lang="ts">
import type { TaskProgress } from "@v/api"
import { globalCache } from "@v/stores/global"

const taskList = globalCache.serverTaskProgress.list
const taskProgressList = computed(() =>
    //计算映射进度
    globalCache.serverTaskProgress.list.value.map((task) => {
        const res: TaskProgress = {
            state: task.state,
            name: task.name,
            uuid: task.uuid,
        }
        if (task.stageName) res.stageName = task.stageName
        if (task.stageId) {
            res.stageId = task.stageId
            if (task.total) res.percentage = Math.floor((task.stageId / task.total) * 100)
        }

        if (task.currentName) res.currentName = task.currentName
        if (task.currentId) {
            res.currentId = task.currentId
            if (task.stageTotal)
                res.stagePercentage = Math.floor((task.currentId / task.stageTotal) * 100)
        }
        return res
    }),
)
</script>

<script lang="ts">
export default {
    name: "TaskList",
}
</script>

<template>
    <div class="taskList-base col">
        <template v-for="task in taskProgressList" :key="task.uuid">
            <TaskCard :task="task"></TaskCard>
        </template>
    </div>
</template>

<style lang="less" scoped>
.taskList-base {
}
</style>
