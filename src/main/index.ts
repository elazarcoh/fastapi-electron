import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import net from 'net'
import { execFile, spawn } from 'child_process'
import readline from 'readline'


const API_PROD_PATH = join(process.resourcesPath, "../lib/api/api.exe")
const API_DEV_PATH = join(__dirname, "../../engine/api.py")


async function getPortFree() {
  return new Promise(res => {
    const srv = net.createServer();
    srv.listen(0, 'localhost', () => {
      const address = srv.address();
      if (address === null || typeof address === 'string') {
        throw new Error('Server address is not available');
      }
      const port = address.port;
      srv.close((err) => res(port))
    });
  })
}

function startAPI(port) {
  // check if current app is Production or Development using electron-is-dev library
  // current app is not production, just run the API from api.py,else run the api from API_PROD_PATH
  if (is.dev) {
    const python = 'python';

    try {

      const proc = spawn(python, [API_DEV_PATH, `--port=${port}`], {
        windowsHide: true,
        env: {
          ...process.env,
          PORT: port.toString(),
          PYTHONUNBUFFERED: '1'
        }
      });
      readline.createInterface({
        input: proc.stdout,
        terminal: false
      }).on('line', function (line) {
        console.log(line);
      });
      readline.createInterface({
        input: proc.stderr,
        terminal: false
      }).on('line', function (line) {
        console.error(line);
      });
    }
    catch (e) {
      console.log(e)
    }

  } else {
    execFile(API_PROD_PATH, {
      windowsHide: true
    })
  }
}


function startApp(port) {


  function createWindow(): void {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
      width: 900,
      height: 670,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    mainWindow.on('ready-to-show', () => {
      mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    mainWindow.loadURL(`http://localhost:${port}`)
  }

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  // In this file you can include the rest of your app"s specific main process
  // code. You can also put them in separate files and require them here.

}

async function start() {
  const port = await getPortFree()
  startAPI(port)
  startApp(port)
}

start()