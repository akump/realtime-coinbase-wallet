const {
    app,
    Menu,
    Tray,
    BrowserWindow,
    nativeImage,
    shell,
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

let contextMenuOptions = [{
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
];

const logout = function () {
    apiKey = undefined;
    apiSecret = undefined;
    coinClient = undefined;
    hasCache = false;
    writeData('apiKey', '');
    writeData('apiSecret', 'arg.apiSecret');
    updateTitle();
    const contextMenu = Menu.buildFromTemplate(contextMenuOptions);
    tray.setContextMenu(contextMenu);
};


const buildContextMenu = function (allUserAccounts) {
    let newContextMenu = [{
            type: 'separator'
        },
        {
            label: 'Re-enter API key...',
            click: () => {
                loginWindow.show();
            }
        },
        {
            label: 'Logout',
            click: () => {
                logout();
            }
        }, {
            label: 'Quit',
            click: function () {
                isQuiting = true;
                app.quit();
            }
        }
    ];
    for (let acc of allUserAccounts) {
        if (parseInt(acc.native_balance.amount) > 0) {
            const usd = acc.native_balance.amount;
            const coin = acc.balance.currency;
            const coin_balance = parseFloat(acc.balance.amount).toFixed(8);
            newContextMenu = [{
                label: `${coin_balance} ${coin} - $${usd}`,
                click: () => {
                    shell.openExternal(`https://www.coinbase.com/accounts/${acc.id}`)
                }
            }, ...newContextMenu, ]
        }
    }

    const contextMenu = Menu.buildFromTemplate(newContextMenu);
    tray.setContextMenu(contextMenu);
}
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
                }, 0);
                totalPortfolioValue = totalPortfolioValue.toFixed(2);
                const formattedNumber = Number(totalPortfolioValue).toLocaleString('en', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
                console.log(formattedNumber);
                tray.setTitle(`$${formattedNumber}`, {
                    fontType: 'monospacedDigit'
                });
                buildContextMenu(allUserAccounts);
            }
        });
    } else {
        tray.setTitle(`$0 - Connect account`, {
            fontType: 'monospacedDigit'
        });
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

setInterval(updateTitle, 30 * 1000);

app.on('before-quit', function () {
    isQuiting = true;
});

app.whenReady().then(() => {
    app.dock.hide();
    loginWindow = new BrowserWindow({
        width: 450,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false,
    })
    loginWindow.loadFile('index.html');
    loginWindow.webContents.openDevTools();

    loginWindow.on('close', function (event) {
        if (!isQuiting) {
            event.preventDefault();
            loginWindow.hide();
            event.returnValue = false;
        }
    });

    tray = new Tray(nativeImage.createEmpty());

    tray.setTitle(`Coinbase`, {
        fontType: 'monospacedDigit'
    });
    if (hasCache) {
        updateTitle();
    } else {
        const contextMenu = Menu.buildFromTemplate(contextMenuOptions);
        tray.setContextMenu(contextMenu);
    }
})