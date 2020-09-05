const TRAIN_API_URL = 'http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/';
const fs = require('fs')

/**
 * Funzione ausiliaria per savare i dati su file
 * @param {array} data
 * @param {string} path
 */
const storeData = (data, path) => {
  try {
      fs.writeFileSync(path, JSON.stringify(data))
  } catch (err) {
      console.error(err)
  }
}

/**
 * Funzione ausiliaria per chiamate API
 * @param {string} url 
 */
const getRemoteData = function (url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const request = client.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error('Failed with status code: ' + response.statusCode));
      }
      const body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err))
  })
};

/**
 * Salva la lista delle stazioni in stations.json
 */
const storeStationData = async function(){
  const alphabet = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
    
    const stations = [];
    for (let i = 0; i < alphabet.length; i++) {
        await getRemoteData(`${TRAIN_API_URL}cercaStazione/${alphabet[i]}`)
        .then((response) => {
            const data = JSON.parse(response);
            if(data.length){

                for (let s = 0; s < data.length; s++) {
                    let station = data[s];
                    let synonyms = [];
                    let nome = station.nomeLungo;
                    nome = nome.replace("- ","");
                    nome = nome.replace('-', ' ');
                    
                    if(nome.indexOf("S.")>=0){
                        synonyms.push(nome.replace("S.", "SAN "));
                    }

                    stations.push({
                        id: station.id,
                        name: {
                            value: nome,
                            synonyms: synonyms
                        }
                    });
                }
            }
        })
        .catch((err)=>{
            console.log(err);
        });
    }

    storeData(stations, './stations.json');
    console.log('saved');
}

/**
 * Ricerca il nome della stazione nel db e restituisce 
 * la lista dei risultati
 * @param {string} stationName 
 */
const retriveStationData = async function(stationName){
    let toRet = {
      error: 0,
      stations: [],
      toSay: ''
    };
    await getRemoteData(`${TRAIN_API_URL}cercaStazione/${stationName}`)
      .then((response) => {
        const data = JSON.parse(response);
        toRet.stations = data;

        if(!data.length){
          toRet.toSay = 'Non ci sono stazioni con questo nome';
        } else if(data.length > 4){
            let stationList = '';
            for (let i = 0; i < 3; i++) {
                stationList += data[i].nomeLungo + ', ';
            }
            stationList = stationList.slice(0, -2);
            toRet.toSay = `Ci sono troppe stazioni con il nome da te data, sii più preciso, ad esempio: ${stationList}`;
        } else if(data.length >1) {
            let stationList = '';
            for (let i = 0; i < data.length; i++) {
                stationList += data[i].nomeLungo + ', ';
            }
            stationList = stationList.slice(0, -2);
            toRet.toSay = `Quale di queste stazioni intendi? ${stationList}`;
        } else {
            let stazionName = data[0].nomeLungo;
            toRet.toSay = `Perfetto! Ho impostato ${stazionName} come stazione di partenza per i tuoi viaggi. `;
            toRet.toSay += `Ricorda che puoi sempre modificarla dicendo: Alexa, cambia la stazione di partenza`;
        }

      })
      .catch((err) => {
        toRet.error = 1;
        toRet.toSay = 'Il portale viagga treno, contenente tutte le informazioni in tempo reale sui treni, al momento non rispode alla mia richiesta. Riprova più tardi';
      });
    return toRet;
}

/**
 * Converte il Formato ID S0812 in Interno
 * per effettuare alcune chiamate API
 * @param {string} stationCode 
 */
const prepareStationCodeInShortFormat = (stationCode) => {
  let newStationCode = parseInt(stationCode.substr(1));
  return newStationCode;
}

/**
 * Restituisce le informazioni del treno,
 * ritardi e fermate intermedie
 * @param {Int} trainNumber 
 * @param {String} originStationCode 
 */
const retriveTrainInformation = async (trainNumber, originStationCode) => {
  let trainInfo = '';
  await getRemoteData(`${TRAIN_API_URL}andamentoTreno/${originStationCode}/${trainNumber}`)
    .then(async(response) => {
      if(response!=''){
        const data = JSON.parse(response);
        trainInfo = data;
      }    
    }).catch((err) => {
      console.log(err);
    });    
  return trainInfo;
}

/**
 * Restituisce la stazione di origine del treno
 * @param {Int} trainNumber 
 * @param {String} stationCode 
 */
const retriveTrainOrigin = async (trainNumber, stationCode) => {
  let orginStationCode = '';
  await getRemoteData(`${TRAIN_API_URL}cercaNumeroTrenoTrenoAutocomplete/${trainNumber}`)
    .then(async (response) => {
      let lines = response.split("\n");
      
      lines = lines.filter(function(item) {
        return item !== ''
      });

      if(lines.length > 1){
        //Nel caso in cui ci siano più righe nel file è necessario controllare 
        //se la stazione stationCode è presente nella tratta per scegliere quale utilizzare
        for (let i = 0; i < lines.length; i++) {
          let orginStationCodeDirty = lines[i].split("|");
          orginStationCodeDirty = orginStationCodeDirty[1].split("-");
          let orginStationCodeTemp = orginStationCodeDirty[1];
          await retriveTrainInformation(trainNumber, orginStationCodeTemp).then((result) => {
            if(result){
              for (let j = 0; j < result.fermate.length; j++) {
                if(result.fermate[j].id == stationCode){
                  orginStationCode = orginStationCodeTemp;
          
                  return true;
                }
              }
            }
          })
        }

      } else{
        let orginStationCodeDirty = lines[0].split("|");
        orginStationCodeDirty = orginStationCodeDirty[1].split("-");
        orginStationCode = orginStationCodeDirty[1];
      }
    }).catch((err) => {
      //console.log(err);
    });    
  return orginStationCode;
}

/**
 * Restituisce un array contente le varie possibilità di viaggio
 * @param {string} from 
 * @param {string} to 
 * @param {dateTime} dateTime 
 * @param {int} limit 
 */
const retriveTravelOptions = async (from, to, dateTime, limit) => {

  fromShort = prepareStationCodeInShortFormat(from);
  to = prepareStationCodeInShortFormat(to);
  let toRet = {
    error: 0,
    options: [],
    toSay: ''
  };

  await getRemoteData(`${TRAIN_API_URL}soluzioniViaggioNew/${fromShort}/${to}/${dateTime}`)
    .then(async (response) => {

      const data = JSON.parse(response);
      const options = data.soluzioni;
      if(!options.length){
        toRet.toSay = 'Non riesco a trovare nessuna soluzione di viaggio';
      } else {
        for (let i = 0; i < limit && i < options.length; i++) {
          let option = options[i];
          let trainCategory = '';
          let exchange = '';
          for (let j = 0; j < option.vehicles.length; j++) {
            trainCategory = translateTrainCategory(option.vehicles[j].categoriaDescrizione) + ' ';
            
            if(option.vehicles.length > 1 && j == 0){
              if(option.vehicles.length > 2){
                exchange = `con ${option.vehicles.length - 1} cambi a:`;
              } else {
                exchange = `con cambio a:`;
              }
            } else if(j>0) {
              exchange += ` ${option.vehicles[j].origine}`;
            }
          }

          const optionToRet = {
            "durata": option.durata,
            "cambi": exchange,
            "partenza": option.vehicles[0].orarioPartenza,
            "arrivo": option.vehicles[option.vehicles.length-1].orarioArrivo,
            "tipo": trainCategory,
            "numeroPrimoTreno": option.vehicles[0].numeroTreno,
            "originePrimoTreno": '',
            "statoTreno": '',
          };

          // only for the first train i retrive train info
          if(i==0){
            await retriveTrainOrigin(optionToRet.numeroPrimoTreno, from).then((result) => {
              optionToRet.originePrimoTreno = result;
              toRet.options.push(optionToRet);
            });
            if(optionToRet.originePrimoTreno){
              //cerco le info orarie:
              await retriveTrainInformation(optionToRet.numeroPrimoTreno, optionToRet.originePrimoTreno).then((result) => {
                if(optionToRet.tipoTreno == 'ST' && optionToRet.provvedimento == '1'){
                  optionToRet.statoTreno = "Attenzione, questo treno è stato soppresso";
                } else if (optionToRet.tipoTreno == 'PP', optionToRet.tipoTreno == 'SI', optionToRet.tipoTreno == 'SF'){
                  optionToRet.statoTreno = "Attenzione, questo treno è stato parzialmente soppresso";
                } else {
                  optionToRet.statoTreno = result.compRitardoAndamento[0] != 'in orario' ? 'viaggia ' + result.compRitardoAndamento[0] : '';
                }
              });
            }
          } else {
            toRet.options.push(optionToRet);
          }

        }

      }
    }).catch((err) => {
      toRet.error = 1;
      toRet.toSay = 'Il portale viagga treno, contenente tutte le informazioni in tempo reale sui treni, al momento non rispode alla mia richiesta. Riprova più tardi';
    });

  return toRet;
}

/**
 * Converte la sigla di una categoria in nome lungo
 * @param {string} cat 
 */
const translateTrainCategory = (cat) => {
  let translated = 'di categoria non nota';
  const categories = {
    "CP": "Corsa prova",
    "TS": "Treno storico",
    "EC": "EuroCity",
    "EN": "EuroNight",
    "TGV": "Train à Grande Vitesse",
    "EXP": "Espresso",
    "FR AV": "Frecciarossa",
    "FA AV": "Frecciargento",
    "ITA": "italo",
    "FB": "Frecciabianca",
    "IC": "InterCity",
    "ICN": "InterCity Notte",
    "REG": "Regionale",
    "RV": "Regionale veloce",
    "S": "Suburbano",
    "RE": "RegioExpress",
    "MXP": "Malpensa Express",
    "SFM": "Metropolitano",
    "M": "Metropolitano",
    "ACC": "Accelerato",
    "D": "Diretto",
    "DD": "Direttissimo",
    "EUC": "Europ Unit Cargo",
    "MI": "Merci Interzona",
    "MRI": "Merci Rapido Internazionale",
    "MRS": "Merci Rapido Speciale",
    "MRV": "Merci Rapido per invio carri Vuoti",
    "MT": "Merci per servizi Terminali",
    "NCL": "Non classificati",
    "STM": "Straordinario per Trasporti Militari",
    "TC": "Treno Combinato",
    "TCS": "Treno Combinato Speciale",
    "TEC": "Trasporti Europei Combinati",
    "TES": "Treno Eccedente Sagoma limite",
    "TRA": "Tradotte",
    "TME": "Treno carrozze riparande o lavorande",
    "LIS": "Locomotiva Isolata",
    "INV": "Invio"
  };

  if (categories.hasOwnProperty(cat)){
    translated = categories[cat];
  }

  return translated;
}

module.exports = {
  retriveStationData,
  retriveTravelOptions,
  storeStationData
}