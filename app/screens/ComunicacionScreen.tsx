import React, { FC, useEffect, useState, useCallback, useRef } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { useStores } from "../models"
import moment from 'moment';
import { observer } from "mobx-react-lite"
import { ViewStyle, TextStyle, View, Alert, FlatList, ActivityIndicator, Platform } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import { colors, spacing } from "../theme"
import * as Haptics from 'expo-haptics';
import { Entypo } from '@expo/vector-icons';
import SegmentedControl from '@react-native-segmented-control/segmented-control/js/SegmentedControl.js'

// Hoisted constants
const SEGMENT_VALUES = ["Recibidos", "Por Aprobar", "Enviados"] as const

interface ComunicacionScreenProps extends NativeStackScreenProps<AppStackScreenProps<"Comunicacion">> {}

export const ComunicacionScreen: FC<ComunicacionScreenProps> = observer(function ComunicacionScreen({ route, navigation }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [listData, setListData] = useState<any[]>([])
  const [nivelIdArr, setNivelIdArr] = useState<string[]>([])

  // Use refs for mutable values that need to persist across renders and async calls
  const currentIndexRef = useRef(0)
  const gruposDictRef = useRef<Record<string, string>>({})
  const anunciosPhotoArrRef = useRef<any[]>([])
  const nivelNombresRef = useRef<string[]>([])

  const {
    authenticationStore: {
      authUserEscuela,
      authUsertype,
      authUserId
    },
  } = useStores()

  useEffect(() => {
    setSelectedIndex(0)
    currentIndexRef.current = 0
    fetchNivelesFromServer()
    fetchAnunciosFromServer()
  }, [])

  async function fetchNivelesFromServer() {
    const nivelRes = await ParseAPI.fetchNiveles(authUserEscuela)
    const mapNivelIds = nivelRes.map((x) => x.id)
    const mapNivelNames = nivelRes.map((x) => x.get('nombre'))
    setNivelIdArr(mapNivelIds)
    nivelNombresRef.current = mapNivelNames
  }

  async function fetchAnunciosFromServer() {
    setListData([])
    if (authUsertype == 1) {
      fetchGruposForDocenteUser()
    } else {
      // Try to fetch threads first, fall back to flat list
      try {
        const threadEntries = await ParseAPI.fetchThreadsForComunicacion(authUserEscuela)
        if (threadEntries && threadEntries.length > 0) {
          await processThreadsForTable(threadEntries)
          return
        }
      } catch (e) {
        console.log("Thread fetch not available, falling back to flat list")
      }

      const resultObj = await ParseAPI.fetchAnunciosForComunicacion(authUserEscuela)
      const anunciosRes = resultObj.mainResultArr
      const attachmentsArr = resultObj.anuncioPhotoArr
      anunciosPhotoArrRef.current = attachmentsArr
      if (anunciosRes != null) {
        processDataForTable(anunciosRes)
      }
    }
  }

  async function fetchGruposForDocenteUser() {
    const escuelaObj = await ParseAPI.fetchUserEscuela(authUserEscuela)
    const userGrupos = await ParseAPI.fetchGrupos(escuelaObj)
    const estudiantesRes = await ParseAPI.fetchEstudiantesByGrupos(userGrupos)
    const resultObj = await ParseAPI.fetchAnunciosForComunicacion(authUserEscuela)
    const anunciosRes = resultObj.mainResultArr
    const userGrupoIds = userGrupos.map(grupo => grupo.id)
    const filteredAnunciosByGrupos = anunciosRes.filter(anuncio => {
      const grupos = anuncio.get('grupos')
      return grupos && grupos.some(grupo => userGrupoIds.includes(grupo.id))
    })
    const filteredAnunciosByEstudiantes = anunciosRes.filter(anuncio => {
      const estudiante = anuncio.get('estudiante')
      return estudiante && estudiantesRes.some(e => e.id === estudiante.id)
    })
    const filteredAnuncios = [...filteredAnunciosByGrupos, ...filteredAnunciosByEstudiantes]
    if (filteredAnuncios != null) {
      processDataForTable(filteredAnuncios)
    }
  }

  async function fetchAnunciosPorAprobar() {
    setListData([])
    if (authUsertype == 0) {
      const resultObj = await ParseAPI.fetchAnunciosPorAprobar(authUserEscuela)
      const anunciosRes = resultObj.mainResultArr
      const attachmentsArr = resultObj.anuncioPhotoArr
      anunciosPhotoArrRef.current = attachmentsArr
      if (anunciosRes != null) {
        processDataForTable(anunciosRes)
      }
    } else {
      setIsLoading(false)
    }
  }

  async function fetchAnunciosEnviados() {
    setListData([])
    if (authUsertype == 0) {
      const anunciosRes = await ParseAPI.fetchAnunciosEnviados(authUserEscuela)
      if (anunciosRes != null) {
        processDataForTable(anunciosRes)
      }
    } else {
      const anunciosRes = await ParseAPI.fetchAnunciosEnviadosDocente(authUserEscuela, authUserId)
      if (anunciosRes != null) {
        processDataForTable(anunciosRes)
      }
    }
  }

  /**
   * Process thread entries for the "Recibidos" tab.
   * Each entry can be a thread (multiple messages) or a standalone message.
   */
  async function processThreadsForTable(entries: any[]) {
    const tableArr: any[] = []

    for (const entry of entries) {
      const anuncio = entry.rootAnuncio
      const latestAnuncio = entry.latestAnuncio
      const replyCount = entry.replyCount
      const isThread = entry.isThread

      let autorStr = ""
      const autorObj = anuncio.get('autor')
      if (anuncio.get('estudiante') != null && autorObj != null) {
        const estudianteObj = anuncio.get('estudiante')
        const grupoObj = estudianteObj.get('grupo')
        if (grupoObj) {
          const grupoName = await fetchGrupoObj(grupoObj.id)
          autorStr = grupoName + " - " + autorObj.get('parentesco') + " de " + estudianteObj.get('NOMBRE') + " " + estudianteObj.get('ApPATERNO')
        }
      }

      let destino = ""
      let estudianteId: string | null = null
      if (anuncio.get('estudiante') != null) {
        destino = anuncio.get('estudiante').get('NOMBRE')
        estudianteId = anuncio.get('estudiante').id
      } else if (anuncio.get('grupos') != null) {
        const grupos = anuncio.get('grupos')
        if (grupos.length > 6) {
          destino = "Toda la escuela."
        } else {
          for (let j = 0; j < grupos.length; j++) {
            const grupo = grupos[j]
            if (grupo != null) {
              const grupoId = grupo.get('grupoId')
              if (grupoId) {
                if (j == grupos.length - 1) {
                  destino = destino + grupoId + "."
                } else {
                  destino = destino + grupoId + ", "
                }
              }
            }
          }
        }
      }

      // Use the latest message's description as preview
      let descripcion = ""
      const latestDesc = latestAnuncio.get('descripcion')
      if (latestDesc != null) {
        descripcion = latestDesc
        if (descripcion.length > 70) {
          descripcion = descripcion.substring(0, 70)
          if (descripcion.includes("\n")) {
            descripcion = descripcion.replace("\n", " ")
          }
          descripcion = descripcion + "..."
        }
      }
      const momentosData = latestAnuncio.get('momento')
      if (momentosData != null) {
        descripcion = "Momentos del Día"
      }

      // Build the subject from the root message
      let threadSubject = ""
      const rootDesc = anuncio.get('descripcion')
      if (rootDesc) {
        threadSubject = rootDesc.length > 40 ? rootDesc.substring(0, 40) + "..." : rootDesc
      }

      const dataItem = {
        id: isThread ? entry.threadId : anuncio.id,
        objectId: anuncio.id,
        estudianteObj: anuncio.get('estudiante'),
        tipo: "Mensaje",
        timestamp: moment(entry.sortDate).format("dd DD/MMM"),
        autor: autorObj,
        autorName: autorStr,
        destino: destino,
        descripcionPreview: descripcion,
        descripcion: anuncio.get('descripcion'),
        momentosData: momentosData,
        createdAt: entry.sortDate,
        hasAttachment: anuncio.get('awsAttachment'),
        anuncioSeen: true,
        msgType: 0,
        aprobado: anuncio.get('aprobado'),
        // Thread-specific fields
        isThread: isThread,
        threadId: entry.threadId,
        replyCount: replyCount,
        threadSubject: threadSubject,
        estudianteId: estudianteId,
        grupoData: anuncio.get('grupos')?.[0] || null,
      }

      tableArr.push(dataItem)
    }

    setIsLoading(false)
    setListData(tableArr)
  }

  async function processDataForTable(dataArr: any[]) {
    if (dataArr.length > 0) {
      const tableArr: any[] = []
      const currentIndex = currentIndexRef.current
      for (let i = 0; i < dataArr.length; i++) {
        const anuncio = dataArr[i]
        let autorStr = ""
        const autorObj = anuncio.get('autor')
        if (currentIndex == 0) {
          if (anuncio.get('estudiante') != null && anuncio.get('autor') != null) {
            const estudianteObj = anuncio.get('estudiante')
            const grupoObj = estudianteObj.get('grupo')
            const grupoName = await fetchGrupoObj(grupoObj.id)
            autorStr = grupoName + " - " + autorObj.get('parentesco') + " de " + estudianteObj.get('NOMBRE') + " " + estudianteObj.get('ApPATERNO')
          }
        } else {
          autorStr = autorObj.get('username')
        }

        let hasAttachment = anuncio.get('awsAttachment')
        if (!hasAttachment && Platform.OS !== "android") {
          const attchRes = lookForAttachmentInAnuncioPhotoTable(anuncio.id)
          hasAttachment = attchRes != null ? true : false
        }

        const timestamp = moment(anuncio.createdAt).format("dd DD/MMM")
        let alumnoFullName = ""
        let destino = ""
        if (anuncio.get('estudiante') != null) {
          destino = anuncio.get('estudiante').get('NOMBRE')
          alumnoFullName = destino + " " + anuncio.get('estudiante').get('ApPATERNO')
        } else if (anuncio.get('grupos') != null) {
          const grupos = anuncio.get('grupos')
          if (grupos.length > 6) {
            destino = "Toda la escuela."
          } else {
            for (let j = 0; j < grupos.length; j++) {
              const grupo = grupos[j]
              if (grupo != null) {
                const grupoId = grupo.get('grupoId')
                if (grupoId) {
                  if (j == grupos.length - 1) {
                    destino = destino + grupoId + "."
                  } else {
                    destino = destino + grupoId + ", "
                  }
                }
              }
            }
          }
        }

        let descripcion = ""
        if (anuncio.get('descripcion') != null) {
          descripcion = anuncio.get('descripcion')
          if (descripcion.length > 70) {
            descripcion = descripcion.substring(0, 70)
            if (descripcion.includes("\n")) {
              descripcion = descripcion.replace("\n", " ")
            }
            descripcion = descripcion + "..."
          }
        }
        const momentosData = anuncio.get('momento')
        if (anuncio.get('momento') != null) {
          descripcion = "Momentos del Día - " + alumnoFullName
        }

        const dataItem = {
          id: anuncio.id,
          objectId: anuncio.id,
          estudianteObj: anuncio.get('estudiante'),
          tipo: "Mensaje",
          timestamp: timestamp,
          autor: autorObj,
          autorName: autorStr,
          destino: destino,
          descripcionPreview: descripcion,
          descripcion: anuncio.get('descripcion'),
          momentosData: momentosData,
          createdAt: anuncio.createdAt,
          hasAttachment: hasAttachment,
          anuncioSeen: true,
          msgType: currentIndex,
          aprobado: anuncio.get('aprobado'),
          // Non-threaded
          isThread: false,
          threadId: null,
          replyCount: 0,
        }

        tableArr.push(dataItem)
      }
      setIsLoading(false)
      setListData(tableArr)
    } else {
      setIsLoading(false)
    }
  }

  function lookForAttachmentInAnuncioPhotoTable(anuncioObjId: string) {
    const resultAnuncioPhoto = anunciosPhotoArrRef.current
    let adjuntoData = null
    for (let i = 0; i < resultAnuncioPhoto.length; i++) {
      const object = resultAnuncioPhoto[i]
      const anuncioInPhoto = object.get('anuncio')
      const tipoAdjunto = object.get('TipoArchivo')
      if (anuncioInPhoto.id == anuncioObjId) {
        adjuntoData = {
          objectId: object.id,
          tipo: tipoAdjunto
        }
      }
    }
    return adjuntoData
  }

  async function fetchGrupoObj(grupoId: string) {
    if (gruposDictRef.current[grupoId] == null) {
      const grupoObj = await ParseAPI.fetchGrupo(grupoId)
      const grupoName = grupoObj.get("grupoId")
      gruposDictRef.current[grupoId] = grupoName
      return grupoName
    } else {
      return gruposDictRef.current[grupoId]
    }
  }

  function segmentIndexChanged(index: number) {
    if (selectedIndex != index) {
      currentIndexRef.current = index
      setSelectedIndex(index)
      setIsLoading(true)
      switch (index) {
        case 0:
          fetchAnunciosFromServer()
          break
        case 1:
          fetchAnunciosPorAprobar()
          break
        case 2:
          fetchAnunciosEnviados()
          break
        default:
          break
      }
    }
  }

  const menuButtonTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (authUsertype == 0) {
      const alertActionsArr: any[] = [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        { text: 'Toda la Escuela', onPress: () => menuOptionSelected("all") }
      ]
      const nivelNombres = nivelNombresRef.current
      if (nivelNombres != null) {
        for (const nivel of nivelNombres) {
          const action = { text: nivel, onPress: () => menuOptionSelected(nivel) }
          alertActionsArr.push(action)
        }
      }
      Alert.alert('Mandar mensaje', 'Selecciona el público que va a recibir el mensaje con notificación:', alertActionsArr)
    }
  }, [authUsertype])

  function menuOptionSelected(nivel: string) {
    let nivelId = "all"
    if (nivel != "all") {
      const indexSelected = nivelNombresRef.current.indexOf(nivel)
      nivelId = nivelIdArr[indexSelected]
    }
    enviarAction(nivel, nivelId)
  }

  function enviarAction(nivel: string, nivelId: string) {
    const actividadParams = {
      actividadType: 4,
      grupoName: nivel,
      grupoId: null,
      nivelId: nivelId,
      estudianteId: null,
      reloadList: null,
      reloadTable: reloadTable
    }
    navigation.navigate("CrearActividad", actividadParams)
  }

  function getDateFormatStr(dateStr: Date) {
    return moment(dateStr).format('ddd DD/MMM') + " | " + moment(dateStr).format('HH:mm')
  }

  function displayAprobadoStatus(aprobado: boolean) {
    return aprobado == true ? "🟢" : "🔴"
  }

  function handleCellPress(item: any) {
    if (item.isThread && item.threadId) {
      // Navigate to thread detail view
      const threadParams = {
        threadId: item.threadId,
        threadSubject: item.threadSubject || item.descripcionPreview,
        estudianteId: item.estudianteId || null,
        grupoData: item.grupoData || null,
        reloadTable: reloadTable,
      }
      navigation.navigate("ThreadDetail", threadParams)
    } else {
      // Navigate to single message detail (backwards compatible)
      const params = { ...item, reloadTable }
      navigation.navigate("mensajeDetail", params)
    }
  }

  function reloadTable(msgType: number) {
    switch (msgType) {
      case 0:
        fetchAnunciosFromServer()
        break
      case 1:
        fetchAnunciosPorAprobar()
        break
      case 2:
        fetchAnunciosEnviados()
        break
      default:
        break
    }
    currentIndexRef.current = msgType
    setSelectedIndex(msgType)
  }

  return (
    <Screen style={$root} preset="fixed" safeAreaEdges={["top"]}>
      <View style={$headerRow}>
        <Text style={$header} text="Comunicación" preset="heading" />
        <Entypo name="new-message" size={23} style={$newMessageIcon} color="#007AFF" onPress={menuButtonTapped} />
      </View>
      <SegmentedControl
        values={SEGMENT_VALUES}
        selectedIndex={selectedIndex}
        onChange={(event) => {
          segmentIndexChanged(event.nativeEvent.selectedSegmentIndex)
        }}
      />
      {isLoading ? (
        <View style={$spinner}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          style={$flatListStyle}
          data={listData}
          renderItem={({ item }) => (
            <ListItem
              style={$itemRow}
              topSeparator={false}
              bottomSeparator={true}
              onPress={() => handleCellPress(item)}
              RightComponent={
                <View style={$rightComponentContainer}>
                  {item.isThread && item.replyCount > 1 ? (
                    <View style={$threadBadge}>
                      <Entypo name="chat" size={12} color="white" />
                      <Text style={$threadBadgeText}>{item.replyCount}</Text>
                    </View>
                  ) : null}
                  {item.hasAttachment == true ? <Entypo name="attachment" size={20} color="#E9573F" style={$listItemRightComp} /> : null}
                </View>
              }
            >
              {selectedIndex == 2 && <Text size="xs">{displayAprobadoStatus(item.aprobado) + " "}</Text>}
              <Text size="xs">{getDateFormatStr(item.createdAt) + "\n"}</Text>
              <Text style={$autorText}>{item.autorName + " \n"}</Text>
              <Text size="md">{" " + item.descripcionPreview}</Text>
            </ListItem>
          )}
          keyExtractor={item => item.id}
        />
      )}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingHorizontal: spacing.stdPadding,
}

const $headerRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 8,
}

const $header: TextStyle = {
  color: colors.palette.neutral700,
  marginBottom: 12
}

const $newMessageIcon: ViewStyle = {
  marginTop: 12,
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

const $listItemRightComp: ViewStyle = {
  marginRight: 8,
  marginTop: 2,
}

const $autorText: TextStyle = {
  color: colors.palette.actionBlue,
}

const $rightComponentContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $threadBadge: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.palette.bluejeansLight,
  borderRadius: 12,
  paddingHorizontal: 8,
  paddingVertical: 3,
  marginRight: 6,
}

const $threadBadgeText: TextStyle = {
  color: "white",
  fontSize: 12,
  fontWeight: "bold",
  marginLeft: 4,
}
