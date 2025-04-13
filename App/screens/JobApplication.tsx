import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView 
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

type JobApplicationRouteProp = RouteProp<{
  params: { jobTitle: string };
}, 'params'>;

const JobApplication = () => {
  const route = useRoute<JobApplicationRouteProp>();
  const navigation = useNavigation();
  const { jobTitle } = route.params;

  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null); // State for selected document

  const handleDocumentUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all document types
        copyToCacheDirectory: true,
        multiple: false, // Only one document at a time
      });
  
      if (result.type === 'success') {
        if (documents.length >= 5) {
          Alert.alert('Limit Reached', 'You can upload up to 5 documents only.');
          return;
        }
  
        const fileUri = result.uri;
        const fileName = result.name;
        const fileType = result.mimeType;
  
        if (!fileUri) {
          Alert.alert('Error', 'Document URI is invalid');
          return;
        }
  
        // Upload the document to Firebase Storage
        const storageRef = storage().ref(`jobDocuments/${auth().currentUser?.uid}/${fileName}`);
        await storageRef.putFile(fileUri);
        const fileUrl = await storageRef.getDownloadURL(); // Get the URL of the uploaded document
  
        // Add the document to state
        setDocuments((prevDocuments) => {
          const updatedDocuments = [...prevDocuments, { name: fileName, uri: fileUrl, type: fileType }];
          if (updatedDocuments.length === 1) {
            setSelectedDocument(fileName); // If it's the first document, set it as selected
          }
          return updatedDocuments;
        });
        Alert.alert('Document Selected', `File: ${fileName}`);
      }
    } catch (error) {
      console.log('Error uploading document:', error);
      Alert.alert('Error', 'There was an error picking the document.');
    }
  };
  

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
    if (documents.length === 1) {
      setSelectedDocument(null); // Clear selected document if last one is removed
    }
  };

  const handleSubmitApplication = async () => {
    if (documents.length < 1) {
      Alert.alert('Error', 'Please upload at least one document.');
      return;
    }

    try {
      const currentUser = auth().currentUser;

      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to apply for a job.');
        return;
      }

      const applicationData = {
        jobTitle,
        documents: documents.map((doc) => ({
          name: doc.name,
          uri: doc.uri,  // Store the document URL in Firestore
        })),
        userId: currentUser.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('jobApplications').add(applicationData);

      Alert.alert('Application Submitted', 'Your job application has been submitted successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving application: ', error);
      Alert.alert('Error', 'There was an error submitting your application. Please try again later.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Apply for {jobTitle}</Text>

      {/* Document Picker */}
      <Text style={styles.sectionTitle}>Required Documents:</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={handleDocumentUpload}>
        <Text style={styles.uploadButtonText}>
          {documents.length >= 5 ? 'Limit Reached' : 'Upload Document'}
        </Text>
      </TouchableOpacity>

      {/* Display the selected document's name */}
      {selectedDocument && (
        <View style={styles.selectedDocument}>
          <Text style={styles.selectedDocumentText}>Selected Document: {selectedDocument}</Text>
        </View>
      )}

      {/* Display Uploaded Documents */}
      {documents.map((doc, index) => (
        <View key={index} style={styles.documentItem}>
          <Text style={styles.documentName}>{doc.name}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveDocument(index)}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmitApplication}>
        <Text style={styles.submitButtonText}>Submit Application</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    color: '#333',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 30,
  },
  sectionTitle: {
    color: '#333',
    fontSize: 18,
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedDocument: {
    marginTop: 10,
    backgroundColor: '#f1f1f1',
    padding: 10,
    borderRadius: 8,
  },
  selectedDocumentText: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  documentName: {
    color: '#333',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#f44336',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default JobApplication;
