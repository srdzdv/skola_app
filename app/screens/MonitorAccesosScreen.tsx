import React, { FC, useEffect, useState, useCallback } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { observer } from "mobx-react-lite"
import { useStores } from "../models"
import moment from 'moment';
import { ViewStyle, FlatList, StyleSheet, View, Dimensions, ActivityIndicator } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { colors } from "../theme"
import { subscribeToChannel, unsubscribeFromChannel } from "../services/PubNubService"
import * as SQLiteAPI from "../services/sqlite/SQLiteAPI"

const SCREEN_WIDTH = Dimensions.get('window').width - 8
const IS_TABLET = SCREEN_WIDTH >= 760 // iPad mini is 768 points wide

interface MonitorAccesosScreenProps extends AppStackScreenProps<"MonitorAccesos"> {}

interface GrupoItem {
  id: string
  name: string
}

export const MonitorAccesosScreen: FC<MonitorAccesosScreenProps> = observer(function MonitorAccesosScreen({ navigation }) {
  const [accesos, setAccesos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEmptyState, setShowEmptyState] = useState(false)
  const [gruposArr, setGruposArr] = useState<GrupoItem[]>([])
  const handleNewAcceso = useCallback((message: any) => {
    if (message === "newAcceso") {
      setAccesos([])
      fetchRecentAccesos()
    }
  }, [])

  const {
    authenticationStore: {
      authUserEscuela,
    },
  } = useStores()

  useEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
    })
    fetchDBGrupos()
    fetchRecentAccesos()
    subscribeToChannel("accesos", handleNewAcceso)
    return () => {
      unsubscribeFromChannel("accesos")
    }
  }, [handleNewAcceso])


  const fetchRecentAccesos = async () => {
    setIsLoading(true)
    try {
      const recentAccesos = await ParseAPI.fetchRecentAccesos(authUserEscuela)
      setIsLoading(false)
      if (recentAccesos.length > 0) {
        setShowEmptyState(false)
        setAccesos(recentAccesos)
      } else {
        setShowEmptyState(true)
      }
    } catch (error) {
      console.error("Error fetching recent accesos:", error)
      setIsLoading(false)
      setShowEmptyState(true)
    }
  }

  async function fetchDBGrupos() {
    const dbResults: any[] = await SQLiteAPI.readDBPromise("Grupo", "WHERE TRUE", [])
    const tempGruposArr: GrupoItem[] = []
    if (dbResults.length > 0) {
      for (const grupo of dbResults) {
        const dataObj: GrupoItem = {
          id: grupo.objectId,
          name: grupo.name
        }
        tempGruposArr.push(dataObj)
      }
      setGruposArr(tempGruposArr)
    }
  }

  const getGroupName = useCallback((grupoObj: any) => {
    const grupo = gruposArr.find((g: GrupoItem) => g.id === grupoObj.id)
    return grupo ? grupo.name : ""
  }, [gruposArr])

  const formatCreatedAtDate = useCallback((createdAt: Date) => {
    return moment(createdAt).format("HH:mm")
  }, [])

  const renderAccesoItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <View style={styles.leftContent}>
        {/* <Image source={{ uri: item.get('student').get('photoUrl') }} style={styles.photo} /> */}
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{item.get('student').get('NOMBRE')}</Text>
          <Text style={styles.class}>{item.get('student').get('APELLIDO')}</Text>
          <Text weight="semiBold" style={styles.relation}>{getGroupName(item.get('student').get('grupo'))}</Text>
        </View>
      </View>
      <View style={styles.centerContent}>
        <Text style={styles.time}>{formatCreatedAtDate(item.get('escaneoOcurrido'))}</Text>
      </View>
      <View style={styles.rightContent}>
        <Text style={styles.name}>{item.get('user').get('nombre')}</Text>
        <Text style={styles.class}>{item.get('user').get('apellidos')}</Text>
        <Text weight="semiBold" style={styles.relation}>{item.get('user').get('parentesco')}</Text>
      </View>
    </View>
  ), [getGroupName, formatCreatedAtDate])

  const keyExtractor = useCallback((item: any) => item.id.toString(), [])

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, [])

  return (
    <Screen style={$root} preset="fixed">
      {isLoading ?
        <ActivityIndicator size="large" color={colors.palette.actionBlue} style={$loadingIndicator} />
        :
        <FlatList
          data={accesos}
          renderItem={renderAccesoItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={ItemSeparator}
        />
      }
      {showEmptyState && <Text size="xl">No hay accesos recientes hoy</Text>}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  padding: 8,
}

const $loadingIndicator: ViewStyle = {
  marginTop: 24,
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.palette.grassLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.35,
  },
  centerContent: {
    marginLeft: IS_TABLET ? 74 : 0,
    width: IS_TABLET ? SCREEN_WIDTH * 0.1 : SCREEN_WIDTH * 0.2,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'white',
    marginTop: -64,
    height: 24,
  },
  rightContent: {
    alignItems: IS_TABLET ? 'flex-end' : 'flex-start',
    marginLeft: IS_TABLET ? 10 : 12,
    width: IS_TABLET ? 330 : SCREEN_WIDTH * 0.4,
  },
  photo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 6,
  },
  name: {
    fontSize: IS_TABLET ? 24 : 16,
    fontWeight: 'bold',
  },
  class: {
    fontSize: IS_TABLET ? 16 : 14,
  },
  time: {
    backgroundColor: 'white',
    borderRadius: 10,
  },
  guardianContainer: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  guardianName: {
    fontSize: 14,
  },
  relation: {
    fontSize: IS_TABLET ? 17 : 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
})
