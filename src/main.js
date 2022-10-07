const { app, Tray, Menu } = require('electron');
const server = require('./server.js');
const path = require('path');
let tray

app.whenReady().then(() => {
  let iconPath = path.resolve(__dirname, '../public', 'favicon.png')
  const contextMenu = Menu.buildFromTemplate([
    { label: 'quit', type: 'normal', role: 'quit' },
  ])
  tray = new Tray(iconPath)
  tray.setContextMenu(contextMenu)
  tray.setToolTip('FileServer')
  tray.setTitle('FileServer')
})