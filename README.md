# File-server-for-qBittorrent

### 说明

本项目为qbittorrent的周边项目，通过express，对于qbittorrent原生支持的api请求直接进行转发处理

另外提供一套api用于拦截对文件内容的请求，返回本地存储中对应的文件内容

对于视频内容，基于ffmpeg自动生成hls流，可在web端直接播放

（ffmpeg需在服务端安装并配置好环境变量）

（hevc/h.265编码的视频需客户端设备、浏览器支持）

（当前hls的生成并不会对视频进行转码，仅进行切片，因此画质、体积基本等同源文件，

生成速度主要受缓存所在的硬盘速度限制，有内存盘的建议将缓存路径设定为内存盘）

其它类型后续将提供下载或预览功能

### 使用方法

请先在qbittorrent配置使用了本服务api的webui，

启动本应用前需设置qbittorrent Web UI端口(默认连接localhost:8008)，

启动后，打开qbittorrent Web UI时，访问本服务端口(默认9009)而不是qbittorrent本身web端口

### 配置项

应用会自动在根目录生成默认配置文件settings.json，配置项如下

```
{
    
	"qbHost": "http://localhost:8008",	//qBittorrent Web UI的地址，如需使用ssl/https，请设置对应的地址和端口号

	"serverPort": 9009,             	//本应用端口
    
	"tempPath": "./",					//视频缓存地址，默认在应用根目录生成output文件夹，可另外指定，指定路径末尾要带/号，会在指定路径生成output文件夹

	"cert": "./ssl/domain.pem",     	//ssl证书路径，可手动修改

	"key": "./ssl/domain.key",      	//ssl密钥路径，可手动修改
	
	"secure": false                 	//ssl安全设置，ssl配置成功后会自动使用true
}
```

### ssl/https配置

在应用根目录下新建文件夹，命名ssl，放入证书，默认识别"domain.pem"和"domain.key"文件

### API

（todo）