import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore'; // Correct Firestore imports
import { auth } from '../../DataBases/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
const LoginPage = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true); // Start loading
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Get Firestore instance
      const firestore = getFirestore();
  
      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
  
      if (!userDoc.exists()) {
        console.error("User data not found in Firestore");
        Alert.alert('Error', 'User data not found');
        return;
      }
  
      const userData = userDoc.data();
      console.log("User Data:", userData);
  
      // Check if user has the required data
      if (!userData.role) {
        console.error("User role is missing in Firestore");
        Alert.alert('Error', 'User role is missing');
        return;
      }
  
      // Navigate based on role
      const { role, isAdmin } = userData;
      
      if (isAdmin) {
        console.log("Navigating to Admin Homepage");
        navigation.navigate("adminHomepage");
      } else if (role === "jobseeker") {
        console.log("Navigating to Jobseeker Homepage (MainTabs)");
        navigation.navigate("MainTabs2");
      } else if (role === "employer") {
        console.log("Navigating to Employer Homepage");
        navigation.navigate("MainTabs");
      } else {
        console.error("Invalid or missing role:", role);
        Alert.alert('Error', 'User role is not valid');
      }
      
    } catch (error) {
      console.error("Error during login:", error.message);
      Alert.alert('Error', `An error occurred while logging in: ${error.message}`);
    } finally {
      setLoading(false); // Stop loading after attempt
    }
  };
  
  
  
  

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      Alert.alert('Success', 'You have successfully logged in with Google.');
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Error', 'Failed to log in with Google. Please try again.');
    }
  };

  // Function to show the account type selection popup
  const handleCreateAccount = () => {
    console.log("Handle create account pressed");  // Debugging line
    Alert.alert(
      'Select Account Type',
      'Please select what type of account you want to create:',
      [
        {
          text: 'Jobseeker', 
          onPress: () => {
            console.log("Navigating to Jobseeker account creation");  // Debugging line
            navigation.navigate('CreateAccount');
          },
        },
        {
          text: 'Employer',
          onPress: () => {
            console.log("Navigating to Employer account creation");  // Debugging line
            navigation.navigate('CreateAccountEmployer');
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };
  
  

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputContainer}>
  <Text style={styles.label}>Password</Text>
  <View style={styles.inputWrapper}>
    <TextInput
      style={styles.input}
      value={password}
      onChangeText={setPassword}
      secureTextEntry={!showPassword}
      placeholder="Enter your password"
    />
    <TouchableOpacity
      onPress={() => setShowPassword(!showPassword)}
      style={styles.eyeButton}
    >
      <Icon
        name={showPassword ? 'eye' : 'eye-off'}
        size={24}
        color="#000"
      />
    </TouchableOpacity>
  </View>
</View>


      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
        <Text style={styles.googleButtonText}>Log in with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>


      <TouchableOpacity onPress={handleCreateAccount}>
        <Text style={styles.createAccountText}>Don’t have an account? Create one here</Text>
      </TouchableOpacity>


    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 40,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    padding: 15,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 10,
    borderWidth:2,
    borderColor:'blue'
  },
  loginButtonText: {
    color: 'blue',
    fontSize: 18,
    fontWeight: 'bold',
  },
  googleButton: {
    padding: 15,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 10,
    borderWidth:2,
    borderColor:'orange'
  },
  googleButtonText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#007BFF',
  },
  createAccountText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#007BFF',
    fontWeight: 'bold',
  },
  inputContainerp: {
    marginBottom: 20,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputp: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingLeft: 15,
    paddingRight: 50, // Extra padding to avoid overlap with the eye icon
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -12 }], // Adjust to center the icon vertically
  },
});

export default LoginPage;
