<script setup lang="ts">
import { reqLogin, reqIsFirst } from '@v/api'
import { proxyGlobalData } from '@v/stores/global'
const router = useRouter()

const loginUser = reactive({ username: '', password: '' })
const login = async (qb = false) => {
    const res = await reqLogin(loginUser.username, loginUser.password)
    console.log('login', proxyGlobalData.first, res)

    if (res) {
        try {
            const first = await reqIsFirst()
            console.log('first', first)

            if (first) {
                router.push('/welcome')
            } else {
                if (qb === true) {
                    // router.push('/old/home')
                    window.location.replace('/old/index.html')
                } else {
                    router.push('/home')
                }
            }
        } catch (error) {
            console.log(error)
        }
    }
}

onMounted(() => {
    reqLogin() //尝试自动登录
        .then((result) => {
            if (result) router.push('/home')
        })
        .catch((err) => {})
})
</script>

<script lang="ts">
export default {
    name: 'Login',
}
</script>

<template>
    <div class="login-base col">
        <div>login</div>
        <div>
            <OInput
                v-model="loginUser.username"
                title="用户名"
                justify="center"
                radius="6px"
                mode="stacked"
            />
            <OInput
                v-model="loginUser.password"
                title="密码"
                justify="center"
                radius="6px"
                mode="stacked"
            />
        </div>
        <div>
            <ElButton @click="login(true)">qbit</ElButton>
            <ElButton @click="login(false)">登录</ElButton>
            <ElButton @click="router.push('/welcome')">wel</ElButton>
        </div>
    </div>
</template>

<style lang="less" scoped>
.login-base {
    width: 100%;
    height: 100%;
    // background-color: #f7f8fa;
}
</style>
