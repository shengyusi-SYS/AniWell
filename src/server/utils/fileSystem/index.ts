import { readdirSync } from "fs"

// 获取所有盘符
function getWindowsDriveLetters() {
    const driveLetters: string[] = []

    for (let i = 65; i <= 90; i++) {
        const driveLetter = String.fromCharCode(i) + ":\\"
        try {
            readdirSync(driveLetter)
            driveLetters.push(driveLetter)
        } catch (err) {
            // 如果读取目录失败，则假设盘符不存在
        }
    }

    return driveLetters
}
