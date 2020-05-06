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

        let stopoverNameElem = await page.$('.block-search__stop td strong');
        let stopoverName = await stopoverNameElem.innerText();

        let stopoverNoElem = await page.$('.block-search__stop td span');
        let stopoverNo = await stopoverNoElem.innerText();
        
        let departuresElem = await page.$$('table.stop-departuresElem tr');
        // No departuresElem?
        if (departuresElem.length == 0) {
            data[`${stopoverName} ${stopoverNo}`] = [];
            await page.close();
            processData();
        }
        let departuresArray = [];
        departuresElem.forEach(async (d) => {
            let departure = {};
            let lineNoElem = await d.$('.line-no');
            departure.lineNumber = await lineNoElem.innerText();

            let lineNameElem = await d.$('.line-direction');
            departure.lineName = await lineNameElem.innerText();

            let lineTimeElem = await d.$('.departure-time');
            departure.lineTime = await lineTimeElem.innerText();

            departuresArray.push(departure);
            if (departuresArray.length == departuresElem.length) {
                data[`${stopoverName} ${stopoverNo}`] = departuresArray;
                await page.close();
                processData();
            }
        });
    });
    
})();

async function processData() {
    if (Object.keys(data).length < urls.length) {
        return;
    }
    console.log(data);
    console.info("Closing browser...");
    await browser.close();
    process.exit();
}