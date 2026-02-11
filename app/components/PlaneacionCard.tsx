import React from "react"
import { ViewStyle, View, TextInput, TouchableOpacity, Alert } from "react-native"
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from "app/components"
import { colors, spacing } from "../theme"


const PlaneacionCard = ({ actNumber, isNew, titulo, tema, habitos, valores, descripcion, notas, onTituloChange, onTemaChange, onHabitosChange, onValoresChange, onDescripcionChange, onNotasChange, onDeleteActividad }) => {

  function optionsBtnPressed() {
    Alert.alert('Acciones Disponibles', "Selecciona una acción para la actividad", [
      {text: 'Cambiar de día', onPress: () => cambiarDia()},
      {text: 'Eliminar actividad', onPress: () => eliminarActividad(), style: 'destructive'},
      {text: 'Cancelar', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
    ]);
  }

  function cambiarDia() {

  }

  function eliminarActividad() {
    onDeleteActividad()
  }


  return (
    <View style={$card}>
        <View style={{ flexDirection: "row", justifyContent: 'space-between' }}>
          <View></View>
          <Text size="xl" weight="bold" style={{alignSelf: 'center'}}>{actNumber}</Text>
          {isNew ?
          <View></View>
          :
          <TouchableOpacity onPress={() => {optionsBtnPressed()}}>
            <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={24} color={colors.palette.neutral100} />
          </TouchableOpacity>
          }
        </View>

        <Text text="Título:*" style={$inputLabel} />
        <TextInput 
          style={$inputField} 
          placeholder="Título..."
          value={titulo}
          onChangeText={onTituloChange}
        />

        <Text text="Tema:" style={$inputLabel}/>
        <TextInput 
          style={$inputField} 
          placeholder="Tema..."
          value={tema}
          onChangeText={onTemaChange}
        />

        <Text text="Hábitos:" style={$inputLabel}/>
        <TextInput 
          style={$inputField} 
          placeholder="Hábitos..."
          value={habitos}
          onChangeText={onHabitosChange}
        />

        <Text text="Valores:" style={$inputLabel}/>
        <TextInput 
          style={$inputField} 
          placeholder="Valores..."
          value={valores}
          onChangeText={onValoresChange}
        />

        <Text text="Descripción de actividades:*" style={$inputLabel}/>
        <TextInput 
          style={$inputFieldMultiline}
          multiline={true}
          numberOfLines={4} 
          placeholder="Descripción..."
          value={descripcion}
          onChangeText={onDescripcionChange}
        />

        <Text text="Notas:" style={$inputLabel}/>
        <TextInput 
          style={$inputFieldMultiline} 
          multiline={true} 
          numberOfLines={3}
          placeholder="Notas..."
          value={notas}
          onChangeText={onNotasChange}
        />
    </View>
  )
}

export default PlaneacionCard

const $card: ViewStyle = {
    height: 560, 
    marginTop: 8, 
    backgroundColor: colors.palette.sunflowerLight, 
    borderRadius: 12,
    marginBottom: 8,
    padding: spacing.small
  }

  const $inputLabel: ViewStyle = {
    marginTop: 6
  }

  const $inputField: ViewStyle = {
    height: 36,
    borderColor: colors.palette.neutral300,
    borderWidth: 1,
    paddingLeft: 8,
    margin: 4,
    borderRadius: 10,
    backgroundColor: colors.palette.neutral100
  };

  const $inputFieldMultiline: ViewStyle = {
    height: 66,
    borderColor: colors.palette.neutral300,
    borderWidth: 1,
    paddingLeft: 8,
    margin: 4,
    borderRadius: 10,
    backgroundColor: colors.palette.neutral100
  };