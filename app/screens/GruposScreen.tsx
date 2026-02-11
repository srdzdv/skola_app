import React, { FC, useEffect, useState, useCallback, useRef, memo } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, SectionList, RefreshControl, TextStyle, ActivityIndicator, Platform } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem, Button } from "app/components"
import { colors, spacing } from "../theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "app/models"
import * as ParseAPI from "../services/parse/ParseAPI"
import * as SQLiteAPI from "../services/sqlite/SQLiteAPI"
import * as Haptics from 'expo-haptics';
import moment from 'moment';

interface GruposScreenProps extends NativeStackScreenProps<AppStackScreenProps<"Grupos">> {}

interface GrupoData {
  id: string;
  get: (key: string) => string;
}

interface EstudianteData {
  id: string;
  objectId?: string;
  nombre?: string;
  apellidos?: string;
  grupoId?: string;
  get: (key: string) => string;
}

interface DBGrupo {
  objectId: string;
  name: string;
}

interface DBEstudiante {
  objectId: string;
  nombre: string;
  apellidos: string;
  grupoId: string;
}

interface ParseEstudiante {
  id: string;
  get: (key: string) => string;
}

interface GrupoSection {
  title: string;
  data: EstudianteData[];
}

type NavigationProp = NativeStackScreenProps<AppStackScreenProps<"Grupos">>["navigation"]

// Memoized list item component for estudiantes
const EstudianteListItem = memo(function EstudianteListItem({
  id,
  nombre,
  apellidos,
  isDBdata,
  onPress,
}: {
  id: string
  nombre: string
  apellidos: string
  isDBdata: boolean
  onPress: (id: string) => void
}) {
  const handlePress = useCallback(() => {
    onPress(id)
  }, [id, onPress])

  return (
    <ListItem style={$itemRow} topSeparator={false} bottomSeparator={true} onPress={handlePress}>
      <Text size="md" weight="bold">{nombre + " " + apellidos}</Text>
    </ListItem>
  )
})

// Memoized section header component
const GrupoSectionHeader = memo(function GrupoSectionHeader({
  title,
  grupoId,
  isDBdata,
  onButtonTapped,
}: {
  title: string
  grupoId: string
  isDBdata: boolean
  onButtonTapped: (buttonId: string) => void
}) {
  const handleTareas = useCallback(() => {
    onButtonTapped(`0_${title}_${grupoId}`)
  }, [title, grupoId, onButtonTapped])

  const handleAnuncios = useCallback(() => {
    onButtonTapped(`1_${title}_${grupoId}`)
  }, [title, grupoId, onButtonTapped])

  const handleMomentos = useCallback(() => {
    onButtonTapped(`2_${title}_${grupoId}`)
  }, [title, grupoId, onButtonTapped])

  const handlePlaneacion = useCallback(() => {
    onButtonTapped(`3_${title}_${grupoId}`)
  }, [title, grupoId, onButtonTapped])

  return (
    <View style={$sectionHeader}>
      <View style={$sectionTextView}>
        <Text weight="medium" style={$sectionText}>{title}</Text>
      </View>
      <View style={$sectionSubview}>
        <Button
          testID="tareas-button"
          text="Tareas"
          style={$tareasButton}
          textStyle={$buttonText}
          preset="reversed"
          onPress={handleTareas}
        />
        <Button
          testID="anuncios-button"
          text="Anuncios"
          style={$anunciosButton}
          textStyle={$buttonText}
          preset="reversed"
          onPress={handleAnuncios}
        />
        <Button
          testID="momentos-button"
          text="Momentos"
          style={$momentosButton}
          textStyle={$buttonText}
          preset="reversed"
          onPress={handleMomentos}
        />
        <Button
          testID="planeacion-button"
          text="Planeación"
          style={$planeacionButton}
          textStyle={$buttonTextBold}
          preset="reversed"
          onPress={handlePlaneacion}
        />
      </View>
    </View>
  )
})

type Dictionary = {
  [key: string]: EstudianteData[]
}

export const GruposScreen: FC<GruposScreenProps> = observer(function GruposScreen() {
  const [listData, setListData] = useState<GrupoSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDBdata, setIsDBdata] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Use ref for mutable data that doesn't need to trigger re-renders
  const estudiantesDictRef = useRef<Dictionary>({});

  const {
    authenticationStore: {
      authUserEscuela,
    },
  } = useStores()

  // Pull in navigation via hook
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    fetchDBGrupos()
  }, [isLoading])

  async function fetchDBGrupos() {
    if (listData.length === 0 && !refreshing) {
      const dbResults = await SQLiteAPI.readDBPromise("Grupo", "WHERE TRUE", []) as DBGrupo[];
      if (dbResults.length > 0) {
        console.log("**Fetch from DB**");
        setIsDBdata(true);
        await processDataFromDB(dbResults);
      } else {
        setIsDBdata(false);
        await fetchServerData();
      }
    }
  }

  async function processDataFromDB(gruposDB: DBGrupo[]) {
    if (listData.length === 0) {
      const DATA: GrupoSection[] = [];
      for (const grupo of gruposDB) {
        const estudiantesGrupoArr = await readEstudianteFromDB(grupo);
        if (estudiantesGrupoArr.length > 0) {
          const dataItem: GrupoSection = {
            title: grupo.name,
            data: estudiantesGrupoArr.map(estudiante => ({
              id: estudiante.objectId,
              objectId: estudiante.objectId,
              nombre: estudiante.nombre,
              apellidos: estudiante.apellidos,
              grupoId: estudiante.grupoId,
              get: (key: string) => estudiante[key as keyof DBEstudiante] || ""
            }))
          };
          DATA.push(dataItem);
        }
      }
      setIsLoading(false);
      setListData(DATA);
    }
  }

  async function readEstudianteFromDB(grupoObj: DBGrupo): Promise<DBEstudiante[]> {
    const searchCondition = "WHERE grupoId = ? ORDER BY apellidos ASC";
    const results = await SQLiteAPI.readDBPromise("Estudiante", searchCondition, [grupoObj.objectId]);
    return results as DBEstudiante[];
  }

  async function fetchServerData() {
    try {
      const userEscuelaObj = await ParseAPI.fetchUserEscuela(authUserEscuela);
      const fetchedGruposArr = await ParseAPI.fetchGrupos(userEscuelaObj);
      
      const myClonedArray = [...fetchedGruposArr];
      const DATA: GrupoSection[] = [];

      // First grupo
      const firstGrupo = myClonedArray.shift();
      if (firstGrupo) {
        const firstGrupoEstudiantesObj = await fetchEstudiantesAndPushToGrupo(firstGrupo);
        if (firstGrupoEstudiantesObj.data.length > 0) {
          DATA.push(firstGrupoEstudiantesObj);
          setListData([...DATA]);
        }
      }

      // The rest of grupos
      for (const grupo of myClonedArray) {
        const grupoEstudiantesObj = await fetchEstudiantesAndPushToGrupo(grupo);
        if (grupoEstudiantesObj.data.length > 0) {
          DATA.push(grupoEstudiantesObj);
        }
      }

      setIsLoading(false);
      setListData([...DATA]);
      setRefreshing(false);

      // Store in cache
      await storeServerDataInDB(fetchedGruposArr);
    } catch (error) {
      console.error("Error fetching server data:", error);
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchEstudiantesAndPushToGrupo(grupoObj: GrupoData): Promise<GrupoSection> {
    const estudiantesGrupoArr = await ParseAPI.fetchEstudiantesByGrupo(grupoObj) as EstudianteData[];
    estudiantesDictRef.current[grupoObj.id] = estudiantesGrupoArr;
    return {
      title: grupoObj.get('name'),
      data: estudiantesGrupoArr,
    };
  }

  async function storeServerDataInDB(gruposData: GrupoData[]) {
    for (const grupo of gruposData) {
      await writeGrupoToDB(grupo);
      const grupoId = grupo.id;
      const estudiantesGrupoData = estudiantesDictRef.current[grupoId];
      if (estudiantesGrupoData) {
        for (const estudiante of estudiantesGrupoData) {
          await writeEstudianteToDB(estudiante, grupoId);
        }
      }
    }
  }

  async function writeGrupoToDB(grupoObj: GrupoData): Promise<boolean> {
    try {
      const tableName = "Grupo";
      const colNames = "(objectId, name)";
      const valuesPlaceholder = "(?, ?)";
      const valuesArr = [grupoObj.id, grupoObj.get("name")];

      const insertResult = await SQLiteAPI.createRecordInTable(
        tableName,
        colNames,
        valuesPlaceholder,
        valuesArr
      );

      return !!insertResult;
    } catch (error) {
      console.error("Error writing grupo to DB:", error);
      return false;
    }
  }

  async function writeEstudianteToDB(estudianteObj: EstudianteData, grupoId: string): Promise<boolean> {
    try {
      const objectId = estudianteObj.id;
      const nombre = estudianteObj.get("NOMBRE");
      const apellidos = estudianteObj.get("APELLIDO");
      const tableName = "Estudiante";
      const colNames = "(objectId, nombre, apellidos, grupoId)";
      const valuesPlaceholder = "(?, ?, ?, ?)";
      const valuesArr = [objectId, nombre, apellidos, grupoId];
      
      const insertResult = await SQLiteAPI.createRecordInTable(
        tableName, 
        colNames, 
        valuesPlaceholder, 
        valuesArr
      );

      return !!insertResult;
    } catch (error) {
      console.error("Error writing estudiante to DB:", error);
      return false;
    }
  }

  // Memoize today's date string - only computed once per render
  const todayDateString = moment().format('ll');

  const buttonTapped = useCallback((buttonId: string) => {
    console.log("buttonTapped: " + buttonId)
    const splitted = buttonId.split("_");
    const actividadType = splitted[0];
    const grupoName = splitted[1];
    const grupoId = splitted[2];

    const actividadParams = {
      actividadType,
      grupoName,
      grupoId
    };

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate("Actividad" as any, actividadParams);
  }, [navigation]);

  // Create a lookup map for quick item access
  const itemLookupRef = useRef<Map<string, EstudianteData>>(new Map());

  // Update lookup when listData changes
  useEffect(() => {
    const map = new Map<string, EstudianteData>();
    listData.forEach(section => {
      section.data.forEach(item => {
        map.set(item.id, item);
      });
    });
    itemLookupRef.current = map;
  }, [listData]);

  const handleEstudiantePress = useCallback((estudianteId: string) => {
    const estudianteObj = itemLookupRef.current.get(estudianteId);
    if (!estudianteObj) return;

    let id = "";
    let nombre = "";
    if (estudianteObj.get("ApPATERNO")?.length > 0) {
      // Server response
      id = estudianteObj.id;
      nombre = estudianteObj.get("NOMBRE") + " " + estudianteObj.get("APELLIDO");
    } else {
      // Local DB response
      id = estudianteObj.objectId || "";
      nombre = (estudianteObj.nombre || "") + " " + (estudianteObj.apellidos || "");
    }

    const navParams = {
      estudianteObjectId: id,
      nombre: nombre
    };

    navigation.navigate("AlumnoMensajes" as any, navParams);
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setIsDBdata(false)
    setIsLoading(true)
    setListData([])
    setRefreshing(true);
    fetchServerData()
  }, []);

  const keyExtractor = useCallback((item: EstudianteData) => item.id, []);

  const renderItem = useCallback(({ item }: { item: EstudianteData }) => {
    // Extract display name based on data source
    const nombre = isDBdata ? (item.nombre || "") : item.get("NOMBRE");
    const apellidos = isDBdata ? (item.apellidos || "") : item.get("APELLIDO");

    return (
      <EstudianteListItem
        id={item.id}
        nombre={nombre}
        apellidos={apellidos}
        isDBdata={isDBdata}
        onPress={handleEstudiantePress}
      />
    );
  }, [isDBdata, handleEstudiantePress]);

  const renderSectionHeader = useCallback(({ section }: { section: GrupoSection }) => {
    if (section.data.length === 0) return null;

    const firstItem = section.data[0];
    const grupoId = isDBdata
      ? (firstItem.grupoId || "")
      : firstItem.get("grupo")?.id || "";

    return (
      <GrupoSectionHeader
        title={section.title}
        grupoId={grupoId}
        isDBdata={isDBdata}
        onButtonTapped={buttonTapped}
      />
    );
  }, [isDBdata, buttonTapped]);

  return (
    <Screen style={$root} preset="fixed" safeAreaEdges={["top"]} >
      <View style={$headerView}>
        <Text style={$header} text="Grupos" preset="heading" />
        <Text style={$headerDate} preset="default">{todayDateString}</Text>
      </View>
      <View style={$listView}>
        {isLoading ? (
          <View style={$spinner}>
            <ActivityIndicator size="large" color="#000000" />
          </View>
        ) : (
          <SectionList
            sections={listData}
            keyExtractor={keyExtractor}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}
      </View>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  marginBottom: 90
}

const $headerView: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
}

const $header: TextStyle = {
  paddingLeft: spacing.small,
  color: colors.palette.neutral700
}
const $headerDate: TextStyle = {
  paddingRight: spacing.small
}

const $spinner: ViewStyle = {
  flex: 1,
  paddingTop: 50,
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center"
}

const $listView: ViewStyle = {
  backgroundColor: colors.background,
  marginTop: spacing.extraSmall,
}

const $sectionText: TextStyle = {
  paddingTop: 4,
  fontSize: 26,
}

const $sectionTextView: ViewStyle = {
  flex: 1,
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center",
}

const $sectionHeader: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  paddingTop: spacing.small,
  paddingBottom: spacing.micro,
}

const $sectionSubview: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  justifyContent: "space-between",
  paddingHorizontal: spacing.tiny,
  paddingVertical: spacing.tiny,
}

const $itemRow: ViewStyle = {
  paddingLeft: spacing.small,
  paddingBottom: spacing.extraSmall,
  paddingTop: spacing.extraSmall
}

const $tareasButton: ViewStyle = {
  padding: spacing.tiny,
  width: 90,
  borderRadius: 100,
  borderColor: colors.palette.grassDark,
  backgroundColor: colors.palette.grassLight,
  borderBottomWidth: Platform.OS === 'ios' ? 2 : 0
}

const $anunciosButton: ViewStyle = {
  padding: spacing.tiny,
  width: 92,
  borderRadius: 100,
  backgroundColor: colors.palette.bluejeansLight,
  borderColor: colors.palette.bluejeansDark,
  borderBottomWidth: Platform.OS === 'ios' ? 2 : 0
}

const $momentosButton: ViewStyle = {
  padding: spacing.tiny,
  width: 92,
  borderRadius: 100,
  backgroundColor: colors.palette.bittersweetLight,
  borderColor: colors.palette.bittersweetDark,
  borderBottomWidth: Platform.OS === 'ios' ? 2 : 0
}

const $planeacionButton: ViewStyle = {
  padding: spacing.tiny,
  width: 92,
  borderRadius: 100,
  backgroundColor: colors.palette.sunflowerLight,
  borderColor: colors.palette.sunflowerDark,
  borderBottomWidth: Platform.OS === 'ios' ? 2 : 0
}

const $buttonText: TextStyle = {
  fontSize: 12,
}

const $buttonTextBold: TextStyle = {
  fontSize: 12,
  fontWeight: "bold",
}