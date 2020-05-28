// const cheerio = require('cheerio')
// const request = require('request');
// const async = require('async');
const Nightmare = require('nightmare');
// const color = require('cli-color');
const fs = require('fs');
// const csv = require("csvtojson");
let csvToJson = require('convert-csv-to-json');

var oldAds;




Nightmare.action('extractAdsFromMarctplaatsSearch', function (selector, done) {
  this.evaluate_now((selector) => {
    var title = Array.from(document.querySelectorAll(".mp-Listing-title")).map((element) => element.innerText);
    var price = Array.from(document.querySelectorAll(".mp-Listing-price")).map((element) => element.innerText);
    var location = Array.from(document.querySelectorAll(".mp-Listing-location")).map((element) => element.innerText);
    var url = Array.from(document.querySelectorAll(".mp-Listing a")).map((element) => element.href);
    var ads = [];
    for (i in title) {
      ads.push([title[i], price[i], url[i], location[i]])
      // ads.push({
      //   title: title[i],
      //   price: price[i],
      //   url: url[i],
      //   location: location[i]
      // })
    }
    return ads;
  }, done, selector)
});

Nightmare.action('extractDataFromMarctplaatsAd', function (selector, done) {
  this.evaluate_now(() => {
    var car = {};
    var key = Array.from(document.querySelectorAll(".spec-table-item .key")).map((element) => element.innerText);
    var value = Array.from(document.querySelectorAll(".spec-table-item .value")).map((element) => element.innerText);
    car.description = Array.from(document.querySelectorAll("#vip-ad-description")).map((element) => element.innerText)[0];
    // if (car.description != undefined) {car.description = car.description.split("\n");}
    car.views = Array.from(document.querySelectorAll("#content > section > section.listing.mp-Card.mp-Card--rounded > section.l-top-content.mp-Card-block > section.header.clear-fix.container-view-desktop > div.stats > span:nth-child(1) > span:nth-child(3)")).map((element) => element.innerText)[0]
    car.saved = Array.from(document.querySelectorAll("#content > section > section.listing.mp-Card.mp-Card--rounded > section.l-top-content.mp-Card-block > section.header.clear-fix.container-view-desktop > div.stats > span:nth-child(2) > span:nth-child(3)")).map((element) => element.innerText)[0]
    car.adDate = Array.from(document.querySelectorAll("#displayed-since > span:nth-child(3)")).map((element) => element.innerText)[0]
    car.location = Array.from(document.querySelectorAll("#vip-map-show")).map((element) => element.innerText)[0]
    // car.lng = Array.from(document.querySelectorAll("#vip-map-show")).map((element) => element.innerText)[0] // goal: get long attribute from element
    // car.lat = Array.from(document.querySelectorAll("#vip-map-show")).map((element) => element.innerText)[0] // goal: get lat attribute from element
    car.SellersName = Array.from(document.querySelectorAll("#vip-seller > div:nth-child(1) > div.top-info > a > h2")).map((element) => element.innerText)[0]
    car.url = Array.from(document.querySelectorAll("#content > section > section.listing.mp-Card.mp-Card--rounded > section.bottom-actions.mp-Card-block.mp-Card-block--highlight > div.short-link > input")).map((element) => element.value)[0]
    car.imgs = [];
    for (i in key) {
      key[i] = key[i].replace(":", "");
      if (key[i] == "Opties") {
        car[key[i]] = value[i].split("\n");
      } else {
        car[key[i]] = value[i];
      }
    }
    return car;
  }, done, selector)
});

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
    // .click('.mp-Dialog-close')
    // .click('.gdpr-consent-button')
    .scrollTo(25000, 0)
    .extractAdsFromMarctplaatsSearch('.mp-Listing-title')
    .then((ads) => { mergeAdsOldNew(ads) })
    .then(nightmare.end())
    .catch((e) => { console.dir(e) });
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
  for (na in newAds) {
    if (dataBase.ads.marktplaats[newAds[na][2]] === undefined) {
      dataBase.ads.marktplaats[newAds[na][2]] = newAds[na];
      dataBase.queue.marktplaats.push(newAds[na][2]);
      console.log("Nieuwe advertentie")
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
function loopThrougAds() {
  if (fisrtTime) {
    dataBase = loadJsonFile("DB.json");
    console.log(dataBase.queue.marktplaats.length + " left in queue")
    runAmount = dataBase.queue.marktplaats.length + 1;
    // ads = loadJsonFormCsv("data.csv");

    openMarktplaatsAdForCarInfo(dataBase.queue.marktplaats.pop())
    fisrtTime = false;
  } else {
    console.log(dataBase.queue.marktplaats.length + " left in queue")
    runAmount--
    if (runAmount > 0) {
      openMarktplaatsAdForCarInfo(dataBase.queue.marktplaats.pop())
    } else if (runAmount == 0) {
      saveJsonFile("DB.json", dataBase);
    }
  }
}

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

// searchForNewMarktplaatsAds() //find new ads for queue
// loopThrougAds() // execute on queue
arrayOfAllCarsForExport();

// loadAdsIntoQueue()
// loadAdsFromCsvIntoDb()

// openMarktplaatsForNewAds(2);
// loadOldAds();

function loadJsonFile(fileLocation) {
  return JSON.parse(fs.readFileSync(fileLocation));
}

function saveJsonFile(fileLocation, jsonData) {
  fs.writeFile(fileLocation, JSON.stringify(jsonData), function (err) {
    if (err) throw err;
    console.log('All new changes have been saved to DateBase');
  });
}

function newCarData(car) {
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