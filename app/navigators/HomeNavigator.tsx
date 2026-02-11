import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CompositeScreenProps } from "@react-navigation/native"
import React from "react"
import { TextStyle, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Icon } from "../components"
import { 
  AccesosScreen, 
  GruposScreen, 
  ActividadGrupoScreen,
  PlanDetailScreen,
  MensajeDetailScreen,
  AlumnoMensajesScreen,
  ComunicacionScreen,
  SeenByScreen,
  EventosScreen,
  EventoDetailScreen,
  EventoViewScreen,
  EventoRsvpScreen,
  AccesosScannerScreen,
  MonitorAccesosScreen,
  ReporteAccesosScreen,
  AttachmentDetailScreen,
  CrearActividadScreen,
  PresenciaScreen,
  EstudiantesScreen,
  EditExpedienteScreen,
  ExpedienteScreen,
  CredencialesScreen,
  PagosScreen,
  MarketingScreen,
  CrearPagoScreen,
  EstadoCuentaScreen,
  GruposAdminScreen,
  CrearGrupoScreen,
  InformacionScreen,
  PaquetesScreen,
  PaqueteDetailScreen,
  CrearInformacionScreen,
  UsuariosScreen,
  UsuarioDetailScreen,
  AdministracionScreen } from "../screens"
import { colors, spacing, typography } from "../theme"
import { AppStackParamList, AppStackScreenProps } from "./AppNavigator"

export type HomeTabParamList = {
    Grupos: undefined
    Comunicacion: undefined
    Eventos: undefined
    Admin: undefined
    AlumnoMensajes: undefined
    CrearActividad: undefined
}

export type DemoTabScreenProps<T extends keyof HomeTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<HomeTabParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>

const Tab = createBottomTabNavigator<HomeTabParamList>()
const GruposStack = createNativeStackNavigator();
const ComunicacionStack = createNativeStackNavigator();
const EventosStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();

function GruposStackScreen() {
  return (
    <GruposStack.Navigator>
      <GruposStack.Group>
        <GruposStack.Screen
          name="grupos"
          component={GruposScreen}
          options={{ headerShown: false }}
        />
        <GruposStack.Screen
          name="Actividad"
          component={ActividadGrupoScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16
            },
          }}
        />
        <GruposStack.Screen
          name="PlanDayDetail"
          component={PlanDetailScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16
            },
          }}
        />
        <GruposStack.Screen
          name="mensajeDetail"
          component={MensajeDetailScreen}
          options={{
            headerTitle: "Mensaje",
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <GruposStack.Screen
          name="AlumnoMensajes"
          component={AlumnoMensajesScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
      </GruposStack.Group>
      <GruposStack.Group screenOptions={{ presentation: 'modal' }}>
        <GruposStack.Screen
          name="attachmentDetail"
          component={AttachmentDetailScreen}
        />
      <GruposStack.Screen
          name="CrearActividad"
          component={CrearActividadScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderLight,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
      </GruposStack.Group>

    </GruposStack.Navigator>
  );
}



function ComunicacionStackScreen() {
  return (
    <ComunicacionStack.Navigator>
      <ComunicacionStack.Group>
        <ComunicacionStack.Screen
          name="comunicacion"
          component={ComunicacionScreen}
          options={{ headerShown: false }}
        />
        <GruposStack.Screen
          name="mensajeDetail"
          component={MensajeDetailScreen}
          options={{
            headerTitle: "Mensaje",
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
      </ComunicacionStack.Group>
      <GruposStack.Group screenOptions={{ presentation: 'modal' }}>
        <GruposStack.Screen
          name="attachmentDetail"
          component={AttachmentDetailScreen}
        />
        <GruposStack.Screen
          name="seenBy"
          component={SeenByScreen}
          options={{
            headerTitle: "Mensaje Visto Por:",
          }}
        />
        <GruposStack.Screen
          name="CrearActividad"
          component={CrearActividadScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderLight,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
      </GruposStack.Group>
    </ComunicacionStack.Navigator>
  );
}

function EventosStackScreen() {
  return (
    <EventosStack.Navigator>
      <EventosStack.Group>
        <EventosStack.Screen
          name="eventos"
          component={EventosScreen}
          options={{ headerShown: false }}
        />
        <EventosStack.Screen
          name="eventoView"
          component={EventoViewScreen}
          options={{
            headerTitle: "Detalles del Evento",
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <EventosStack.Screen
          name="eventoRsvp"
          component={EventoRsvpScreen}
          options={{
            headerTitle: "Asistencia al Evento",
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
      </EventosStack.Group>

      <EventosStack.Group screenOptions={{ presentation: 'modal' }}>
        <EventosStack.Screen
          name="Evento"
          component={EventoDetailScreen}
          options={{
            headerTitle: "Crear Evento",
            headerStyle: {
              backgroundColor: colors.palette.lavanderLight,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <GruposStack.Screen
          name="attachmentDetail"
          component={AttachmentDetailScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.grassClear,
            },
          }}
        />
      </EventosStack.Group>
    </EventosStack.Navigator>
  );
}

function AdministracionStackScreen() {
  return (
    <AdminStack.Navigator>
      <AdminStack.Group>
        <AdminStack.Screen
          name="administracion"
          component={AdministracionScreen}
          options={{ 
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
            headerShown: false 
          }}
        />
         <AdminStack.Screen
          name="Accesos"
          component={AccesosScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <AdminStack.Screen
          name="Escaner"
          component={AccesosScannerScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        /> 
        <AdminStack.Screen
          name="Monitor de Accesos"
          component={MonitorAccesosScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.grassDark,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <AdminStack.Screen
          name="ReporteAccesos"
          component={ReporteAccesosScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.grassLight,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <AdminStack.Screen
          name="Presencia"
          component={PresenciaScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        /> 

        <AdminStack.Screen
          name="Estudiantes"
          component={EstudiantesScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        
        <AdminStack.Screen
          name="Expediente"
          component={ExpedienteScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />

        <AdminStack.Screen
          name="EditExpediente"
          component={EditExpedienteScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />

        <AdminStack.Screen
          name="Pagos"
          component={PagosScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />

        <AdminStack.Screen
          name="Marketing"
          component={MarketingScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />

        <AdminStack.Screen
          name="EdoCuenta"
          component={EstadoCuentaScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <AdminStack.Screen
          name="CrearPago"
          component={CrearPagoScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.bluejeansDark,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <AdminStack.Screen
          name="Usuarios"
          component={UsuariosScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <AdminStack.Screen
          name="GruposAdmin"
          component={GruposAdminScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <AdminStack.Screen
          name="Informacion"
          component={InformacionScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <AdminStack.Screen
          name="Paquetes"
          component={PaquetesScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <AdminStack.Screen
          name="PaqueteDetail"
          component={PaqueteDetailScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderClear,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <AdminStack.Screen
          name="Usuario"
          component={UsuarioDetailScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderLight,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
      </AdminStack.Group>
      
      <GruposStack.Group screenOptions={{ presentation: 'modal' }}>
        <GruposStack.Screen
          name="CrearGrupo"
          component={CrearGrupoScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderLight,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <GruposStack.Screen
          name="seenBy"
          component={SeenByScreen}
          options={{
            headerTitle: "Documento Visto Por:",
          }}
        />
        <GruposStack.Screen
          name="CrearInformacion"
          component={CrearInformacionScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderLight,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <GruposStack.Screen
          name="Credenciales"
          component={CredencialesScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderLight,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
        <GruposStack.Screen
          name="attachmentDetail"
          component={AttachmentDetailScreen}
        />
        <GruposStack.Screen
          name="CrearActividad"
          component={CrearActividadScreen}
          options={{
            headerStyle: {
              backgroundColor: colors.palette.lavanderLight,
            },
            headerTintColor: colors.palette.actionColor,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              color: colors.palette.neutral100
            },
          }}
        />
      </GruposStack.Group>
    </AdminStack.Navigator>
  );
}



export function HomeNavigator() {
    const { bottom } = useSafeAreaInsets()

    return (
        <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: [$tabBar],
          tabBarActiveTintColor: colors.palette.neutral100,
          tabBarInactiveTintColor: colors.palette.neutral900,
          tabBarLabelStyle: $tabBarLabel,
          tabBarItemStyle: $tabBarItem,
        }}
        >
          <Tab.Screen
            name="Grupos"
            component={GruposStackScreen}
            options={{
            tabBarLabel: "Grupos",
            tabBarIcon: ({ focused }) => <Icon icon="community" color={focused && colors.palette.neutral100} />,
            }}
          />

      <Tab.Screen
        name="Comunicacion"
        component={ComunicacionStackScreen}
        options={{
          tabBarLabel: "Comunicación",
          tabBarIcon: ({ focused }) => <Icon icon="check" color={focused && colors.palette.neutral100} />,
        }}
      />

      <Tab.Screen
        name="Eventos"
        component={EventosStackScreen}
        options={{
          tabBarLabel: "Eventos",
          tabBarIcon: ({ focused }) => <Icon icon="bell" color={focused && colors.palette.neutral100} />,
        }}
      />

      <Tab.Screen
        name="Admin"
        component={AdministracionStackScreen}
        options={{
          tabBarLabel: "Admin",
          tabBarIcon: ({ focused }) => <Icon icon="settings" color={focused && colors.palette.neutral100} />,
        }}
      />

        </Tab.Navigator>
    )

}

const $tabBar: ViewStyle = {
    backgroundColor: colors.palette.lavanderDark,
    borderTopColor: colors.transparent,
    flexDirection: "column"
}
  
const $tabBarItem: ViewStyle = {
    paddingTop: spacing.medium,
}

const $tabBarLabel: TextStyle = {
    fontSize: 16,
    fontFamily: typography.primary.medium,
    lineHeight:14,
    paddingTop: 8
}