const {
    app,
    Menu,
    Tray,
    BrowserWindow,
    ipcMain
} = require('electron');
const Store = require('electron-store');
const store = new Store();
const Client = require('coinbase').Client;
let coinClient;
let isQuiting;
let tray;
let loginWindow;
let apiKey;
let apiSecret;

if (store.get('apiKey') && store.get('apiSecret')) {
    coinClient = new Client({
        'apiKey': store.get('apiKey'),
        'apiSecret': store.get('apiSecret'),
        strictSSL: false
    });
    apiKey = store.get('apiSecret');
    apiSecret = store.get('apiSecret');
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
                }, 0)
                console.log(totalPortfolioValue)
                tray.setTitle(`$${new Intl.NumberFormat().format(totalPortfolioValue)}`)
            }
        });
    }
}

// receive message from index.html
ipcMain.on('asynchronous-message', (event, arg) => {
    if (arg.apiKey) {
        apiKey = arg.apiKey;
        store.set('apiKey', arg.apiKey);
    }
    if (arg.apiSecret) {
        apiSecret = arg.apiSecret;
        store.set('apiKapiSecretey', arg.apiSecret);
    }
    coinClient = new Client({
        'apiKey': apiKey,
        'apiSecret': apiSecret,
        strictSSL: false
    });
    updateTitle();
    loginWindow.hide();
});

setInterval(updateTitle, 60 * 1000)

app.on('before-quit', function () {
    isQuiting = true;
});

app.whenReady().then(() => {
    loginWindow = new BrowserWindow({
        width: 300,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false,
    })
    loginWindow.loadFile('index.html');

    loginWindow.on('close', function (event) {
        if (!isQuiting) {
            event.preventDefault();
            loginWindow.hide();
            event.returnValue = false;
        }
    });

    tray = new Tray('coin3.png')
    const contextMenu = Menu.buildFromTemplate([{
            label: 'Login',
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
    tray.setTitle('wooo!')
})