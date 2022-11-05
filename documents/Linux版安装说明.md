1. **以Ubuntu Desktop版为例，不完全适合server版或其它linux发行版**（electron需要图形环境）,非root用户，root用户未测试，该安装说明部分内容是根据回忆记录，可能有不准确的地方，等有空了再重装试试，总之绝大部分问题在于驱动和权限

2. intel显卡自带驱动，nvidia和amd需要正确安装显卡驱动，可参考jellyfin官方的[安装说明](https://jellyfin.org/docs/general/administration/hardware-acceleration)。

   nvidia显卡可在附加驱动界面中安装最新驱动，

   如果使用vaapi，可不安装amd驱动，跳到第3步，

   这里"简单"说明amd显卡驱动的安装：

   - ！！！amd显卡需要安装**amdgpu-pro**驱动！！！，这是[官方文档地址](https://amdgpu-install.readthedocs.io/en/latest/install-prereq.html#downloading-the-installer-package)，也可以参考前面jellyfin的安装说明，最新安装包应该是在[repo.radeon.com](http://repo.radeon.com/amdgpu-install/latest)里

   - 下载并安装好amdgpu-install后，执行`amdgpu-install --usecase=workstation -y --vulkan=pro --opencl=rocr,legacy`

   - 如果报错显示udev依赖不满足等,执行`apt search amdgpu-pro`，确认能找到**amdgpu-pro**包后

   - 执行`sudo apt install amdgpu-pro `

   - 安装最后阶段，命令行会停止一段时间，不要关闭，这是在收集随机数据进行加密，等待一段时间后它会继续完成


   - ！！！在我的测试中，安装此驱动会导致Ubuntu图形界面出错，出现花屏、无法通过正常登录界面登录等问题（可以ssh连接），不确定是由于多个显卡驱动冲突还是什么配置项的问题，但这让我重装了好几次系统...
3. 安装jellyfin-ffmpeg5，可参考[官方文档](https://jellyfin.org/docs/general/administration/installing#ffmpeg-installation)

   ubuntu系统可使用下方单行命令

   没安装curl的需要先`sudo apt install curl -y` 

   ```sh
   curl -fsSL https://repo.jellyfin.org/ubuntu/jellyfin_team.gpg.key | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/debian-jellyfin.gpg && echo "deb [arch=$( dpkg --print-architecture )] https://repo.jellyfin.org/ubuntu $( lsb_release -c -s ) main" | sudo tee /etc/apt/sources.list.d/jellyfin.list && sudo apt update && sudo apt install jellyfin-ffmpeg5 -y 
   ```

   安装完成后在`/usr/share/jellyfin-ffmpeg`目录下看到ffmpeg、ffprobe、vainfo三个文件就说明安装成功了，再执行`sudo chown -R <用户名> /usr/share/jellyfin-ffmpeg/`防止权限错误,可执行`sudo /usr/share/jellyfin-ffmpeg/vainfo `查看是否能显示正确的显卡及驱动

4. 为ffmpeg添加使用显卡的权限，将下面的用户名替换为你自己的，也就是终端最开头的@符前的字符

   ```sh
   sudo adduser --system --group ffmpeg && sudo adduser <用户名> ffmpeg && sudo usermod -aG render ffmpeg
   ```

   有时可能仍然会出现权限问题,比如后续运行ffmpeg时报错permission...，可尝试`sudo chmod 777 /dev/dri/renderD128`

5. 安装qbittorrent，设置中开启Web UI，**关闭下方的“启用 Host header 属性验证”**，按需修改用户名和密码

6.  将本应用解压到合适的位置，建议在/home下的用户文件夹内，避免权限问题（可能需要`sudo chown -R 用户名 应用目录`）

7. 运行一次FileServer-for-qBittorrent，会在本应用根目录下生成settings.json配置文件

8. 修改配置文件settings.json中的qbHost为当前qbittorrent的webUI地址，默认为8080端口（详见下方配置项），如已了解对应配置项，可于此步提前修改好

9. 点击托盘图标重启本应用

10. 通过serverPort端口（默认端口9009）访问本应用（如果不显示登录界面，只显示一段文字，如403、无权限等，请尝试通过qBittorren端口访问原版Web UI，在设置的Web UI验证中放宽连续失败次数，并重启qBittorrent，以后改进）

11. 可选，按需修改FileServer配置（详见下方配置项），通过点击Web UI上方绿色FileServer打开配置界面（或在pc端修改本应用根目录下配置文件settings.json）

12. enjoy it！