require('dotenv').config()
const Client = require('coinbase').Client;
const client = new Client({
    'apiKey': process.env.apiKey,
    'apiSecret': process.env.apiSecret,
    strictSSL: false
});

const getAccounts = async function (pagination = {}) {
    client.getAccounts(pagination, function (err, accounts, pagination) {
        if (accounts) {
            for (const account of accounts) {
                console.log('my bal: ' + account.balance.amount + ' for ' + account.name);
            }
        }
        if (pagination) {
            getAccounts(pagination)
        } else {
            return;
        }
    });
}

getAccounts();