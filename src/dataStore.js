const path = require('path');
const fs = require('fs');
const electron = require('electron')
const dataPath = electron.app.getPath('userData');
const configPath = path.join(dataPath, 'config.json');

const parseData = function () {
    const defaultData = {};
    try {
        return JSON.parse(fs.readFileSync(configPath));
    } catch (error) {
        return defaultData;
    }
};

const writeData = function (key, value) {
    let contents = parseData();
    contents[key] = value;
    fs.writeFileSync(configPath, JSON.stringify(contents));
};

const readData = function (key) {
    let contents = parseData();
    return contents[key];
};

module.exports = {
    writeData,
    readData
}