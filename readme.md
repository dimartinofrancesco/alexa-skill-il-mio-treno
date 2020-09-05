# Alexa pendolare skill

Ask alexa what time the train is to go to work or to go home
*Builded with Alexa Skills Kit SDK 2.0 for Node.js*

## Alexa: apri il mio treno!
Lo scorso anno Amazon decise di regalare un Amazon echo dot a chiunque avesse pubblicato almeno una skill. 
Qualche settimana prima avevo deciso di andare al lavoro in treno.

Queste sono le premesse che mi portarono a sviluppare, ed imparare a sviluppare, questa skill per Alexa.

## La skill come MVP
**Scenario:** Un utente "pendolare" la mattina si sveglia e vuol sapere se il suo treno è in ritardo o soppresso e di quanto è in ritardo. 

La skill, al primo avvio, memorizza la stazione di partenza e di arrivo del pendolare in modo tale che quando l'utente invocherà "Alexa apri il mio treno" la skill risponderà **dicendo a che ora è il prossimo treno e se viaggia con ritardo**. 

## Base del funzionamento
Per conoscere lo **stato del treno** e calcolare la "rotta" l'app si interfaccia con le API di *viaggiatreno.it* che vi assicuro essere esilaranti. 

**Le stazioni** vengono pre caricate all'interno del file models/it-IT.json. E' possibile invocare TrainInfo.storeStationData() - commentato all'interno del file di test lambda/custom/train-info-testing.js - per generare il file lambda/custom/stations.json e manualmente fare l'update del file it-IT in models. 

**I dati degli utenti** vengono memorizzati in un'istanza di DynamoDB 


## Prerequisiti per l'esecuzione
· Alexa [ASK CLI](https://developer.amazon.com/en-US/docs/alexa/smapi/quick-start-alexa-skills-kit-command-line-interface.html) / ``npm install -g ask-cli``
· Un account AWS ed un minimo di esperienza per la configurazione di un'istanza **DynamoDB**


## Deploy
· Aggiornare il file ``.ask/config`` con i dati della vostra skill
· Eseguire il deploy tramite CLI ``ask deploy --target lambda`` - Verrà automaticamente instanziata una **lambda** e create tutte le **utterance** necessarie.
· ``ask dialog --locale it-IT``



