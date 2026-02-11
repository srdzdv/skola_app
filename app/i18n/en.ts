const en = {
  common: {
    ok: "OK!",
    cancel: "Cancel",
    back: "Back",
    logOut: "Log Out",
  },
  errorScreen: {
    title: "Ocurrió algo inesperado",
    friendlySubtitle:
      "Toma una captura de pantalla de este mensaje y envíala al chat de soporte técnico para poder resolver esta situación.",
    reset: "RESET APP",
    traceTitle: "Error from %{name} stack",
  },
  emptyStateComponent: {
    generic: {
      heading: "So empty... so sad",
      content: "No data found yet. Try clicking the button to refresh or reload the app.",
      button: "Let's try this again",
    },
  },

  errors: {
    invalidEmail: "Invalid email address.",
  },
  loginScreen: {
    title: "Skola App",
    username: "Usuario:",
    usernamePlaceholder: "Ingresa tu usuario aquí",
    password: "Contraseña:",
    passwordPlaceholder: "Ingresa tu contraseña aquí",
    signInButton: "Ingresar",
    info: "i"
  },
  accesosScreen: {
    scannerBttn: "Escaner de accesos",
    presenciaBttn: "Presencia",
    monitorBttn: "Monitor",
    reporteBttn: "Report",
    resetScanner: "Regresar a escaner",
    otorgarBttn: "Otorgar permiso",
  },
  homeScreen: {
    logoutBttn: "Cerrar sesión",
    accesosBttn: "Accesos",
    estudiantesBttn: "Estudiantes",
    pagosBttn: "Pagos",
    usuariosBttn: "Usuarios",
    gruposBttn: "Grupos",
    infoBttn: "Información",
    paquetesBttn: "Paquetes/Horarios",
    facturacionBttn: "Facturación",
  },
  marketingScreen: {
    connectFbBttn: "Conectar Facebook",
  },
  eventoScreen: {
    fechaTF: "Fecha del Evento:",
    nombreTF: "Nombre:",
    lugarTF: "Lugar:",
    descripcionTF: "Descripción:",
    publicoTF: "Público",
  },
  paqueteScreen: {
    nombreTF: "Nombre:",
    nombrePlaceholder: "Paquete matutino",
    horaEntradaTF: "Hora de entrada:",
    horaSalidaTF: "Hora de salida:",
    precioTF: "Precio $:",
  },
  crearGrupo: {
    nombreTF: "Nombre del grupo:",
    grupoIdTF: "Identificador (Máx. 4 letras):",
    grupoIdPlaceholder: "ejemplo: K1A",
    nivelTF: "Nivel:"
  },
  informacionScreen: {
    nombreTF: "Nombre:",
    nombrePlaceholder: "Nombre de la circular...",
    descripcionTF: "Descripción:",
    descripcionPlaceholder: "Descripción del contenido...",
  },
  crearUsuarioScreen: {
    usuarioTF: "Usuario:",
    usuarioPlaceholder: "Ej: Miss Lucy",
    nombreTF: "Nombre:",
    nombrePlaceholder: "Ej: Lucía",
    apellidosTF: "Apellidos:",
    apellidosPlaceholder: "Ej: García López",
    passwordTF: "Contraseña:",
  }
}

export default en
export type Translations = typeof en
