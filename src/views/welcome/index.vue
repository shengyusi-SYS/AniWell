<script setup lang="ts">
import { reqModify } from '@v/api'
import bcrypt from 'bcryptjs'
const test = ref('asd')
const defaultUser = reactive({ username: 'admin', password: 'adminUser', passwordAgain: '' })
const confirmModify = async () => {
    const salt = await bcrypt.genSalt()
    const passwordHash = await bcrypt.hash(defaultUser.password, salt)
    await reqModify(defaultUser.username, passwordHash, salt)
}
</script>

<script lang="ts">
export default {
    name: 'Welcome',
}
</script>

<template>
    <div class="welcome-base col">
        <div>welcome</div>
        <!-- <OInput v-model="test" title="vrfdsff" justify="center" radius="6px" mode="multiRow" />
            <OInput v-model="test" title="gtrbrwf" justify="center" radius="6px" mode="singleRow"
            ><template #left><IEpFold /></template><template #right>ferggrteswf</template></OInput
            > -->
        <div>
            <OInput
                v-model="defaultUser.username"
                title="用户名"
                justify="center"
                radius="6px"
                mode="stacked"
            />
            <OInput
                v-model="defaultUser.password"
                title="新密码"
                justify="center"
                radius="6px"
                mode="stacked"
            />
            <OInput
                v-model="defaultUser.passwordAgain"
                title="确认密码"
                justify="center"
                radius="6px"
                mode="stacked"
            />
        </div>
        <div>
            <ElButton @click="confirmModify">确认修改</ElButton>
        </div>
    </div>
</template>

<style lang="less" scoped>
.welcome-base {
    width: 100%;
    height: 100%;
    background-color: #f7f8fa;
}
</style>
