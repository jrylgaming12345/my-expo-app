import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { auth, db, storage } from '../../DataBases/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import uuid from 'react-native-uuid';
import MapView, { Marker } from 'react-native-maps'; 
import { useNavigation } from '@react-navigation/native';

const PostJob = () => {
  const navigation = useNavigation();
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [coordinates, setCoordinates] = useState({ latitude: 10.5737, longitude: 122.0310 });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    if (images.length >= 4) {
      Alert.alert('Limit Reached', 'You can only upload up to 4 images.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are required to select images.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const uploadJob = async () => {
    if (!jobTitle.trim() || !jobDescription.trim() || !companyName.trim()) {
      Alert.alert('Validation Error', 'Please fill out all required fields.');
      return;
    }
    setUploading(true);
    try {
      const imageUrls = await Promise.all(
        images.map(async (uri) => {
          const response = await fetch(uri);
          const blob = await response.blob();
          const filename = `${uuid.v4()}.jpg`;
          const storageRef = ref(storage, `jobImages/${filename}`);
          await uploadBytes(storageRef, blob);
          return await getDownloadURL(storageRef);
        })
      );

      await addDoc(collection(db, 'pending-jobs'), {
        title: jobTitle,
        description: jobDescription,
        companyName,
        coordinates,
        images: imageUrls,
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid || 'Anonymous',
      });

      Alert.alert('Success', 'Your job has been submitted for review.');
      setJobTitle('');
      setJobDescription('');
      setCompanyName('');
      setCoordinates({ latitude: 10.5737, longitude: 122.0310 });
      setImages([]);
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting job:', error);
      Alert.alert('Upload Error', 'There was an error submitting your job. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <Text style={styles.title}>Post a Job</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Job Title</Text>
          <TextInput
            style={styles.input}
            value={jobTitle}
            onChangeText={setJobTitle}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Job Description</Text>
          <TextInput
            style={[styles.input, styles.multiLineInput]}
            value={jobDescription}
            onChangeText={setJobDescription}
            multiline
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Company Name</Text>
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
          />
        </View>
        <View style={styles.mapContainer}>
          <Text style={styles.mapInstructions}>Drag the marker to select job location:</Text>
          <MapView
            style={styles.map}
            initialRegion={{
              ...coordinates,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onRegionChangeComplete={(region) => setCoordinates({ latitude: region.latitude, longitude: region.longitude })}
          >
            <Marker
              coordinate={coordinates}
              draggable
              onDragEnd={(e) => setCoordinates(e.nativeEvent.coordinate)}
            />
          </MapView>
        </View>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          <Text style={styles.imagePickerText}>Add Image ({images.length}/4)</Text>
        </TouchableOpacity>
        <View style={styles.imageContainer}>
          {images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.image} />
          ))}
        </View>
        {uploading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={uploadJob}>
            <Text style={styles.uploadButtonText}>Submit Job</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: { padding: 20, backgroundColor: '#F9F9F9' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 16, marginBottom: 5, color: '#555' },
  input: { borderBottomWidth: 1, borderBottomColor: '#CCC', padding: 8, fontSize: 16, color: '#333' },
  multiLineInput: { height: 100, textAlignVertical: 'top' },
  mapContainer: { height: 300, marginBottom: 20, borderRadius: 8, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
  mapInstructions: { color: '#333', marginBottom: 10 },
  imagePicker: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, marginBottom: 15 },
  imagePickerText: { color: 'white', textAlign: 'center' },
  imageContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  image: { width: 100, height: 100, borderRadius: 8 },
  uploadButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center' },
  uploadButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default PostJob;
