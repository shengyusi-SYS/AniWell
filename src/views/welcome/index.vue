<script setup lang="ts">
import { reqModify } from '@v/api'
import bcrypt from 'bcryptjs'
import { globalCache, proxyGlobalData } from '@v/stores/global'
const router = useRouter()
const defaultUser = reactive({ username: '', password: '', passwordAgain: '' })
const confirmModify = async () => {
    if (defaultUser.password === defaultUser.passwordAgain) {
        const salt = await bcrypt.genSalt()
        const passwordHash = await bcrypt.hash(defaultUser.password, salt)
        try {
            await reqModify(defaultUser.username, passwordHash, salt)
            proxyGlobalData.salt = salt
            proxyGlobalData.first = false
            router.push('/login')
            // ElMessage.info('初始化成功，请重新登录')
        } catch (error) {
            console.log(error)
        }
    } else ElMessage.error('密码不一致')
}
</script>

<script lang="ts">
export default {
    name: 'Welcome',
}
</script>

<template>
    <div class="welcome-base col">
        <div style="font-size: 2em">Welcome</div>
        <div class="col">
            <ElInput
                v-model="defaultUser.username"
                class="welcome-input"
                size="large"
                placeholder="新用户名"
                autofocus
                :formatter="(value:string) => value.replace(/\W/,'')"
            />
            <ElInput
                v-model="defaultUser.password"
                class="welcome-input"
                size="large"
                placeholder="新密码"
                show-password
                :formatter="(value:string) => value.replace(/\W/,'')"
            />
            <ElInput
                v-model="defaultUser.passwordAgain"
                class="welcome-input"
                size="large"
                placeholder="确认密码"
                show-password
                :formatter="(value:string) => value.replace(/\W/,'')"
            />
        </div>
        <div>
            <ElButton size="large" @click="confirmModify">确认</ElButton>
        </div>
    </div>
</template>

<style lang="less" scoped>
.welcome-base {
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
    .welcome-input {
        width: 20em;
        height: 3em;
        margin: 0.5em;
    }
}
</style>
