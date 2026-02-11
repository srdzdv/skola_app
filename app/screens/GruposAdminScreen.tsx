import React, { FC, useEffect, useState, useCallback, memo } from "react"
import { useStores } from "../models"
import * as ParseAPI from "../services/parse/ParseAPI"
import { observer } from "mobx-react-lite"
import { Entypo } from '@expo/vector-icons'
import { ViewStyle, TextStyle, View, FlatList, ActivityIndicator, TouchableOpacity, Alert } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { colors, spacing } from "../theme"
import * as Haptics from 'expo-haptics'

interface GruposAdminScreenProps extends AppStackScreenProps<"GruposAdmin"> {}

interface GrupoItem {
  id: string
  get: (key: string) => any
}

interface UserItem {
  id: string
  get: (key: string) => any
}

export const GruposAdminScreen: FC<GruposAdminScreenProps> = observer(function GruposAdminScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true)
  const [listData, setListData] = useState<GrupoItem[]>([])
  const [userList, setUserList] = useState<UserItem[]>([])
  const [userCheckVisibility, setUserCheckVisibility] = useState<{[key: string]: boolean}>({})
  const [actionOccurred, setActionOccurred] = useState(false)
  const [changes, setChanges] = useState<{[key: string]: boolean}>({})

  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  const presentFeedback = useCallback((alertTitle: string, alertMessage: string) => {
    Alert.alert(
      alertTitle,
      alertMessage,
      [{ text: 'Ok', onPress: () => {}, style: 'default' }],
      { cancelable: false },
    )
  }, [])

  const saveDone = useCallback(() => {
    setIsLoading(false)
    setChanges({})
    presentFeedback("Cambios Guardados", "Todos los cambios han sido guardados exitosamente.")
  }, [presentFeedback])

  const addMaestrosToRelation = useCallback(async (maestrosDict: {[key: string]: string[]}) => {
    const dictKeys = Object.keys(maestrosDict)
    if (dictKeys != null) {
      for (let i = 0; i < dictKeys.length; i++) {
        const grupoId = dictKeys[i]
        const maestrosArr = maestrosDict[grupoId]
        const res = await ParseAPI.addMaestrosToGrupo(grupoId, maestrosArr)
        console.log("addMaestrosRES: " + JSON.stringify(res))
      }
    }
  }, [])

  const removeMaestrosFromRelation = useCallback(async (maestrosDict: {[key: string]: string[]}) => {
    const dictKeys = Object.keys(maestrosDict)
    if (dictKeys != null) {
      for (let i = 0; i < dictKeys.length; i++) {
        const grupoId = dictKeys[i]
        const maestrosArr = maestrosDict[grupoId]
        const res = await ParseAPI.removeMaestrosFromGrupo(grupoId, maestrosArr)
        console.log("removeMaestrosRES: " + JSON.stringify(res))
      }
    }
  }, [])

  const processMaestrosData = useCallback(() => {
    const grupoMaestros: {[key: string]: string[]} = {}
    const removeMaestros: {[key: string]: string[]} = {}
    const dictKeys = Object.keys(changes)
    const gruposCount = dictKeys.length
    dictKeys.forEach(itemKey => {
      const itemKeySplitArr = itemKey.split('_')
      const grupoId = itemKeySplitArr[0]
      const userId = itemKeySplitArr[1]
      if (changes[itemKey]) {
        if (grupoMaestros[grupoId] == null) {
          grupoMaestros[grupoId] = [userId]
        } else {
          grupoMaestros[grupoId].push(userId)
        }
      } else {
        if (removeMaestros[grupoId] == null) {
          removeMaestros[grupoId] = [userId]
        } else {
          removeMaestros[grupoId].push(userId)
        }
      }
    })
    const delayTime = gruposCount * 1000
    setTimeout(() => saveDone(), delayTime)
    addMaestrosToRelation(grupoMaestros)
    removeMaestrosFromRelation(removeMaestros)
  }, [changes, saveDone, addMaestrosToRelation, removeMaestrosFromRelation])

  const guardarCambios = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setIsLoading(true)
    processMaestrosData()
  }, [processMaestrosData])

  const fetchMaestrosRelation = useCallback(async (grupoObj: GrupoItem) => {
    const grupoId = grupoObj.id
    const maestrosRes = await ParseAPI.fetchGrupoMaestrosRelation(grupoObj)
    maestrosRes.forEach((user: UserItem) => {
      setUserCheckVisibility(prevState => ({
        ...prevState,
        [`${grupoId}_${user.id}`]: true,
      }))
    })
    setIsLoading(false)
  }, [])

  const fetchGruposFromServer = useCallback(async () => {
    const escuelaObj = await ParseAPI.fetchUserEscuela(authUserEscuela)
    const resultObj = await ParseAPI.fetchGrupos(escuelaObj)
    resultObj.forEach((grupo: GrupoItem) => {
      fetchMaestrosRelation(grupo)
    })
    if (resultObj != null) {
      setListData(resultObj)
    }
  }, [authUserEscuela, fetchMaestrosRelation])

  const fetchUsersFromServer = useCallback(async () => {
    const resultObj = await ParseAPI.fetchEscuelaUsers(authUserEscuela)
    if (resultObj != null) {
      setUserList(resultObj)
    }
  }, [authUserEscuela])

  const reloadActividadList = useCallback(() => {
    fetchGruposFromServer()
    fetchUsersFromServer()
  }, [fetchGruposFromServer, fetchUsersFromServer])

  const plusButtonTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("CrearGrupo", { reloadList: reloadActividadList })
  }, [navigation, reloadActividadList])

  // Setup navigation header
  useEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.grapefruitDark
      },
      title: "Grupos",
      headerRight: () => (
        <Entypo name="plus" size={23} style={$headerPlusIcon} color={colors.palette.actionColor} onPress={plusButtonTapped} />
      ),
    })
  }, [navigation, plusButtonTapped])

  // Fetch data on mount
  useEffect(() => {
    fetchGruposFromServer()
    fetchUsersFromServer()
  }, [])

  const handleCellPress = useCallback((grupoId: string, userId: string) => {
    setActionOccurred(true)
    const status = !userCheckVisibility[`${grupoId}_${userId}`]
    setUserCheckVisibility(prevState => ({
      ...prevState,
      [`${grupoId}_${userId}`]: status,
    }))
    setChanges(prevState => ({
      ...prevState,
      [`${grupoId}_${userId}`]: status,
    }))
  }, [userCheckVisibility])

  const renderItem = useCallback(({ item }: { item: GrupoItem }) => (
    <View style={$itemRow}>
      <ExpandableRow key={item.id} title={item.get('name')} subtitle={item.get('nivel').get('nombre')}>
        {userList.map(user => (
          <TouchableOpacity key={user.id} onPress={() => handleCellPress(item.id, user.id)}>
            <View style={$expandedDivider} />
            <View style={$userRow}>
              {userCheckVisibility[`${item.id}_${user.id}`] ? (
                <Entypo style={$checkIcon} name="check" size={22} color={colors.palette.grassDark} />
              ) : (
                <View style={$checkPlaceholder} />
              )}
              <Text style={$userName}>{user.get('nombre') + " " + user.get('apellidos')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ExpandableRow>
    </View>
  ), [userList, userCheckVisibility, handleCellPress])

  const keyExtractor = useCallback((item: GrupoItem) => item.id, [])



  return (
    <Screen style={$root} preset="fixed">
      {actionOccurred && (
        <TouchableOpacity onPress={guardarCambios}>
          <Text style={$guardarText}>Guardar cambios</Text>
        </TouchableOpacity>
      )}
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
  paddingTop: spacing.tiny,
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
  borderRadius: 10,
}

const $itemRow: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  paddingTop: spacing.extraSmall,
  paddingBottom: spacing.tiny,
}

const $rowDivider: ViewStyle = {
  backgroundColor: colors.background, 
  height: 8, 
}

const $expandedDivider: ViewStyle = {
  backgroundColor: colors.palette.neutral300,
  height: 1,
  marginTop: 4,
}

const $headerPlusIcon: TextStyle = {
  marginTop: -2,
}

const $guardarText: TextStyle = {
  justifyContent: "flex-end",
  textAlign: "right",
  color: colors.palette.actionBlue,
}

const $userRow: ViewStyle = {
  flexDirection: "row",
}

const $checkIcon: TextStyle = {
  paddingTop: 6,
  paddingLeft: 3,
}

const $checkPlaceholder: ViewStyle = {
  width: 25,
}

const $userName: TextStyle = {
  paddingLeft: spacing.extraSmall,
  paddingVertical: 4,
}

const $expandableRowHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
}

const $expandableRowContent: ViewStyle = {
  flex: 1,
}

const $expandableRowTitle: TextStyle = {
  paddingLeft: spacing.small,
  paddingBottom: 2,
}

const $expandableRowSubtitle: TextStyle = {
  paddingLeft: spacing.small,
  paddingBottom: 8,
  color: colors.palette.neutral500,
}

const $docentesLabel: TextStyle = {
  paddingLeft: spacing.tiny,
}

interface ExpandableRowProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

const ExpandableRow = memo(function ExpandableRow({ title, subtitle, children }: ExpandableRowProps) {
  const [expanded, setExpanded] = useState(false)

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setExpanded(prev => !prev)
  }, [])

  const chevronStyle: TextStyle = {
    paddingRight: spacing.small,
    transform: [{ rotate: expanded ? '180deg' : '0deg' }],
    paddingBottom: subtitle ? 8 : 2,
  }

  return (
    <View>
      <TouchableOpacity onPress={handlePress}>
        <View style={$expandableRowHeader}>
          <View style={$expandableRowContent}>
            <Text size="lg" style={$expandableRowTitle}>{title}</Text>
            {subtitle && (
              <Text size="sm" style={$expandableRowSubtitle}>{subtitle}</Text>
            )}
          </View>
          <Entypo
            name="chevron-down"
            size={20}
            color={colors.palette.neutral500}
            style={chevronStyle}
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View>
          <Text size="sm" weight="bold" style={$docentesLabel}>Docentes Activos</Text>
          {children}
        </View>
      )}
      <View style={$rowDivider} />
    </View>
  )
})