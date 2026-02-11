import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, FlatList, ActivityIndicator } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import { colors, spacing } from "../theme"


interface EventoRsvpScreenProps extends AppStackScreenProps<"EventoRsvp"> {}

export const EventoRsvpScreen: FC<EventoRsvpScreenProps> = observer(function EventoRsvpScreen({ route, navigation }) {
  const [isLoading, setIsLoading] = useState(true)
  const [listData, setListData] = useState([])

  useEffect(() => {
    setupComponents()
  }, [])

  function setupComponents() {
    navigation.setOptions({
      headerBackTitleVisible: false,
    });
    processDataForList()
  }

  function processDataForList() {
    let rsvpList = route.params.rsvpList
    let usersList = rsvpList.map((item) => item.get("user").get("nombre") + " " + item.get("user").get("apellidos") + " - " + item.get("user").get("parentesco"))
    setListData(usersList)
    setIsLoading(false)
  }

  return (
    <Screen style={$root} preset="fixed">
      {isLoading ? 
        <>
          <View style={$spinner}>
            <ActivityIndicator size="large" color="#007AFF" /> 
          </View>
        </>
      :
        <FlatList
          style={$flatListStyle}
          data={listData}
          renderItem={({item}) =>
            <ListItem 
              style={$itemRow} 
              topSeparator={false} 
              bottomSeparator={true}
            >
              <View style={{flex: 1, flexDirection: 'column'}}>
                <View style={{marginTop: 4, paddingTop: 1}}>
                  <Text size="sm">{item}</Text>
                </View>
              </View>
            </ListItem>
          }
          keyExtractor={item => item.id}
        />  
      }
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingTop: spacing.stdPadding,
  paddingHorizontal: spacing.stdPadding,
}

const $spinner: ViewStyle = {
  flex: 1,
  paddingTop: 50,
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center"
}

const $flatListStyle: ViewStyle = {
  marginTop: 1,
  marginBottom: 20,
  borderRadius: 10,
}

const $itemRow: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  paddingLeft: spacing.small,
  paddingRight: spacing.tiny,
  paddingTop: spacing.tiny,
  paddingBottom: spacing.tiny,
}
