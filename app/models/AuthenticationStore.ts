import { Instance, SnapshotOut, types } from "mobx-state-tree"
import * as SQLiteAPI from "../services/sqlite/SQLiteAPI"

export const AuthenticationStoreModel = types
  .model("AuthenticationStore")
  .props({
    authToken: types.maybe(types.string),
    authUserId: types.maybe(types.string),
    authUserEscuela: types.optional(types.string, ""),
    authEscuelaName: types.optional(types.string, ""),
    authUsername: types.optional(types.string, ""),
    authPassword: types.optional(types.string, ""),
    authUsertype: types.optional(types.integer, -1),
  })
  .views((store) => ({
    get isAuthenticated() {
      return !!store.authToken
    },
    get validationErrors() {
      return {
        authUsername: (function () {
          if (store.authUsername.length === 0) return "No puede estar en blanco"
          return ""
        })(),
        authPassword: (function () {
          if (store.authPassword.length === 0) return "No puede estar en blanco"
          if (store.authPassword.length < 3) return "Debe ser al menos 3 caracteres"
          return ""
        })(),
      }
    },
  }))
  .actions((store) => ({
    setAuthToken(value?: string) {
      store.authToken = value
    },
    setAuthUsername(value: string) {
      // store.authUsername = value.replace(/ /g, "") // REMOVE
      store.authUsername = value
    },
    setAuthPassword(value: string) {
      // store.authPassword = value.replace(/ /g, "")
      store.authPassword = value
    },
    setAuthUserId(value: string) {
      store.authUserId = value
    },
    setAuthUserEscuela(value: string) {
      store.authUserEscuela = value
    },
    setAuthEscuelaName(value: string) {
      store.authEscuelaName = value
    },
    setAuthUsertype(value: number) {
      store.authUsertype = value
    },
    logout() {
      console.log("AuthStore - logout")
      // SQLite - Drop Tables
      SQLiteAPI.dropAllTables()
      store.authToken = undefined
      store.authUsername = ""
      store.authPassword = ""
      store.authUserId = ""
      store.authUserEscuela = ""
      store.authEscuelaName = ""
      store.authUsertype = -1
    },
  }))

export interface AuthenticationStore extends Instance<typeof AuthenticationStoreModel> {}
export interface AuthenticationStoreSnapshot extends SnapshotOut<typeof AuthenticationStoreModel> {}
