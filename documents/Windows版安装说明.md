1. 安装qbittorrent，设置中开启Web UI，关闭下方的“启用 Host header 属性验证”，按需修改用户名和密码
2. 运行一次，会在本应用根目录下生成settings.json配置文件
3. 修改配置文件settings.json中的qbHost为当前qbittorrent的webUI地址，默认为8080端口（详见下方配置项），如已了解对应配置项，可于此步提前修改好
4. 点击托盘图标重启本应用
5. 通过serverPort端口（默认地址http://localhost:9009）访问本应用（如果不显示登录界面，只显示一段文字，如403、无权限等，请尝试在qBittorrent Web UI验证中放宽连续失败次数并重启qBittorrent，以后改进）
6. 可选，按需修改FileServer配置（详见下方配置项），通过点击Web UI上方绿色FileServer打开配置界面（或在pc端修改本应用根目录下配置文件settings.json）
7. enjoy it！

