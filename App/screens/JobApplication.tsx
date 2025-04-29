import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

type JobApplicationRouteProp = RouteProp<{
  params: { 
    jobTitle: string;
    companyName?: string;
    requiredDocuments?: string;
  };
}, 'params'>;

const JobApplication = () => {
  const route = useRoute<JobApplicationRouteProp>();
  const navigation = useNavigation();
  const { jobTitle, companyName, requiredDocuments } = route.params;

  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse required documents if they exist
  const requiredDocsArray = requiredDocuments 
    ? requiredDocuments.split(/[,;\n]/).map(doc => doc.trim()).filter(doc => doc)
    : [];

  const handleImageUpload = async () => {
    if (documents.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 files only.');
      return;
    }

    try {
      setIsUploading(true);
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: false,
      });

      console.log('Image picker result:', result); // Debugging

      if (result.canceled) {
        console.log('User cancelled image picker');
        setIsUploading(false);
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        console.log('No assets selected');
        Alert.alert('Error', 'No image was selected');
        setIsUploading(false);
        return;
      }

      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.fileName || `image_${Date.now()}.jpg`;
      const fileType = asset.type || 'image/jpeg';
      const fileSize = asset.fileSize || 0;

      // First add the document to state (but mark as pending upload)
      const pendingDocument = { 
        name: fileName, 
        uri: fileUri, 
        type: fileType,
        size: (fileSize / 1024).toFixed(1) + ' KB',
        isUploading: true
      };
      setDocuments(prev => [...prev, pendingDocument]);

      // Create a reference to the file in Firebase Storage
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${Date.now()}.${fileExtension}`;
      const storageRef = storage().ref(`jobDocuments/${auth().currentUser?.uid}/${uniqueFileName}`);

      // Show uploading indicator
      Alert.alert('Uploading', `Please wait while we upload ${fileName}...`);

      // Upload the file
      const response = await fetch(fileUri);
      const blob = await response.blob();

      const uploadTask = storageRef.put(blob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          // Track upload progress if needed
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          console.log('Upload error:', error);
          // Remove the pending document if upload fails
          setDocuments(prev => prev.filter(doc => doc.uri !== fileUri));
          Alert.alert('Error', 'Failed to upload file');
          setIsUploading(false);
        },
        async () => {
          try {
            const fileUrl = await storageRef.getDownloadURL();
            
            // Update the document in state with the final URL
            setDocuments(prev => prev.map(doc => 
              doc.uri === fileUri 
                ? { 
                    ...doc, 
                    uri: fileUrl, 
                    isUploading: false,
                    storagePath: storageRef.fullPath 
                  } 
                : doc
            ));
            
            Alert.alert('Success', `${fileName} uploaded successfully!`);
          } catch (error) {
            console.log('Error getting download URL:', error);
            setDocuments(prev => prev.filter(doc => doc.uri !== fileUri));
            Alert.alert('Error', 'Failed to get file URL');
          } finally {
            setIsUploading(false);
          }
        }
      );
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Error', 'There was an error selecting the image.');
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = async (index: number) => {
    Alert.alert(
      'Remove File',
      'Are you sure you want to remove this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const docToRemove = documents[index];
              
              // Delete from Firebase Storage if path exists
              if (docToRemove.storagePath) {
                const fileRef = storage().ref(docToRemove.storagePath);
                await fileRef.delete();
              }
              
              // Remove from local state
              setDocuments(documents.filter((_, i) => i !== index));
            } catch (error) {
              console.log('Error removing file:', error);
              Alert.alert('Error', 'Failed to remove file from storage');
            }
          }
        }
      ]
    );
  };

  const handleSubmitApplication = async () => {
    if (documents.length < 1) {
      Alert.alert('Required', 'Please upload at least one file.');
      return;
    }

    try {
      setIsSubmitting(true);
      const currentUser = auth().currentUser;

      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to apply for a job.');
        return;
      }

      const applicationData = {
        jobTitle,
        companyName: companyName || 'N/A',
        documents: documents.map(doc => ({
          name: doc.name,
          uri: doc.uri,
          type: doc.type,
          size: doc.size
        })),
        userId: currentUser.uid,
        status: 'submitted',
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('jobApplications').add(applicationData);

      Alert.alert(
        'Application Submitted', 
        'Your application has been received!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving application: ', error);
      Alert.alert('Error', 'There was an error submitting your application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (!type) return 'insert-drive-file';
    if (type.includes('pdf')) return 'picture-as-pdf';
    if (type.includes('image')) return 'image';
    if (type.includes('word')) return 'description';
    if (type.includes('excel')) return 'grid-on';
    if (type.includes('zip')) return 'folder-zip';
    return 'insert-drive-file';
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.jobTitle}>{jobTitle}</Text>
        {companyName && <Text style={styles.companyName}>{companyName}</Text>}
      </View>

      {requiredDocsArray.length > 0 && (
        <View style={styles.requirementsSection}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          <View style={styles.requirementsList}>
            {requiredDocsArray.map((doc, index) => (
              <View key={index} style={styles.requirementItem}>
                <Icon name="check-circle" size={18} color="#4CAF50" />
                <Text style={styles.requirementText}>{doc}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.uploadSection}>
        <Text style={styles.sectionTitle}>Your Files</Text>
        <Text style={styles.uploadHint}>
          Upload your files (Images first for testing) - Max 5 files
        </Text>

        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={handleImageUpload}
          disabled={isUploading || documents.length >= 5}
        >
          <LinearGradient
            colors={['#6C63FF', '#4A42E8']}
            style={styles.uploadButtonGradient}
          >
            <Icon 
              name="cloud-upload" 
              size={24} 
              color="#FFF" 
              style={styles.uploadIcon}
            />
            <Text style={styles.uploadButtonText}>
              {isUploading ? 'Uploading...' : 'Select Image'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.documentsCount}>
          {documents.length} of 5 files uploaded
        </Text>
      </View>

      {documents.length > 0 && (
        <View style={styles.documentsList}>
          {documents.map((doc, index) => (
            <View key={index} style={styles.documentCard}>
              <View style={styles.documentInfo}>
                {doc.type.includes('image') ? (
                  <Image 
                    source={{ uri: doc.uri }} 
                    style={[styles.documentIcon, { width: 28, height: 28, borderRadius: 4 }]}
                  />
                ) : (
                  <Icon 
                    name={getFileIcon(doc.type)} 
                    size={28} 
                    color="#6C63FF" 
                    style={styles.documentIcon}
                  />
                )}
                <View style={styles.documentDetails}>
                  <Text 
                    style={styles.documentName}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {doc.name}
                  </Text>
                  <Text style={styles.documentMeta}>
                    {doc.type} • {doc.size}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveDocument(index)}
              >
                <Icon name="delete" size={20} color="#FF5252" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={styles.submitButton}
        onPress={handleSubmitApplication}
        disabled={isSubmitting || documents.length === 0}
      >
        <LinearGradient
          colors={['#6C63FF', '#4A42E8']}
          style={styles.submitButtonGradient}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Text>
          <Icon name="send" size={20} color="#FFF" style={styles.submitIcon} />
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ... (keep your existing styles) ...

export default JobApplication;
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F7FB',
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 25,
    alignItems: 'center',
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  companyName: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  requirementsSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  requirementsList: {
    marginTop: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 8,
  },
  uploadSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  uploadHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  uploadButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  uploadButtonGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIcon: {
    marginRight: 10,
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  documentsCount: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  documentsList: {
    marginBottom: 20,
  },
  documentCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIcon: {
    marginRight: 12,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  documentMeta: {
    fontSize: 12,
    color: '#888',
  },
  removeButton: {
    padding: 8,
    marginLeft: 10,
  },
  submitButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 10,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 10,
  },
  submitIcon: {
    marginLeft: 5,
  },
});

export default JobApplication;