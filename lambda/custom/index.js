/* eslint-disable  func-names */
/* eslint-disable  no-console */
// ask deploy --target lambda

const Alexa = require('ask-sdk');
const TrainInfo = require('./train-info');
const moment = require('moment-timezone');

/**
 * STATES:
 * 0: no initialization 
 * 1: setup from station
 * 2: setup to station
 * 3: next result?
 */

const SaveUserData = async (handlerInput, userData) => {
  const attributesManager = handlerInput.attributesManager;
  attributesManager.setPersistentAttributes(userData);
  await attributesManager.savePersistentAttributes();
} 

const RetriveUserData = async (handlerInput) => {
  const attributesManager = handlerInput.attributesManager;
  const attributes = await attributesManager.getPersistentAttributes() || {
    fromStation: null,
    toStation: null, 
    state: 0
  };
  return attributes;
}

const RetriveTravels = async (handlerInput, limit) => {

  let userData = await RetriveUserData(handlerInput);
  let currentDate = moment();
  let currentRomeDate = currentDate.tz('Europe/Rome').format().substring(0,19);
  let nextTrainInfo = await TrainInfo.retriveTravelOptions(userData.fromStation.id,userData.toStation.id,currentRomeDate, limit);
  let speechText = `Non riesco a contattare il servizio orari treni, riprova più tardi`;

  if(!nextTrainInfo.error){
    speechText = limit > 1 ? `a seguire gli altri treni sono ` : `Il prossimo treno per ${userData.toStation.name} parte `;
    for (let o = limit == 1 ? 0 : 1; o < nextTrainInfo.options.length; o++) {
      let train = nextTrainInfo.options[o];
      let oraPartenza = moment(train.partenza);
      let oraArrivo = moment(train.arrivo);
      
      speechText += `alle ore ${oraPartenza.format('h [e] m')} ed arriva alle ${oraArrivo.format('h [e] m')} `;
      if(train.cambi){
        speechText += `effettua ${train.cambi} `;
        speechText += train.cambi > 1 ? `cambi ` : `cambio `;
      }
      if(limit == 1 && train.statoTreno){
        speechText += `, il treno ${train.statoTreno} `;
      }
    }
  } 

  return speechText;

}

const LaunchRequestHandler = {
  async canHandle(handlerInput) {
    let userData = await RetriveUserData(handlerInput);

    return (handlerInput.requestEnvelope.request.type === 'LaunchRequest' 
    ||
      (handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetNextTrain'
      &&  (!userData.state)
      && handlerInput.requestEnvelope.request.dialogState !== 'STARTED'
      && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED'
      && handlerInput.requestEnvelope.request.dialogState !== 'IN_PROGRESS') ||
      (handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SetToStation'
      &&  (!userData.state)
      && handlerInput.requestEnvelope.request.dialogState !== 'STARTED'
      && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED'
      && handlerInput.requestEnvelope.request.dialogState !== 'IN_PROGRESS') ||
      (handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SetFromStation'
      &&  (!userData.state)
      && handlerInput.requestEnvelope.request.dialogState !== 'STARTED'
      && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED'
      && handlerInput.requestEnvelope.request.dialogState !== 'IN_PROGRESS')
    );
  },
  async handle(handlerInput) {
    
    let userData = await RetriveUserData(handlerInput);
    let delegateDirective = 'SetFromStation';
    let speechText = `Ciao pendolare! `;
    let slots = {};

    if (userData.state == 3) {
      delegateDirective = 'GetNextTrain';
      speechText += await RetriveTravels(handlerInput, 1);
    } else if (userData.state == 2) {
      delegateDirective = 'SetToStation';
    }
    
    return handlerInput.responseBuilder
      .addDelegateDirective({
         name: delegateDirective,
         confirmationStatus: 'NONE',
         slots: slots
      })
      .speak(speechText)
      .getResponse();
    }
};

const GetNextTrainHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetNextTrain'
      && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
  },
  async handle(handlerInput) {
    let limit = 1;
    let speechText = await RetriveTravels(handlerInput, limit);
    //TODO: dialog con vuoi sapere altro?

    if (handlerInput.requestEnvelope.request.dialogState == 'COMPLETED'){
      return handlerInput.responseBuilder
        .speak(speechText)
        .withShouldEndSession(true)
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(speechText)
        .addDelegateDirective()
        .getResponse();
    }
    
  }
}


const SetToStationHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SetToStation';
  },
  async handle(handlerInput) {

    let updatedIntent = handlerInput.requestEnvelope.request.intent;
    let updatedSlots = updatedIntent.slots;
    let speechText = `Qual è la stazione FS più vicina alla tua destinazione?`;

    if(updatedSlots.ToStationName.value){
      let slotAuth = updatedSlots.ToStationName.resolutions.resolutionsPerAuthority[0];
      if(slotAuth.status.code == 'ER_SUCCESS_MATCH'){
        if(slotAuth.values.length > 1 && 
          !(slotAuth.values[0].value.name.toUpperCase() == updatedSlots.ToStationName.value.toUpperCase())){
          requestedStationName = updatedSlots.ToStationName.value;
          speechText = `Puoi essere più preciso, ad esempio: `;
          for (let s = 0; s < slotAuth.values.length && s < 3; s++) {
            speechText += `${slotAuth.values[s].value.name}, `;
          }
          // Sollecita la giusta risposta
          return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .addElicitSlotDirective('ToStationName')
            .getResponse();

        } else {
          let userData = await RetriveUserData(handlerInput);
          userData.toStation = slotAuth.values[0].value;
          
          let delegateDirective = 'GetNextTrain';
          
          speechText = `Ho impostato ${slotAuth.values[0].value.name} come stazione di arrivo. `;
          if(userData.state != 3){
            speechText = `Siamo pronti per la partenza! se vorrai cambiare la stazione di arrivo o di partenza potrai farlo dicendo ad esempio: cambia la stazione di arrivo. `;
          }


          speechText += await RetriveTravels(handlerInput, 1);

          userData.state = 3;
          
          await SaveUserData(handlerInput, userData);

          return handlerInput.responseBuilder
            .addDelegateDirective({
              name: delegateDirective,
              confirmationStatus: 'NONE',
              slots: {}
            })
            .speak(speechText)
            .getResponse();
          
        }
      } else {
        speechText = `Non riesco a trovare la stazione, puoi pronunciarla lentamente?`;
      }
    }
   
    return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .addElicitSlotDirective('ToStationName')
            .getResponse();
  },
}

const SetFromStationHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SetFromStation';
  },
  async handle(handlerInput) {

    let updatedIntent = handlerInput.requestEnvelope.request.intent;
    let updatedSlots = updatedIntent.slots;
    let speechText = `Qual è la stazione FS più vicina a casa tua?`;

    if(updatedSlots.FromStationName.value){
      let slotAuth = updatedSlots.FromStationName.resolutions.resolutionsPerAuthority[0];
      if(slotAuth.status.code == 'ER_SUCCESS_MATCH'){
        if(slotAuth.values.length > 1 && 
          !(slotAuth.values[0].value.name.toUpperCase() == updatedSlots.FromStationName.value.toUpperCase())){
          requestedStationName = updatedSlots.FromStationName.value;
          speechText = `Puoi essere più preciso, ad esempio: `;
          for (let s = 0; s < slotAuth.values.length && s < 3; s++) {
            speechText += `${slotAuth.values[s].value.name}, `;
          }
          // Sollecita la giusta risposta
          return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .addElicitSlotDirective('FromStationName')
            .getResponse();
        } else {
          let userData = await RetriveUserData(handlerInput);
          userData.fromStation = slotAuth.values[0].value;
          
          let delegateDirective = 'GetNextTrain';
          if(!userData.state || userData.state <= 1){
            userData.state = 2;
            delegateDirective = 'SetToStation'
            speechText = `Annotata!`;
          } else {
            speechText = `Ho impostato ${slotAuth.values[0].value.name} come stazione di partenza. `;
            userData.state = 3;

            speechText += await RetriveTravels(handlerInput, 1);
          }

          await SaveUserData(handlerInput, userData);

          return handlerInput.responseBuilder
            .addDelegateDirective({
              name: delegateDirective,
              confirmationStatus: 'NONE',
              slots: {}
            })
            .speak(speechText)
            .getResponse();
          
        }
      } else {
        speechText = `Non riesco a trovare la stazione, puoi pronunciarla lentamente?`;
      }
    }
    
    return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .addElicitSlotDirective('FromStationName')
            .getResponse();

  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = "chiedimi qual è il prossimo treno per la mia destinazione. Se vuoi cambiare la stazione più vicina a casa tua puoi chiedere: Alexa chiedi a mio treno di cambiare la stazione di partenza, altrimenti Alexa chiedi a mio treno di cambiare la stazione di arrivo";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Buon viaggio!';

    return handlerInput.responseBuilder
      .speak(speechText);
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    const speechText = 'Buon viaggio!';

    return handlerInput.responseBuilder
      .speak(speechText);
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Mi spiace ma non ho capito quello che mi hai chiesto, puoi ripetere?')
      .reprompt('Mi spiace ma non ho capito, puoi ripetere?')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    GetNextTrainHandler,
    SetToStationHandler,
    SetFromStationHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('alexa-skill-il-mio-treno')
  .withAutoCreateTable(true)
  .lambda();
