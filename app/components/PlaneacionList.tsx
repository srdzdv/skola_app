import { colors } from 'app/theme';
import moment from 'moment';
import * as ParseAPI from "../services/parse/ParseAPI"
import React, { useEffect, useState, useCallback, memo } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

interface GrupoObj {
  id: string
  name: string
}

interface PlaneacionListProps {
  navObject: any
  grupoObj: GrupoObj
}

interface PlanItem {
  date: string
  dayObj: string
  planCount: number
  planObjects: any[] | undefined
  dayOfWeek: number
}

// Days of week array - hoisted to module level
const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const

// Memoized list item component
const PlaneacionListItem = memo(function PlaneacionListItem({
  date,
  dayObj,
  planCount,
  dayOfWeek,
  onPress,
}: {
  date: string
  dayObj: string
  planCount: number
  dayOfWeek: number
  onPress: (date: string) => void
}) {
  const handlePress = useCallback(() => {
    onPress(date)
  }, [date, onPress])

  const planCountText = planCount === 0 ? "Sin Plan" : "Actividades: " + planCount

  return (
    <>
      <TouchableOpacity style={styles.row} onPress={handlePress}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.dayOfWeek}>{DAYS_OF_WEEK[dayOfWeek]}</Text>
        <Text style={styles.actividadCount}>{planCountText}</Text>
      </TouchableOpacity>
      {dayOfWeek === 5 && <View style={styles.weekendSeparator} />}
    </>
  )
})

const PlaneacionList = ({ navObject, grupoObj }: PlaneacionListProps) => {
  const [listData, setListData] = useState<PlanItem[]>([])

  useEffect(() => {
    fetchPlaneacionFromServer()
  }, [grupoObj.id])

  async function fetchPlaneacionFromServer() {
    const results = await ParseAPI.fetchPlaneacion(grupoObj.id)
    // Process data
    const dayPlanCount: { [fecha: string]: number } = {}
    const dayPlanObjects: { [fecha: string]: any[] } = {}

    for (let i = 0; i < results.length; i++) {
      const object = results[i]
      const fecha = object.get('fecha')
      const fechaId = moment(fecha).format("DD-MM-YYYY")

      // Check if the date key exists, if not initialize with 0
      if (!dayPlanCount[fechaId]) {
        dayPlanCount[fechaId] = 1
      } else {
        // Increment the counter for the date
        dayPlanCount[fechaId]++
      }

      const actividadCount = dayPlanObjects[fechaId] == null ? "1" : `${dayPlanObjects[fechaId].length + 1}`
      const actividadObj = {
        id: object.id,
        key: 'Actividad ' + actividadCount,
        titulo: object.get('titulo'),
        tema: object.get('tema'),
        habitos: object.get('habitos'),
        valores: object.get('valores'),
        descripcion: object.get('descripcion'),
        notas: object.get('notas')
      }

      if (!dayPlanObjects[fechaId]) {
        dayPlanObjects[fechaId] = [actividadObj]
      } else {
        dayPlanObjects[fechaId].push(actividadObj)
      }
    }

    getNext20WorkDays(dayPlanCount, dayPlanObjects)
  }

  function getNext20WorkDays(
    dayPlanCount: { [fecha: string]: number },
    dayPlanObjects: { [fecha: string]: any[] }
  ) {
    const workDays: PlanItem[] = []
    const day = new Date() // Start from today

    while (workDays.length < 20) {
      const dayOfWeek = day.getDay() // Sunday - 0, Monday - 1, ..., Saturday - 6
      const fechaId = moment(day).format("DD-MM-YYYY")
      let planCount = 0

      if (dayPlanCount[fechaId] != null) {
        planCount = dayPlanCount[fechaId]
      }

      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        workDays.push({
          date: moment(day).format("DD MMMM"),
          dayObj: fechaId,
          planCount: planCount,
          planObjects: dayPlanObjects[fechaId],
          dayOfWeek
        })
      }

      day.setDate(day.getDate() + 1) // Move to the next day
    }

    setListData(workDays)
  }

  const onActionCompleted = useCallback(() => {
    // A Save or Delete action occurred in the detail view
    // Load data again
    fetchPlaneacionFromServer()
  }, [grupoObj.id])

  // Create item lookup for navigation
  const itemLookupRef = React.useRef<Map<string, PlanItem>>(new Map())

  React.useEffect(() => {
    const map = new Map<string, PlanItem>()
    listData.forEach(item => {
      map.set(item.date, item)
    })
    itemLookupRef.current = map
  }, [listData])

  const handleItemPress = useCallback((date: string) => {
    const item = itemLookupRef.current.get(date)
    if (item) {
      navObject.navigate('PlanDayDetail', {
        date: item.date,
        dayObj: item.dayObj,
        grupo: grupoObj,
        planObjects: item.planObjects,
        onActionCompleted: onActionCompleted
      })
    }
  }, [navObject, grupoObj, onActionCompleted])

  const renderItem = useCallback(({ item }: { item: PlanItem }) => (
    <PlaneacionListItem
      date={item.date}
      dayObj={item.dayObj}
      planCount={item.planCount}
      dayOfWeek={item.dayOfWeek}
      onPress={handleItemPress}
    />
  ), [handleItemPress])

  const keyExtractor = useCallback((item: PlanItem) => item.date, [])

  if (listData.length === 0) {
    return null
  }

  return (
    <FlatList
      data={listData}
      style={styles.list}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
    />
  )
}

export default PlaneacionList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 2,
    backgroundColor: '#fff'
  },
  list: {
    borderRadius: 8,
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: colors.palette.sunflowerClear
  },
  date: {
    fontWeight: 'bold',
    width: 90
  },
  dayOfWeek: {
    width: 90
  },
  actividadCount: {
    width: 100
  },
  weekendSeparator: {
    height: 5,
    backgroundColor: colors.palette.sunflowerLight
  },
});
