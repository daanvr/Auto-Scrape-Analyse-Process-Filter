const cheerio = require('cheerio')
// const request = require('request');
// const async = require('async');
const Nightmare = require('nightmare');
// const color = require('cli-color');
const fs = require('fs');
// const csv = require("csvtojson");
// let csvToJson = require('convert-csv-to-json');


function searchForNewMarktplaatsAds() {
  for (i = 1; i < 6; i++) { // assumes 18 pages.
    openMarktplaatsForNewAds(i);
  }
}

function openMarktplaatsAdForCarInfo(url) {
  var nightmare = Nightmare({ show: false });
  nightmare
    .goto(url)
    .scrollTo(25000, 0)
    .extractDataFromMarctplaatsAd('.mp-Listing-title')
    .then((car) => {
      newCarData(car);
    })
    .then(() => {

      loopThrougAds()
    })
    .then(nightmare.end())
    .catch((e) => {
      console.dir(e)
      dataBase.queue.marktplaats.push(url);
    });
}

function openMarktplaatsForNewAds(pageNbr) {
  let serchQuery = 'https://www.marktplaats.nl/l/auto-s/p/' + pageNbr + '/#q:vito|PriceCentsFrom:151000|PriceCentsTo:1500000|constructionYearFrom:2005|constructionYearTo:2010|sortBy:SORT_INDEX|sortOrder:DECREASING|postcode:7522MB|view:gallery-view|limit:100';
  // let serchQuery = 'https://www.marktplaats.nl/l/auto-s/p/' + pageNbr + '/#q:transporter|PriceCentsFrom:151000|PriceCentsTo:1500000|constructionYearFrom:2005|constructionYearTo:2010|sortBy:SORT_INDEX|sortOrder:DECREASING|postcode:7522MB|view:gallery-view';
  var nightmare = Nightmare({ show: true });
  nightmare
    .goto(serchQuery)
    .wait('body')
    .scrollTo(25000, 0)
    .evaluate(() => document.querySelector('body').innerHTML)
    .end()
    .then(response => { procesMarkplaatsSearchHtml(response) })
    .catch((e) => { console.dir(e) });
}
// openMarktplaatsForNewAds(1)

function openMarktplaatsForNewAdsAllPages(url) {
  var nightmare = Nightmare({ show: true });
  nightmare
    .goto(url)
    .wait('body')
    .scrollTo(25000, 0)
    .evaluate(() => document.querySelector('body').innerHTML)
    .end()
    .then(response => { procesMarkplaatsSearchHtml(response) })
    .catch((e) => { console.dir(e) });
}

let procesMarkplaatsSearchHtml = html => {
  var adsOnPage = [];
  const $ = cheerio.load(html); // cherio is a jquery like library for node js
  $(".mp-Listing").each((i, elem) => { // select ads gallery item
    adsOnPage.push({
      title: $(elem).find(".mp-Listing-title").text(), //  within the item select title
      price: $(elem).find(".mp-Listing-price").text(),
      url: "https://www.marktplaats.nl" + $(elem).find("a").attr("href")
      // img: $(elem).find("img").attr("src")
    });
  });

  mergeAdsOldNew(adsOnPage); //procesing extracted Data

  // Show sample to know if it works
  console.log("Sample: " + adsOnPage[0]);

  // if there is a "next" page go and scrape that too
  if ($("#content > div.mp-Page-element.mp-Page-element--main > div.mp-PaginationControls > nav > a:nth-child(4)").attr("href") != undefined) {
    var nextUrl = "https://www.marktplaats.nl" + $("#content > div.mp-Page-element.mp-Page-element--main > div.mp-PaginationControls > nav > a:nth-child(4)").attr("href");
    openMarktplaatsForNewAdsAllPages(nextUrl)
    console.log("To next page of Marktplaats.");
  }

}

let simultaniousQueries = 0;

function openMarkplaatsAdForScraping(url) {
  var nightmare = Nightmare({ show: false });
  nightmare
    .goto(url)
    .wait('body')
    .scrollTo(25000, 0)
    .evaluate(() => document.querySelector('body').innerHTML)
    .end()
    .then((response) => {
      procesMarkplaatsAdHtml(response, url);
      simultaniousQueries--
      loopThrougAdQueue();
    })
    .catch((e) => { console.dir(e) });
}
// openMarkplaatsAdForScraping("https://www.marktplaats.nl/a/auto-s/volkswagen/m1550958802-volkswagen-polo-gti-1-4-tsi-132kw-dsg-2011-zwart-full-option.html?c=f9c10d02d229f439a6f2f5d406f79fb6&previousPage=vip")

let procesMarkplaatsAdHtml = (html, url) => {
  var car = {};
  const $ = cheerio.load(html); // cherio is a jquery like library for node js
  var keys = [];
  var values = [];
  $("#car-attributes > div.car-feature-table.spec-table.spec-table_flex.spec-table_flex--withOptions > div > span:nth-child(1)").each((i, data) => {
    keys.push(data.children[0].data)
  });
  $("#car-attributes > div.car-feature-table.spec-table.spec-table_flex.spec-table_flex--withOptions > div > span:nth-child(2)").each((i, data) => {
    if (data.attribs["data-model-binding"] == "options") { } else { values.push(data.children[0].data) }
  });
  $("#car-attributes > div.car-feature-table.spec-table.spec-table_flex.spec-table_flex--withOptions > div.spec-table-item.spec-table-item--fullwidth > span.value > ul > li").each((i, data) => {
    car[data.children[0].children[0].data] = true;
  });
  car.description = $("#vip-ad-description").text();
  // if (car.description != undefined) {car.description = car.description.split("\n");}
  car.views = $("#content > section > section.listing.mp-Card.mp-Card--rounded > section.l-top-content.mp-Card-block > section.header.clear-fix.container-view-desktop > div.stats > span:nth-child(1) > span:nth-child(3)").text();
  car.saved = $("#content > section > section.listing.mp-Card.mp-Card--rounded > section.l-top-content.mp-Card-block > section.header.clear-fix.container-view-desktop > div.stats > span:nth-child(2) > span:nth-child(3)").text();
  car.pubishedOn = $("#displayed-since > span:nth-child(3)").text();
  car.location = $("#vip-map-show").text().replace("\n", "").replace("                            ", "").replace("\n", "").replace("                    ", "");
  if (car.location === "") { car.location = $("#vip-seller-location > h3 > span").text() }
  car.lng = $("#vip-map-show").attr("long");
  car.lat = $("#vip-map-show").attr("lat");
  car.SellersName = $("#vip-seller > div.info-block > div > div > div.top-info > a > h2").attr("title");
  car.url = url;
  car.shareUrl = $("#content > section > section.listing.mp-Card.mp-Card--rounded > section.bottom-actions.mp-Card-block.mp-Card-block--highlight > div.short-link > input").attr("value");
  car.imgs = [];
  $("#vip-image-viewer > div > img").each((i, data) => {
    car.imgs.push(data.attribs.src.replace("//", ""));
  });
  for (i in keys) {
    keys[i] = keys[i].replace(":", ""); // clean string
    car[keys[i]] = values[i];
  }
  if (car.Kilometerstand != undefined) {car.Kilometerstand = car.Kilometerstand.replace(" km", "").replace(".", "")}
  if (car.Prijs != undefined) {car.Prijs = car.Prijs.replace("€ ", "").replace(",00", "").replace(".", "")}
  if (car.Vermogen != undefined) {car.Vermogen = car.Vermogen.replace(" pk", "")}
  
  
  
  newCarData(car)
  // console.log(car);
}

function loadOldAds() {
  let json = csvToJson.getJsonFromCsv("data.csv");
  oldAds = json;
  console.log("Loaded " + oldAds.length + " ads.")
  for (let i = 0; i < 3; i++) {
    console.log(json[i]);
  }
}

function loadJsonFormCsv(filePath) {
  return csvToJson.getJsonFromCsv(filePath);
}

function mergeAdsOldNew(newAds) {
  if (dataBase === undefined) { dataBase = loadJsonFile("DB.json"); }
  for (na in newAds) {
    if (dataBase.ads.marktplaats[newAds[na].url] === undefined) {
      dataBase.ads.marktplaats[newAds[na].url] = newAds[na];
      dataBase.queue.marktplaats.push(newAds[na].url);
      console.log("Nieuwe advertentie")
    }
  }
  saveJsonFile("DB.json", dataBase);
}

function saveMergedAdList(data) {
  var csvData = "";
  for (i in data) {
    csvData += data[i][0] + ";" + data[i][1] + ";" + data[i][2] + ";" + data[i][3] + "\n";
  }

  fs.appendFile('data.csv', csvData, function (err) {
    if (err) throw err;
    console.log('Added ' + data.length + ' ads!');
  });
}

let dataBase;
let fisrtTime = true;
let runAmount;
function loopThrougAdQueue() {
  if (fisrtTime) {
    if (dataBase === undefined) { dataBase = loadJsonFile("DB.json"); }
    // console.log(dataBase.queue.marktplaats.length + " left in queue")
    runAmount = dataBase.queue.marktplaats.length;
    // ads = loadJsonFormCsv("data.csv");

    // openMarktplaatsAdForCarInfo(dataBase.queue.marktplaats.pop())
    var nextCar = dataBase.queue.marktplaats.pop();
    // console.log(nextCar);
    openMarkplaatsAdForScraping(nextCar)
    fisrtTime = false;
  } else {
    console.log(dataBase.queue.marktplaats.length + " left in queue")
    runAmount--
    if (runAmount > 0) {
      while (simultaniousQueries < 10) {
        console.log("go for next add");
        var nextCar = dataBase.queue.marktplaats.pop();
        openMarkplaatsAdForScraping(nextCar);
        simultaniousQueries++
      }

      // openMarktplaatsAdForCarInfo(dataBase.queue.marktplaats.pop())

      // var nextCar = dataBase.queue.marktplaats.pop();
      // openMarkplaatsAdForScraping(nextCar);

      // var nextCar = dataBase.queue.marktplaats.pop();
      // openMarkplaatsAdForScraping(nextCar);
      
    } else if (runAmount == 0) {
      saveJsonFile("DB.json", dataBase);
    }
  }
}

// openMarkplaatsAdForScraping(url)

function loadAdsIntoQueue() {
  dataBase = loadJsonFile("DB.json");
  let adKeys = Object.keys(dataBase.ads.marktplaats)
  for (let i = 0; i < adKeys.length; i++) {
    dataBase.queue.marktplaats.push(dataBase.ads.marktplaats[adKeys[i]].url)
  }
  saveJsonFile("DB.json", dataBase);
}

function loadAdsFromCsvIntoDb() {
  dataBase = loadJsonFile("DB.json");
  let ads = loadJsonFormCsv("data.csv");
  console.log(dataBase)
  for (i in ads) {
    dataBase.ads.marktplaats[ads[i].url] = ads[i];
  }
  saveJsonFile("DB.json", dataBase);
}


// openMarktplaatsForNewAdsAllPages("https://www.marktplaats.nl/l/auto-s/#q:vito|PriceCentsFrom:151000|PriceCentsTo:1500000|constructionYearFrom:2005|constructionYearTo:2010|sortBy:SORT_INDEX|sortOrder:DECREASING|postcode:7522MB|view:gallery-view|limit:100")

loopThrougAdQueue() // execute on queue

// arrayOfAllCarsForExport();

// loadAdsIntoQueue()
// loadAdsFromCsvIntoDb()

// openMarktplaatsForNewAds(2);
// loadOldAds();

function loadJsonFile(fileLocation) {
  return JSON.parse(fs.readFileSync(fileLocation));
}
let readyToSaveQ = true;
function saveJsonFile(fileLocation, jsonData) {
  if (readyToSaveQ) {
    fs.writeFile(fileLocation, JSON.stringify(jsonData), function (err) {
      if (err) throw err;
      console.log('All new changes have been saved to DateBase');
    });
    readyToSaveQ = false;
    setTimeout(() => {
      readyToSaveQ = true;
    }, 1000);
  } else {
    setTimeout(() => {
      saveJsonFile(fileLocation, jsonData)
    }, 1000);
  }
}

function newCarData(car) {
  if (dataBase === undefined) { dataBase = loadJsonFile("DB.json"); }
  // console.log("New car data");
  if (car.Kenteken != undefined) {
    dataBase.cars.numberPlats[car.Kenteken] = car;
    console.log(car.Kenteken);
  } else {
    dataBase.cars.url[car.url] = car;
    console.log(car.url);
  }
  saveJsonFile("DB.json", dataBase);
}

function fromDatebaseToCsv() { // not buildt jet
  var csvData = "";
  let carNbrPlats = Object.keys(dataBase.cars.numberPlats);
  let carUrls = Object.keys(dataBase.cars.url);

  //Get all xisting keys for any car
  for (np in carNbrPlats) {
    Object.keys(dataBase.cars.numberPlats[carNbrPlats[np]])
  }


  for (i in dataBase.cars.numberPlats) {
    csvData += data[i][0] + ";" + data[i][1] + ";" + data[i][2] + ";" + data[i][3] + "\n";
  }

  fs.appendFile('export.csv', csvData, function (err) {
    if (err) throw err;
    console.log('Exported ' + data.length + ' cars!');
  });
}

function arrayOfAllCarsForExport() {
  dataBase = loadJsonFile("DB.json");

  let allCarsForExport = [];

  let carNbrPlats = Object.keys(dataBase.cars.numberPlats);
  let carUrls = Object.keys(dataBase.cars.url);

  for (np in carNbrPlats) {
    allCarsForExport.push(dataBase.cars.numberPlats[carNbrPlats[np]]);
  }
  for (url in carUrls) {
    allCarsForExport.push(dataBase.cars.url[carUrls[url]]);
  }

  dataBase.cars.all = allCarsForExport;
  // saveJsonFile("DB.json", dataBase);

  cleanCarsForExport()

}


//must add delay for save function to not create problem

function cleanCarsForExport() {
  // dataBase = loadJsonFile("DB.json");

  for (i in dataBase.cars.all) {
    //transforms description array to description string
    if (Array.isArray(dataBase.cars.all[i].description)) {
      let newDescription = "";
      for (a in dataBase.cars.all[i].description) {
        newDescription += " " + dataBase.cars.all[i].description[a];
      }
      dataBase.cars.all[i].description = newDescription;
    }

    // transforms options array to opjects with true in it.
    if (dataBase.cars.all[i].Opties != undefined) {
      for (a in dataBase.cars.all[i].Opties) {
        dataBase.cars.all[i][dataBase.cars.all[i].Opties[a]] = true;
      }
      dataBase.cars.all[i].Opties = ""
    }

    // Clean strings
    if (dataBase.cars.all[i].Kilometerstand != undefined) {
      dataBase.cars.all[i].Kilometerstand = Number(dataBase.cars.all[i].Kilometerstand.replace(" km", "").replace(".", ""));
    }
    if (dataBase.cars.all[i].Prijs != undefined) {
      dataBase.cars.all[i].Prijs = Number(dataBase.cars.all[i].Prijs.replace("€ ", "").replace(",00", "").replace(".", ""));
    }
    if (dataBase.cars.all[i].Vermogen != undefined) {
      dataBase.cars.all[i].Vermogen = Number(dataBase.cars.all[i].Vermogen.replace(" pk", ""));
    }
  }
  saveJsonFile("DB.json", dataBase);

}