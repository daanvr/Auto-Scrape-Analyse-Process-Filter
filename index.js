let dataBase = {};
let car = {};
// let carsNbr = [];

$.getJSON("DB.json", function (data) {
    dataBase = data;
    // carsNbr = Object.keys(dataBase.cars.numberPlats);
    // console.log(dataBase);
    filterOutToExpensive(6100);
    filterOutToManyKms(320100);
    selectCar(0);
});

function selectCar(nbr) {
    console.log("car: " + nbr);
    console.log(dataBase.cars.potential.length);
    if (nbr >= dataBase.cars.potential.length) {
        console.log("first car");
        nbr = 1
    } else if (nbr < 0) {
        console.log("last car");
        nbr = dataBase.cars.potential.length - 1;
    }
    selectedCar = nbr;
    car = dataBase.cars.potential[nbr];
    console.log(car);

    displayCar()
}

function filterOutToExpensive(price) {
    for (p in dataBase.cars.potential) {
        if (dataBase.cars.potential[p].Prijs > price) {
            let toExpensive = dataBase.cars.potential.splice(p, 1)[0];
            console.log("toExpensive");
            console.log(toExpensive);
            dataBase.cars.toExpensive.push(toExpensive);
        }
    }
}
function filterOutToManyKms(kms) {
    for (ex in dataBase.cars.potential) {
        if (dataBase.cars.potential[ex].Kilometerstand > kms) {
            let toManyKms = dataBase.cars.potential.splice(ex, 1)[0];
            console.log("toManyKms");
            console.log(toManyKms);
            dataBase.cars.toManyKms.push(toManyKms);
        }
    }
}




function displayCar() {
    let html = "";

    html += "<h1 class='carTitle' >";
    html += car.Kilometerstand;
    html += " km - ";
    html += car.Prijs;
    html += "€ - ";
    html += car.Bouwjaar;
    html += "</h1>";

    html += "<h2 class='carTitle' >";
    html += car.human.lengte;
    html += " - ";
    html += car.human.ramen;
    html += "ramen - ";
    html += car.human.btw;
    html += " - ";
    if (car.Airconditioning != undefined || car["Climate control"] != undefined ) {
        html += "Airco";
    } else {
        html += "Geen airco?";
    }
    html += "</h2>";

    for (i in car.imgs) {
        html += "<img class='carImg' src=https://" + car.imgs[i] + ">";
    }
    html += "<div>" + car.description.replace(/\n/g, "<br />").replace(/marge/gi, "<b> MARGE </b>").replace(/btw/gi, "<b> BTW </b>").replace(/airco/gi, "<b>AIRCO</b>").replace(/climate/gi, "<b>CLIMATE</b>") + "</div>";

    html += "<pre>" + JSON.stringify(car, null, 2) + "</pre>";
    $("#car").html(html);
}

$(document).keydown(function (e) {
    console.log(e.which);
    keyPushedEventHandler(e.which);
    switch (e.which) {
        case 37: // <-
            e.preventDefault();
            break;

        case 39: // ->
            e.preventDefault();
            break;

        default: return;
    }

});

function keyPushedEventHandler(key) {
    let selectedQuestion = $("#querySelection").val();
    if (dataBase.cars.potential[selectedCar].human === undefined) {
        dataBase.cars.potential[selectedCar].human = {};
    };
    switch (key) {
        case 37: // <-
            selectedCar--;
            selectCar(selectedCar);
            break;

        case 39: // ->
            selectedCar++;
            selectCar(selectedCar);
            break;

        case 83: // s
            if (selectedQuestion != "nbrBord") {
                saveBD();
            }
            break;

        case 88: // x
            if (selectedQuestion != "nbrBord") {
                noGo();
            }
            break;

        default: break;
    }
    if (selectedQuestion == "lang") {
        switch (key) {
            case 49: // 1
                console.log("L1");
                dataBase.cars.potential[selectedCar].human.lengte = "L1";
                noGo();
                break;

            case 50: // 2
                console.log("L2");
                dataBase.cars.potential[selectedCar].human.lengte = "L2";
                break;

            case 51: // 3
                console.log("L3");
                dataBase.cars.potential[selectedCar].human.lengte = "L3";
                break;

            default: return;
        }
    }
    if (selectedQuestion == "btw") {
        if (dataBase.cars.potential[selectedCar].human.btw === undefined) {
            switch (key) {
                case 38: // up
                    console.log("+BTW");
                    dataBase.cars.potential[selectedCar].Prijs = dataBase.cars.potential[selectedCar].Prijs * 1.21;
                    dataBase.cars.potential[selectedCar].human.btw = "is toegevoegd";
    
                    break;
    
                case 40: // down
                console.log("inc. BTW of Marge");
                dataBase.cars.potential[selectedCar].human.btw = "Geen BTW van toepasing";
                    break;
    
                default: return;
            }
        } else {
            console.log("btw is al toegevoegd of het is niet van toepasing")
        }
        
    }
    if (selectedQuestion == "ramen") {
        switch (key) {
            case 48: // 1
                console.log("0 ramen");
                dataBase.cars.potential[selectedCar].human.ramen = 0;
                break;

            case 49: // 1
                console.log("1 raam");
                dataBase.cars.potential[selectedCar].human.ramen = 1;
                break;

            case 50: // 2
                console.log("2 ramen");
                dataBase.cars.potential[selectedCar].human.ramen = 2;
                break;

            case 51: // 3
                console.log("3 ramen");
                dataBase.cars.potential[selectedCar].human.ramen = 3;
                break;

            case 52: // 4
                console.log("4 ramen");
                dataBase.cars.potential[selectedCar].human.ramen = 4;
                break;

            case 53: // 5
                console.log("5 ramen");
                dataBase.cars.potential[selectedCar].human.ramen = 5;
                break;

            default: return;
        }
    }




}




function changeSelectedQuestion() {
    console.log($("#querySelection").val());
    switch ($("#querySelection").val()) {
        case "lang":

            break;

        case "btw":
            $("#questionLable").text("is de prijs includief de eventuele BTW?")
            break;

        case "ramen":
            $("#questionLable").text("Hoe veel ramen zitten er in deze bus buiten de cokpit om?")
            break;

        case "nbrBord":
            let html = "";
            html += '<input type="text" id="nbrPlate" name="nbrPlate">';
            $("#questionArea").html(html)
            $("#questionLable").text("Wat is het nummberboard van deze auto?")
            $("#nbrPlate").keyup(function () {
                console.log("Nieuw nummberboard: " + $("#nbrPlate").val())
                if (dataBase.cars.potential[selectedCar].Kenteken === undefined) {
                    dataBase.cars.potential[selectedCar].Kenteken = $("#nbrPlate").val();
                }
                if (dataBase.cars.potential[selectedCar].human === undefined) {
                    dataBase.cars.potential[selectedCar].human = {};
                };
                dataBase.cars.potential[selectedCar].human.Kenteken = $("#nbrPlate").val();
            });
            break;

        default:
            break;
    }
}

function saveBD() {
    $("body").html("<pre>" + JSON.stringify(dataBase, null, 2) + "</pre>")
}

function nbrOfWindows(nbr) {
    console.log("auto heeft " + nbr + " ramen.")
    if (dataBase.cars.potential[selectedCar].human === undefined) {
        dataBase.cars.potential[selectedCar].human = {};
    };
    dataBase.cars.potential[selectedCar].human.windows = nbr;
}

function noGo(nbrToRemove) {
    if (nbrToRemove === undefined) { nbrToRemove = selectedCar };
    let removed = dataBase.cars.potential.splice(nbrToRemove, 1)[0];
    console.log(removed);
    dataBase.cars.noGo.push(removed);
    selectCar(nbrToRemove)
}