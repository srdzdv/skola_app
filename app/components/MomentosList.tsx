import React, { useState, useEffect, useCallback, memo } from 'react'
import * as SQLiteAPI from "../services/sqlite/SQLiteAPI"
import { ScrollView, StyleSheet, View, Text, Alert, TextInput, Button, Switch, ActivityIndicator, Dimensions, Platform } from "react-native"
import SegmentedControl from '@react-native-segmented-control/segmented-control/js/SegmentedControl.js'
import { colors, spacing } from "../theme"
import * as Haptics from 'expo-haptics';
import * as ParseAPI from "../services/parse/ParseAPI"

interface MomentosListProps {
  grupoId: string
}

interface StudentData {
  id: string
  objectId: string
  nombre: string
  apellidos: string
}

const MomentosList = ({ grupoId }: MomentosListProps) => {
    const [students, setStudents] = useState<StudentData[]>([])

    useEffect(() => {
        fetchEstudiantes(grupoId)
      }, [grupoId])

      async function fetchEstudiantes(grupoIdParam: string) {
        // Query the local DB first
        const dbRes = await readEstudianteFromDB(grupoIdParam)
        if (dbRes.length > 0) {
            setStudents(dbRes)
        } else {
          // If results are empty, provide feedback to user
          presentFeedback("Ocurrió algo inesperado.", "No fue posible cargar la lista de alumnos. Favor de intentar de nuevo.")
        }
      }

      async function readEstudianteFromDB(grupoIdParam: string) {
        const searchCondition = "WHERE grupoId = ?"
        const dbEstudiantes = await SQLiteAPI.readDBPromise("Estudiante", searchCondition, [grupoIdParam])
        return dbEstudiantes as StudentData[]
      }

      function presentFeedback(alertTitle: string, alertMessage: string) {
        Alert.alert(
          alertTitle,
          alertMessage,
          [
            {text: 'Ok', onPress: () => {}, style: 'default'},
          ],
          {cancelable: false},
        );
      }

  return (
    <ScrollView style={styles.container}>
      {students.map(student => (
        <StudentCard
          key={student.objectId}
          studentData={student}
        />
      ))}
    </ScrollView>
  )
}

export default MomentosList


const SEGMENT_VALUES = ["Nada", "Poco", "Todo", "Más"] as const

// Get dimensions once at module level
const windowWidth = Dimensions.get('window').width
const halfCardWidth = (windowWidth / 2) - 30

/** COMPONENT: StudentCard **/
const StudentCard = memo(function StudentCard({ studentData }: { studentData: StudentData }) {
  // State
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [momentoObjId, setMomentoObjId] = useState<string | null>(null)
  // Alimentacion
  const [desayunoIndex, setDesayunoIndex] = useState(0)
  const [comidaIndex, setComidaIndex] = useState(0)
  const [colacionIndex, setColacionIndex] = useState(0)
  const [meriendaIndex, setMeriendaIndex] = useState(0)
  const [lecheVal, setLecheVal] = useState("")
  // Descanso
  const [durmioVal, setDurmioVal] = useState(false)
  const [horarioVal, setHorarioVal] = useState("")
  const [duracionVal, setDuracionVal] = useState("")
  // Funciones
  const [avisoVal, setAvisoVal] = useState(false)
  const [pipiVal, setPipiVal] = useState("")
  const [popoVal, setPopoVal] = useState("")
  // Comentarios
  const [comentarios, setComentarios] = useState("")

  useEffect(() => {
    fetchMomento()
  }, [studentData.objectId])

  async function fetchMomento() {
    const res = await ParseAPI.fetchMomento(studentData.objectId)
    if (res != null) {
      setIsDataLoading(true)
      setMomentoObjId(res.id)
      setupUI(res.get("momento"))
    }
  }

  function setupUI(momentosDict: Record<string, any>) {
    const desayunoValue = momentosDict["desayuno"]
    const desIndex = SEGMENT_VALUES.indexOf(desayunoValue)
    setDesayunoIndex(desIndex >= 0 ? desIndex : 0)
    const comidaValue = momentosDict["comida"]
    const comIndex = SEGMENT_VALUES.indexOf(comidaValue)
    setComidaIndex(comIndex >= 0 ? comIndex : 0)
    const colacionValue = momentosDict["colacion"]
    const colIndex = SEGMENT_VALUES.indexOf(colacionValue)
    setColacionIndex(colIndex >= 0 ? colIndex : 0)
    const meriendaValue = momentosDict["merienda"]
    const merIndex = SEGMENT_VALUES.indexOf(meriendaValue)
    setMeriendaIndex(merIndex >= 0 ? merIndex : 0)

    setLecheVal(momentosDict["leche"] || "")
    setDurmioVal(momentosDict["descanso"] || false)
    setHorarioVal(momentosDict["horaSiesta"] || "")
    setDuracionVal(momentosDict["tiempoSiesta"] || "")
    setAvisoVal(momentosDict["avisoFuncion"] || false)
    setPipiVal(momentosDict["pipi"] || "")
    setPopoVal(momentosDict["popo"] || "")
    setComentarios(momentosDict["alimentosComentarios"] || "")
    setIsDataLoading(false)
  }

    const guardarButtonPressed = useCallback(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setIsLoading(true)
      processData()
    }, [desayunoIndex, comidaIndex, colacionIndex, meriendaIndex, lecheVal, durmioVal, horarioVal, duracionVal, avisoVal, pipiVal, popoVal, comentarios, momentoObjId])

    function processData() {
      const momentosDict: Record<string, any> = {
        desayuno: SEGMENT_VALUES[desayunoIndex],
        comida: SEGMENT_VALUES[comidaIndex],
        colacion: SEGMENT_VALUES[colacionIndex],
        merienda: SEGMENT_VALUES[meriendaIndex],
        leche: lecheVal,
        descanso: durmioVal,
        horaSiesta: horarioVal,
        tiempoSiesta: duracionVal,
        avisoFuncion: avisoVal,
        pipi: pipiVal,
        popo: popoVal,
        alimentosComentarios: comentarios,
      }

      // Server call
      if (momentoObjId == null) {
        saveMomentosInServer(momentosDict)
      } else {
        // Update Existing object
        updateMomentoInServer(momentosDict)
      }
    }

    async function saveMomentosInServer(momentosDict: {}) {
      // Autor
      let userObj = await ParseAPI.getCurrentUserObj() // not do the whole object just the ID!!!!!
      // Server call
      let res = await ParseAPI.saveMomentos(studentData.objectId, userObj.id, momentosDict)
      if (res != null) {
        setIsLoading(false)
        // RUN CLOUD
        runCloudCodeFunction()
        // Feedback user
        presentFeedback("Momentos Guardados", "Una notificación ha sido enviada a los Papás del alumno.")
      } else {
        presentFeedback("Ocurrió algo inesperado", "No fue posible guardar el momento para el alumno. Intenta de nuevo, por favor.")
      }
    }

    async function updateMomentoInServer(momentosDict: {}) {
      let res = await ParseAPI.updateMomento(momentoObjId, momentosDict)
      if (res != null) {
        setIsLoading(false)
        // RUN CLOUD
        runCloudCodeFunction()
        // Feedback user
        presentFeedback("Momentos Actualizados", "Una notificación ha sido enviada a los Papás del alumno.")
      } else {
        presentFeedback("Ocurrió algo inesperado", "No fue posible actualizar el momento para el alumno. Intenta de nuevo, por favor.")
      }
    }

    function runCloudCodeFunction() {
      // Cloud
      let cloudFuncName = "momentosParentNotification"
      const params = { estudianteObjectId: studentData.objectId }
      ParseAPI.runCloudCodeFunction(cloudFuncName, params)
    }

    function presentFeedback(alertTitle: string, alertMessage: string) {
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          {text: 'Ok', onPress: null, style: 'default'},
        ],
        {cancelable: false},
      );
    }



    // Memoized callbacks for SegmentedControl
    const handleDesayunoChange = useCallback((event: any) => {
      setDesayunoIndex(event.nativeEvent.selectedSegmentIndex)
    }, [])

    const handleComidaChange = useCallback((event: any) => {
      setComidaIndex(event.nativeEvent.selectedSegmentIndex)
    }, [])

    const handleColacionChange = useCallback((event: any) => {
      setColacionIndex(event.nativeEvent.selectedSegmentIndex)
    }, [])

    const handleMeriendaChange = useCallback((event: any) => {
      setMeriendaIndex(event.nativeEvent.selectedSegmentIndex)
    }, [])

    const buttonColor = Platform.OS === "ios" ? colors.palette.actionColor : colors.palette.sunflowerDark

    return (
        <View style={styles.card}>
            <Text style={styles.cardName}>{studentData.nombre + " " + studentData.apellidos}</Text>
            {isDataLoading ? (
              <View style={styles.spinner}>
                <ActivityIndicator size="large" color={colors.palette.actionYellow} />
              </View>
            ) : (
            <>
              <View style={styles.alimentacionSection}>
                <Text style={styles.sectionTitle}>Alimentación</Text>

                <Text style={styles.sectionItem}>Desayuno</Text>
                <SegmentedControl
                  values={SEGMENT_VALUES}
                  selectedIndex={desayunoIndex}
                  fontStyle={styles.segmentFontStyle}
                  style={styles.segmentedControl}
                  onChange={handleDesayunoChange}
                />

                <Text style={styles.sectionItem}>Comida</Text>
                <SegmentedControl
                  values={SEGMENT_VALUES}
                  selectedIndex={comidaIndex}
                  fontStyle={styles.segmentFontStyle}
                  style={styles.segmentedControl}
                  onChange={handleComidaChange}
                />

                <Text style={styles.sectionItem}>Colación</Text>
                <SegmentedControl
                  values={SEGMENT_VALUES}
                  selectedIndex={colacionIndex}
                  fontStyle={styles.segmentFontStyle}
                  style={styles.segmentedControl}
                  onChange={handleColacionChange}
                />

                <Text style={styles.sectionItem}>Merienda</Text>
                <SegmentedControl
                  values={SEGMENT_VALUES}
                  selectedIndex={meriendaIndex}
                  fontStyle={styles.segmentFontStyle}
                  style={styles.segmentedControl}
                  onChange={handleMeriendaChange}
                />

                <Text style={styles.sectionItem}>Leche</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Mililitros..."
                  value={lecheVal}
                  onChangeText={setLecheVal}
                />
              </View>

              <View style={styles.rowContainer}>
                <View style={styles.halfCardLeft}>
                  <Text style={styles.sectionTitle}>Descanso</Text>

                  <View style={styles.switchView}>
                    <Text style={styles.sectionItemWithMargin}>¿Durmió?</Text>
                    <Switch
                      value={durmioVal}
                      onValueChange={setDurmioVal}
                    />
                  </View>

                  <Text style={styles.sectionItem}>Horario:</Text>
                  <TextInput
                    style={styles.haldCardInputField}
                    placeholder="Hora de siesta"
                    value={horarioVal}
                    onChangeText={setHorarioVal}
                  />

                  <Text style={styles.sectionItem}>Duración:</Text>
                  <TextInput
                    style={styles.haldCardInputField}
                    placeholder="Minutos"
                    value={duracionVal}
                    onChangeText={setDuracionVal}
                  />
                </View>

                <View style={styles.halfCardRight}>
                  <Text style={styles.sectionTitle}>Funciones</Text>

                  <View style={styles.switchView}>
                    <Text style={styles.sectionItemWithMargin}>¿Avisó?</Text>
                    <Switch
                      value={avisoVal}
                      onValueChange={setAvisoVal}
                    />
                  </View>

                  <Text style={styles.sectionItem}>Pipí:</Text>
                  <TextInput
                    style={styles.haldCardInputField}
                    placeholder="# veces"
                    value={pipiVal}
                    onChangeText={setPipiVal}
                  />

                  <Text style={styles.sectionItem}>Popó:</Text>
                  <TextInput
                    style={styles.haldCardInputField}
                    placeholder="# veces"
                    value={popoVal}
                    onChangeText={setPopoVal}
                  />
                </View>
              </View>

              <Text style={styles.cardLabel}>Comentarios generales:</Text>
              <TextInput
                style={styles.inputFieldMultiline}
                multiline={true}
                numberOfLines={2}
                value={comentarios}
                onChangeText={setComentarios}
              />
            </>
            )}

            {isLoading ? (
              <View style={styles.spinner}>
                <ActivityIndicator size="small" color={colors.palette.actionYellow} />
              </View>
            ) : (
              <>
                {Platform.OS === "android" && <View style={styles.androidSpacer} />}
                <Button
                  title="Guardar"
                  color={buttonColor}
                  onPress={guardarButtonPressed}
                />
              </>
            )}
        </View>
    )
})


/** STYLES: MomentosList **/
const styles = StyleSheet.create({
    container: {
        marginBottom: -16,
    },
    card: {
      marginTop: 8,
      backgroundColor: colors.palette.bittersweetDark,
      borderRadius: 12,
      marginBottom: 8,
      padding: spacing.small
    },
    cardName: {
        color: colors.palette.neutral100,
        fontSize: 18,
        fontWeight: "bold",
    },
    cardLabel: {
      color: colors.palette.neutral100,
      fontSize: 15,
      fontWeight: "normal",
      marginTop: 12,
    },
    inputFieldMultiline: {
      height: 48,
      borderColor: colors.palette.neutral300,
      borderWidth: 1,
      paddingLeft: 8,
      margin: 4,
      borderRadius: 10,
      backgroundColor: colors.palette.neutral100
    },
    resetButton: {
      backgroundColor: colors.palette.actionYellow,
    },
    alimentacionSection: {
      backgroundColor: 'white',
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: spacing.small,
      height: 330,
      borderRadius: 8,
    },
    sectionTitle: {
      fontWeight: "bold",
      marginBottom: 6,
    },
    sectionItem: {
      fontSize: 12,
      marginBottom: 4,
    },
    sectionItemWithMargin: {
      fontSize: 12,
      marginBottom: 4,
      marginTop: 7,
    },
    rowContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    halfCardLeft: {
      backgroundColor: 'white',
      paddingVertical: 6,
      paddingHorizontal: spacing.small,
      height: 168,
      borderRadius: 8,
      width: halfCardWidth,
    },
    halfCardRight: {
      backgroundColor: 'white',
      paddingVertical: 6,
      paddingHorizontal: spacing.small,
      height: 168,
      borderRadius: 8,
      width: halfCardWidth,
    },
    switchView: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    segmentedControl: {
      marginBottom: 10
    },
    segmentFontStyle: {
      fontSize: 12,
    },
    inputField: {
      height: 30,
      borderColor: colors.palette.neutral400,
      borderWidth: 1,
      paddingLeft: 6,
      borderRadius: 8,
      backgroundColor: colors.palette.neutral100
    },
    haldCardInputField: {
      height: 26,
      marginBottom: 10,
      borderColor: colors.palette.neutral400,
      borderWidth: 1,
      paddingLeft: 6,
      borderRadius: 8,
      backgroundColor: colors.palette.neutral100
    },
    spinner: {
      flex: 1,
      paddingTop: 16,
      alignContent: "center",
      alignItems: "center",
      justifyContent: "center"
    },
    androidSpacer: {
      height: 6,
    },
})