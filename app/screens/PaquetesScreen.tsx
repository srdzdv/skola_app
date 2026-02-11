import React, { FC, useEffect, useState, useCallback } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { observer } from "mobx-react-lite"
import { Entypo } from '@expo/vector-icons'
import { useStores } from "../models"
import { ViewStyle, TextStyle, View, FlatList, ActivityIndicator, Dimensions } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import * as Haptics from 'expo-haptics'
import { colors, spacing } from "../theme"

// Hoisted constants
const WINDOW_WIDTH = Dimensions.get('window').width
const ROW_CONTENT_WIDTH = WINDOW_WIDTH - 62

interface PaquetesScreenProps extends AppStackScreenProps<"Paquetes"> {}

interface PaqueteItem {
  id: string
  get: (key: string) => any
}

export const PaquetesScreen: FC<PaquetesScreenProps> = observer(function PaquetesScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true)
  const [listData, setListData] = useState<PaqueteItem[]>([])

  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  const fetchPaquetesFromServer = useCallback(async () => {
    const resultObj = await ParseAPI.fetchPaquetes(authUserEscuela)
    if (resultObj != null) {
      setListData(resultObj)
      setIsLoading(false)
    }
  }, [authUserEscuela])

  const reloadTable = useCallback(() => {
    fetchPaquetesFromServer()
  }, [fetchPaquetesFromServer])

  const plusButtonTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("PaqueteDetail", { obj: null, reloadTable: reloadTable })
  }, [navigation, reloadTable])

  const handleCellPress = useCallback((item: PaqueteItem) => {
    navigation.navigate("PaqueteDetail", { obj: item, reloadTable: reloadTable })
  }, [navigation, reloadTable])

  // Setup navigation header
  useEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.mintDark
      },
      headerRight: () => (
        <Entypo name="plus" size={23} style={$headerPlusIcon} color={colors.palette.actionColor} onPress={plusButtonTapped} />
      ),
    })
  }, [navigation, plusButtonTapped])

  // Fetch data on mount
  useEffect(() => {
    fetchPaquetesFromServer()
  }, [])

  const renderItem = useCallback(({ item }: { item: PaqueteItem }) => (
    <ListItem
      style={$itemRow}
      topSeparator={false}
      bottomSeparator={true}
      onPress={() => handleCellPress(item)}
    >
      <View style={$itemContent}>
        <View style={$itemNameContainer}>
          <Text size="md">{item.get('nombre')}</Text>
        </View>
        <View style={$itemDetailsRow}>
          <Text size="sm">{item.get('horario')}</Text>
          <Text size="sm">{"$" + item.get('precio')}</Text>
        </View>
      </View>
    </ListItem>
  ), [handleCellPress])

  const keyExtractor = useCallback((item: PaqueteItem) => item.id, [])


  return (
    <Screen style={$root} preset="fixed">
      {isLoading ? (
        <View style={$spinner}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          style={$flatListStyle}
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
        />
      )}
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
  marginTop: 8,
  marginBottom: 20,
  borderRadius: 10,
}

const $itemRow: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  paddingLeft: spacing.small,
  paddingRight: spacing.tiny,
  paddingTop: spacing.tiny,
  paddingBottom: spacing.extraSmall,
}

const $headerPlusIcon: TextStyle = {
  marginTop: -2,
}

const $itemContent: ViewStyle = {
  flex: 1,
  flexDirection: 'column',
}

const $itemNameContainer: ViewStyle = {
  marginTop: 2,
  paddingTop: 4,
}

const $itemDetailsRow: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: ROW_CONTENT_WIDTH,
  marginBottom: -8,
  marginTop: 4,
}
