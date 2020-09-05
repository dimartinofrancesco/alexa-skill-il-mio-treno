const TrainInfo = require('./train-info');
const moment = require('moment-timezone');

let main = async () => {

    //Build station type
    //TrainInfo.storeStationData();


    let data = '2019-11-07T06:45:00';
    let dataMoment= moment(data);
    console.log(dataMoment.format('h [e] m'));

    let currentDate = moment();
    let currentRomeDate = currentDate.tz('Europe/Rome').format().substring(0,19);
    //console.log(currentRomeDate);

    //USER PERSISTENT DATA
    let stationFrom = {"nomeLungo":"ANGRI","nomeBreve":"Angri","label":null,"id":"S09812"};
    //let stationFrom = {"nomeLungo":"Napoli","nomeBreve":"Angri","label":null,"id":"S09218"};
    let stationTo = {"nomeLungo":"DUOMO VIA VERNIERI","nomeBreve":"Duomo V.Vernieri","label":null,"id":"S09819"};
    //let stationTo = {"nomeLungo":"Milano","nomeBreve":"Duomo V.Vernieri","label":null,"id":"S01700"};


    //USER INPUT
    if(!stationFrom||0){
        let stationName = 'MILANO CENTRALE';
        TrainInfo.retriveStationData(stationName).then((result)=>{
            if(result.error){
                console.log(result.toSay);
            } else if(result.stations > 1){
                console.log(result.toSay);
            } else {
                console.log(result.toSay);
                stationFrom = result.stations[0];
            }
        });
    }

    
    TrainInfo.retriveTravelOptions(stationFrom.id,stationTo.id,currentRomeDate, 2).then((result)=>{
        if(result.error){
            console.log(result);
        } else {
            console.log(result);
        }
    });
    


}

main();



