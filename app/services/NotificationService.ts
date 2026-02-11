import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as ParseAPI from "./parse/ParseAPI";

export async function registerForPushNotificationsAsync(userId: string, userEscuelaId: string, usertype: number) {
  console.log("NOTIFICATION_registerForPushNotificationsAsync: " + userId)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  // only ask if permissions have not already been determined, because
  // iOS won't necessarily prompt the user a second time.
  if (existingStatus !== 'granted') {
    // Android remote notification permissions are granted during the app
    // install, so this will only ask on iOS
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Stop here if the user did not grant permissions
  if (finalStatus !== 'granted') {
    console.log("NOT GRANTED")
    // alert('Failed to get push token for push notification!');
    console.log("Notification permissions not granted");
    return;
  }

  console.log("EAS_ProjectID:" + Constants.expoConfig?.extra?.eas?.projectId)

  try {
    // Get the token that uniquely identifies this device
    const tokenData = await Notifications.getExpoPushTokenAsync({ 
      projectId: Constants.expoConfig?.extra?.eas?.projectId 
    });
    const token = tokenData.data;
    
    console.log("****expoPushToken: " + JSON.stringify(token));
    
    // Parse store
    await storeExpoToken(userId, userEscuelaId, usertype, token);
  } catch (error) {
    console.log("Error getting/storing push token:", error);
  }
}

async function storeExpoToken(userId: string, userEscuelaId: string, usertype: number, token: string) {
  console.log("NOTIFServ_storeExpoToken: " + userId)
  // userId userType? escuela? token
  let userTokenData = {
    userId: userId,
    userType: usertype,
    escuela: userEscuelaId,
    token: token
  }

  try {
    let result = await ParseAPI.storeUserExpoToken(userTokenData)
    console.log("***ExpoTokenRes: " + JSON.stringify(result))
  } catch (error) {
    console.log("Error storing Expo token in Parse:", error);
  }
}

