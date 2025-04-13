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
import { functions } from '../../DataBases/firebaseConfig';



const CreateAccount = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    fullName: '',
    gender: '',
    address: '', // Address field to be updated
    birthdate: '',
    phoneNumber: '',
    email: '',
    professionalHeadline: '',
    education: '',
    workExperience: '',
    skills: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);


  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateEmail = (email: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);      
  };

  const handleCreateAccount = async () => {
    const { fullName, address, email, password, professionalHeadline, education, workExperience, skills, username } = formData;
    const profileImage = profilePicture;
  
    try {
      let user;
      if (auth.currentUser) {
        // Use current user if already authenticated
        user = auth.currentUser;
      } else {
        // Create user with email and password if no user is logged in
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }
  
      // Upload profile image to Firebase Storage if provided
      let profileImageUrl = "";
      if (profileImage) {
        const imageRef = ref(storage, `profileImages/${user.uid}`);
        const response = await fetch(profileImage);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        profileImageUrl = await getDownloadURL(imageRef);
      }
  
      // Save user data to Firestore using the current authenticated user's UID
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName,
        address,
        email,
        professionalHeadline,
        education,
        workExperience,
        skills,
        username,
        profileImageUrl,
        role: "jobseeker",
      });
  
      Alert.alert("Success", "Account created successfully!");
      navigation.navigate("MainTabs"); // Navigate to JobSeeker home
    } catch (error) {
      console.error("Error creating account:", error.message);
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Error", "This email is already in use. Please use a different email.");
      } else {
        Alert.alert("Error", "Failed to create account. Please try again.");
      }
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
      <Text style={styles.label}>Professional Headline</Text>
      <TextInput
        placeholder="e.g IT instructor"
        style={styles.input}
        value={formData.professionalHeadline}
        onChangeText={(value) => handleInputChange('professionalHeadline', value)}
      />
      <Text style={styles.label}>Education</Text>
      <TextInput
        placeholder="Enter your education details"
        style={styles.input}
        value={formData.education}
        onChangeText={(value) => handleInputChange('education', value)}
      />
      <Text style={styles.label}>Work Experience</Text>
      <TextInput
        placeholder="Enter your work experience"
        style={styles.input}
        value={formData.workExperience}
        onChangeText={(value) => handleInputChange('workExperience', value)}
      />
      <Text style={styles.label}>Skills</Text>
      <TextInput
        placeholder="Enter your skills"
        style={[styles.input, styles.skillsInput]} // Added style to make the skills input bigger
        value={formData.skills}
        onChangeText={(value) => handleInputChange('skills', value)}
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.stepsContainer}>
          
          {steps[currentStep]}

          {/* Navigation and Create Account Button */}
          <View style={styles.navigationButtons}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.navigationButton}
                onPress={() => setCurrentStep(currentStep - 1)}
              >
                <Icon name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            {currentStep < steps.length - 1 && (
              <TouchableOpacity
                style={styles.navigationButton}
                onPress={() => setCurrentStep(currentStep + 1)}
              >
                <Icon name="arrow-right" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            {currentStep === steps.length - 1 && (
              <TouchableOpacity style={styles.createAccountButton} onPress={handleCreateAccount}>
                <Text style={styles.createAccountButtonText}>Create Account</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Slider Indicators */}
          <View style={styles.sliderDotsContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.sliderDot,
                  currentStep === index && styles.activeSliderDot,
                ]}
              />
            ))}
          </View>
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
    stepsContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 10,
      borderRadius: 40,
      marginBottom: 15,
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
    imageUploadContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    profileImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },

    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      borderWidth: 1,
      borderColor: '#ccc',
      paddingLeft:0,
      marginRight:0,
      height:25,
      width:25
    },
    checkboxText: {
      fontSize: 15,
    },
    navigationButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
    },
    navigationButton: {
      padding: 10,
      backgroundColor: '#007BFF',
      borderRadius: 40,
    },
    navigationButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },

    skillsInput: {
      height: 100, // Increased height for skills input box
    },
    createAccountButton: {
      backgroundColor: '#28A745',
      padding: 10,
      borderRadius: 50,
    },
    createAccountButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    backButton:{
marginBottom:80,
    },

    sliderDotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    sliderDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#ccc',
      marginHorizontal: 5,
    },
    activeSliderDot: {
      backgroundColor: '#007BFF',
    },
    
  });


export default CreateAccount;
