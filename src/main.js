const { app, Tray, Menu } = require('electron');
const server = require('./server.js');
const path = require('path');
let tray

app.whenReady().then(() => {
  try {
    let iconPath = path.resolve(__dirname, '../public', 'favicon.png')
    const contextMenu = Menu.buildFromTemplate([
      {label: '重启', type: 'normal', click() {
        app.relaunch();
        app.quit();
      }},
      { label: '退出', type: 'normal', role: 'quit' },
    ])
    tray = new Tray(iconPath)
    tray.setContextMenu(contextMenu)
    tray.setToolTip('FileServer')
    tray.setTitle('FileServer')
    console.log('tray on');
  } catch (error) {
    console.log('tray off');
  }
})