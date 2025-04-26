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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { auth, db, storage } from '../../DataBases/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import uuid from 'react-native-uuid';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

const PostJob = () => {
  const navigation = useNavigation();
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobType, setJobType] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState('');
  const [coordinates, setCoordinates] = useState({ 
    latitude: 10.5737, 
    longitude: 122.0310,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  });
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

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const uploadJob = async () => {
    if (!jobTitle.trim() || !jobDescription.trim() || !companyName.trim() || !jobType) {
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
        jobType,
        requiredDocuments,
        coordinates,
        images: imageUrls,
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid || 'Anonymous',
        status: 'pending'
      });

      Alert.alert(
        'Success', 
        'Your job has been submitted for review.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      
      // Reset form
      setJobTitle('');
      setJobDescription('');
      setCompanyName('');
      setJobType('');
      setRequiredDocuments('');
      setCoordinates({ 
        latitude: 10.5737, 
        longitude: 122.0310,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      });
      setImages([]);
    } catch (error) {
      console.error('Error submitting job:', error);
      Alert.alert('Upload Error', 'There was an error submitting your job. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#6C63FF', '#4A42E8']}
          style={styles.header}
        >
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Post a New Job</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <View style={styles.inputCard}>
            <Text style={styles.label}>Job Title*</Text>
            <TextInput
              style={styles.input}
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder="Enter job title"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputCard}>
          <Text style={styles.label}>Job Type*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={jobType}
              onValueChange={(itemValue) => setJobType(itemValue)}
              style={styles.picker}
              dropdownIconColor="#999"
            >
              <Picker.Item label="Select job type..." value="" />
              <Picker.Item label="White Collar" value="white collar" />
              <Picker.Item label="Blue Collar" value="blue collar" />
              <Picker.Item label="Others" value="others" />
            </Picker>
          </View>
        </View>

          <View style={styles.inputCard}>
            <Text style={styles.label}>Job Description*</Text>
            <TextInput
              style={[styles.input, styles.multiLineInput]}
              value={jobDescription}
              onChangeText={setJobDescription}
              multiline
              numberOfLines={4}
              placeholder="Describe the job responsibilities and requirements"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.label}>Company Name*</Text>
            <TextInput
              style={styles.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Enter company name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.label}>Required Documents</Text>
            <TextInput
              style={[styles.input, styles.multiLineInput]}
              value={requiredDocuments}
              onChangeText={setRequiredDocuments}
              multiline
              numberOfLines={3}
              placeholder="List the required documents (separated by commas if multiple)"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.label}>Job Location</Text>
            <Text style={styles.mapInstructions}>
              Drag the marker to select the job location
            </Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={coordinates}
                onRegionChangeComplete={(region) => setCoordinates(region)}
              >
                <Marker
                  coordinate={{
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude
                  }}
                  draggable
                  onDragEnd={(e) => setCoordinates({
                    ...coordinates,
                    latitude: e.nativeEvent.coordinate.latitude,
                    longitude: e.nativeEvent.coordinate.longitude
                  })}
                />
              </MapView>
            </View>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.label}>Images ({images.length}/4)</Text>
            <TouchableOpacity 
              style={styles.imagePicker} 
              onPress={pickImage}
              disabled={images.length >= 4}
            >
              <Icon name="add-a-photo" size={20} color="#FFF" />
              <Text style={styles.imagePickerText}>
                {images.length > 0 ? 'Add More Images' : 'Add Images'}
              </Text>
            </TouchableOpacity>
            
            {images.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Icon name="close" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.uploadingText}>Submitting your job...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={uploadJob}
              disabled={uploading}
            >
              <LinearGradient
                colors={['#6C63FF', '#4A42E8']}
                style={styles.buttonGradient}
              >
                <Text style={styles.submitButtonText}>Submit Job</Text>
                <Icon name="send" size={20} color="#FFF" style={styles.buttonIcon} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    color: '#333',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    color: '#333',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  inputCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#444',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  multiLineInput: {
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  pickerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapInstructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  imagePickerText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 10,
  },
  buttonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 10,
  },
  uploadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  uploadingText: {
    marginTop: 10,
    color: '#666',
  },
});

export default PostJob;