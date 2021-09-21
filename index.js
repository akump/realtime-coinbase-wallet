// TODO write an about page
const {
    app,
    Menu,
    Tray,
    BrowserWindow,
    nativeImage,
    shell,
    ipcMain
} = require('electron');
const {
    writeData,
    readData
} = require('./src/dataStore.js');
const Client = require('coinbase').Client;

let coinClient;
let isQuiting;
let tray;
let loginWindow;
let apiKey;
let apiSecret;
let hasCache = false;

const permanentContextMenuTemplate = [{
    label: 'Love the app? Buy me a coffee ☕',
    click: () => shell.openExternal('https://www.buymeacoffee.com/akump')
},
{
    label: 'Quit',
    click: () => {
        isQuiting = true;
        app.quit();
    }
}];

const connectMenuTemplate = [{
    label: 'Connect to Coinbase...',
    click: () => loginWindow.show()

},
...permanentContextMenuTemplate
];

const logout = function () {
    apiKey = null;
    apiSecret = null;
    coinClient = null;
    hasCache = false;
    writeData('apiKey', '');
    writeData('apiSecret', '');
    updateTitle();
    tray.setContextMenuFromTemplate(connectMenuTemplate);
};

const buildContextMenu = function (allUserAccounts) {
    let newContextMenu = [{
        type: 'separator'
    },
    {
        label: 'Re-enter API key...',
        click: () => loginWindow.show()
    },
    {
        label: 'Logout',
        click: () => logout()
    },
    ...permanentContextMenuTemplate
    ];
    for (let acc of allUserAccounts) {
        if (parseInt(acc.native_balance.amount) > 0) {
            const usd = acc.native_balance.amount;
            const coin = acc.balance.currency;
            const coin_balance = parseFloat(acc.balance.amount).toFixed(8);
            newContextMenu = [{
                label: `${coin_balance} ${coin} - $${usd}`,
                click: () => shell.openExternal(`https://www.coinbase.com/accounts/${acc.id}`)
            }, ...newContextMenu,]
        }
    }
    tray.setContextMenuFromTemplate(newContextMenu);
};

const updateTitle = function (pagination = {}, allUserAccounts = []) {
    if (apiKey && apiSecret && coinClient) {
        coinClient.getAccounts(pagination, (err, accounts, pagination) => {
            if (accounts) {
                allUserAccounts = [...allUserAccounts, ...accounts];
            }
            if (pagination) {
                updateTitle(pagination, allUserAccounts)
            } else {
                let totalPortfolioValue = allUserAccounts.reduce((previousValue, currentValue) => previousValue + parseFloat(currentValue.native_balance.amount), 0);
                totalPortfolioValue = totalPortfolioValue.toFixed(2);
                const formattedNumber = Number(totalPortfolioValue).toLocaleString('en', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
                console.log(`${new Date()}: ${formattedNumber}`);
                tray.setMonospacedTitle(`$${formattedNumber}`);
                buildContextMenu(allUserAccounts);
            }
        });
    } else {
        tray.setMonospacedTitle(`$0 - Connect account`);
    }
}

const savedApiKey = readData('apiKey');
const savedApiSecret = readData('apiSecret');

if (savedApiKey && savedApiSecret) {
    coinClient = new Client({
        'apiKey': savedApiKey,
        'apiSecret': savedApiSecret,
        strictSSL: false
    });
    apiKey = savedApiKey;
    apiSecret = savedApiSecret;
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
    });
    loginWindow.loadFile('index.html');
    // loginWindow.webContents.openDevTools();

    loginWindow.on('close', event => {
        if (!isQuiting) {
            event.preventDefault();
            loginWindow.hide();
            event.returnValue = false;
        }
    });

    tray = new Tray(nativeImage.createEmpty());
    tray.setMonospacedTitle = function (text) {
        tray.setTitle(text, {
            fontType: 'monospacedDigit'
        });
    };
    tray.setContextMenuFromTemplate = function (contextMenuOptions) {
        const contextMenu = Menu.buildFromTemplate(contextMenuOptions);
        tray.setContextMenu(contextMenu);
    };
    tray.setMonospacedTitle('Realtime Coinbase');

    setInterval(updateTitle, 30 * 1000);

    if (hasCache) {
        updateTitle();
    } else {
        tray.setContextMenuFromTemplate(connectMenuTemplate);
    }
})