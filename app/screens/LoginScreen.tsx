import React, { FC, useState, useRef, useMemo, useCallback } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, ImageStyle, TextStyle, View, TextInput, ActivityIndicator, Alert, Image, TouchableOpacity } from "react-native"
import { Feather } from '@expo/vector-icons'
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, TextField, Button, Icon, TextFieldAccessoryProps } from "app/components"
import { colors, spacing } from "../theme"
import { useStores } from "../models"
import * as Haptics from 'expo-haptics'
import * as ParseInit from "../services/parse/ParseInit"
import * as ParseAPI from "../services/parse/ParseAPI"
import 'react-native-get-random-values'
import SkolaDotsURI from '../../assets/images/Skola4Dots.png'
import { registerForPushNotificationsAsync } from "app/services/NotificationService"

const SkolaDotsImg = Image.resolveAssetSource(SkolaDotsURI).uri

interface LoginScreenProps extends NativeStackScreenProps<AppStackScreenProps<"Login">> {}

export const LoginScreen: FC<LoginScreenProps> = observer(function LoginScreen() {
  const authPasswordInput = useRef<TextInput>(null)
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isMomsTots, setIsMomsTots] = useState(false)

  const {
    authenticationStore: {
      authUsername,
      authPassword,
      setAuthUsername,
      setAuthPassword,
      setAuthToken,
      setAuthUserId,
      setAuthUserEscuela,
      setAuthEscuelaName,
      setAuthUsertype,
      validationErrors,
      logout
    },
  } = useStores()

  const authErrors: typeof validationErrors = isSubmitted ? validationErrors : ({} as any)

  const togglePasswordVisibility = useCallback(() => {
    setIsAuthPasswordHidden(prev => !prev)
  }, [])

  const PasswordRightAccessory = useMemo(
    () =>
      function PasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <Icon
            icon={isAuthPasswordHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={$iconContainer}
            onPress={togglePasswordVisibility}
          />
        )
      },
    [isAuthPasswordHidden, togglePasswordVisibility],
  )

  const presentFeedback = useCallback((alertTitle: string, alertMessage: string) => {
    Alert.alert(
      alertTitle,
      alertMessage,
      [{ text: 'Ok', onPress: () => {}, style: 'default' }],
      { cancelable: false },
    )
  }, [])

  const userIsAuthenticated = useCallback((userId: string, userEscuelaId: string, escuelaName: string, usertype: number) => {
    setAuthPassword("")
    setIsSubmitted(false)
    setAuthUserId(userId)
    setAuthUserEscuela(userEscuelaId)
    setAuthEscuelaName(escuelaName)
    setAuthUsertype(usertype)
    setAuthToken(String(Date.now()))
    registerForPushNotificationsAsync(userId, userEscuelaId, usertype)
  }, [setAuthPassword, setAuthUserId, setAuthUserEscuela, setAuthEscuelaName, setAuthUsertype, setAuthToken])

  const logOutInvalidUser = useCallback(() => {
    setIsSubmitted(false)
    ParseInit.default.User.logOut().then(() => {
      logout()
      console.log("User Logged out. Parse")
    })
  }, [logout])

  const login = useCallback(async () => {
    if (!isMomsTots) {
      ParseInit.initializeParseDetails("SKOLA_SERVER")
    }
    Haptics.notificationAsync()
    setIsSubmitted(true)

    if (Object.values(validationErrors).some((v) => !!v)) {
      setTimeout(() => setIsSubmitted(false), 1500)
      return
    }

    try {
      const user = await ParseInit.default.User.logIn(authUsername, authPassword)
      if (user != null) {
        const status = user.get('status')
        const usertype = user.get('usertype')
        const userEscuela = user.get('escuela')
        let escuelaNombre = null
        let isAccountPaid = null

        // Escuela might be just a pointer - check if data is loaded
        if (userEscuela) {
          escuelaNombre = userEscuela.get('nombre')
          isAccountPaid = userEscuela.get('paid')

          // If escuela is just a pointer (nombre is null), fetch the full object
          if (userEscuela.id && escuelaNombre === null) {
            const escuelaObj = await ParseAPI.fetchUserEscuela(userEscuela.id)
            escuelaNombre = escuelaObj.get('nombre')
            isAccountPaid = escuelaObj.get('paid')
            console.log("**userEscuela.objectId:", userEscuela.id)
          }
        }

        if (isAccountPaid === false) {
          logOutInvalidUser()
          presentFeedback("Cuenta Desactivada", "Por favor contacta al equipo de Skola App.")
          return
        }

        if (status === 0) {
          if (usertype === 2) {
            logOutInvalidUser()
            presentFeedback("Acceso Inválido", "Por favor revisa con tu escuela el estatus de tu acceso a la aplicación")
          } else {
            userIsAuthenticated(user.id, userEscuela.id, escuelaNombre, usertype)
          }
        } else {
          logOutInvalidUser()
          presentFeedback("Acceso Inválido", "Por favor revisa con tu escuela el estatus de tu acceso a la aplicación")
        }
      }
    } catch (error: any) {
      console.log("LOGIN/Error: " + JSON.stringify(error))
      setAuthUsername("")
      setAuthPassword("")
      setIsSubmitted(false)
      presentFeedback("Ocurrió un inconveniente", "" + error.message)
    }
  }, [isMomsTots, validationErrors, authUsername, authPassword, logOutInvalidUser, presentFeedback, userIsAuthenticated, setAuthUsername, setAuthPassword])

  const screenTitlePressed = useCallback(() => {
    Haptics.notificationAsync()
    setIsMomsTots(true)
  }, [])

  const escuelaSelected = useCallback((escuela: string) => {
    ParseInit.initializeParseDetails(escuela)
  }, [])

  const cancelMomsTots = useCallback(() => {
    setIsMomsTots(false)
  }, [])

  const infoButtonPressed = useCallback(() => {
    Alert.alert(
      "Moms & Tots",
      "Para ingresar, primero selecciona tu escuela:",
      [
        { text: 'Moms & Tots Toluca', onPress: () => escuelaSelected("MT_Toluca"), style: 'default' },
        { text: 'Moms & Tots Metepec', onPress: () => escuelaSelected("MT_Metepec"), style: 'default' },
        { text: 'Cancelar', onPress: cancelMomsTots, style: 'cancel' },
      ],
      { cancelable: false },
    )
  }, [escuelaSelected, cancelMomsTots])

  const focusPasswordInput = useCallback(() => {
    authPasswordInput.current?.focus()
  }, [])

  return (
    <Screen style={$root} preset="auto" keyboardShouldPersistTaps="never">
      <View style={$topSpacer} />

      <Image source={{ uri: SkolaDotsImg }} style={$logoImg} resizeMode="contain" />

      <View style={$cardContainer}>
        <TouchableOpacity style={$titleContainer} onPress={screenTitlePressed}>
          <Text style={$titleText} tx="loginScreen.title" preset="heading" />
        </TouchableOpacity>

        <TextField
          value={authUsername}
          onChangeText={setAuthUsername}
          containerStyle={$textField}
          inputWrapperStyle={$usernameInputWrapper}
          autoCapitalize="none"
          autoComplete="name"
          autoCorrect={false}
          keyboardType="default"
          labelTx="loginScreen.username"
          placeholderTx="loginScreen.usernamePlaceholder"
          helper={authErrors?.authUsername}
          status={authErrors?.authUsername ? "error" : undefined}
          onSubmitEditing={focusPasswordInput}
        />

        <TextField
          value={authPassword}
          onChangeText={setAuthPassword}
          containerStyle={$textField}
          inputWrapperStyle={$passwordInputWrapper}
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          secureTextEntry={isAuthPasswordHidden}
          labelTx="loginScreen.password"
          placeholderTx="loginScreen.passwordPlaceholder"
          helper={authErrors?.authPassword}
          status={authErrors?.authPassword ? "error" : undefined}
          onSubmitEditing={login}
          RightAccessory={PasswordRightAccessory}
        />

        {isSubmitted ? (
          <View style={$loadingContainer}>
            <ActivityIndicator size="large" color="#000000" />
          </View>
        ) : (
          <Button
            testID="login-button"
            tx="loginScreen.signInButton"
            style={$tapButton}
            textStyle={$buttonText}
            preset="reversed"
            onPress={login}
          />
        )}

        {isMomsTots && (
          <TouchableOpacity style={$infoButton} onPress={infoButtonPressed}>
            <Feather name="info" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $topSpacer: ViewStyle = {
  height: 64,
  backgroundColor: colors.background,
}

const $logoImg: ImageStyle = {
  height: 40,
  width: 200,
  marginTop: 20,
  alignSelf: 'center',
}

const $cardContainer: ViewStyle = {
  padding: spacing.stdPadding,
  backgroundColor: colors.palette.bluejeansLight,
  marginTop: 32,
  marginHorizontal: 24,
  borderRadius: 18,
}

const $titleContainer: ViewStyle = {
  alignItems: "center",
  paddingTop: 48,
  marginBottom: 20,
}

const $titleText: TextStyle = {
  color: colors.palette.neutral200,
}

const $textField: ViewStyle = {
  padding: 4,
  marginTop: spacing.medium,
  marginBottom: spacing.small,
  borderColor: colors.palette.bluejeansDark,
}

const $usernameInputWrapper: ViewStyle = {
  padding: 4,
}

const $passwordInputWrapper: ViewStyle = {
  paddingHorizontal: 4,
  paddingTop: 4,
  height: 34,
}

const $iconContainer: ViewStyle = {
  paddingRight: 4,
}

const $loadingContainer: ViewStyle = {
  marginTop: spacing.extraLarge,
}

const $tapButton: ViewStyle = {
  backgroundColor: colors.palette.sunflowerLight,
  borderRadius: 80,
  borderColor: colors.palette.sunflowerDark,
  borderBottomWidth: 4,
  marginTop: 50,
  marginBottom: spacing.extraLarge,
}

const $buttonText: TextStyle = {
  fontSize: 20,
  color: colors.palette.neutral700,
}

const $infoButton: ViewStyle = {
  alignSelf: "center",
  height: 30,
  marginTop: 80,
}
