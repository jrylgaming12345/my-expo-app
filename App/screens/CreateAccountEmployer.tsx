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
  Dimensions,
  ActivityIndicator
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
import { LinearGradient } from 'expo-linear-gradient';
import 'react-native-get-random-values';

const { width } = Dimensions.get('window');

// Sample data for Antique province
const ANTIQUE_MUNICIPALITIES = [
  'San Jose de Buenavista',
  'Anini-y',
  'Barbaza',
  'Belison',
  'Bugasong',
  'Caluya',
  'Culasi',
  'Hamtic',
  'Laua-an',
  'Libertad',
  'Pandan',
  'Patnongon',
  'San Remigio',
  'Sebaste',
  'Sibalom',
  'Tibiao',
  'Tobias Fornier',
  'Valderrama'
];

// Sample barangays by municipality (just a few samples)
const BARANGAYS_BY_MUNICIPALITY = {
  'Anini-y': [
'Badiang', 'Bagtason', 'Banawan', 'Bayo', 'Buenavista', 'Cabiawan', 'Camancijan', 'Carnate', 'Cubay Norte', 'Cubay Sur', 'Dangcalan', 'Igdagmay', 'Igpanolong', 'Igtuba', 'Magdalena', 'Nasuli C', 'San Francisco', 'San Juan', 'San Pedro', 'San Ramon', 'San Roque', 'Santo Rosario', 'Tagaytay', 'Talisay', 'Tinindugan'
  ],
  'Barbaza': [
   'Alojipan', 'Bagumbayan', 'Balatbat', 'Binangbang', 'Bugang', 'Cadiao', 'Cadolonan', 'Esparar', 'Ipil', 'Lamogom', 'Linabuan', 'Macatol', 'Napsaan', 'Pasay', 'San Andres', 'San Antonio', 'San Juan', 'San Roque', 'Tabungon', 'Tigbanaba', 'Tinigbasan'
  ],
  'Belison': [
   'Borocboroc', 'Buenavista', 'Concepcion', 'Delima', 'Maradiona', 'Mojon', 'Poblacion', 'Rombang', 'Sinaja-an'
  ],
  'Bugasong': [
    'Agojo', 'Bagtason', 'Bitadton Norte', 'Bitadton Sur', 'Cubay', 'Cubi-cubi', 'Daja', 'Ilaures', 'Ipil', 'Igsoro', 'Laguinbanua', 'Lawa-an', 'Madrangca', 'Maybunga', 'Namatay', 'Pangalcagan', 'Patria', 'Poblacion', 'Salusoy', 'San Antonio', 'San Fernando', 'San Gregorio', 'San Jose', 'San Juan', 'San Rafael', 'Santo Rosario'
  ],

  'Caluya': [
   'Alegria', 'Bacong', 'Banago', 'Bonbon', 'Caluya Poblacion', 'Camanci', 'Canas', 'Imba', 'Lipata', 'Lucio Laurel', 'Semirara', 'Sibolo', 'Sibato'
  ],

  'Culasi': [
   'Alojipan', 'Bacong', 'Balac-Balac', 'Balitbiton', 'Camancijan', 'Carit-an', 'Condes', 'Cubay Norte', 'Cubay Sur', 'Dalipe', 'Flores', 'Imba', 'Ipayo', 'Malacañang', 'Malalison', 'Magsaysay', 'Rosario', 'Salde', 'San Antonio', 'San Juan', 'San Pedro', 'Simbola', 'Tinabanan', 'Valderrama'
  ],


  'Hamtic': [
    'Aglibacao', 'Apgahan', 'Asluman', 'Atabay', 'Bacong', 'Banawan', 'Bantayan', 'Biga-a', 'Buhang', 'Cansadan', 'Carit-an', 'Catungan I', 'Catungan II', 'Cawayan', 'Dangcalan', 'Durog', 'Egaña', 'Gen. Fullon', 'Guintas', 'Igbangcal', 'Igburi', 'Iglilico', 'Inabasan', 'Malandog', 'Pasungay', 'Piape I', 'Piape II', 'Poblacion', 'San Jose', 'San Rafael', 'San Roque', 'Tigbayog'
  ],

  'Laua-an': [
'Alojipan', 'Bagumbayan', 'Barasanan A', 'Barasanan B', 'Bucaya', 'Cansilayan', 'Capnayan', 'Capoyuan', 'Casit-an', 'Guinobatan', 'Idio', 'Lugutan', 'Ma-asin', 'Madalag', 'Magcalon', 'Maybunga', 'Oloc', 'Poblacion', 'San Ramon', 'SiRamon'
  ],

  'Libertad': [
'Barangka', 'Bato', 'Bolanao', 'Bongan', 'Calabanog', 'Codiong', 'Cubay Norte', 'Cubay Sur', 'Idiacacan', 'Insubuan', 'Libertad Poblacion', 'Maasin', 'San Isidro', 'San Roque', 'Tag-Osip'
  ],

  'Pandan': [
'Agosip', 'Aracay', 'Bagumbayan', 'Batonan Norte', 'Batonan Sur', 'Centro Norte', 'Centro Sur', 'Culpog', 'Dionela', 'Dumangsal', 'Idiacacan', 'Igpalje', 'Lanipe', 'Mag-aba', 'Malatapas', 'Nauring', 'Patria', 'San Andres', 'Santa Ana', 'Santo Rosario', 'Tingib'
  ],


  'Patnongon': [
   'Aureliana', 'Bagumbayan', 'Badiang', 'Bangbang', 'Bariri', 'Binanu-an', 'Cansadan', 'Cansilayan', 'Carit-an', 'Catmonan', 'Cubay', 'Igbarawan', 'Igburi', 'Iglinab', 'Igtalongon', 'La-Rioja', 'Linabuan', 'Malan-as', 'Maribong', 'Poblacion', 'Salaguiawan', 'San Antonio', 'San Roque', 'Santa Monica'
  ],


  'San Jose de Buenavista': [
'Atabay', 'Badiang', 'Barangay 1 (Poblacion)', 'Barangay 2 (Poblacion)', 'Barangay 3 (Poblacion)', 'Barangay 4 (Poblacion)', 'Barangay 5 (Poblacion)', 'Barangay 6 (Poblacion)', 'Barangay 7 (Poblacion)', 'Barangay 8 (Poblacion)', 'Barangay 9 (Poblacion)', 'Barangay 10 (Poblacion)', 'Barangay 11 (Poblacion)', 'Barangay 12 (Poblacion)', 'Barangay 13 (Poblacion)', 'Barangay 14 (Poblacion)', 'Barangay 15 (Poblacion)', 'Barangay 16 (Poblacion)', 'Barangay 17 (Poblacion)', 'Barangay 18 (Poblacion)', 'Barangay 19 (Poblacion)', 'Barangay 20 (Poblacion)', 'Barangay 21 (Poblacion)', 'Barangay 22 (Poblacion)', 'Barangay 23 (Poblacion)', 'Barangay 24 (Poblacion)', 'Barangay 25 (Poblacion)', 'Barangay 26 (Poblacion)', 'Barangay 27 (Poblacion)', 'Barangay 28 (Poblacion)', 'Barangay 29 (Poblacion)', 'Barangay 30 (Poblacion)', 'Barangay 31 (Poblacion)', 'Barangay 32 (Poblacion)', 'Barangay 33 (Poblacion)', 'Barangay 34 (Poblacion)', 'Barangay 35 (Poblacion)', 'Barangay 36 (Poblacion)', 'Barangay 37 (Poblacion)', 'Barangay 38 (Poblacion)'
  ],


  'San Remigio': [
   'Aningalan', 'Bagtason', 'Banbanan', 'Barangay I (Poblacion)', 'Barangay II (Poblacion)', 'Barangay III (Poblacion)', 'Barangay IV (Poblacion)', 'Barangay V (Poblacion)', 'Barangay VI (Poblacion)', 'Barangay VII (Poblacion)', 'Barangay VIII (Poblacion)', 'Barangay IX (Poblacion)', 'Barangay X (Poblacion)', 'Barangay XI (Poblacion)', 'Barangay XII (Poblacion)', 'Batuan', 'Biga', 'Buenavista', 'Cabunga-an', 'Capinpisan', 'Gen. Luna', 'Iglinab', 'Inabasan', 'La Union', 'Magdalena', 'Osorio I', 'Osorio II', 'Panpanan I', 'Panpanan II', 'Sinundolan', 'Supanga', 'Tordesillas', 'Tubudan'
  ],


  'Sebaste': [
'Abiera', 'Aguila', 'Idio', 'Ipil', 'Nauhon', 'P. Javier', 'San Antonio', 'San Luis', 'Villahermosa'
  ],


  'Sibalom': [
'Apong', 'Atabay', 'Bagumbayan', 'Banbanan', 'Bulanao', 'Bugnay', 'Cansadan Del Sur', 'Catmon', 'Cubay', 'Egana', 'Igcococ', 'Iglanot', 'Igsococ', 'Ilaures', 'Imparayan', 'Inabasan', 'Insarayan', 'Nabaoy', 'Nalipayan', 'Palaypay', 'Poblacion', 'Pucio', 'Sabang West', 'San Pedro', 'Sinaja-an', 'Tacbuyan', 'Taclobo', 'Tubudan'
  ],


  'Tibiao': [
 'Barangay I (Poblacion)', 'Barangay II (Poblacion)', 'Barangay III (Poblacion)', 'Barangay IV (Poblacion)', 'Barangay V (Poblacion)', 'Barangay VI (Poblacion)', 'Barangay VII (Poblacion)', 'Barangay VIII (Poblacion)', 'Barangay IX (Poblacion)', 'Barangay X (Poblacion)', 'Barangay XI (Poblacion)', 'Barangay XII (Poblacion)', 'Barangay XIII (Poblacion)', 'Barangay XIV (Poblacion)', 'Barangay XV (Poblacion)', 'Barangay XVI (Poblacion)'
  ],


  'Tobias Fornier (Dao)': [
'Abaca', 'Aningalan', 'Ballescas', 'Barasanan', 'Bandoja', 'Bugtongbato', 'Bulanao', 'Buyu-an', 'Camancijan', 'Dapdap', 'Igcadlum', 'Igtalongon', 'Lucero', 'Malacañang', 'Paciencia', 'Pasong', 'Pis-anan', 'San Antonio', 'San Francisco Norte', 'San Francisco Sur', 'San Pedro', 'Santa Ana', 'Santo Tomas'
  ],

  'Valderrama': [
'Bakiang', 'Buluangan I', 'Buluangan II', 'Canipayan', 'Cananghan', 'Canipayan', 'Iglinab', 'Lublub', 'Malabor', 'Manlacbo', 'Pandanan', 'Patong-Patong', 'Poblacion', 'San Agustin', 'San Antonio', 'San Fernando', 'San Gabriel', 'San Roque', 'Suguidan', 'Talisay', 'Tubudan'
      ],
    
  // Add more municipalities and their barangays as needed
};

const CreateAccountEmployer = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    fullName: '',
    gender: '',
    street: '',
    province: 'Antique', // Default to Antique
    municipality: '',
    barangay: '',
    birthdate: '',
    phoneNumber: '',
    email: '',
    companyName: '',
    companyIndustry: '',
    companyWebsite: '',
    username: '',
    password: '',
    confirmPassword: '',
    accountType: 'employer',
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const steps = [
    'Personal Information',
    'Company Details',
    'Contact Information',
    'Account Setup'
  ];

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    
    // Reset barangay when municipality changes
    if (key === 'municipality') {
      setFormData((prev) => ({ ...prev, barangay: '' }));
    }
  };

  // Get barangays for the selected municipality
  const getBarangays = () => {
    if (!formData.municipality) return [];
    return BARANGAYS_BY_MUNICIPALITY[formData.municipality] || [];
  };

  const validateForm = () => {
    const { 
      fullName, 
      email, 
      password, 
      confirmPassword, 
      username,
      companyName,
      companyIndustry
    } = formData;
    
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email');
      return false;
    }
    
    if (!validateEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!companyName.trim()) {
      Alert.alert('Validation Error', 'Please enter your company name');
      return false;
    }
    
    if (!companyIndustry.trim()) {
      Alert.alert('Validation Error', 'Please enter your company industry');
      return false;
    }
    
    if (!username.trim()) {
      Alert.alert('Validation Error', 'Please choose a username');
      return false;
    }
    
    if (!password) {
      Alert.alert('Validation Error', 'Please enter a password');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }
    
    if (!acceptedTerms) {
      Alert.alert('Validation Error', 'You must accept the terms and conditions');
      return false;
    }
    
    return true;
  };

  const validateEmail = (email) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);      
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const { 
      email, 
      password, 
      fullName, 
      companyName,
      companyIndustry,
      companyWebsite,
      username,
      phoneNumber,
      street,
      barangay,
      municipality,
      province,
      gender,
      birthdate
    } = formData;
  
    // Construct full address
    const address = `${street}, ${barangay}, ${municipality}, ${province}, Philippines`;
  
    try {
      // Create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Upload profile picture if available
      let profileImageUrl = "";
      if (profilePicture) {
        const imageRef = ref(storage, `profileImages/${user.uid}`);
        const response = await fetch(profilePicture);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        profileImageUrl = await getDownloadURL(imageRef);
      }

      // Store employer data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName,
        email,
        username,
        phoneNumber,
        address,
        street,
        barangay,
        municipality,
        province,
        country: 'Philippines',
        gender,
        birthdate,
        companyName,
        companyIndustry,
        companyWebsite: companyWebsite || null,
        profileImageUrl,
        role: "employer",
        accountType: "employer",
        createdAt: new Date().toISOString()
      });

      Alert.alert(
        "Account Created", 
        `Welcome ${fullName}! Your employer account has been successfully created.`,
        [{ text: "OK", onPress: () => navigation.navigate("MainTabs") }]
      );
    } catch (error) {
      console.error("Error creating account:", error.message);
      let errorMessage = "Failed to create account. Please try again.";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use. Please use a different email.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
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
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const renderStepContent = () => {
    switch(currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <TouchableOpacity 
              style={styles.imageUploadContainer} 
              onPress={handleProfilePictureUpload}
            >
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Icon name="user" size={40} color="#6C63FF" />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Icon name="camera" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.label}>Full Name*</Text>
            <TextInput
              placeholder="Enter your full name"
              style={styles.input}
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
            />

            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.gender}
                style={styles.picker}
                onValueChange={(itemValue) => handleInputChange('gender', itemValue)}
              >
                <Picker.Item label="Select Gender" value="" />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>

            <Text style={styles.label}>Street Address*</Text>
            <TextInput
              placeholder="House #, Street, Building"
              style={styles.input}
              value={formData.street}
              onChangeText={(value) => handleInputChange('street', value)}
            />

            <Text style={styles.label}>Province*</Text>
            <View style={[styles.pickerContainer, styles.disabledInput]}>
              <Picker
                selectedValue={formData.province}
                style={styles.picker}
                enabled={false} // Make it non-editable
              >
                <Picker.Item label="Antique" value="Antique" />
              </Picker>
            </View>

            <Text style={styles.label}>Municipality/Town*</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.municipality}
                style={styles.picker}
                onValueChange={(itemValue) => handleInputChange('municipality', itemValue)}
              >
                <Picker.Item label="Select Municipality/Town" value="" />
                {ANTIQUE_MUNICIPALITIES.map((municipality) => (
                  <Picker.Item key={municipality} label={municipality} value={municipality} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Barangay*</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.barangay}
                style={styles.picker}
                enabled={!!formData.municipality} // Only enable if municipality is selected
                onValueChange={(itemValue) => handleInputChange('barangay', itemValue)}
              >
                <Picker.Item 
                  label={formData.municipality ? "Select Barangay" : "Select Municipality first"} 
                  value="" 
                />
                {getBarangays().map((barangay) => (
                  <Picker.Item key={barangay} label={barangay} value={barangay} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Country*</Text>
            <View style={[styles.pickerContainer, styles.disabledInput]}>
              <Picker
                selectedValue="Philippines"
                style={styles.picker}
                enabled={false} // Make it non-editable
              >
                <Picker.Item label="Philippines" value="Philippines" />
              </Picker>
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>Company Name*</Text>
            <TextInput
              placeholder="Enter your company name"
              style={styles.input}
              value={formData.companyName}
              onChangeText={(value) => handleInputChange('companyName', value)}
            />

            <Text style={styles.label}>Company Industry*</Text>
            <TextInput
              placeholder="e.g. Technology, Healthcare, Finance"
              style={styles.input}
              value={formData.companyIndustry}
              onChangeText={(value) => handleInputChange('companyIndustry', value)}
            />

            <Text style={styles.label}>Company Website</Text>
            <TextInput
              placeholder="https://yourcompany.com (optional)"
              style={styles.input}
              keyboardType="url"
              autoCapitalize="none"
              value={formData.companyWebsite}
              onChangeText={(value) => handleInputChange('companyWebsite', value)}
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>Birthdate</Text>
            <TouchableOpacity 
              style={styles.input} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={formData.birthdate ? styles.dateText : styles.placeholderText}>
                {formData.birthdate || "Select your birthdate"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.birthdate ? new Date(formData.birthdate) : new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    handleInputChange('birthdate', selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}

            <Text style={styles.label}>Phone Number*</Text>
            <TextInput
              placeholder="Enter your phone number"
              style={styles.input}
              keyboardType="phone-pad"
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
            />

            <Text style={styles.label}>Email*</Text>
            <TextInput
              placeholder="Enter your email"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>Username*</Text>
            <TextInput
              placeholder="Choose a username"
              style={styles.input}
              autoCapitalize="none"
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
            />

            <Text style={styles.label}>Password*</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Enter your password"
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#6C63FF"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password*</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Confirm your password"
                style={styles.passwordInput}
                secureTextEntry={!showConfirmPassword}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Icon
                  name={showConfirmPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#6C63FF"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              >
                <Icon 
                  name={acceptedTerms ? "check-square" : "square"} 
                  size={24} 
                  color="#6C63FF" 
                />
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I agree to the {' '}
                <Text 
                  style={styles.termsLink}
                  onPress={() => navigation.navigate("TermsAndConditions")}
                >
                  Terms and Conditions
                </Text>
              </Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#6C63FF', '#4A42E8']}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employer Registration</Text>
        </LinearGradient>

        <View style={styles.progressContainer}>
          <Text style={styles.stepIndicator}>
            Step {currentStep + 1} of {steps.length}
          </Text>
          <Text style={styles.stepTitle}>{steps[currentStep]}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(currentStep + 1) / steps.length * 100}%` }
              ]} 
            />
          </View>
        </View>

        {renderStepContent()}

        <View style={styles.navigationContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Icon name="arrow-left" size={20} color="#6C63FF" />
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          )}

          {currentStep < steps.length - 1 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={() => setCurrentStep(currentStep + 1)}
            >
              <Text style={[styles.navButtonText, styles.nextButtonText]}>Next</Text>
              <Icon name="arrow-right" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.submitButton]}
              onPress={handleCreateAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={[styles.navButtonText, styles.submitButtonText]}>Create Account</Text>
                  <Icon name="check" size={20} color="#4CAF50" />
                </>
              )}
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
    backgroundColor: '#F5F7FB',
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  progressContainer: {
    padding: 20,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#6C63FF',
    marginBottom: 5,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#EEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 3,
  },
  stepContent: {
    paddingHorizontal: 20,
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: 25,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 120,
    backgroundColor: '#6C63FF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  disabledInput: {
    backgroundColor: '#EEE',
  },
  dateText: {
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  termsText: {
    fontSize: 14,
    color: '#666',
  },
  termsLink: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  nextButton: {
    backgroundColor: '#6C63FF',
    borderWidth: 0,
  },
  nextButtonText: {
    color: '#FFF',
  },
  submitButton: {
    borderColor:'#4CAF50',
    borderWidth:1,
    flex: 1,
    justifyContent: 'center',
    marginLeft:65,
  },
  submitButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default CreateAccountEmployer;