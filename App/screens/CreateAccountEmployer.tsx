import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, storage } from '../../DataBases/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Feather';
import 'react-native-get-random-values';
import { httpsCallable } from "firebase/functions";

const CreateAccountEmployer = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    fullName: '',
    gender: '',
    address: '',
    birthdate: '',
    phoneNumber: '',
    email: '',
    companyName: '', // New field for company name
    companyIndustry: '', // New field for company industry
    companyWebsite: '', // New field for company website
    username: '',
    password: '',
    confirmPassword: '',
    accountType: 'employer', // Set to employer by default
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateEmail = (email) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const handleCreateAccount = async () => {
    const { email, password, confirmPassword, fullName, accountType } = formData;
  
    if (!fullName || !email || !password || !confirmPassword || !accountType) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
  
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
  
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
  
    if (!acceptedTerms) {
      Alert.alert('Error', 'You must accept the terms and conditions.');
      return;
    }
  
    try {
      // Create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Store user data in Firestore
      const userData = {
        ...formData,
        uid: user.uid,
        profilePicture: '',
        role: accountType,
      };
  
      await setDoc(doc(db, 'users', user.uid), userData);
  
      // Upload profile picture if available
      if (profilePicture) {
        const storageRef = ref(storage, `profilePictures/${user.uid}`);
        const response = await fetch(profilePicture);
        const imageBlob = await response.blob();
        await uploadBytes(storageRef, imageBlob);
  
        const profilePictureUrl = await getDownloadURL(storageRef);
        await setDoc(doc(db, 'users', user.uid), { profilePicture: profilePictureUrl }, { merge: true });
      }
  
      // Show success pop-up message
      Alert.alert(
        'Account Created',
        `Welcome, ${fullName}! Your account has been successfully created.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to the respective homepage after a delay
              setTimeout(() => {
                if (accountType === 'employer') {
                  navigation.replace('MainTabs');
                } else {
                  navigation.replace('MainTabs');
                }
              }, 500);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
  

  const handleProfilePictureUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const steps = [
    <View>
      <TouchableOpacity style={styles.imageUploadContainer} onPress={handleProfilePictureUpload}>
        {profilePicture ? (
          <Image source={{ uri: profilePicture }} style={styles.profileImage} />
        ) : (
          <Image
            source={require('./assets/profile-logo.png')} // Placeholder image
            style={styles.profileImage}
          />
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        placeholder="Enter your full name"
        style={styles.input}
        value={formData.fullName}
        onChangeText={(value) => handleInputChange('fullName', value)}
      />
      <Text style={styles.label}>Gender</Text>
      <Picker
        selectedValue={formData.gender}
        style={styles.input}
        onValueChange={(itemValue) => handleInputChange('gender', itemValue)}
      >
        <Picker.Item label="Select Gender" value="" />
        <Picker.Item label="Male" value="male" />
        <Picker.Item label="Female" value="female" />
        <Picker.Item label="Other" value="other" />
      </Picker>
      <Text style={styles.label}>Address</Text>
</View>,

<View>
<Text style={styles.label}>Company Name</Text>
      <TextInput
        placeholder="Enter your company name"
        style={styles.input}
        value={formData.companyName}
        onChangeText={(value) => handleInputChange('companyName', value)}
      />
      <Text style={styles.label}>Company Industry</Text>
      <TextInput
        placeholder="Enter your company industry"
        style={styles.input}
        value={formData.companyIndustry}
        onChangeText={(value) => handleInputChange('companyIndustry', value)}
      />
      <Text style={styles.label}>Company Website</Text>
      <TextInput
  placeholder="Enter your company website (optional)"
  style={styles.input}
  value={formData.companyWebsite}
  onChangeText={(value) => handleInputChange('companyWebsite', value)}
/>
</View>,

    <View>
      <Text style={styles.label}>Birthdate</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
        <TextInput
          placeholder="Select your birthdate"
          style={styles.input}
          value={formData.birthdate}
          editable={false}
        />
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={formData.birthdate ? new Date(formData.birthdate) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              handleInputChange('birthdate', selectedDate.toLocaleDateString());
            }
          }}
        />
      )}
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        placeholder="Enter your phone number"
        style={styles.input}
        keyboardType="phone-pad"
        value={formData.phoneNumber}
        onChangeText={(value) => handleInputChange('phoneNumber', value)}
      />
      <Text style={styles.label}>Email</Text>
      <TextInput
        placeholder="Enter your email"
        style={styles.input}
        keyboardType="email-address"
        value={formData.email}
        onChangeText={(value) => handleInputChange('email', value)}
      />
    </View>,

    <View>
      <Text style={styles.label}>Username</Text>
      <TextInput
        placeholder="Choose a username"
        style={styles.input}
        value={formData.username}
        onChangeText={(value) => handleInputChange('username', value)}
      />
      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
  <TextInput
    placeholder="Enter your password"
    style={styles.passinput}
    secureTextEntry={!showPassword}
    value={formData.password}
    onChangeText={(value) => handleInputChange('password', value)}
  />
  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
    <Icon
      name={showPassword ? 'eye' : 'eye-off'}
      size={24}
      color="#000"
      style={styles.eye}
    />
  </TouchableOpacity>
</View>
<Text style={styles.label}>Confirm Password</Text>
<View style={styles.passwordContainer}>
  <TextInput
    placeholder="Confirm your password"
    style={styles.passinput}
    secureTextEntry={!showConfirmPassword}
    value={formData.confirmPassword}
    onChangeText={(value) => handleInputChange('confirmPassword', value)}
  />
  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
    <Icon
      name={showConfirmPassword ? 'eye' : 'eye-off'}
      size={24}
      color="#000"
      style={styles.eye}
    />
  </TouchableOpacity>
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setAcceptedTerms(!acceptedTerms)}
        >
          <Icon name={acceptedTerms ? "check-square" : "square"} size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.checkboxText}>
          I accept the{" "}
          <TouchableOpacity onPress={() => navigation.navigate("TermsAndConditions")}>
            <Text style={{ color: "blue" }}>Terms and Conditions</Text>
          </TouchableOpacity>
        </Text>
      </View>
    </View>,
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        {steps[currentStep]}
        <View style={styles.stepIndicator}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === currentStep ? '#007BFF' : 'gray' },
              ]}
            />
          ))}
        </View>
        <View style={styles.navigationButtons}>
        {currentStep > 0 && (
  <TouchableOpacity
    style={styles.navigationButton}
    onPress={() => setCurrentStep((prev) => prev - 1)}
  >
    <Icon name="arrow-left" style={styles.arrowIcon} />
  </TouchableOpacity>
)}
{currentStep < steps.length - 1 ? (
  <TouchableOpacity
    style={styles.navigationButton}
    onPress={() => setCurrentStep((prev) => prev + 1)}
  >
    <Icon name="arrow-right" style={styles.arrowIcon} />
  </TouchableOpacity>
) : (
  <TouchableOpacity
    style={styles.navigationButton}
    onPress={handleCreateAccount}
  >
    <Icon name="check" style={styles.arrowIcon} />
  </TouchableOpacity>
)}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerText: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 100,
    padding: 10,
    marginBottom: 15,
    height: 45,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 50,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  passinput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  eye: {
    width: 24, // Ensure a fixed width
    height: 24, // Ensure a fixed height
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // Add some spacing
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingLeft:0,
    marginRight:0,
    height:25,
    width:25
  },

  backButton:{
    marginBottom:0,
    marginTop:100,
        },
  checkboxText: {
    fontSize: 15,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navigationButton: {
    width: 50,
    height: 50,
    borderRadius: 25, // Fully round
    backgroundColor: '#007BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    fontSize: 24,
    color: 'white',
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  dot: { height: 10, width: 10, borderRadius: 20, marginHorizontal: 5 },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
});

export default CreateAccountEmployer;
