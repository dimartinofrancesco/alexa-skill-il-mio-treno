## Alexa apri il mio treno!
Lo scorso anno Amazon decise di regalare un Amazon echo dot a chiunque avesse pubblicato almeno una skill. 
Qualche settimana precedente decisi di andare al lavoro in treno.

Queste sono le premesse che mi portarono a sviluppare, ed imparare a sviluppare, un skill per Alexa.

![Amici miei - Schiaffi alla stazione](https://i.makeagif.com/media/5-04-2015/Cr_LOS.gif)

## La skill come MVP
**Scenario:** Un utente "pendolare" la mattina si sveglia e vuol sapere se il suo treno è in ritardo o soppresso e di quanto è in ritardo. 

La skill, al primo avvio, memorizza la stazione di partenza e di arrivo del pendolare in modo tale che quando l'utente invocherà "Alexa apri il mio treno" la skill risponderà **dicendo a che ora è il prossimo treno e se viaggia con ritardo**. 

**La skill la è pubblica su Amazon qui: [https://www.amazon.it/dp/B081PGHPJX/...](https://www.amazon.it/dp/B081PGHPJX/ref=sr_1_1?brr=1&qid=1574117336&rd=1&s=digital-skills&sr=1-1)**

## Base del funzionamento
Per conoscere lo **stato del treno** e calcolare la "rotta" l'app si interfaccia con le API di *viaggiatreno.it* che vi assicuro essere, diciamo, *non standard*. 

**Le stazioni** vengono pre caricate all'interno del file models/it-IT.json. E' possibile invocare TrainInfo.storeStationData() - commentato all'interno del file di test lambda/custom/train-info-testing.js - per generare il file lambda/custom/stations.json e manualmente fare l'update del file it-IT in models. 

**I dati degli utenti** vengono memorizzati in un'istanza di DynamoDB 


## Prerequisiti per l'esecuzione
* Alexa [ASK CLI](https://developer.amazon.com/en-US/docs/alexa/smapi/quick-start-alexa-skills-kit-command-line-interface.html) / ``npm install -g ask-cli``
* Un account AWS ed un minimo di esperienza per la configurazione di un'istanza **DynamoDB**


## Deploy
* Aggiornare il file ``.ask/config`` con i dati della vostra skill
* Eseguire il deploy tramite CLI ``ask deploy --target lambda`` - Verrà automaticamente instanziata una **lambda** e create tutte le **utterance** necessarie.

## Repository
Ho fatto una copia del repository e reso pubblico su gitHub all'indirizzo: [github.com/dimartinofrancesco/alexa-skill-il-mio-treno](https://github.com/dimartinofrancesco/alexa-skill-il-mio-treno)

Se la utilizzate **fate fork** e magari se vi sentite buoni potete fare anche una **pull request** di un bugfix o di una nuova funzionalià

## Statistiche
Nel periodo pre-lockdown, ovvero dal 18/11/19 (data di pubblicazione) al 28/02/20, le statistiche sono state:
### User Enablements 
* Total for Custom Range: 1,705
* Maximum per Day: 60
* Average per Day: 14.09
