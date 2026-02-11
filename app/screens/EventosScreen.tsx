import React, { FC, useEffect, useState, useCallback } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { useStores } from "../models"
import moment from 'moment';
import { observer } from "mobx-react-lite"
import { Entypo } from '@expo/vector-icons';
import { ViewStyle, TextStyle, View, SectionList } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import { colors, spacing } from "../theme"
import * as Haptics from 'expo-haptics';

interface EventosScreenProps extends NativeStackScreenProps<AppStackScreenProps<"Eventos">> {}

interface SectionData {
  title: string
  data: any[]
}

export const EventosScreen: FC<EventosScreenProps> = observer(function EventosScreen({ navigation }) {
  const [listData, setListData] = useState<SectionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  useEffect(() => {
    fetchEventosFromServer()
  }, [])

  async function fetchEventosFromServer() {
    const eventosRes = await ParseAPI.fetchEventos(authUserEscuela)
    if (eventosRes != null) {
      processDataForTable(eventosRes)
    }
  }

  function processDataForTable(dataArr: any[]) {
    if (dataArr.length > 0) {
      const tableArr: SectionData[] = []
      const eventosDict: Record<string, any[]> = {}

      for (let i = 0; i < dataArr.length; i++) {
        const evento = dataArr[i]
        const eventoFecha = evento.get('fecha')
        const eventoMes = moment(eventoFecha).format('MMMM YYYY')

        if (eventosDict[eventoMes] == null) {
          eventosDict[eventoMes] = [evento]
        } else {
          eventosDict[eventoMes].push(evento)
        }
      }

      const monthKeys = Object.keys(eventosDict)
      monthKeys.forEach((month) => {
        const dataItem: SectionData = {
          title: month,
          data: eventosDict[month],
        }
        tableArr.push(dataItem)
      })

      setIsLoading(false)
      setListData(tableArr)
    } else {
      setIsLoading(false)
    }
  }

  const displayShortDate = useCallback((eventoFecha: Date) => {
    return moment(eventoFecha).format('D MMM')
  }, [])

  const reloadTable = useCallback(() => {
    fetchEventosFromServer()
  }, [])

  const menuButtonTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    const params = {
      reloadTable: reloadTable
    }
    navigation.navigate("Evento", params)
  }, [navigation, reloadTable])

  const navigateToEvento = useCallback((item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    const params = {
      eventoObj: item,
      reloadTable: reloadTable
    }
    navigation.navigate("eventoView", params)
  }, [navigation, reloadTable])

  const renderItem = useCallback(({ item }: { item: any }) => (
    <ListItem style={$itemRow} topSeparator={false} bottomSeparator={true} onPress={() => navigateToEvento(item)}>
      <Text size="md" weight="semiBold">{displayShortDate(item.get("fecha"))}</Text>
      <Text size="md" weight="normal">{"  " + item.get("nombre")}</Text>
    </ListItem>
  ), [navigateToEvento, displayShortDate])

  const renderSectionHeader = useCallback(({ section }: { section: SectionData }) => (
    <View style={$sectionHeader}>
      <View style={$sectionTextView}>
        <Text weight="medium" style={$sectionText}>{section.title}</Text>
      </View>
    </View>
  ), [])

  const keyExtractor = useCallback((item: any) => item.id, [])

  return (
    <Screen style={$root} preset="fixed" safeAreaEdges={["top"]}>
      <View style={$headerView}>
        <Text style={$header} text="Eventos" preset="heading" />
        <Entypo name="plus" size={26} style={$plusIcon} color="#007AFF" onPress={menuButtonTapped} />
      </View>

      <View style={$listView}>
        {isLoading ? (
          <View style={$spinner}>
            <Text>Cargando...</Text>
          </View>
        ) : (
          <SectionList
            sections={listData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
          />
        )}
      </View>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $headerView: ViewStyle = {
  flexDirection: "row",
  paddingHorizontal: spacing.stdPadding,
  justifyContent: "space-between",
  marginBottom: 4
}

const $header: TextStyle = {
  color: colors.palette.neutral700
}

const $plusIcon: ViewStyle = {
  marginTop: 6,
}

const $listView: ViewStyle = {
  backgroundColor: colors.palette.grassLight,
  marginTop: spacing.extraSmall,
  paddingBottom: 80,
  marginBottom: 18
}

const $spinner: ViewStyle = {
  flex: 1,
  paddingTop: 50,
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center"
}

const $itemRow: ViewStyle = {
  backgroundColor: colors.palette.grassLight,
  paddingLeft: spacing.small,
  paddingBottom: spacing.extraSmall,
  paddingTop: spacing.extraSmall
}

const $sectionHeader: ViewStyle = {
  backgroundColor: colors.palette.grassDark,
  paddingTop: spacing.small,
  paddingBottom: spacing.micro,
}

const $sectionText: TextStyle = {
  paddingTop: 4,
  fontSize: 26,
}

const $sectionTextView: ViewStyle = {
  flex: 1,
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center",
}
