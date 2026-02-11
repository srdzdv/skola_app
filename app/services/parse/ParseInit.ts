const Parse = require('parse/react-native.js');
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure Parse for React Native environment
Parse.setAsyncStorage(AsyncStorage);

// Disable WebSocket/LiveQuery functionality to prevent Node.js module issues
try {
  if (Parse.LiveQuery) {
    Parse.LiveQuery = null;
  }
  Parse.liveQueryOpen = false;
} catch (e) {
  console.log('LiveQuery not available - this is expected in React Native');
}

// Ensure Parse doesn't try to use WebSocket
global.WebSocket = global.WebSocket || class WebSocketStub {
  constructor() {
    console.warn('WebSocket disabled for Parse compatibility');
  }
  close() {}
  send() {}
};

interface ParseInitObject {
    appId: string,
    serverURL: string,
    appKey: string
}

// Host Server Object Type
var parseInitData: ParseInitObject = {
    appId: "", 
    serverURL: "", 
    appKey: "" 
}

// AsyncStorageKeys
const currHostKey = "currHost"
const skolaHost = "skolaServer"
const mtTolucaHost = "mtTolucaServer"
const mtMetepecHost = "mtMetepecServer"

// SKOLA SERVER DEFAULS
const skolaServerParseInit: ParseInitObject = { 
    appId: "skolaAppId", 
    serverURL: "https://skola-server.herokuapp.com/parse", 
    appKey: "HaOAxK44dLooin7sL1lv6SsZyMQ2c3OWqPvaF31B" 
}

// MOMS&TOTS TOLUCA
const mtTolucaParseInit: ParseInitObject = { 
    appId: "skolamomstotstolucaAppId", 
    serverURL: "https://skola-momstotstoluca-server.herokuapp.com/parse",
    appKey: "HaOAxK44dLooin7sL1lv6SsZyMQ2c3OWqPvaF31B" 
}

// MOMS&TOTS METEPEC
const mtMetepecParseInit: ParseInitObject = { 
    appId: "skolamomstotsmetepecAppId", 
    serverURL: "https://skola-momstotsmetepec-server.herokuapp.com/parse", 
    appKey: "HaOAxK44dLooin7sL1lv6SsZyMQ2c3OWqPvaF31B" 
}

// Fetch current server config if available.
retrieveHostingData()

async function retrieveHostingData() {
    try {
        const currHostItem = await AsyncStorage.getItem(currHostKey);
        if (currHostItem !== null) {
            switch (currHostItem) {
                case mtTolucaHost:
                    parseInitData = mtTolucaParseInit
                    break;
                case mtMetepecHost:
                    parseInitData = mtMetepecParseInit
                    break;
                default:
                    parseInitData = skolaServerParseInit
                    break;
            }
            // Initialize SDK
            Parse.initialize(parseInitData.appId, parseInitData.appKey);
            Parse.serverURL = parseInitData.serverURL;
        }
      } catch (error) {
        // Error retrieving data
        console.log("**retrieveHostingData_ERROR: " + JSON.stringify(error))
    }
}

async function persistHostingData(hostVal: string) {
    try {
        await AsyncStorage.setItem(currHostKey, hostVal);
        console.log("persistHostingData_DONE")
      } catch (error) {
        // Error saving data
        console.log("**persistHostingData_ERROR: " + JSON.stringify(error))
    }
}


export function initializeParseDetails(initSelectedSchool: string) {
    var hostSelected = ""
    switch (initSelectedSchool) {
        case "MT_Toluca":
            parseInitData = mtTolucaParseInit
            hostSelected = mtTolucaHost
            break;
        case "MT_Metepec":
            parseInitData = mtMetepecParseInit
            hostSelected = mtMetepecHost
            break;
        default:
            parseInitData = skolaServerParseInit
            hostSelected = skolaHost
            break;
    }
    // Persist in device storage
    persistHostingData(hostSelected)
    // Initialize SDK
    Parse.initialize(parseInitData.appId, parseInitData.appKey);
    Parse.serverURL = parseInitData.serverURL;
}

export default Parse;