import React, { useState, useEffect } from 'react';
import * as ParseAPI from "../services/parse/ParseAPI"
import * as AWSService from '../services/AWSService'
import { colors } from "../theme"
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import {Picker} from '@react-native-picker/picker';
import { StyleSheet, View, Image, TextInput, TouchableOpacity, Text, Button, Modal, Alert } from 'react-native';

// Convert HEIC/HEIF images to JPEG for S3 compatibility
const convertHeicToJpeg = async (uri: string, mimeType: string): Promise<string> => {
  const isHeic = mimeType?.toLowerCase().includes('heic') || mimeType?.toLowerCase().includes('heif')
  if (!isHeic) {
    return uri
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  )
  return result.uri
}


const EmptyPerson = {
  nombre: '',
  apellidos: '',
  domicilio: '',
  telefonocasa: '',
  telefonocelular: '',
  parentesco: '',
  photo: null,
};

interface PersonRowProps {
  person: any;
  onChange: (field: string, value: any) => void;
}

const PersonRow = ({ person, onChange }: PersonRowProps) => {
    const [pickerVisible, setPickerVisible] = useState(false)
    const [photoURL, setPhotoURL] = useState(person.photo || null)
    const [userStatus, setUserStatus] = useState(person.status || 0)

    // Update photoURL when person.photo changes
    useEffect(() => {
        setPhotoURL(person.photo || null)
    }, [person.photo])

    // Update userStatus when person.status changes
    useEffect(() => {
        setUserStatus(person.status || 0)
    }, [person.status])

    async function adjuntarFotoAction(person: any) {
        let result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          quality: 1,
        });

        if (!result.canceled) {
          // Convert HEIC to JPEG if needed
          const originalUri = result.assets[0].uri
          const mimeType = result.assets[0].mimeType ?? ''
          const assetURI = await convertHeicToJpeg(originalUri, mimeType)

          if (person && person.id) {
            guardarPersAutPhoto(assetURI, person.id)
          } else {
            console.log("Null Person or no ID: " + JSON.stringify(person))
            setPhotoURL(assetURI)
            onChange('photo', assetURI)
          }
        } else {
          console.log('You did not select any image.');
        }
      }

      async function guardarPersAutPhoto(assetURL: string, userObjId: string) {
        const oldPhotoURL = photoURL
        setPhotoURL(assetURL)

        try {
          // Check if existing photo first
          if (oldPhotoURL != null) {
            await ParseAPI.destroyUserPhoto(userObjId)
          }

          // saveUserPhoto
          let resId = await ParseAPI.saveUserPhoto(userObjId);
          if (resId != null) {
            await uploadFileToAWSS3(resId, assetURL);
            presentFeedback("Foto Guardada", "La foto se ha guardado correctamente. No es necesario dar click al botón de guardar.")
          } else {
            setPhotoURL(oldPhotoURL)
            presentFeedback("Ocurrió algo inesperado", "No fue posible guardar la photo de la persona autorizada. Favor de intentar de nuevo.")
          }
        } catch (error) {
          setPhotoURL(oldPhotoURL)
          console.error("PersonRow_Error saving persona autorizada photo:", error);
          presentFeedback("Ocurrió algo inesperado", "No fue posible guardar la photo de la persona autorizada. Favor de intentar de nuevo.")
        }
      }

      async function uploadFileToAWSS3(anuncioPhotoObjectId: string, assetURL: string) {
        try {
          const uploadRes = await AWSService.uploadImageDataToAWS(anuncioPhotoObjectId, assetURL, 'image/jpg', true);
          console.log("**uploadFileToAWSS3: " + JSON.stringify(uploadRes));
        } catch (error) {
          console.error("Error uploading to AWS S3:", error);
          throw error;
        }
      }

      function presentFeedback(alertTitle: string, alertMessage: string) {
        Alert.alert(
          alertTitle,
          alertMessage,
          [
            {text: 'Ok', onPress: undefined, style: 'default'},
          ],
          {cancelable: false},
        );
      }

      async function activateUser() {
        if (!person.id) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          presentFeedback("Error", "No se puede activar un usuario sin ID.")
          return
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        try {
          const params = { objectID: person.id, status: 0 }
          const result = await ParseAPI.runCloudCodeFunction("modifyUserStatus", params)

          // Handle new standardized response format
          if (result && result.success) {
            setUserStatus(0)
            onChange('status', 0) // Update the parent component
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            presentFeedback("Usuario Activado", "El usuario ha sido activado correctamente.")
          } else {
            const errorMsg = result?.error?.message || "No fue posible activar el usuario. Intente de nuevo."
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            presentFeedback("Error", errorMsg)
          }
        } catch (error) {
          console.error("Error activating user:", error)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          presentFeedback("Error", "Ocurrió un error al activar el usuario.")
        }
      }

      function PhotoView(props: { photoURL: string }) {
        return <Image source={{ uri: props.photoURL }} style={{ width: 125, height: 156, borderRadius: 8, alignSelf: 'center', marginTop: 6, marginBottom: 6,}} />
      }

  return (
    <View style={styles.personContainer}>
      <View style={styles.photoRow}>
        {photoURL != null &&
          <PhotoView photoURL={photoURL} />
        }
        <Button
          title="Adjuntar foto"
          onPress={() => adjuntarFotoAction(person)}
        />
      </View>
      {userStatus !== 0 && userStatus !== undefined && (
        <View>
          <Text style={styles.deactivatedWarning}>Persona Desactivada</Text>
          <TouchableOpacity style={styles.activateButton} onPress={activateUser}>
            <Text style={styles.activateButtonText}>Activar</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.row}>
        <TextInput
          id="nombre"
          style={styles.input}
          value={person.nombre}
          autoCapitalize="words"
          placeholder="Nombre"
          placeholderTextColor="gray"
          onChangeText={(text) => onChange('nombre', text)}
        />
        </View>
        <View style={styles.row}>
        <TextInput
          id="apellidos"
          style={styles.input}
          value={person.apellidos}
          autoCapitalize="words"
          placeholder="Apellidos"
          placeholderTextColor="gray"
          onChangeText={(text) => onChange('apellidos', text)}
        />
      </View>


      <View style={styles.row}>
        <TouchableOpacity style={styles.input} onPress={() => {setPickerVisible(true)}}>
          <Text style={{color: person.parentesco?.length > 0 ? "black" : "gray"}}>{person.parentesco?.length > 0 ? person.parentesco : "Parentesco"}</Text>
        </TouchableOpacity>
        <Modal
            transparent={true}
            visible={pickerVisible}
            onRequestClose={() => setPickerVisible(false)}
        >
            <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={person.parentesco}
                  onValueChange={(itemValue, itemIndex) => {
                      onChange('parentesco', itemValue);
                      setPickerVisible(false);
                  }
                }>
                    <Picker.Item label="Seleccione parentesco" value="" />
                    <Picker.Item label="Familiar" value="Familiar" />
                    <Picker.Item label="Tío" value="Tío" />
                    <Picker.Item label="Tía" value="Tía" />
                    <Picker.Item label="Abuelo" value="Abuelo" />
                    <Picker.Item label="Abuela" value="Abuela" />
                    <Picker.Item label="Abuelo Materno" value="Abuelo Materno" />
                    <Picker.Item label="Abuelo Paterno" value="Abuelo Paterno" />
                    <Picker.Item label="Abuela Materna" value="Abuela Materna" />
                    <Picker.Item label="Abuela Paterna" value="Abuela Paterna" />
                    <Picker.Item label="Amigo" value="Amigo" />
                    <Picker.Item label="Amiga" value="Amiga" />
                    <Picker.Item label="Hermano" value="Hermano" />
                    <Picker.Item label="Hermana" value="Hermana" />
                    <Picker.Item label="Conocido" value="Conocido" />
                    <Picker.Item label="Conocida" value="Conocida" />
                    <Picker.Item label="Vecino" value="Vecino" />
                    <Picker.Item label="Vecina" value="Vecina" />
                    <Picker.Item label="Primo" value="Primo" />
                    <Picker.Item label="Prima" value="Prima" />
                    <Picker.Item label="Empleado" value="Empleado" />
                    <Picker.Item label="Empleada" value="Empleada" />
                    <Picker.Item label="Otro" value="Otro" />
                </Picker>
            </View>
            </View>
        </Modal>
      </View>

      <View style={styles.row}>
        <TextInput
          id="domicilio"
          style={styles.input}
          value={person.domicilio}
          placeholder="Domicilio"
          placeholderTextColor="gray"
          onChangeText={(text) => onChange('domicilio', text)}
        />
        </View>
        <View style={styles.row}>
        <TextInput
          id="telefonocasa"
          style={styles.input}
          value={person.telefonocasa}
          placeholder="Teléfono 1"
          placeholderTextColor="gray"
          onChangeText={(text) => onChange('telefonocasa', text)}
        />
        <TextInput
          id="telefonocelular"
          style={styles.input}
          value={person.telefonocelular}
          placeholder="Teléfono 2"
          placeholderTextColor="gray"
          onChangeText={(text) => onChange('telefonocelular', text)}
        />
      </View>
    </View>
  );
};

interface PersonasAutorizadasTableProps {
  onPeopleUpdate: (updatedPeople: any[], changedPeople: any) => void;
  existingPeople: any[];
}

const PersonasAutorizadasTable = ({ onPeopleUpdate, existingPeople }: PersonasAutorizadasTableProps) => {
  const [people, setPeople] = useState(
    (Array.isArray(existingPeople) && existingPeople.length > 0)
      ? existingPeople
      : [EmptyPerson, EmptyPerson, EmptyPerson]
  );
  const [changedPeople, setChangedPeople] = useState<{[key: number]: any}>({});

  // Keep internal state in sync with incoming props
  useEffect(() => {
    if (Array.isArray(existingPeople) && existingPeople.length > 0) {
      setPeople(existingPeople);
    }
  }, [existingPeople]);

  useEffect(() => {
    onPeopleUpdate(people, changedPeople);
  }, [people, changedPeople]);

  const handleAddPerson = () => {
    setPeople([...people, { ...EmptyPerson }]);
  };

  const handleChange = (index: number, field: string, value: string) => {
    // console.log("handleChange: " + index + " " + field + " " + value)
    const updatedPeople = people.map((p: any, i: number) => {
        if (i === index) {
            return { ...p, [field]: value };
        }
        return p;
    });
    setPeople(updatedPeople);

    // Track the change with field-specific information
    setChangedPeople(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        id: people[index].id, // Include the id if it exists
        changedFields: {
          ...(prev[index]?.changedFields || {}),
          [field]: value
        }
      }
    }));
  };

  return (
    <View style={styles.container}>
      {people.map((person: any, index: number) => (
        <View key={index} style={styles.rowContainer}>
        <Text style={person.status !== 0 && person.status !== undefined ? styles.inputLabelGrayed : styles.inputLabel}>{`Persona ${index + 1}`}</Text>
        <PersonRow
          key={index}
          person={person}
          onChange={(field, value) => handleChange(index, field, value)}
        />
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={handleAddPerson}>
        <Text style={styles.buttonText}>Agregar Nueva Persona Autorizada</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PersonasAutorizadasTable;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  inputLabel: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  rowContainer: {
    marginBottom: 20,
  },
  personContainer: {
    padding: 10,
    backgroundColor: '#DDFFDD',
    borderRadius: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickerContainer: {
    backgroundColor: 'white',
    width: '80%',
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  photoRow: {
    alignItems: 'center', 
    marginBottom: 6,
  },
  input: {
    flex: 1,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginRight: 10,
  },
  photoButton: {
    backgroundColor: '#aaa',
    padding: 10,
    borderRadius: 4,
  },
  addButton: {
    backgroundColor: '#5cb85c',
    padding: 15,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: colors.palette.actionColor,
    fontSize: 16,
  },
  deactivatedWarning: {
    color: 'red',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  inputLabelGrayed: {
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#999999',
  },
  activateButton: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 8,
    alignSelf: 'center',
  },
  activateButtonText: {
    color: colors.palette.actionBlue,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});