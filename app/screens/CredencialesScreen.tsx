import React, { FC, useState, useEffect, useRef } from "react"
import ViewShot from "react-native-view-shot";
import { observer } from "mobx-react-lite"
import { ViewStyle, Image, View, FlatList, ScrollView } from "react-native"
import { Feather } from '@expo/vector-icons';
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { colors } from "../theme"
import * as Sharing from 'expo-sharing';

interface CredencialesScreenProps extends AppStackScreenProps<"Credenciales"> {}

export const CredencialesScreen: FC<CredencialesScreenProps> = observer(function CredencialesScreen({ route, navigation }) {
  const [isLoading, setIsLoading] = useState(true)
  const [listData, setListData] = useState(null)
  const ref = useRef();
  const captureRef = useRef();

  let dataCount = route.params["credInfo"].length
  const dataPropArr = dataCount
  const viewHeight = dataPropArr * 380
  var viewShotDimension = { width: 330, height: 2500 };

  useEffect(() => {
    setupComponents()
    // Data
    const dataProp = route.params["credInfo"]
    // let arrLen = dataProp.length
    //viewShotDimension.height = 380 * arrLen
    // State
    setListData(dataProp)
    setIsLoading(false)
  }, [])

  function setupComponents() {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerRight: () => (
        <Feather name="share" size={28} style={{marginTop: 2}} color={colors.palette.actionColor}  onPress={shareButtonTapped} /> 
      ),
    });
  }

  async function shareButtonTapped() {
    try {
      const uri = await captureRef.current.capture();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Share Credenciales' });
      } else {
        console.log("Sharing is not available on this platform");
      }
    } catch (error) {
      console.error("Error sharing image:", error);
    }
  }

  const CapturableCredencialesList = () => (
    <ViewShot ref={captureRef} options={{ format: "jpg", quality: 0.9 }}>
      <View style={{ backgroundColor: 'white', padding: 20 }}>
        {listData && listData.map((item) => (
          <CredencialRow key={item.qrCode} credencial={item} />
        ))}
      </View>
    </ViewShot>
  );

  return (
    <Screen style={$root} preset="fixed">
      {!isLoading && (
        <>
          <ScrollView ref={ref}>
            {listData && <CredencialesList credencialesData={listData} />}
          </ScrollView>
          <View style={{ position: 'absolute', left: -9999 }}>
            <CapturableCredencialesList />
          </View>
        </>
      )}
    </Screen>
  )
})

function PhotoView(props) {
  return <Image source={{ uri: props.photoURL }} style={{ width: 125, height: 156, borderRadius: 8, }} />
}

function EmptyPhotoView() {
  return <View style={{ width: 125, height: 156, borderRadius: 8, backgroundColor: colors.palette.neutral200}}></View>
}

const CredencialRow = ({ credencial }) => {
  return (
      <View style={$credencialCard}>
        <View style={{flex: 1, width: 260, justifyContent: "center", alignItems: "center"}}>
          <Image source={{uri: 'https://api.qrserver.com/v1/create-qr-code/?data=' + credencial.qrCode}} style={{height: 160, width: 160 }} />
          <Text weight="bold" style={{margin: 4}}>{credencial.nombres}</Text>
          {credencial.photoURL ? <PhotoView photoURL={credencial.photoURL} /> : <EmptyPhotoView />}
        </View>
      </View>
  );
}

const CredencialesList = ({ credencialesData }) => {
  return (
    <FlatList
      data={credencialesData}
      renderItem={({ item }) => <CredencialRow credencial={item} />}
      keyExtractor={item => item.qrCode}
    />
  )
}

const $root: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $credencialCard: ViewStyle = {
  flex: 1,
  width: 280,
  padding: 8,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.palette.credBckgrnBlue,
  margin: 16,
  borderRadius: 12
}
