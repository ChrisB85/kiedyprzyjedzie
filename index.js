"use strict"

const config = require("config");
const playwright = require("playwright-chromium");

const urls = config.get('url');
var browser;
var data = {};

(async () => {
    const browserType = "chromium";
    browser = await playwright[browserType].launch({
        // headless: false,
    });

    let context = await browser.newContext();

    urls.forEach(async (url) => {
        let page = await context.newPage();

        await page.goto(url);

        page.on('console', msg => {
            // console.log(msg.text());
            getDepartures(page);
        });

        await page.addScriptTag({
            path: 'observer.js'
        });

        getDepartures(page);
    });

})();

async function getDepartures(page) {
    let stopoverNameElem = await page.$('.block-search__stop td strong');
    let stopoverName = await stopoverNameElem.innerText();

    let stopoverNoElem = await page.$('.block-search__stop td span');
    let stopoverNo = await stopoverNoElem.innerText();

    let departuresRows = await page.$$('table.stop-departures tr');

    var lineKey = `${stopoverName} ${stopoverNo}`;

    // No departures?
    if (departuresRows.length == 0) {
        data[lineKey] = [];
        await page.close();
        processData();
    }
    let departuresArray = [];
    departuresRows.forEach(async (d) => {
        let departure = {};
        let lineNoElem = await d.$('.line-no');
        departure.number = await lineNoElem.innerText();

        let lineNameElem = await d.$('.line-direction');
        departure.name = await lineNameElem.innerText();

        let lineTimeElem = await d.$('.departure-time');
        departure.time = await lineTimeElem.innerText();

        departuresArray.push(departure);
        if (departuresArray.length == departuresRows.length) {
            data[lineKey] = departuresArray;
            // await page.close();
            processData();
        }
    });
}

async function processData() {
    // Not all data retrieved yet
    if (Object.keys(data).length < urls.length) {
        return;
    }
    console.log("Output data:");
    console.log(data);
    data = [];
    // await browser.close();
    // process.exit();
}