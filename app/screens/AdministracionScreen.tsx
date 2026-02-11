import React, { FC, useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import * as ParseAPI from "../services/parse/ParseAPI"
import { ViewStyle, TextStyle, View, Alert } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, Button, Icon } from "app/components"
import * as ParseInit from "../services/parse/ParseInit"
import { StackScreenProps } from "@react-navigation/stack"
import { useNavigation } from "@react-navigation/native"
import { colors, spacing } from "../theme"
import { useStores } from "../models"
import * as Haptics from 'expo-haptics';

interface AdministracionScreenProps extends StackScreenProps<AppStackScreenProps<"Administracion">> {}

export const AdministracionScreen: FC<AdministracionScreenProps> = observer(function AdministracionScreen() {
  const [escuelaName, setEscuelaName] = useState("")
  const {
    authenticationStore: {
      authUsername,
      authEscuelaName,
      authUsertype,
      logout
    },
  } = useStores()

  // Pull in navigation via hook
  const navigation = useNavigation()

  useEffect(() => {
    getSchoolName()
  }, [])

  function getUsername() {
    return authUsername
  }

  function getSchoolName() {
    if (authEscuelaName.length > 0) {
      setEscuelaName(authEscuelaName)
    } else {
      fetchEscuelaName()
    }
  }

  async function fetchEscuelaName() {
    let userObj = await ParseAPI.getCurrentUserObj()
    let escuelaObj = userObj.get('escuela')
    setEscuelaName(escuelaObj.get('nombre'))
  }

  function navToAccesos() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Accesos")
  }

  function navToEstudiantes() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Estudiantes")
  }

  function navToPagos() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Pagos")
  }

  function navToUsuarios() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Usuarios")
  }

  function navToGrupos() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("GruposAdmin")
  }

  function navToInformacion() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Informacion")
  }

  function navToPaquetes() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Paquetes")
  }

  function navToMarketing() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Marketing")
  }

  function navToFacturacion() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Facturas")
  }

  async function logoutBttnPressed() {
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    ParseInit.default.User.logOut().then(() => {
      logout()
      console.log("User Logged out. Parse");
    });
  }

  function menuButtonTapped() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    Alert.alert('Opciones Adicionales', 'Selecciona la acción que deseas ejecutar.', [
      {
        text: 'Cancelar',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {text: 'Cerrar sesión', onPress: () => logoutBttnPressed(), style: 'destructive', },
      // {text: 'PDF', onPress: () => mediaSelected("pdf") },
      // {text: 'Video', onPress: () => mediaSelected("vid") },
    ]);
  }


  return (
    <Screen style={$root} preset="scroll" safeAreaEdges={["top"]}>
            <View style={{flexDirection: "row", justifyContent: "space-between", marginBottom: 8, marginRight: 14}}>
              <Text preset="heading" style={$topText}>{escuelaName}</Text>
              <Icon icon="more" color="#007AFF" onPress={menuButtonTapped} />
            </View>

      <Text preset="default" style={$topText}>{getUsername()}</Text>

      <Button
          testID="accesos-button"
          tx="homeScreen.accesosBttn"
          style={$accesosButton}
          textStyle={{ color: colors.palette.neutral100 }}
          preset="default"
          onPress={navToAccesos}
        />
      <Button
          testID="estudiantes-button"
          tx="homeScreen.estudiantesBttn"
          style={$estudiantesButton}
          textStyle={{ color: colors.palette.neutral100 }}
          preset="default"
          onPress={navToEstudiantes}
        />
        <Button
          testID="info-button"
          tx="homeScreen.infoBttn"
          style={$infoButton}
          textStyle={{ color: colors.palette.neutral100 }}
          preset="default"
          onPress={navToInformacion}
        />
        {authUsertype !== 1 && (
        <>
        <Button
          testID="pagos-button"
          tx="homeScreen.pagosBttn"
          style={$pagosButton}
          textStyle={{ color: colors.palette.neutral100 }}
          preset="default"
          onPress={navToPagos}
        />
        <Button
          testID="grupos-button"
          tx="homeScreen.gruposBttn"
          style={$gruposButton}
          textStyle={{ color: colors.palette.neutral100 }}
          preset="default"
          onPress={navToGrupos}
        />
        <Button
          testID="paquetes-button"
          tx="homeScreen.paquetesBttn"
          style={$paquetesButton}
          textStyle={{ color: colors.palette.neutral100 }}
          preset="default"
          onPress={navToPaquetes}
        />
        <Button
          testID="usuarios-button"
          tx="homeScreen.usuariosBttn"
          style={$usuariosButton}
          textStyle={{ color: colors.palette.neutral100 }}
          preset="default"
          onPress={navToUsuarios}
        />
        <Button
          testID="facturacion-button"
          tx="homeScreen.facturacionBttn"
          style={$facturacionButton}
          textStyle={{ color: colors.palette.neutral100 }}
          preset="default"
          onPress={navToFacturacion}
        />
        {/* <Button
          testID="marketing-button"
          text="Marketing"
          style={$marketingButton}
          textStyle={{ color: colors.palette.marketingPurple, fontWeight: 'bold' }}
          preset="default"
          onPress={navToMarketing}
        /> */}
        </>
      )}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 16,
  backgroundColor: colors.background,
  paddingLeft: spacing.stdPadding,
}

const $topText: TextStyle = {
  color: colors.palette.neutral700
}

const $accesosButton: ViewStyle = {
  marginTop: spacing.extraLarge,
  marginBottom: spacing.extraSmall,
  backgroundColor: colors.palette.grassLight,
  borderRadius: 80,
  borderColor: colors.palette.grassDark,
  borderBottomWidth: 4
}

const $estudiantesButton: ViewStyle = {
  marginTop: spacing.small,
  marginBottom: spacing.extraSmall,
  backgroundColor: colors.palette.bluejeansLight,
  borderRadius: 80,
  borderColor: colors.palette.bluejeansDark,
  borderBottomWidth: 4
}

const $pagosButton: ViewStyle = {
  marginTop: spacing.small,
  marginBottom: spacing.extraSmall,
  backgroundColor: colors.palette.bittersweetLight,
  borderRadius: 80,
  borderColor: colors.palette.bittersweetDark,
  borderBottomWidth: 4
}

const $infoButton: ViewStyle = {
  marginTop: spacing.small,
  marginBottom: spacing.extraSmall,
  backgroundColor: colors.palette.sunflowerLight,
  borderRadius: 80,
  borderColor: colors.palette.sunflowerDark,
  borderBottomWidth: 4
}

const $usuariosButton: ViewStyle = {
  marginTop: spacing.small,
  marginBottom: spacing.extraSmall,
  backgroundColor: colors.palette.pinkroseLight,
  borderRadius: 80,
  borderColor: colors.palette.pinkroseDark,
  borderBottomWidth: 4
}

const $gruposButton: ViewStyle = {
  marginTop: spacing.small,
  marginBottom: spacing.extraSmall,
  backgroundColor: colors.palette.grapefruitLight,
  borderRadius: 80,
  borderColor: colors.palette.grapefruitDark,
  borderBottomWidth: 4
}

const $paquetesButton: ViewStyle = {
  marginTop: spacing.small,
  marginBottom: spacing.extraSmall,
  backgroundColor: colors.palette.mintLight,
  borderRadius: 80,
  borderColor: colors.palette.mintDark,
  borderBottomWidth: 4
}

const $facturacionButton: ViewStyle = {
  marginTop: spacing.small,
  marginBottom: spacing.extraSmall,
  backgroundColor: colors.palette.lavanderLight,
  borderRadius: 80,
  borderColor: colors.palette.lavanderDark,
  borderBottomWidth: 4
}

const $marketingButton: ViewStyle = {
  marginTop: spacing.small,
  marginBottom: spacing.extraSmall,
  backgroundColor: colors.palette.neutral100, // White fill
  borderRadius: 80,
  borderColor: colors.palette.marketingPurple, // Purple border
  borderWidth: 2,
  borderBottomWidth: 4,
  shadowColor: colors.palette.marketingPurple, // Purple shadow
  shadowOffset: {
    width: 0,
    height: 0,
  },
  shadowOpacity: 0.8,
  shadowRadius: 10,
  elevation: 15, // For Android glow effect
}