"use strict";

const config = require("config");
const playwright = require("playwright");
const HomeAssistant = require("homeassistant");

const urls = config.get('url');
var browser;
var data = {
    "data": {}
};

var hass = null;
if (config.has("homeAssistantUrl") && config.get("homeAssistantUrl").length > 0) {
    hass = new HomeAssistant({
        // Your Home Assistant host
        // Optional, defaults to http://locahost
        host: config.get("homeAssistantUrl"),

        // Your Home Assistant port number
        // Optional, defaults to 8123
        port: config.get("homeAssistanPort"),

        // Your long lived access token generated on your profile page.
        // Optional
        token: config.get("homeAssistantToken"),

        // Ignores SSL certificate errors, use with caution
        // Optional, defaults to false
        ignoreCert: false,
    });
}

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

async function getDepartures(page, time = null) {
    let updateTimeElem = await page.$('.info-strap time');
    let updateTime = await updateTimeElem.innerText();
    let stopoverNameElem = await page.$('.block-search__stop td strong');
    let stopoverName = await stopoverNameElem.innerText();

    let stopoverNoElem = await page.$('.block-search__stop td span');
    let stopoverNo = await stopoverNoElem.innerText();

    let departuresRows = await page.$$('table.stop-departures tr');

    let lineKey = `${stopoverName} ${stopoverNo}`;
    
    // No departures?
    if (departuresRows.length == 0) {
        data["data"][lineKey] = {
            time: updateTime,
            departures: {}
        };
        // await page.close();
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
            data["data"][lineKey] = {
                time: updateTime,
                departures: departuresArray
            };
            // await page.close();
            processData();
        }
    });
}

async function processData() {
    // Not all data retrieved yet
    
    if (Object.keys(data["data"]).length < urls.length) {
        return;
    }
    data["update_time"] = Date.now();
    console.log("Output data:");
    console.log(data);
    var dataString = JSON.stringify(data);
    await mqttPublish("playwright/sensor/departures", dataString, true);

    data = {
        "data": {}
    };
    // await browser.close();
    // process.exit();
}

async function mqttPublish(topic, payload, retain = false) {
    if (hass == null) {
        return;
    }

    console.info(`Sending mqtt payload ${payload}...`);
    hass.services
        .call("publish", "mqtt", {
            topic: topic,
            payload: payload,
            retain: retain,
        })
        .then((res) => { })
        .catch((err) => console.error(err));
}
