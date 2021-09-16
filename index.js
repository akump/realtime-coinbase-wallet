const {
    app,
    Menu,
    Tray,
    BrowserWindow,
    nativeImage,
    ipcMain
} = require('electron');
const path = require('path');
const fs = require('fs');
const dataPath = app.getPath('userData');
console.log(dataPath)
const configPath = path.join(dataPath, 'config.json');

function writeData(key, value) {
    let contents = parseData()
    contents[key] = value;
    fs.writeFileSync(configPath, JSON.stringify(contents));
}

function readData(key) {
    let contents = parseData()
    return contents[key];
}

function parseData() {
    const defaultData = {}
    try {
        return JSON.parse(fs.readFileSync(configPath));
    } catch (error) {
        return defaultData;
    }
}

const Client = require('coinbase').Client;
let coinClient;
let isQuiting;
let tray;
let loginWindow;
let apiKey;
let apiSecret;
let hasCache = false;


console.log(readData('apiKey'))
console.log(readData('apiSecret'))

const updateTitle = function (pagination = {}, allUserAccounts = []) {
    if (apiKey && apiSecret && coinClient) {
        coinClient.getAccounts(pagination, function (err, accounts, pagination) {
            if (accounts) {
                allUserAccounts = [...allUserAccounts, ...accounts];
            }
            if (pagination) {
                updateTitle(pagination, allUserAccounts)
            } else {
                let totalPortfolioValue = allUserAccounts.reduce(function (previousValue, currentValue) {
                    return previousValue + parseFloat(currentValue.native_balance.amount)
                }, 0)
                const formattedNumber = Number(totalPortfolioValue.toFixed(2)).toLocaleString('en');
                console.log(formattedNumber);
                tray.setTitle(`$${formattedNumber}`);
            }
        });
    } else {
        tray.setTitle(`$0 - Connect account`);
    }
}

if (readData('apiKey') && readData('apiSecret')) {
    coinClient = new Client({
        'apiKey': readData('apiKey'),
        'apiSecret': readData('apiSecret'),
        strictSSL: false
    });
    apiKey = readData('apiKey');
    apiSecret = readData('apiSecret');
    hasCache = true;
}

ipcMain.on('asynchronous-message', (event, arg) => {
    if (arg.apiKey) {
        apiKey = arg.apiKey;
        writeData('apiKey', arg.apiKey);
    }
    if (arg.apiSecret) {
        apiSecret = arg.apiSecret;
        writeData('apiSecret', arg.apiSecret);
    }
    coinClient = new Client({
        'apiKey': apiKey,
        'apiSecret': apiSecret,
        strictSSL: false
    });
    updateTitle();
    loginWindow.hide();
});

setInterval(updateTitle, 15 * 1000)

app.on('before-quit', function () {
    isQuiting = true;
});

app.whenReady().then(() => {
    loginWindow = new BrowserWindow({
        width: 450,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false,
    })
    loginWindow.loadFile('index.html');
    // loginWindow.webContents.openDevTools();


    loginWindow.on('close', function (event) {
        if (!isQuiting) {
            event.preventDefault();
            loginWindow.hide();
            event.returnValue = false;
        }
    });

    tray = new Tray(nativeImage.createEmpty());
    const contextMenu = Menu.buildFromTemplate([{
            label: 'Connect to Coinbase...',
            click: () => {
                loginWindow.show();
            }
        },
        {
            label: 'Quit',
            click: function () {
                isQuiting = true;
                app.quit();
            }
        }
    ])


    tray.setContextMenu(contextMenu);
    tray.setTitle(`Coinbase`);
    if (hasCache) {
        updateTitle();
    }
})