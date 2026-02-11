import React, { FC, useEffect, useState, useCallback } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { useStores } from "../models"
import { observer } from "mobx-react-lite"
import { ViewStyle, TextStyle, View, FlatList, ActivityIndicator } from "react-native"
import { Entypo } from '@expo/vector-icons'
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import { colors, spacing } from "../theme"
import * as Haptics from 'expo-haptics'
import SegmentedControl from '@react-native-segmented-control/segmented-control/js/SegmentedControl.js'

// Hoisted constants
const SEGMENT_CONTROL_VALUES = ["Administración", "Docentes"]

interface UsuariosScreenProps extends NativeStackScreenProps<AppStackScreenProps<"Usuarios">> {}

interface UserItem {
  id: string
  get: (key: string) => any
}

export const UsuariosScreen: FC<UsuariosScreenProps> = observer(function UsuariosScreen({ navigation }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [adminArr, setAdminArr] = useState<UserItem[]>([])
  const [teachersArr, setTeachersArr] = useState<UserItem[]>([])
  const [listData, setListData] = useState<UserItem[]>([])

  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  const processDataForTable = useCallback((dataArr: UserItem[]) => {
    if (dataArr.length > 0) {
      const adminUsersArr = dataArr.filter((user) => user.get('usertype') === 0)
      const teacherUsersArr = dataArr.filter((user) => user.get('usertype') === 1)
      setAdminArr(adminUsersArr)
      setTeachersArr(teacherUsersArr)
      setListData(adminUsersArr)
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUsersFromServer = useCallback(async () => {
    const resultObj = await ParseAPI.fetchEscuelaUsers(authUserEscuela)
    if (resultObj != null) {
      processDataForTable(resultObj)
    }
  }, [authUserEscuela, processDataForTable])

  const reloadActividadList = useCallback(() => {
    setSelectedIndex(0)
    fetchUsersFromServer()
  }, [fetchUsersFromServer])

  const plusButtonTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Usuario", { reloadList: reloadActividadList })
  }, [navigation, reloadActividadList])

  // Setup navigation header
  useEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.pinkroseDark
      },
      headerRight: () => (
        <Entypo name="plus" size={23} style={$headerPlusIcon} color={colors.palette.actionColor} onPress={plusButtonTapped} />
      ),
    })
  }, [navigation, plusButtonTapped])

  // Fetch data on mount
  useEffect(() => {
    setSelectedIndex(0)
    fetchUsersFromServer()
  }, [])

  const displayDataForUsertype = useCallback((usertype: number) => {
    setListData([])
    setIsLoading(false)
    if (usertype === 0) {
      setListData(adminArr)
    } else {
      setListData(teachersArr)
    }
  }, [adminArr, teachersArr])

  const segmentIndexChanged = useCallback((index: number) => {
    if (selectedIndex !== index) {
      setSelectedIndex(index)
      setIsLoading(true)
      displayDataForUsertype(index)
    }
  }, [selectedIndex, displayDataForUsertype])

  const handleSegmentChange = useCallback((event: any) => {
    segmentIndexChanged(event.nativeEvent.selectedSegmentIndex)
  }, [segmentIndexChanged])

  const handleCellPress = useCallback((item: UserItem) => {
    navigation.navigate("Usuario", { userObj: item })
  }, [navigation])

  const renderItem = useCallback(({ item }: { item: UserItem }) => (
    <ListItem
      style={$itemRow}
      topSeparator={false}
      bottomSeparator={true}
      onPress={() => handleCellPress(item)}
    >
      <Text size="md">{item.get('nombre') + " " + item.get('apellidos')}</Text>
    </ListItem>
  ), [handleCellPress])

  const keyExtractor = useCallback((item: UserItem) => item.id, [])


  return (
    <Screen style={$root} preset="fixed">
      <SegmentedControl
        values={SEGMENT_CONTROL_VALUES}
        selectedIndex={selectedIndex}
        onChange={handleSegmentChange}
      />

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
