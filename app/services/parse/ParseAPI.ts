//  Created by Salvador Rodriguez Davila
//  Sun May 28th, 2023
import { Platform } from "react-native"
import Parse from "./ParseInit"

// ============================================
// Standardized API Response Types (v2.0)
// ============================================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

// Error code to user-friendly message mapping (Spanish)
export const ERROR_MESSAGES: Record<string, string> = {
    'INVALID_PARAMS': 'Faltan datos requeridos',
    'NOT_FOUND': 'No se encontró el recurso',
    'ANUNCIO_NOT_FOUND': 'Anuncio no encontrado',
    'EVENTO_NOT_FOUND': 'Evento no encontrado',
    'UNAUTHORIZED': 'No tienes permiso para esta acción',
    'FILE_TOO_LARGE': 'El archivo es muy grande',
    'INVALID_FILE_TYPE': 'Formato de archivo no soportado',
    'S3_ERROR': 'Error al subir archivo, intenta de nuevo',
    'NOTIFICATION_FAILED': 'Error al enviar notificación',
    'DELETE_FAILED': 'Error al eliminar',
    'REMINDER_FAILED': 'Error al enviar recordatorio',
}

/**
 * Get user-friendly error message from API error response
 */
export function getApiErrorMessage(error: { code: string; message: string } | undefined): string {
    if (!error) return 'Error desconocido'
    return ERROR_MESSAGES[error.code] || error.message || 'Error desconocido'
}

/**
 * Check if an API response indicates success
 */
export function isApiSuccess<T>(response: ApiResponse<T> | null | undefined): response is ApiResponse<T> & { success: true; data: T } {
    return response !== null && response !== undefined && response.success === true && response.data !== undefined
}

/**
 * Extract data from API response or throw error
 */
export function getApiData<T>(response: ApiResponse<T> | null | undefined, fallbackErrorMsg: string = 'Error en la operación'): T {
    if (!response) {
        throw new Error(fallbackErrorMsg)
    }
    if (!response.success) {
        throw new Error(getApiErrorMessage(response.error))
    }
    if (response.data === undefined) {
        throw new Error(fallbackErrorMsg)
    }
    return response.data
}

export async function getCurrentUserObj() {
    return await Parse.User.currentAsync()
}
export async function fetchUserEscuela(escuelaId: string) {
    const Escuela = Parse.Object.extend("Escuela")
    const queryEscuela = new Parse.Query(Escuela)
    const escuela = await queryEscuela.get(escuelaId)
    return escuela
}

export async function fetchSubscription(escuelaId: string) {
    let escuelaObj = await fetchUserEscuela(escuelaId)
    
    const Subscripcion = Parse.Object.extend("Subscripcion")
    const query = new Parse.Query(Subscripcion)
    query.equalTo("escuela", escuelaObj)
    
    const result = await query.first()
    return result
}

export async function checkUsernameExists(username: string) {
    const User = Parse.Object.extend("_User")
    const query = new Parse.Query(User)
    query.equalTo("username", username)
    const object = await query.first();
    return object != null ? true : false
}

export async function fetchAllUsersWithEmail() {
    const User = Parse.Object.extend("_User")
    const query = new Parse.Query(User)
    query.equalTo("usertype", 2)
    query.fullText('username', '@');
    query.limit(1000)

    const results = await query.find()
    return results
}

export async function fetchGrupos(escuelaObj: any) {
    // Get current user
    const currentUser = Parse.User.current();
    // Fetch Grupos
    const Grupo = Parse.Object.extend("grupo")
    const query = new Parse.Query(Grupo)
    query.equalTo("escuela", escuelaObj)
    if (!isCurrentUserAdmin(currentUser)) {
        query.equalTo("Maestros", currentUser)
    }
    query.ascending("name");
    query.include("nivel")

    const results = await query.find()
    return results
}


export async function fetchEstudiantes(escuelaId: string) {
    let escuelaObj = await fetchUserEscuela(escuelaId)
    // Fetch Grupos
    const Estudiante = Parse.Object.extend("Estudiantes")
    const query = new Parse.Query(Estudiante)
    query.equalTo("escuela", escuelaObj)
    query.equalTo("status", 0)
    query.include("grupo")
    query.ascending("ApPATERNO");
    query.limit(400)
    const results = await query.find()
    return results
}

export async function countEstudiantes(escuelaId: string) {
    let escuelaObj = await fetchUserEscuela(escuelaId)
    // Fetch Grupos
    const Estudiante = Parse.Object.extend("Estudiantes")
    const query = new Parse.Query(Estudiante)
    query.equalTo("escuela", escuelaObj)
    query.equalTo("status", 0)
    query.include("grupo")
    query.ascending("ApPATERNO");
    query.limit(400)
    const countEstudiantes = await query.count()
    return countEstudiantes
}

export async function fetchEstudiantesByGrupo(grupoObj: any) {
    // Fetch Grupos
    const Estudiante = Parse.Object.extend("Estudiantes")
    const query = new Parse.Query(Estudiante)
    query.equalTo("grupo", grupoObj)
    query.equalTo("status", 0)
    query.ascending("ApPATERNO");
    const results = await query.find()
    return results
}

export async function fetchAnuncioPhoto(anuncioId: string) {
    // Fetch Anuncio
    const Anuncio = Parse.Object.extend("anuncio")
    const innerQuery = new Parse.Query(Anuncio);
    innerQuery.equalTo("objectId", anuncioId)
    // AnuncioPhoto
    const AnuncioPhoto = Parse.Object.extend("AnuncioPhoto")
    const query = new Parse.Query(AnuncioPhoto)
    query.matchesQuery("anuncio", innerQuery);
    const result = await query.first()
    return result
}

// Fetch ALL photos for an anuncio (supports multiple attachments)
export async function fetchAnuncioPhotos(anuncioId: string) {
    const Anuncio = Parse.Object.extend("anuncio")
    const innerQuery = new Parse.Query(Anuncio);
    innerQuery.equalTo("objectId", anuncioId)
    const AnuncioPhoto = Parse.Object.extend("AnuncioPhoto")
    const query = new Parse.Query(AnuncioPhoto)
    query.matchesQuery("anuncio", innerQuery);
    query.ascending("createdAt")
    const results = await query.find()
    return results
}

export async function fetchGrupoActividad(grupoId: string, actividadId: string) {
    const grupoObj = await fetchGrupo(grupoId)
    var actividadType = ""
    switch (actividadId) {
        case "0":
            actividadType = "Tarea"
            break;
        case "1":
            actividadType = "Anuncio"
            break;
        case "2":
            actividadType = "Momentos" // NOT ACCURATE!
            break;
        case "3":
            actividadType = "Planeación" // NOT ACCURATE!
            break;
        default:
            actividadType = "Actividad" // NOT ACCURATE!
            break;
    }
    // Fetch tipoAnuncio
    const TipoAnuncio = Parse.Object.extend("tipoAnuncio")
    const queryTipoAnuncio = new Parse.Query(TipoAnuncio)
    queryTipoAnuncio.equalTo("nombre", actividadType)

    // Query anuncio Table
    const Anuncio = Parse.Object.extend("anuncio")
    const queryAnuncio = new Parse.Query(Anuncio)
    queryAnuncio.matchesQuery("tipo", queryTipoAnuncio);
    queryAnuncio.equalTo("grupos", grupoObj)
    queryAnuncio.descending("createdAt")

    const results = await queryAnuncio.find()
    return results
}

export async function fetchGrupo(grupoId: string) {
    // Fetch Grupo by id
    const Grupo = Parse.Object.extend("grupo")
    const query = new Parse.Query(Grupo)
    const grupoObj = await query.get(grupoId)
    return grupoObj
}

export async function fetchPaquete(paqueteId: string) {
    // Fetch Paquete by id
    const Paquete = Parse.Object.extend("Paquetes")
    const query = new Parse.Query(Paquete)
    const paqueteObj = await query.get(paqueteId)
    return paqueteObj
}

export async function fetchTipoAnuncioNombre(tipoAnuncioId) {
    // Fetch Grupo by id
    const TipoAnuncio = Parse.Object.extend("tipoAnuncio")
    const query = new Parse.Query(TipoAnuncio)
    const tipoAnuncioObj = await query.get(tipoAnuncioId)
    return tipoAnuncioObj.get("nombre")
}

export async function getTipoAnuncio(nombre) {
    // Fetch Grupo by id
    const TipoAnuncio = Parse.Object.extend("tipoAnuncio")
    const query = new Parse.Query(TipoAnuncio)
    query.equalTo("nombre", nombre)
    const object = await query.first();
    return object
}

function isCurrentUserAdmin(currentUser) {
    const usertype = currentUser.get('usertype')
    return usertype == 0 ? true : false
}

export async function saveAnuncioObject(params, grupo, estudianteId, nivelGrupos) {
    const Anuncio = Parse.Object.extend("anuncio");
    const anuncio = new Anuncio();
    if (estudianteId != null) {
        const Estudiante = Parse.Object.extend("Estudiantes")
        const estudiantePointer = Estudiante.createWithoutData(estudianteId);
        anuncio.set("estudiante", estudiantePointer)
    } 
    
    if (nivelGrupos != null) {
        anuncio.set("grupos", nivelGrupos)
    }

    if (grupo != null) {
        const Grupo = Parse.Object.extend("grupo");
        const grupoPointer = Grupo.createWithoutData(grupo.id);
        var grupoArr = [grupoPointer]
        anuncio.set("grupos", grupoArr)
    }
    anuncio.set("side", "escuela");
    let anuncioObj = await anuncio.save(params)
    return anuncioObj.id
}

export async function runCloudCodeFunction(funcName, params) {
    try {
        const cloud = Parse.Cloud;
        let result = await cloud.run(funcName, params)
        // console.log("cloud result: " + JSON.stringify(result))
        return result
    } catch (error) {
        console.error(`Error in cloud function ${funcName}:`, error)
        console.error("Parameters:", JSON.stringify(params))
        throw new Error(`Cloud function ${funcName} failed: ${error.message || error}`)
    }
}

export async function saveAnuncioPhoto(anuncioObjectId: string, tipoArchivo: string) {
    const Anuncio = Parse.Object.extend("anuncio")
    const queryAnuncio = new Parse.Query(Anuncio)
    const anuncioObj = await queryAnuncio.get(anuncioObjectId)

    const AnuncioPhoto = Parse.Object.extend("AnuncioPhoto");
    const anuncioPhoto = new AnuncioPhoto();
    anuncioPhoto.set("anuncio", anuncioObj);
    anuncioPhoto.set("aws", true);
    anuncioPhoto.set("TipoArchivo", tipoArchivo);
    anuncioPhoto.set("newS3Bucket", true);

    let result = await anuncioPhoto.save()
    return result
}

export async function fetchGrupoAndEstudianteAnuncios(estudianteId: string) {
    // Fetch Estudiante Object
    const Estudiante = Parse.Object.extend("Estudiantes")
    const query = new Parse.Query(Estudiante)
    const estudianteRes = await query.get(estudianteId)
    // Grupo Query
    var gruposArr = [];
    let grupoObj = estudianteRes.get('grupo');
    gruposArr.push(grupoObj);
    const Anuncio = Parse.Object.extend("anuncio");
    const queryGrupo = new Parse.Query(Anuncio);
    queryGrupo.containedIn('grupos', gruposArr);
    // Estudiante Query
    const queryEstudiante = new Parse.Query(Anuncio);
    queryEstudiante.equalTo("estudiante", estudianteRes);
    // Main Or query
    var mainQuery = Parse.Query.or(queryEstudiante, queryGrupo);
    mainQuery.equalTo("aprobado", true);
    mainQuery.include("autor");
    mainQuery.include('estudiante');
    mainQuery.include('tipo');
    mainQuery.include('grupos');
    mainQuery.descending("createdAt");
    mainQuery.limit(40);

    // AnuncioPhoto
    const AnuncioPhoto = Parse.Object.extend("AnuncioPhoto");
    var anuncioPhotoQuery = new Parse.Query(AnuncioPhoto);
    anuncioPhotoQuery.matchesQuery("anuncio", mainQuery);
    anuncioPhotoQuery.descending("createdAt");
    anuncioPhotoQuery.limit(40);
    const resultAnuncioPhoto = await anuncioPhotoQuery.find();

    const mainResults = await mainQuery.find();

    let resultsObj = {
        anuncioPhotoArr: resultAnuncioPhoto,
        mainResultArr: mainResults
    }
    return resultsObj
}

export async function fetchAttachmentObjectsForAnuncios(estudianteId: string) {
    // Fetch Estudiante Object
    const Estudiante = Parse.Object.extend("Estudiantes")
    const query = new Parse.Query(Estudiante)
    const estudianteRes = await query.get(estudianteId)
    // Grupo Query
    var gruposArr = [];
    let grupoObj = estudianteRes.get('grupo');
    gruposArr.push(grupoObj);
    const Anuncio = Parse.Object.extend("anuncio");
    const queryGrupo = new Parse.Query(Anuncio);
    queryGrupo.containedIn('grupos', gruposArr);
    // Estudiante Query
    const queryEstudiante = new Parse.Query(Anuncio);
    queryEstudiante.equalTo("estudiante", estudianteRes);
    // Main Or query
    var mainQuery = Parse.Query.or(queryEstudiante, queryGrupo);
    mainQuery.equalTo("aprobado", true);
    mainQuery.include("autor");
    mainQuery.include('estudiante');
    mainQuery.include('tipo');
    mainQuery.include('grupos');
    mainQuery.descending("createdAt");
    mainQuery.limit(40);
    // AnuncioPhoto
    const AnuncioPhoto = Parse.Object.extend("AnuncioPhoto");
    var anuncioPhotoQuery = new Parse.Query(AnuncioPhoto);
    anuncioPhotoQuery.matchesQuery("anuncio", mainQuery);
    anuncioPhotoQuery.descending("createdAt");
    anuncioPhotoQuery.limit(40);
    const resultAnuncioPhoto = await anuncioPhotoQuery.find();

    return resultAnuncioPhoto
}

export async function storeUserExpoToken(userTokenData: any) {
    console.log("PARSE_storeUserExpoToken: " + JSON.stringify(userTokenData))
    const ExpoAdminToken = Parse.Object.extend("ExpoAdminToken")
    // Check if object exists
    const queryExpoAdminToken = new Parse.Query(ExpoAdminToken)
    queryExpoAdminToken.equalTo("userId", userTokenData.userId)
    queryExpoAdminToken.equalTo("escuela", userTokenData.escuela)
    const object = await queryExpoAdminToken.first()
    if (object != null) {
        // Update object
        object.set("token", userTokenData.token);
        let updateRes = await object.save()
        return updateRes
    } else {
        // Store new record
        const expoAdminToken = new ExpoAdminToken();
        expoAdminToken.set("userId", userTokenData.userId);
        expoAdminToken.set("userType", userTokenData.userType);
        expoAdminToken.set("escuela", userTokenData.escuela);
        expoAdminToken.set("token", userTokenData.token);
    
        let result = await expoAdminToken.save()
        return result
    }
}

export async function fetchScannedUser(userObjId: string) {
    const User = Parse.Object.extend("_User")
    const query = new Parse.Query(User)
    const userRes = await query.get(userObjId)
    return userRes
}

export async function fetchScannedEstudiante(estudianteId: string) {
    // Fetch Grupos
    const Estudiante = Parse.Object.extend("Estudiantes")
    const query = new Parse.Query(Estudiante)
    const estudianteRes = await query.get(estudianteId)
    return estudianteRes
}

export async function fetchEstudiantePersonasAutorizadasRelation(personasAutRelation: any) {
    const res = await personasAutRelation.query().find()
    return res
}

export async function findHermanos(apellidos: string) {
    const Estudiante = Parse.Object.extend("Estudiantes")
    const query = new Parse.Query(Estudiante)
    query.equalTo("APELLIDO", apellidos)
    const res = await query.find()
    return res
}

export async function fetchUserPhotoId(userObject: any) {
    // UserPhoto
    var UserPhoto = Parse.Object.extend("UserPhoto");
    var query = new Parse.Query(UserPhoto);
    query.equalTo("user", userObject);
    let userPhotoFetched = await query.first()
    if (userPhotoFetched != null) {
        // Return isNewBucket as well
        return {
            id: userPhotoFetched.id,
            isNewBucket: userPhotoFetched.get("newS3Bucket")
        }
    } else {
        return null
    }
}

export async function registrarAcceso(userObj: any, estudianteObj: any, escuelaId: string) {
    // Escuela
    let escuelaObj = await fetchUserEscuela(escuelaId)
    // Store new record
    const Acceso = Parse.Object.extend("Acceso")
    const acceso = new Acceso();
    acceso.set("user", userObj);
    acceso.set("student", estudianteObj);
    acceso.set("escuelaId", escuelaObj.id);
    const date = new Date();
    acceso.set("escaneoOcurrido", date);
    acceso.set("scanner", "skolaADMN");

    let result = await acceso.save()
    return result
}

export async function fetchRecentAccesos(escuelaId: string) {
    let escuelaObj = await fetchUserEscuela(escuelaId)

    // Create a date object for the start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const Acceso = Parse.Object.extend("Acceso")
    const query = new Parse.Query(Acceso)
    query.equalTo("escuelaId", escuelaObj.id)
    query.greaterThanOrEqualTo("escaneoOcurrido", today)
    query.ascending("escaneoOcurrido")
    query.include("user");
    query.include("student");
    query.limit(35)

    const results = await query.find()
    return results
}

export async function fetchAccesos(estudianteObj: any) {
    const Acceso = Parse.Object.extend("Acceso")
    const query = new Parse.Query(Acceso)
    query.equalTo("student", estudianteObj)
    query.include("user")
    query.include("student")
    query.descending("createdAt")
    query.limit(45)

    const results = await query.find()
    return results
}

export async function fetchEventos(escuelaId: string) {
    // Two months ago from today
    var d = new Date();
    d.setMonth(d.getMonth() - 2);
    // Escuela
    let escuelaObj = await fetchUserEscuela(escuelaId)
    // Fetch Eventos
    const Evento = Parse.Object.extend("evento")
    const query = new Parse.Query(Evento)
    query.equalTo("escuela", escuelaObj)
    query.greaterThanOrEqualTo("fecha", d)
    query.descending("fecha");
    const results = await query.find()

    return results
}

export async function fetchAnunciosForComunicacion(escuelaId: string) {
    try {
        let escuelaObj = await fetchUserEscuela(escuelaId)

        // Users of the school
        const User = Parse.Object.extend("_User")
        const userQuery = new Parse.Query(User)
        userQuery.equalTo("escuela", escuelaObj)
        userQuery.equalTo("status", 0)
        userQuery.equalTo("usertype", 2)

        // Fetch Anuncios
        const Anuncio = Parse.Object.extend("anuncio")
        const query = new Parse.Query(Anuncio)
        query.equalTo("aprobado", true)
        query.notEqualTo("actionTaken", true)
        query.matchesQuery("autor", userQuery)
        query.include("autor")
        query.include("tipo")
        query.include("grupos")
        query.include("estudiante")
        query.descending("createdAt")
        query.limit(35)
        // Run main anuncios query
        const mainResults = await query.find();
        // Fetch AnuncioPhotos
        const AnuncioPhoto = Parse.Object.extend("AnuncioPhoto");
        let allAnuncioPhotos: any[] = [];
        
        if (Platform.OS !== "android") {
            for (const anuncio of mainResults) {
                const photoQuery = new Parse.Query(AnuncioPhoto);
                photoQuery.equalTo("anuncio", anuncio);
                photoQuery.descending("createdAt");
                const anuncioPhotoObj = await photoQuery.first();
                if (anuncioPhotoObj != null) {
                    // console.log("anuncioPhotoObj: " + JSON.stringify(anuncioPhotoObj.id))
                    allAnuncioPhotos = [...allAnuncioPhotos, anuncioPhotoObj];
                }
            }
        }


        let resultsObj = {
            anuncioPhotoArr: allAnuncioPhotos,
            mainResultArr: mainResults
        }
        return resultsObj
    } catch (error) {
        console.error("Error in fetchAnunciosForComunicacion:", error);
        throw error;
    }
}

export async function fetchAnunciosPorAprobar(escuelaId) {
    let escuelaObj = await fetchUserEscuela(escuelaId)

    // Users of the school
    const User = Parse.Object.extend("_User")
    const userQuery = new Parse.Query(User)
    userQuery.equalTo("escuela", escuelaObj)
    userQuery.equalTo("status", 0)
    userQuery.equalTo("usertype", 1) // Maestros

    // Fetch Anuncios
    const Anuncio = Parse.Object.extend("anuncio")
    const query = new Parse.Query(Anuncio)
    query.equalTo("aprobado", false)
    query.matchesQuery("autor", userQuery)
    query.include("autor")
    query.include("tipo")
    query.include("grupos")
    query.include("estudiante")
    query.descending("createdAt")

    // AnuncioPhoto
    const AnuncioPhoto = Parse.Object.extend("AnuncioPhoto");
    var anuncioPhotoQuery = new Parse.Query(AnuncioPhoto);
    anuncioPhotoQuery.matchesQuery("anuncio", query);
    anuncioPhotoQuery.descending("createdAt");
    anuncioPhotoQuery.limit(40);
    const resultAnuncioPhoto = await anuncioPhotoQuery.find();

    const mainResults = await query.find();

    let resultsObj = {
        anuncioPhotoArr: resultAnuncioPhoto,
        mainResultArr: mainResults
    }
    return resultsObj
}

export async function fetchAnunciosEnviados(escuelaId: string) {
    let escuelaObj = await fetchUserEscuela(escuelaId)

    // Users of the school
    const User = Parse.Object.extend("_User")
    const userQuery = new Parse.Query(User)
    userQuery.equalTo("escuela", escuelaObj)
    userQuery.equalTo("status", 0)
    userQuery.containedIn("usertype", [0, 1]); // Admin & Maestros

    // Fetch Anuncios
    const Anuncio = Parse.Object.extend("anuncio")
    const query = new Parse.Query(Anuncio)
    query.matchesQuery("autor", userQuery)
    query.include("autor")
    query.include("tipo")
    query.include("grupos")
    query.include("estudiante")
    query.descending("createdAt")

    const results = await query.find()
    return results
}

export async function fetchAnunciosEnviadosDocente(escuelaId: string, userId: string) {
    let escuelaObj = await fetchUserEscuela(escuelaId)
    // Users of the school
    const User = Parse.Object.extend("_User")
    const userQuery = new Parse.Query(User)
    userQuery.equalTo("escuela", escuelaObj)
    userQuery.equalTo("status", 0)
    userQuery.equalTo("objectId", userId)

    // Fetch Anuncios
    const Anuncio = Parse.Object.extend("anuncio")
    const query = new Parse.Query(Anuncio)
    query.matchesQuery("autor", userQuery)
    query.include("autor")
    query.include("tipo")
    query.include("grupos")
    query.include("estudiante")
    query.descending("createdAt")

    const results = await query.find()
    return results
}

export async function createPresencia(estudianteId: string) {
    let estudiante = await fetchScannedEstudiante(estudianteId)

    const Presencia = Parse.Object.extend("Presencia")
    const presencia = new Presencia();
    presencia.set("estudiante", estudiante);
    presencia.set("presente", false);

    let result = await presencia.save()
    return result.id
}

export async function fetchPresencia(escuelaId: string) {
    let escuelaObj = await fetchUserEscuela(escuelaId)
    // Query estudiantes of the school
    const Estudiante = Parse.Object.extend("Estudiantes")
    const estudianteQuery = new Parse.Query(Estudiante)
    estudianteQuery.equalTo("escuela", escuelaObj)
    estudianteQuery.equalTo("status", 0)
    estudianteQuery.include("grupo")
    // Fetch Presencia
    const Presencia = Parse.Object.extend("Presencia")
    const queryPresencia = new Parse.Query(Presencia)
    queryPresencia.matchesQuery("estudiante", estudianteQuery)
    queryPresencia.include("estudiante")
    queryPresencia.descending("presente")
    queryPresencia.limit(400)

    const results = await queryPresencia.find()
    return results
}

export async function updatePresencia(objectId: string) {
    const Presencia = Parse.Object.extend("Presencia")
    const query = new Parse.Query(Presencia)
    const presenciaObj = await query.get(objectId)

    let presente = presenciaObj.get("presente")

    presenciaObj.set("presente", !presente)
    let res = await presenciaObj.save()
    return res.id
}

export async function archivarAnuncio(anuncioId: string) {
    const Anuncio = Parse.Object.extend("anuncio")
    const query = new Parse.Query(Anuncio)
    const anuncioObj = await query.get(anuncioId)

    anuncioObj.set("actionTaken", true)
    let res = await anuncioObj.save()
    return res.id
}

export async function toggleAprobarAnuncio(anuncioId) {
    const Anuncio = Parse.Object.extend("anuncio")
    const query = new Parse.Query(Anuncio)
    const anuncioObj = await query.get(anuncioId)

    let aprobadoField = anuncioObj.get("aprobado")

    anuncioObj.set("aprobado", !aprobadoField)
    let res = await anuncioObj.save()
    return res.id
}

export async function eliminarAnuncio(anuncioId: string) {
    const Anuncio = Parse.Object.extend("anuncio")
    const query = new Parse.Query(Anuncio)
    const anuncioObj = await query.get(anuncioId)

    let res = await anuncioObj.destroy()
    return res.id
}

export async function fetchSeenBy(anuncioObjId: string) {
    const Anuncio = Parse.Object.extend("anuncio")
    const queryAnuncio = new Parse.Query(Anuncio)
    const anuncioObj = await queryAnuncio.get(anuncioObjId)

    const Actividad = Parse.Object.extend("actividad")
    const query = new Parse.Query(Actividad)
    query.equalTo("anuncioID", anuncioObj)
    query.equalTo("tipo", "seen")
    query.include("userID")

    const results = await query.find()
    return results
}

export async function fetchInformacionSeenBy(informacionObjId: string) {
    const InformacionSeenBy = Parse.Object.extend("InformacionSeenBy")
    const query = new Parse.Query(InformacionSeenBy)
    query.equalTo("infoId", informacionObjId)

    const results = await query.find()
    return results
}

export async function fetchEstudianteNombreOfUser(userObj: any) {
    const User = Parse.Object.extend("_User")
    const queryUser = new Parse.Query(User)
    const fetchedUserObj = await queryUser.get(userObj.objectId)

    const Estudiante = Parse.Object.extend("Estudiantes")
    const query = new Parse.Query(Estudiante);
    query.equalTo("PersonasAutorizadas", fetchedUserObj);
    const studentObj = await query.first();

    return studentObj.get('NOMBRE') + " " + studentObj.get('ApPATERNO')
}

export async function fetchUserParentescoAndEstudiante(userId: string) {
    const User = Parse.Object.extend("_User")
    const queryUser = new Parse.Query(User)
    const fetchedUserObj = await queryUser.get(userId)

    let parentesco = fetchedUserObj.get("parentesco")

    const Estudiante = Parse.Object.extend("Estudiantes")
    const query = new Parse.Query(Estudiante);
    query.equalTo("PersonasAutorizadas", fetchedUserObj);
    const studentObj = await query.first();

    let returnData = {
        parentesco: parentesco,
        estudiante: studentObj.get('NOMBRE') + " " + studentObj.get('ApPATERNO')
    }

    return returnData
}

export async function fetchNiveles(escuelaId: string) {
    let escuelaObj = await fetchUserEscuela(escuelaId)

    const Nivel = Parse.Object.extend("Nivel")
    const query = new Parse.Query(Nivel);
    query.equalTo("escuela", escuelaObj);
    const nivelRes = await query.find();

    return nivelRes
}

export async function fetchGruposOfNivel(nivelId) {
    const Nivel = Parse.Object.extend("Nivel")
    const queryNivel = new Parse.Query(Nivel)
    const fetchedNivel = await queryNivel.get(nivelId)

    const Grupo = Parse.Object.extend("grupo")
    const queryGrupo = new Parse.Query(Grupo);
    queryGrupo.equalTo("nivel", fetchedNivel);
    const res = await queryGrupo.find();

    return res
}

export async function fetchEscuelaUsers(escuelaId) {
    let escuelaObj = await fetchUserEscuela(escuelaId)

    const User = Parse.Object.extend("_User")
    const query = new Parse.Query(User)
    query.equalTo("escuela", escuelaObj)
    query.equalTo("status", 0)
    query.notEqualTo("usertype", 2)

    const userRes = await query.find()
    return userRes
}

export async function saveEvento(escuelaId, eventoData) {
    let escuelaObj = await fetchUserEscuela(escuelaId)

    const Evento = Parse.Object.extend("evento");
    const evento = new Evento();
    evento.set("escuela", escuelaObj);
    evento.set("fecha", eventoData.fecha);
    evento.set("nombre", eventoData.nombre);
    evento.set("lugar", eventoData.lugar);
    evento.set("descripcion", eventoData.descripcion);
    evento.set("publico", eventoData.publico);
    evento.set("confirmacion", eventoData.confirmacion);

    let result = await evento.save()
    return result.id
}

export async function deleteEvento(eventoId: string): Promise<boolean> {
    try {
      const Evento = Parse.Object.extend("evento");
      const query = new Parse.Query(Evento);
      const evento = await query.get(eventoId);
      await evento.destroy();
      return true;
    } catch (error) {
      console.error("Error deleting evento:", error);
      return false;
    }
  }

export async function fetchStudentPhotoObjId(estudianteObj: any) {
    const StudentPhoto = Parse.Object.extend("studentPhoto")
    const query = new Parse.Query(StudentPhoto)
    query.equalTo("estudiante", estudianteObj)
    query.descending("createdAt")
    const result = await query.first()
    if (result != null) {
        return {
            id: result.id, 
            isNewBucket: result.get("newS3Bucket")
        }
    } else {
        return null
    }
}

export async function fetchPaquetes(escuelaId: string) {
    let escuelaObj = await fetchUserEscuela(escuelaId)

    const Paquete = Parse.Object.extend("Paquetes")
    const query = new Parse.Query(Paquete)
    query.equalTo("escuela", escuelaObj)
    query.descending("createdAt")

    const results = await query.find()
    return results
}

export async function savePaquete(paqueteObj: any) {
    let escuelaObj = await fetchUserEscuela(paqueteObj.escuelaId)
    let niveles = await fetchNiveles(paqueteObj.escuelaId)
    let nivelObj = niveles[0]


    const Paquetes = Parse.Object.extend("Paquetes");
    const paquete = new Paquetes();
    paquete.set("escuela", escuelaObj);
    paquete.set("nivel", nivelObj);
    paquete.set("nombre", paqueteObj.nombre);
    paquete.set("precio", paqueteObj.precio);
    paquete.set("horario", paqueteObj.horario);
    paquete.set("horaEntrada", paqueteObj.horaEntrada);
    paquete.set("horaSalida", paqueteObj.horaSalida);
    paquete.set("tipo", "Horario");

    let result = await paquete.save()
    return result.id
}

export async function updatePaquete(paqueteObj: any) {
    const Paquetes = Parse.Object.extend("Paquetes");
    const query = new Parse.Query(Paquetes);
    const paquete = await query.get(paqueteObj.objectId);

    paquete.set("nombre", paqueteObj.nombre);
    paquete.set("precio", paqueteObj.precio);
    paquete.set("horario", paqueteObj.horario);
    paquete.set("horaEntrada", paqueteObj.horaEntrada);
    paquete.set("horaSalida", paqueteObj.horaSalida);

    let result = await paquete.save();
    return result.id;
}

export async function saveEstudiante(escuelaId, estudianteData) {
    try {
        // Validate required data
        if (!escuelaId) {
            throw new Error("Escuela ID is required")
        }
        if (!estudianteData.nombre || !estudianteData.apPaterno) {
            throw new Error("Student name and paternal surname are required")
        }
        if (!estudianteData.grupoObj) {
            throw new Error("Grupo object is required")
        }
        if (!estudianteData.paqueteObj) {
            throw new Error("Paquete object is required")
        }

        let escuelaObj = await fetchUserEscuela(escuelaId)
        if (!escuelaObj) {
            throw new Error("Escuela not found")
        }

        const Estudiante = Parse.Object.extend("Estudiantes");
        const estudiante = new Estudiante();

        estudiante.set("escuela", escuelaObj);
        estudiante.set("status", 0);

        estudiante.set("NOMBRE",    estudianteData.nombre); // String
        estudiante.set("ApPATERNO", estudianteData.apPaterno); // String
        estudiante.set("ApMATERNO", estudianteData.apMaterno || ""); // String
        estudiante.set("APELLIDO",  estudianteData.apellido); // String

        estudiante.set("grupo",     estudianteData.grupoObj); // Object
        estudiante.set("paquete",   estudianteData.paqueteObj); // Object

        estudiante.set("HORARIO",   estudianteData.horario || ""); // String
        estudiante.set("CURP",      estudianteData.curp || ""); // String
        estudiante.set("GENERO",    estudianteData.genero || "F"); // String
        estudiante.set("COLEGIATURA", estudianteData.colegiatura || 0); // Int

        estudiante.set("fechaIngreso",    estudianteData.fechaIngreso || new Date()); // Date
        estudiante.set("fechaNacimiento", estudianteData.fechaNacimiento || new Date()); // Date

        let result = await estudiante.save()
        if (!result || !result.id) {
            throw new Error("Failed to save student - no ID returned")
        }
        return result.id
    } catch (error) {
        console.error("Error in saveEstudiante:", error)
        console.error("Student data:", JSON.stringify(estudianteData, null, 2))
        throw new Error(`Failed to save student: ${error.message || error}`)
    }
}

export async function updateEstudiante(estudianteId: string, estudianteData) {
    let estudiante = await fetchScannedEstudiante(estudianteId)

    estudiante.set("NOMBRE",    estudianteData.nombre); // String
    estudiante.set("ApPATERNO", estudianteData.apPaterno); // String
    estudiante.set("ApMATERNO", estudianteData.apMaterno); // String
    estudiante.set("APELLIDO",  estudianteData.apellido); // String

    estudiante.set("grupo",     estudianteData.grupoObj); // Object
    estudiante.set("paquete",   estudianteData.paqueteObj); // Object

    estudiante.set("HORARIO",   estudianteData.horario); // String
    estudiante.set("CURP",      estudianteData.curp); // String
    estudiante.set("GENERO",    estudianteData.genero); // String
    estudiante.set("COLEGIATURA", estudianteData.colegiatura); // Int

    estudiante.set("fechaIngreso",    estudianteData.fechaIngreso); // Date
    estudiante.set("fechaNacimiento", estudianteData.fechaNacimiento); // Date

    let result = await estudiante.save()
    return result.id
}

export async function updateStatusEstudiante(estudianteId: string, status: number) {
    console.log("**updateStatusEstudiante: " + estudianteId + " status: " + status)
    let estudiante = await fetchScannedEstudiante(estudianteId)

    estudiante.set("status", status); // Int

    let result = await estudiante.save()
    return result.id
}

export async function saveStudentPhoto(estudianteId: string) {
    let estudianteObj = await fetchScannedEstudiante(estudianteId)

    const StudentPhoto = Parse.Object.extend("studentPhoto");
    const studentPhoto = new StudentPhoto();
    studentPhoto.set("estudiante", estudianteObj);
    studentPhoto.set("aws", true);
    studentPhoto.set("newS3Bucket", true);

    let result = await studentPhoto.save()
    return result.id
}

export async function destroyStudentPhoto(estudianteId: string) {
    let estudianteObj = await fetchScannedEstudiante(estudianteId)

    const StudentPhoto = Parse.Object.extend("studentPhoto");
    const query = new Parse.Query(StudentPhoto)
    query.equalTo("estudiante", estudianteObj)
    const studentPhotoRes = await query.find()
    for (let i = 0; i < studentPhotoRes.length; i++) {
        const object = studentPhotoRes[i];
        let res = await object.destroy()
        console.log("DESTROY studentPhoto: " + res)
    }
    return true
}

export async function saveUserPhoto(userId: string) {
    let userObj = await fetchScannedUser(userId)

    const UserPhoto = Parse.Object.extend("UserPhoto");
    const userPhoto = new UserPhoto();
    userPhoto.set("user", userObj);
    userPhoto.set("aws", true);
    userPhoto.set("newS3Bucket", true);

    let result = await userPhoto.save()
    return result.id
}

export async function destroyUserPhoto(userId: string) {
    let userObj = await fetchScannedUser(userId)

    const UserPhoto = Parse.Object.extend("UserPhoto");
    const query = new Parse.Query(UserPhoto)
    query.equalTo("user", userObj)
    const userPhotoRes = await query.find()
    for (let i = 0; i < userPhotoRes.length; i++) {
        const object = userPhotoRes[i];
        let res = await object.destroy()
        console.log("DESTROY UserPhoto: " + res)
    }
    return true
}

export async function updateEstudiantePersonasAutRelation(estudianteId: string, userIDsArr: string[]) {
    // Fetch Estudiante Obj
    let estudianteObj = await fetchScannedEstudiante(estudianteId)
    // Fetch all user objects
    const User = Parse.Object.extend("_User")
    const query = new Parse.Query(User)
    query.containedIn("objectId", userIDsArr);
    const userRes = await query.find()
    // Estudiante Relation
    const relation = estudianteObj.relation("PersonasAutorizadas");
    relation.add(userRes);
    let result = await estudianteObj.save();
    return result
}

export async function savePlaneacion(grupoId: string, planeacionData) {
    const grupoObj = await fetchGrupo(grupoId)
    const userObj = await getCurrentUserObj()

    const Planeacion = Parse.Object.extend("Planeacion");
    const planeacion = new Planeacion();

    planeacion.set("grupo", grupoObj); // Object
    planeacion.set("fecha", planeacionData.fecha); // Date
    planeacion.set("tema", planeacionData.tema); // String
    planeacion.set("notas", planeacionData.notas); // String
    planeacion.set("autor", userObj); // Object
    planeacion.set("titulo", planeacionData.titulo); // String
    planeacion.set("valores", planeacionData.valores); // String
    planeacion.set("habitos", planeacionData.habitos); // String
    planeacion.set("descripcion", planeacionData.descripcion); // String

    let result = await planeacion.save()
    return result.id
}

export async function fetchPlaneacion(grupoId: string) {
    const grupoObj = await fetchGrupo(grupoId)

    const Planeacion = Parse.Object.extend("Planeacion")
    const query = new Parse.Query(Planeacion)
    query.equalTo("grupo", grupoObj)
    // start of today
    var start = new Date();
    start.setUTCHours(0,0,0,0);
    query.greaterThanOrEqualTo("fecha", start) 
    query.descending("fecha")

    const results = await query.find()
    return results
}

export async function eliminarPlaneacion(planeacionId: string) {
    const Planeacion = Parse.Object.extend("Planeacion")
    const query = new Parse.Query(Planeacion)
    const planeacionObj = await query.get(planeacionId)

    let res = await planeacionObj.destroy()
    return res.id
}

export async function saveMomentos(estudianteId: string, autorId: string, momentosDict: {}) {
    const Anuncio = Parse.Object.extend("anuncio");
    const anuncio = new Anuncio();
    // Autor
    let userObj = await fetchScannedUser(autorId)
    anuncio.set("autor", userObj)
    // Estudiante
    const Estudiante = Parse.Object.extend("Estudiantes")
    const estudiantePointer = Estudiante.createWithoutData(estudianteId);
    anuncio.set("estudiante", estudiantePointer)
    // Data
    anuncio.set("aprobado", true)
    anuncio.set("momento", momentosDict)
    anuncio.set("sentFrom", "skolaRN")
    
    let anuncioObj = await anuncio.save()
    return anuncioObj.id
}

export async function fetchMomento(estudianteId: string) {
    // Fetch Estudiante Obj
    let estudianteObj = await fetchScannedEstudiante(estudianteId)
    // Fetch Anuncio Momento
    const Anuncio = Parse.Object.extend("anuncio")
    const query = new Parse.Query(Anuncio)
    query.equalTo("estudiante", estudianteObj)
    query.exists("momento")
    // Start of today
    var start = new Date();
    start.setUTCHours(0,0,0,0);
    query.greaterThanOrEqualTo("createdAt", start)

    const result = await query.first()
    return result
}

export async function updateMomento(objectId: string, momentosDict: {}) {
    const Anuncio = Parse.Object.extend("anuncio")
    const query = new Parse.Query(Anuncio)
    const anuncio = await query.get(objectId)
    anuncio.set("momento", momentosDict)

    let anuncioObj = await anuncio.save()
    return anuncioObj.id
}

export async function fetchPagos(escuelaId: string) {
    // Create a new Date object for the first day of the current month
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    console.log(firstDayOfMonth);

    // Current Escuela
    let escuelaObj = await fetchUserEscuela(escuelaId)

    // Estudiantes Query
    const Estudiante = Parse.Object.extend("Estudiantes")
    const estudiantesQuery = new Parse.Query(Estudiante)
    estudiantesQuery.equalTo("escuela", escuelaObj)
    estudiantesQuery.equalTo("status", 0)
    estudiantesQuery.limit(400)

    // Pagos Query
    const Pagos = Parse.Object.extend("pagos")
    const queryPagos = new Parse.Query(Pagos)
    queryPagos.greaterThanOrEqualTo("createdAt", firstDayOfMonth)
    queryPagos.matchesQuery("student", estudiantesQuery)
    queryPagos.include("student")
    queryPagos.limit(400)

    const results = await queryPagos.find()
    return results
}

export async function updatePagoManual(pagoObject) {
    // Get current user
    const currentUser = Parse.User.current();

    pagoObject.set("manual", true)
    pagoObject.set("pagado", true)
    pagoObject.set("confirmadoPor", currentUser)

    let res = await pagoObject.save()
    return res.id
}

export async function eliminarPago(pagoObject) {
    let res = await pagoObject.destroy()
    return res.id
}

export async function fetchPagosEstudiante(estudianteId: string) {
    // Fetch Estudiante Obj
    let estudianteObj = await fetchScannedEstudiante(estudianteId)
    // Pagos Query
    const Pagos = Parse.Object.extend("pagos")
    const queryPagos = new Parse.Query(Pagos)
    queryPagos.equalTo("student", estudianteObj)
    queryPagos.include("student")
    queryPagos.limit(200)
    queryPagos.descending("createdAt")

    const results = await queryPagos.find()
    return results
}

export async function getEvento(eventoObjId: string) {
    const Evento = Parse.Object.extend("evento")
    const query = new Parse.Query(Evento)
    const evento = await query.get(eventoObjId)
    return evento
}

export async function saveEventoGaleria(eventoObjId: string) {
    const userObj = await getCurrentUserObj()
    const eventoObj = await getEvento(eventoObjId)

    const EventoGaleria = Parse.Object.extend("EventoGaleria");
    const eventoGaleria = new EventoGaleria();
    eventoGaleria.set("evento", eventoObj);
    eventoGaleria.set("autor", userObj);
    eventoGaleria.set("newS3Bucket", true);

    let result = await eventoGaleria.save()
    return result.id
}

export async function fetchEventoGaleria(eventoId: string) {
    const eventoObj = await getEvento(eventoId)

    const EventoGaleria = Parse.Object.extend("EventoGaleria")
    const query = new Parse.Query(EventoGaleria)
    query.equalTo("evento", eventoObj)

    const results = await query.find()
    return results
}

export async function deleteEventoFoto(fotoId: string): Promise<boolean> {
    try {
        const EventoGaleria = Parse.Object.extend("EventoGaleria");
        const query = new Parse.Query(EventoGaleria);
        const galeriaItem = await query.get(fotoId);
        await galeriaItem.destroy();
        return true;
    } catch (error) {
        console.error("Error deleting evento foto:", error);
        return false;
    }
}

export async function fetchGrupoMaestrosRelation(grupoObj) {
    // create a relation based on the authors key
    var relation = grupoObj.relation("Maestros");
    // generate a query based on that relation
    var query = relation.query();
    
    // now execute the query
    const results = await query.find()
    return results
}

export async function addMaestrosToGrupo(grupoId: string, maestrosArr: string[]) {
    // Fetch grupo Object
    let grupoObj = await fetchGrupo(grupoId)
    // Get existing relation
    var relation = grupoObj.relation("Maestros");
    // Fetch each Maestro Object with sync for loop
    for (var i = 0; i < maestrosArr.length; i++) {
        let userId = maestrosArr[i]
        let userObj = await fetchScannedUser(userId)
        relation.add(userObj)
    }
    let saveGrupoRes = await grupoObj.save()
    return saveGrupoRes.id
}

export async function removeMaestrosFromGrupo(grupoId: string, maestrosArr: string[]) {
    // Fetch grupo Object
    let grupoObj = await fetchGrupo(grupoId)
    // Get existing relation
    var relation = grupoObj.relation("Maestros");
    // Fetch each Maestro Object with sync for loop
    for (var i = 0; i < maestrosArr.length; i++) {
        let userId = maestrosArr[i]
        let userObj = await fetchScannedUser(userId)
        relation.remove(userObj)
    }
    let saveGrupoRes = await grupoObj.save()
    return saveGrupoRes.id
}

export async function createGrupo(name: string, grupoAbv: string, nivelObjId: string, escuelaId: string) {
    // Current Escuela
    let escuelaObj = await fetchUserEscuela(escuelaId)
    // Nivel
    const Nivel = Parse.Object.extend("Nivel")
    const queryNivel = new Parse.Query(Nivel)
    const nivelObj = await queryNivel.get(nivelObjId)
    // Grupo
    const Grupo = Parse.Object.extend("grupo");
    const grupo = new Grupo();
    grupo.set("name", name);
    grupo.set("grupoId", grupoAbv);
    grupo.set("nivel", nivelObj);
    grupo.set("escuela", escuelaObj);

    let result = await grupo.save()
    return result.id
}

export async function fetchInformacion(escuelaId: string) {
    // Current Escuela
    let escuelaObj = await fetchUserEscuela(escuelaId)
    // Fetch Informacion
    const Informacion = Parse.Object.extend("Informacion")
    const query = new Parse.Query(Informacion)
    query.equalTo("escuela", escuelaObj)
    query.descending("createdAt");

    const results = await query.find()
    return results
}

export async function saveInformacion(escuelaId: string, titulo: string, descripcion: string) {
    // Current Escuela
    let escuelaObj = await fetchUserEscuela(escuelaId)

    const Informacion = Parse.Object.extend("Informacion");
    const informacion = new Informacion();
    informacion.set("tipo", titulo);
    informacion.set("contenido", descripcion);
    informacion.set("newS3Bucket", true);
    informacion.set("escuela", escuelaObj);

    let result = await informacion.save()
    return result.id
}

export async function eliminarInformacion(informacionObj: any) {
    let res = await informacionObj.destroy()
    return res.id
}

export async function fetchEventoRSVP(eventoId: string) {
    const eventoObj = await getEvento(eventoId)
    // Fetch EventoRSVP
    const EventoRSVP = Parse.Object.extend("EventoRSVP")
    const query = new Parse.Query(EventoRSVP)
    query.equalTo("evento", eventoObj)
    query.descending("fecha");
    query.include("user")

    const results = await query.find()

    return results
}

export async function savePago(pagoData: any, escuelaId: string) {
    let currentUser = await getCurrentUserObj()

    const Pagos = Parse.Object.extend("pagos")
    const pago = new Pagos()
    
    pago.set("escuela", escuelaId)
    pago.set("student", pagoData.estudianteObj)
    pago.set("concepto", pagoData.concepto)
    pago.set("cantidad", pagoData.cantidad)
    pago.set("total", pagoData.cantidad)
    pago.set("pagado", false)
    pago.set("manual", true)
    pago.set("user", currentUser)
    
    let result = await pago.save()
    return result.id
}

export async function fetchEstudiantesByGrupos(gruposArr: string[]) {
    const Estudiante = Parse.Object.extend("Estudiantes")
    const query = new Parse.Query(Estudiante)
    query.containedIn("grupo", gruposArr)

    const results = await query.find()
    return results
}

// ============================================
// Conversation Threads
// ============================================

/**
 * Save a new anuncio that belongs to a thread.
 * If threadId is provided, this message is a reply within an existing thread.
 * If threadId is null, a new thread is created (the message becomes the root).
 */
export async function saveAnuncioWithThread(
    params: Record<string, any>,
    grupo: any,
    estudianteId: string | null,
    nivelGrupos: any[] | null,
    threadId: string | null
): Promise<{ id: string, parseObject: any }> {
    if (threadId != null) {
        // Reply — link to existing thread root in a single save
        params["threadId"] = threadId

        // Ensure the root message also has threadId set (handles legacy messages
        // that were created before threading and don't have threadId yet)
        const Anuncio = Parse.Object.extend("anuncio")
        const rootQuery = new Parse.Query(Anuncio)
        const rootObj = await rootQuery.get(threadId)
        if (!rootObj.get("threadId")) {
            rootObj.set("threadId", threadId)
            await rootObj.save()
        }

        const savedId = await saveAnuncioObject(params, grupo, estudianteId, nivelGrupos)
        const savedQuery = new Parse.Query(Anuncio)
        const savedAnuncio = await savedQuery.get(savedId)
        return { id: savedId, parseObject: savedAnuncio }
    }

    // Threads are only for one-on-one messages (with a specific estudiante).
    // Group or school-wide messages save normally without threading.
    if (!estudianteId) {
        const anuncioObjId = await saveAnuncioObject(params, grupo, estudianteId, nivelGrupos)
        const Anuncio = Parse.Object.extend("anuncio")
        const query = new Parse.Query(Anuncio)
        const anuncioObj = await query.get(anuncioObjId)
        return { id: anuncioObjId, parseObject: anuncioObj }
    }

    // New thread — save first, then set threadId = own id (requires two saves
    // because we need the objectId to set as threadId)
    const anuncioObjId = await saveAnuncioObject(params, grupo, estudianteId, nivelGrupos)
    const Anuncio = Parse.Object.extend("anuncio")
    const query = new Parse.Query(Anuncio)
    const anuncioObj = await query.get(anuncioObjId)
    anuncioObj.set("threadId", anuncioObjId)
    await anuncioObj.save()
    return { id: anuncioObjId, parseObject: anuncioObj }
}

/**
 * Fetch conversation threads for the Comunicacion screen.
 * Groups anuncios by threadId and returns one entry per thread
 * (the root message) along with the latest reply timestamp and reply count.
 */
export async function fetchThreadsForComunicacion(escuelaId: string, grupoIds?: string[]) {
    try {
        let escuelaObj = await fetchUserEscuela(escuelaId)

        const User = Parse.Object.extend("_User")

        // For threaded messages, fetch ALL authors so we get complete threads
        // (correct reply counts, correct root/latest). We filter afterwards
        // to only include threads that contain at least one parent message.
        const allUsersQuery = new Parse.Query(User)
        allUsersQuery.equalTo("escuela", escuelaObj)
        allUsersQuery.equalTo("status", 0)

        // Fetch approved anuncios that have a threadId.
        // Threads are only for one-on-one messages (with a specific estudiante).
        const Anuncio = Parse.Object.extend("anuncio")
        const query = new Parse.Query(Anuncio)
        query.equalTo("aprobado", true)
        query.notEqualTo("actionTaken", true)
        query.matchesQuery("autor", allUsersQuery)
        query.exists("threadId")
        query.exists("estudiante")
        query.include("autor")
        query.include("tipo")
        query.include("grupos")
        query.include("estudiante")
        query.include("estudiante.grupo")
        query.descending("createdAt")
        query.limit(200)

        const results = await query.find()

        // Group by threadId, tracking whether any message is from a parent
        const threadMap: Record<string, { root: any, latest: any, replyCount: number, hasParentMessage: boolean }> = {}

        for (const anuncio of results) {
            const tid = anuncio.get("threadId")
            if (!tid) continue

            const autorUsertype = anuncio.get("autor")?.get("usertype")
            const isParent = autorUsertype === 2

            if (!threadMap[tid]) {
                threadMap[tid] = {
                    root: anuncio,
                    latest: anuncio,
                    replyCount: 1,
                    hasParentMessage: isParent
                }
            } else {
                threadMap[tid].replyCount++
                if (isParent) threadMap[tid].hasParentMessage = true
                // Keep the most recent message as "latest"
                if (anuncio.createdAt > threadMap[tid].latest.createdAt) {
                    threadMap[tid].latest = anuncio
                }
                // Keep the oldest message as "root"
                if (anuncio.createdAt < threadMap[tid].root.createdAt) {
                    threadMap[tid].root = anuncio
                }
            }
        }

        // Only keep threads that have at least one parent (usertype 2) message
        for (const tid of Object.keys(threadMap)) {
            if (!threadMap[tid].hasParentMessage) {
                delete threadMap[tid]
            }
        }

        // Standalone (non-threaded) messages: only from parents (usertype 2)
        const parentUserQuery = new Parse.Query(User)
        parentUserQuery.equalTo("escuela", escuelaObj)
        parentUserQuery.equalTo("status", 0)
        parentUserQuery.equalTo("usertype", 2)

        const queryNonThreaded = new Parse.Query(Anuncio)
        queryNonThreaded.equalTo("aprobado", true)
        queryNonThreaded.notEqualTo("actionTaken", true)
        queryNonThreaded.matchesQuery("autor", parentUserQuery)
        queryNonThreaded.doesNotExist("threadId")
        queryNonThreaded.include("autor")
        queryNonThreaded.include("tipo")
        queryNonThreaded.include("grupos")
        queryNonThreaded.include("estudiante")
        queryNonThreaded.include("estudiante.grupo")
        queryNonThreaded.descending("createdAt")
        queryNonThreaded.limit(35)

        const nonThreadedResults = await queryNonThreaded.find()

        // If grupoIds provided (docente), filter threads/messages by grupo
        const filterByGrupos = (anuncio: any): boolean => {
            if (!grupoIds || grupoIds.length === 0) return true
            const grupos = anuncio.get("grupos")
            if (grupos && grupos.some((g: any) => grupoIds.includes(g.id))) return true
            const estudiante = anuncio.get("estudiante")
            if (estudiante) {
                const grupoObj = estudiante.get("grupo")
                if (grupoObj && grupoIds.includes(grupoObj.id)) return true
            }
            return false
        }

        // Filter threadMap entries by grupo membership
        if (grupoIds && grupoIds.length > 0) {
            for (const tid of Object.keys(threadMap)) {
                if (!filterByGrupos(threadMap[tid].root)) {
                    delete threadMap[tid]
                }
            }
        }

        const filteredNonThreaded = nonThreadedResults.filter(filterByGrupos)

        // Build the combined list: threads + standalone messages
        const threadEntries = Object.values(threadMap).map(t => ({
            rootAnuncio: t.root,
            latestAnuncio: t.latest,
            replyCount: t.replyCount,
            threadId: t.root.get("threadId"),
            isThread: true,
            sortDate: t.latest.createdAt
        }))

        const standaloneEntries = filteredNonThreaded.map(a => ({
            rootAnuncio: a,
            latestAnuncio: a,
            replyCount: 0,
            threadId: null,
            isThread: false,
            sortDate: a.createdAt
        }))

        const allEntries = [...threadEntries, ...standaloneEntries]
        allEntries.sort((a, b) => b.sortDate - a.sortDate)

        return allEntries
    } catch (error) {
        console.error("Error in fetchThreadsForComunicacion:", error)
        throw error
    }
}

/**
 * Fetch all messages within a specific conversation thread.
 * Returns messages sorted chronologically (oldest first).
 */
export async function fetchThreadMessages(threadId: string) {
    try {
        const Anuncio = Parse.Object.extend("anuncio")
        const query = new Parse.Query(Anuncio)
        query.equalTo("threadId", threadId)
        query.equalTo("aprobado", true)
        query.include("autor")
        query.include("tipo")
        query.include("grupos")
        query.include("estudiante")
        query.ascending("createdAt")
        query.limit(100)

        const results = await query.find()

        // Also fetch attachment photos for all messages in the thread
        const AnuncioPhoto = Parse.Object.extend("AnuncioPhoto")
        const photoQuery = new Parse.Query(AnuncioPhoto)
        photoQuery.containedIn("anuncio", results)
        photoQuery.descending("createdAt")
        photoQuery.limit(200)
        const photos = await photoQuery.find()

        return {
            messages: results,
            photos: photos
        }
    } catch (error) {
        console.error("Error in fetchThreadMessages:", error)
        throw error
    }
}

/**
 * Group an array of anuncio objects into thread entries.
 * Used by ComunicacionScreen to group sent/pending messages by thread.
 */
export function groupAnunciosByThread(anuncios: any[]) {
    const threadMap: Record<string, { root: any, latest: any, replyCount: number }> = {}
    const standalone: any[] = []

    for (const anuncio of anuncios) {
        const tid = anuncio.get("threadId")
        // Threads are only for one-on-one messages. Group/school messages
        // are treated as standalone even if they have a threadId.
        if (!tid || !anuncio.get("estudiante")) {
            standalone.push(anuncio)
            continue
        }
        if (!threadMap[tid]) {
            threadMap[tid] = { root: anuncio, latest: anuncio, replyCount: 1 }
        } else {
            threadMap[tid].replyCount++
            if (anuncio.createdAt > threadMap[tid].latest.createdAt) {
                threadMap[tid].latest = anuncio
            }
            if (anuncio.createdAt < threadMap[tid].root.createdAt) {
                threadMap[tid].root = anuncio
            }
        }
    }

    const threadEntries = Object.values(threadMap).map(t => ({
        rootAnuncio: t.root,
        latestAnuncio: t.latest,
        replyCount: t.replyCount,
        threadId: t.root.get("threadId"),
        isThread: true,
        sortDate: t.latest.createdAt
    }))

    const standaloneEntries = standalone.map(a => ({
        rootAnuncio: a,
        latestAnuncio: a,
        replyCount: 0,
        threadId: null,
        isThread: false,
        sortDate: a.createdAt
    }))

    const allEntries = [...threadEntries, ...standaloneEntries]
    allEntries.sort((a, b) => b.sortDate - a.sortDate)
    return allEntries
}

// ============================================
// Public Parent Registration
// ============================================

/**
 * Validate a school registration code and return the school object if valid.
 * The registration code is the Escuela's objectId.
 */
export async function validateSchoolCode(schoolCode: string) {
    try {
        const Escuela = Parse.Object.extend("Escuela")
        const query = new Parse.Query(Escuela)
        const escuela = await query.get(schoolCode)

        if (!escuela) {
            return { valid: false, escuela: null, nombre: null }
        }

        const isPaid = escuela.get("paid")
        if (isPaid === false) {
            return { valid: false, escuela: null, nombre: null }
        }

        return {
            valid: true,
            escuela: escuela,
            escuelaId: escuela.id,
            nombre: escuela.get("nombre"),
        }
    } catch (error) {
        console.error("Error validating school code:", error)
        return { valid: false, escuela: null, nombre: null }
    }
}

/**
 * Public registration: create a student record with pending status.
 * The student is linked to the school but not yet assigned to a grupo.
 */
export async function saveEstudiantePendiente(escuelaId: string, estudianteData: Record<string, any>) {
    const Estudiantes = Parse.Object.extend("Estudiantes")
    const estudiante = new Estudiantes()

    const Escuela = Parse.Object.extend("Escuela")
    const escuelaQuery = new Parse.Query(Escuela)
    const escuelaObj = await escuelaQuery.get(escuelaId)

    estudiante.set("NOMBRE", estudianteData.nombre)
    estudiante.set("ApPATERNO", estudianteData.apPaterno)
    estudiante.set("ApMATERNO", estudianteData.apMaterno)
    estudiante.set("APELLIDO", `${estudianteData.apPaterno} ${estudianteData.apMaterno}`)
    estudiante.set("CURP", estudianteData.curp || "")
    estudiante.set("GENERO", estudianteData.genero || "")
    estudiante.set("fechaNacimiento", estudianteData.fechaNacimiento)
    estudiante.set("escuela", escuelaObj)
    estudiante.set("status", "pendiente")

    const result = await estudiante.save()
    return result.id
}

/**
 * Public registration: creates a parent user and links them to the student.
 * Calls the newUserSignUp cloud function and then creates the relationship.
 * Returns the parent credentials for email notification.
 */
export async function registerParentPublic(
    escuelaId: string,
    estudianteId: string,
    parentData: {
        nombre: string
        apellidos: string
        email: string
        telefono: string
        direccion: string
        parentesco: string
    }
) {
    // Create the parent user via cloud function
    const userParams = {
        username: parentData.email || `${parentData.nombre}_${parentData.apellidos}`,
        nombre: parentData.nombre,
        apellidos: parentData.apellidos,
        domicilio: parentData.direccion,
        telCasa: "",
        telCel: parentData.telefono,
        email: parentData.email,
        parentesco: parentData.parentesco,
        escuela: escuelaId,
    }

    const result = await runCloudCodeFunction("newUserSignUp", userParams)

    let userId: string | null = null
    if (result) {
        if (result.success && result.data) {
            userId = result.data.userId || result.data.objectId || result.data.id
        } else if (typeof result === "string") {
            userId = result
        } else if (result.objectId || result.id || result.userId) {
            userId = result.objectId || result.id || result.userId
        }
    }

    if (!userId) {
        throw new Error("No fue posible crear la cuenta del padre/madre.")
    }

    // Link the parent to the student
    await updateEstudiantePersonasAutRelation(estudianteId, [userId])

    return {
        userId,
        username: userParams.username,
    }
}

/**
 * Send welcome email with login credentials after public registration.
 * Calls a cloud function that handles email delivery server-side.
 */
export async function sendRegistrationEmail(params: {
    email: string
    parentName: string
    studentName: string
    schoolName: string
    username: string
    escuelaId: string
}) {
    try {
        const result = await runCloudCodeFunction("sendParentRegistrationEmail", {
            email: params.email,
            parentName: params.parentName,
            studentName: params.studentName,
            schoolName: params.schoolName,
            username: params.username,
            escuelaId: params.escuelaId,
        })
        return result
    } catch (error) {
        console.error("Error sending registration email:", error)
        // Don't throw - email failure shouldn't block registration
        return null
    }
}

export async function fetchFacturapiRFCs(estudianteId: string) {
    const Facturapi = Parse.Object.extend("Facturapi")
    const query = new Parse.Query(Facturapi)
    query.equalTo("estudiante", estudianteId)
    query.descending("createdAt")

    const results = await query.find()
    return results
}