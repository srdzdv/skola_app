import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, FlatList, ActivityIndicator } from "react-native"
import * as ParseAPI from "../services/parse/ParseAPI"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import { colors, spacing } from "../theme"
import moment from 'moment';

interface SeenByScreenProps extends NativeStackScreenProps<AppStackScreenProps<"SeenBy">> {}

export const SeenByScreen: FC<SeenByScreenProps> = observer(function SeenByScreen({ route, navigation }) {
  const [isLoading, setIsLoading] = useState(true)
  const [listData, setListData] = useState([])

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: colors.palette.sunflowerLight,
      },
      headerTintColor: colors.palette.neutral700,
    })
    processDataForTable()
  }, [])

  async function processDataForTable() {
    if (route.params.tableData) {
      // Anuncio Seen by data
      let seenByData = JSON.parse(JSON.stringify(route.params.tableData))
      
      const promises = seenByData.map(async (object) => {
        const userObj = object.userID
        const estudianteNombre = await ParseAPI.fetchEstudianteNombreOfUser(userObj)
        return {
          key: object.id,
          parentesco: userObj.parentesco,
          estudiante: estudianteNombre,
          timestamp: object.createdAt
        }
      })

      const tableArr = await Promise.all(promises)
      setIsLoading(false)
      setListData(tableArr)

    } else if (route.params.infoTableData) {
      // Informacion Seen by data
      let seenByData = JSON.parse(JSON.stringify(route.params.infoTableData))
      if (seenByData.length === 0) {
        setIsLoading(false)
        setListData([])
        return
      }

      const promises = seenByData.map(async (object) => {
        const userEstudianteData = await ParseAPI.fetchUserParentescoAndEstudiante(object.userId)
        return {
          key: object.id,
          parentesco: userEstudianteData.parentesco,
          estudiante: userEstudianteData.estudiante,
          timestamp: object.createdAt
        }
      })

      const tableArr = await Promise.all(promises)
      setIsLoading(false)
      setListData(tableArr)
    }
  }

  function getDateFormatStr(dateStr) {
    return moment(dateStr).format('DD/MMM/YY  HH:mm')
  }

  return (
    <Screen style={$root} preset="fixed">
      {isLoading ?
        <ActivityIndicator size="large" color={colors.palette.actionBlue} animating={isLoading} style={{marginTop: 56}} hidesWhenStopped={true}/>
        :
        <>
        <View style={$countHeader}>
          <Text size="md" weight="medium">{`${listData.length} ${listData.length === 1 ? 'persona ha' : 'personas han'} visto este mensaje`}</Text>
        </View>
        {listData.length > 0 ?
          <FlatList
          style={$flatListStyle}
          data={listData}
          renderItem={({item}) =>
            <ListItem 
              style={$itemRow} 
              topSeparator={false} 
              bottomSeparator={true}
            >
              <Text size="md">{item.parentesco + " de " + item.estudiante + "\n"}</Text>
              <Text size="xs">{" " + getDateFormatStr(item.timestamp)}</Text>

            </ListItem>
          }
          keyExtractor={item => item.id}
          />
        :
        <View style={$emptyState}>
          <Text size="md">Nadie ha visto este mensaje.</Text>
        </View>
        }
        
        </>
      }
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const $emptyState: ViewStyle = {
  padding: 16,
  alignItems: "center",
}

const $flatListStyle: ViewStyle = {
  marginBottom: 44,
  borderRadius: 10,
}

const $itemRow: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  paddingLeft: spacing.small,

}

const $countHeader: ViewStyle = {
  padding: spacing.tiny,
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  marginBottom: spacing.tiny,
}