import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { ActivityIndicator, FlatList, View, ViewStyle, TextStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { useNavigation } from "@react-navigation/native"
import { colors } from "app/theme"
import * as ParseAPI from "../services/parse/ParseAPI"
import { Entypo } from '@expo/vector-icons';
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "app/models"

interface ReporteAccesosScreenProps extends AppStackScreenProps<"ReporteAccesos"> {}

export const ReporteAccesosScreen: FC<ReporteAccesosScreenProps> = observer(function ReporteAccesosScreen({ route }) {
    // Pull in navigation via hook
  const navigation = useNavigation()
  const estudianteObj = route.params?.estudianteObj
  const [accesos, setAccesos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [grupoName, setGrupoName] = useState("")

  useEffect(() => {
    setupComponents()
    fetchAccesosFromServer()
    if (estudianteObj?.get("grupo")?.id) {
      fetchGrupoFromServer(estudianteObj.get("grupo").id)
    }
  }, [])


  function setupComponents() {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.grassLight
      },
      title: "Reporte de Accesos",
      // headerRight: () => (
      //   <Entypo name="plus" size={23} style={{marginTop: -2}} color={colors.palette.actionColor}  onPress={plusButtonTapped} /> 
      // ),
    });
  }

  // function plusButtonTapped() {
  //   console.log("Plus button tapped")
  // }

  async function fetchAccesosFromServer() {
    let resultObj = await ParseAPI.fetchAccesos(estudianteObj)
    if (resultObj != null) {
      setAccesos(resultObj)
      setIsLoading(false)
    }
  }

  async function fetchGrupoFromServer(grupoId: string) {
    let resultObj = await ParseAPI.fetchGrupo(grupoId)
    if (resultObj != null) {
      setGrupoName(resultObj.get("name") || "")
    }
  }

  function renderAcceso(rowObject: any) {
    return (
      <View style={$tableRow}>
        <View>
            {rowObject.item.get("escaneoOcurrido") instanceof Date ? (
              <View style={$dateContainer}>
                <View style={$rowContainer}>
                    <Text 
                      weight="bold" 
                      style={$dayText}
                      text={rowObject.item.get("escaneoOcurrido").toLocaleString('es-MX', {
                        weekday: 'long',
                      }).charAt(0).toUpperCase() + rowObject.item.get("escaneoOcurrido").toLocaleString('es-MX', { weekday: 'long' }).slice(1)}
                    />
                    <Text 
                      style={$dateText}
                      text={rowObject.item.get("escaneoOcurrido").toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    />
                  </View>
                <Text 
                  weight="medium" 
                  style={$timeText}
                  text={rowObject.item.get("escaneoOcurrido").toLocaleString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
              </View>
            ) : (
              <Text text={String(rowObject.item.get("escaneoOcurrido"))} />
            )}
            <Text
              weight="normal"
              style={$nameText}
              text={rowObject.item.get("user").get("nombre") + " " + rowObject.item.get("user").get("apellidos")}
            />
          
        </View>
      </View>
    )
  }


  return (
    <Screen style={$root} preset="fixed">
      
        <Text size="xl" text={estudianteObj.get("NOMBRE") + " " + estudianteObj.get("APELLIDO")} />
        <Text size="md" text={grupoName} style={$grupoText} />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.palette.grassDark} />
      ) : (
        <FlatList
          style={{marginTop: 4, padding: 8, borderWidth: 1, borderColor: colors.palette.neutral300, borderRadius: 10}}
          data={accesos}
          renderItem={renderAcceso}
        />
      )}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  padding: 8,
  paddingLeft: 16,
  paddingRight: 16,
}

const $headerRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8,
}

const $grupoText: TextStyle = {
  marginLeft: 8,
}

const $tableRow: ViewStyle = {
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
  paddingVertical: 2,
  marginBottom: 4,
}

const $rowContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
}

const $nameText: TextStyle = {
  fontSize: 16,
  flex: 1,
  textAlign: "lefy",
}

const $dateContainer: ViewStyle = {
  flexDirection: "column",
}

const $dayText: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral700,
}

const $dateText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral700,
}

const $timeText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral800,
}
