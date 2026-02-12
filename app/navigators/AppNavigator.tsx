/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import { useColorScheme } from "react-native"
import * as Screens from "app/screens"
import Config from "../config"
import { useStores } from "../models"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { HomeNavigator } from "./HomeNavigator"

import { fetchUserEscuela } from "app/services/parse/ParseAPI"
import { registerForPushNotificationsAsync } from "app/services/NotificationService"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * If no params are allowed, pass through `undefined`. Generally speaking, we
 * recommend using your MobX-State-Tree store(s) to keep application state
 * rather than passing state through navigation params.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 *   https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type AppStackParamList = {
  Login: undefined
  // 🔥 Your screens go here
  Accesos: undefined
	Grupos: undefined
	ActividadGrupo: undefined
	MensajeDetail: undefined
	AlumnoMensajes: undefined
	Comunicacion: undefined
	SeenBy: undefined
	Eventos: undefined
	EventoDetail: undefined
	EventoView: { 
    eventoObj: any, 
    reloadTable?: () => void 
  }
	AccesosScanner: undefined
	AttachmentDetail: { 
    objectId: string, 
    tipo: string, 
    isNewBucket: boolean 
  }
	CrearActividad: undefined
	Presencia: undefined
	Estudiantes: undefined
	Expediente: undefined
	Pagos: undefined
	Usuarios: undefined
	UsuarioDetail: undefined
	Administracion: undefined
	Credenciales: undefined
	EditExpediente: undefined
	PlanDetail: undefined
	PagoDetail: undefined
	EstadoCuenta: undefined
	GruposAdmin: undefined
	Informacion: undefined
	CrearGrupo: undefined
	CrearInformacion: undefined
	Paquetes: undefined
	PaqueteDetail: undefined
	EventoRsvp: { 
    objectId: string, 
    rsvpList: any[] 
  }
	MonitorAccesos: undefined
	CrearPago: undefined
	ReporteAccesos: undefined
	Marketing: undefined
	CrearFactura: undefined
	Facturas: undefined
	ThreadDetail: {
    threadId: string
    threadSubject?: string
    estudianteId?: string | null
    grupoData?: any
    reloadTable?: (msgType: number) => void
  }
	// IGNITE_GENERATOR_ANCHOR_APP_STACK_PARAM_LIST
}

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = observer(function AppStack() {
  const {
    authenticationStore: { isAuthenticated, authUserEscuela, authUserId, authUsertype },
  } = useStores()

  const [isAccountActive, setIsAccountActive] = useState(true)

  useEffect(() => {
    async function checkAccount() {
      if (isAuthenticated && authUserEscuela) {
        const isPaid = await validateActiveAccount()
        setIsAccountActive(isPaid)
      }
    }
    checkAccount()
  }, [isAuthenticated, authUserEscuela])

  useEffect(() => {
    if (isAuthenticated && authUserId && authUserEscuela) {
      console.log("APP_registerForPushNotificationsAsync: " + authUserId)
      registerForPushNotificationsAsync(authUserId, authUserEscuela, authUsertype)
    }
  }, [isAuthenticated, authUserId, authUserEscuela, authUsertype])

  async function validateActiveAccount() {
	let res = await fetchUserEscuela(authUserEscuela)
	let isPaid = res.get("paid")
	return isPaid
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
    >
      {isAuthenticated && isAccountActive ? (
        <>
          <Stack.Screen name="Home" component={HomeNavigator} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={Screens.LoginScreen} />
        </>
      )}

      {/** 🔥 Your screens go here */}
      <Stack.Screen name="Accesos" component={Screens.AccesosScreen} />
			<Stack.Screen name="Grupos" component={Screens.GruposScreen} />
			<Stack.Screen name="ActividadGrupo" component={Screens.ActividadGrupoScreen} />
			<Stack.Screen name="MensajeDetail" component={Screens.MensajeDetailScreen} />
			<Stack.Screen name="AlumnoMensajes" component={Screens.AlumnoMensajesScreen} />
			<Stack.Screen name="Comunicacion" component={Screens.ComunicacionScreen} />
			<Stack.Screen name="SeenBy" component={Screens.SeenByScreen} />
			<Stack.Screen name="Eventos" component={Screens.EventosScreen} />
			<Stack.Screen name="EventoDetail" component={Screens.EventoDetailScreen} />
			<Stack.Screen name="EventoView" component={Screens.EventoViewScreen} />
			<Stack.Screen name="AccesosScanner" component={Screens.AccesosScannerScreen} />
			<Stack.Screen name="AttachmentDetail" component={Screens.AttachmentDetailScreen} />
			<Stack.Screen name="CrearActividad" component={Screens.CrearActividadScreen} />
			<Stack.Screen name="Presencia" component={Screens.PresenciaScreen} />
			<Stack.Screen name="Estudiantes" component={Screens.EstudiantesScreen} />
			<Stack.Screen name="Expediente" component={Screens.ExpedienteScreen} />
			<Stack.Screen name="Pagos" component={Screens.PagosScreen} />
			<Stack.Screen name="Usuarios" component={Screens.UsuariosScreen} />
			<Stack.Screen name="UsuarioDetail" component={Screens.UsuarioDetailScreen} />
			<Stack.Screen name="Administracion" component={Screens.AdministracionScreen} />
			<Stack.Screen name="Credenciales" component={Screens.CredencialesScreen} />
			<Stack.Screen name="EditExpediente" component={Screens.EditExpedienteScreen} />
			<Stack.Screen name="PlanDetail" component={Screens.PlanDetailScreen} />
			<Stack.Screen name="EstadoCuenta" component={Screens.EstadoCuentaScreen} />
			<Stack.Screen name="GruposAdmin" component={Screens.GruposAdminScreen} />
			<Stack.Screen name="Informacion" component={Screens.InformacionScreen} />
			<Stack.Screen name="CrearGrupo" component={Screens.CrearGrupoScreen} />
			<Stack.Screen name="CrearInformacion" component={Screens.CrearInformacionScreen} />
			<Stack.Screen name="Paquetes" component={Screens.PaquetesScreen} />
			<Stack.Screen name="PaqueteDetail" component={Screens.PaqueteDetailScreen} />
			<Stack.Screen name="EventoRsvp" component={Screens.EventoRsvpScreen} />
			<Stack.Screen name="MonitorAccesos" component={Screens.MonitorAccesosScreen} />
			<Stack.Screen name="CrearPago" component={Screens.CrearPagoScreen} />
			<Stack.Screen name="ReporteAccesos" component={Screens.ReporteAccesosScreen} />
			<Stack.Screen name="Marketing" component={Screens.MarketingScreen} />
			<Stack.Screen name="CrearFactura" component={Screens.CrearFacturaScreen} />
			<Stack.Screen name="Facturas" component={Screens.FacturasScreen} />
			<Stack.Screen name="ThreadDetail" component={Screens.ThreadDetailScreen} />
			{/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}
    </Stack.Navigator>
  )
})

export interface NavigationProps
  extends Partial<React.ComponentProps<typeof NavigationContainer>> {}

export const AppNavigator = observer(function AppNavigator(props: NavigationProps) {
  const colorScheme = useColorScheme()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={colorScheme === "dark" ? DarkTheme : DefaultTheme}
      {...props}
    >
      <AppStack />
    </NavigationContainer>
  )
})
