import React, { FC, useEffect, useState } from "react"
import moment from 'moment';
import * as ParseAPI from "../services/parse/ParseAPI"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, ActivityIndicator, Alert } from "react-native"
import { Entypo } from '@expo/vector-icons';
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { colors, spacing } from "../theme"
import PlaneacionCard from '../components/PlaneacionCard'

const EmptyActividad = {
  id: Math.random().toString(), 
  key: 'Actividad 1', 
  titulo: '', 
  tema: '', 
  habitos: '', 
  valores: '', 
  descripcion: '', 
  notas: '' 
}

interface PlanDetailScreenProps extends AppStackScreenProps<"PlanDetail"> {}

export const PlanDetailScreen: FC<PlanDetailScreenProps> = observer(function PlanDetailScreen({ route, navigation }) {
  const dateParam = route.params["date"]
  const dateObjectParam = route.params["dayObj"]
  const grupoObj = route.params["grupo"]
  const planObjects = route.params["planObjects"]

  const { onActionCompleted } = route.params;

  const isNewPlan = planObjects == null ? true : false
  var planObjectsCount = 0

  const [activities, setActivities] = useState(planObjects || [EmptyActividad]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadTxt, setLoadTxt] = useState("")

  const fechaObject = moment(dateObjectParam, "DD-MM-YYYY").toDate()

  useEffect(() => {
    setupComponents()
  }, [activities])

  function setupComponents() {
    // Count
    if (!isNewPlan) {
      planObjectsCount = planObjects.length
    }
    // Header
    navigation.setOptions({
      title: "Plan del Día",
      headerBackTitleVisible: false,
      headerRight: () => (
        <Entypo name="plus" size={28} style={{marginTop: 2}} color="#fff" onPress={headerRightBttnPressed} />
      ),
    })
  }

  function headerRightBttnPressed() {
    Alert.alert('Plan del día', "Selecciona una acción", [
      {text: 'Agregar actividad', onPress: () => agregarActividad()},
      {text: 'Guardar plan', onPress: () => guardarPlan()},
      {text: 'Cancelar', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
    ]);
  }

  function agregarActividad() {
    setActivities(activities => {
      // Create a new activity object with a unique id and a new activity number
      const newActivityNumber = `Actividad ${activities.length + 1}`;
      const newActivity = {
        id: Math.random().toString(), // Ideally use a more reliable unique identifier
        key: newActivityNumber,
        titulo: '',
        tema: '',
        habitos: '',
        valores: '',
        descripcion: '',
        notas: ''
      };
      // Return a new array with all previous activities plus the new one
      return [...activities, newActivity];
    });
  }

  const updateField = (id, field, value) => {
    // Create a new array with all current people
    const updatedActivities = activities.map((p, i) => {
      // If the index matches, create a new object with the updated field
      if (i === id) {
          return { ...p, [field]: value };
      }
      // Otherwise, return the existing person object
      return p;
    });
    setActivities(updatedActivities);
  };

  function guardarPlan() {
    var proceedToSave = true
    // Iterate
    activities.forEach((activity) => {
      if (activity.titulo.length == 0 || activity.descripcion.length == 0) {
        proceedToSave = false
      }
    })

    if (proceedToSave) {
      guardarPreprocess()
    } else {
      presentFeedback("Campos vacíos", "Título y Descripción son obligatorios. Ingresa texto en esos campos para poder guardar.")
    }
  }

  function guardarPreprocess() {
    if (isNewPlan) {
      guardarPlaneacion(activities)
    } else {
      // Plan with Existing activities
      if (planObjectsCount != activities.length) { // works with delete?
        let tempArr = activities
        const newSplicedArr = tempArr.splice(0, planObjectsCount)
        const allActivitiesArr = newSplicedArr.concat(activities)
        setActivities(allActivitiesArr)
        // SAVE NEW Activities
        guardarPlaneacion(tempArr)
      } else {
        // Provide feedback to user
        presentFeedback("No hubo cambios", "Agrega una nueva actividad para guardar.")
        return
      }
    }
  }

  async function guardarPlaneacion(activitiesArr) {
    // console.log("SAVING PLAN...")
    setLoadTxt("Guardando plan del día...")
    setIsLoading(true)
    const actLen = activitiesArr.length
    var savedCount = 0
    for (var i = 0; i < actLen; i++) {
      const activity = activitiesArr[i]
      const planeacionData = {
        fecha: fechaObject,
        titulo: activity.titulo,
        tema: activity.tema,
        habitos: activity.habitos,
        valores: activity.valores,
        descripcion: activity.descripcion,
        notas: activity.notas,
      }
      // Server call
      let res = await ParseAPI.savePlaneacion(grupoObj.id, planeacionData)
      console.log("**res: " + res)
      savedCount += 1
      if (savedCount == actLen) {
        // Run CLOUD code
        runCloudCodeFunction(res)
        // Reload table
        onActionCompleted()
        // User Feedback
        setIsLoading(false)
        presentFeedback("Plan Guardado", "Todas las actividades han sido guardadas exitosamente.")
      }
    }
  }

  function presentFeedback(alertTitle, alertMessage) {
    Alert.alert(
      alertTitle,
      alertMessage,
      [
        {text: 'Ok', onPress: null, style: 'default'},
      ],
      {cancelable: false},
    );
  }

  function handleDeleteFromCard(index: number, objectId: string) {
    setLoadTxt("Eliminando actividad...")
    setIsLoading(true)
    // Update state
    activities.splice(index, 1)
    setActivities(activities)
    // Server call
    deleteActividadFromServer(objectId)
  }

  async function deleteActividadFromServer(objectId: string) {
    let res = await ParseAPI.eliminarPlaneacion(objectId)
    console.log("destroy res: " + res)
    // Reload table
    onActionCompleted()
    // Feedback user
    setIsLoading(false)
    presentFeedback("Actividad Eliminada", "La actividad ha sido eliminada exitosamente.")
  }

  function runCloudCodeFunction(planeacionObjectId: string) {
    let cloudFuncName = "planeacionParentNotification"
    let dateStr = moment(dateObjectParam, "DD-MM-YYYY").format("dddd D [de] MMMM, YYYY")
    const params = { 
      grupoId: grupoObj.id, 
      grupoName: grupoObj.name, 
      activityDate: dateStr, 
      objectId: planeacionObjectId 
    }
    ParseAPI.runCloudCodeFunction(cloudFuncName, params)
  }


  return (
    <Screen style={$root} preset="scroll">
      <Text size="xl" weight="bold" style={{alignSelf: 'center'}}>{dateParam + " - " + grupoObj.name}</Text>
      {isLoading ?
      <View>
        <Text text={loadTxt} size="xl" style={{marginTop: 20, marginBottom: 16, alignSelf: 'center',}} />
        <ActivityIndicator size="large" color={colors.palette.actionBlue} />
      </View>
      :
      <>
      {activities.map((activity, index) => (
          <PlaneacionCard key={activity.id} actNumber={activity.key}
            isNew={isNewPlan} 
            titulo={activity.titulo}
            tema={activity.tema}
            habitos={activity.habitos}
            valores={activity.valores}
            descripcion={activity.descripcion}
            notas={activity.notas}
            onTituloChange={(value) => updateField(index, 'titulo', value)}
            onTemaChange={(value) => updateField(index, 'tema', value)}
            onHabitosChange={(value) => updateField(index, 'habitos', value)}
            onValoresChange={(value) => updateField(index, 'valores', value)}
            onDescripcionChange={(value) => updateField(index, 'descripcion', value)}
            onNotasChange={(value) => updateField(index, 'notas', value)}
            onDeleteActividad={() => handleDeleteFromCard(index, activity.id)}
          />
       ))}
      </>
      }
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.sunflowerClear,
  paddingTop: spacing.extraSmall,
  paddingHorizontal: spacing.stdPadding,
}

const $card: ViewStyle = {
  height: 250, 
  marginTop: 8, 
  backgroundColor: colors.palette.sunflowerLight, 
  borderRadius: 12,
  marginBottom: 8,
}
