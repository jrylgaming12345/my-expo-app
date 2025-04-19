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
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../../DataBases/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const LoginPage = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const firestore = getFirestore();
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));

      if (!userDoc.exists()) {
        Alert.alert('Error', 'User data not found');
        return;
      }

      const userData = userDoc.data();

      if (!userData.role) {
        Alert.alert('Error', 'User role is missing');
        return;
      }

      const { role, isAdmin } = userData;

      if (role === "jobseeker") {
        navigation.navigate("MainTabs2");
      } else if (role === "employer") {
        navigation.navigate("MainTabs");
      } else {
        Alert.alert('Error', 'User role is not valid');
      }

    } catch (error) {
      Alert.alert('Error', `Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigation.replace('MainTabs');
    } catch (error) {
      Alert.alert('Error', 'Failed to log in with Google');
    }
  };

  const handleCreateAccount = () => {
    Alert.alert(
      'Create Account',
      'Select your account type:',
      [
        {
          text: 'Jobseeker',
          onPress: () => navigation.navigate('CreateAccount'),
        },
        {
          text: 'Employer',
          onPress: () => navigation.navigate('CreateAccountEmployer'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#4A90E2', '#3F51B5']}
        style={styles.header}
      >
        <Image
          source={require('../../assets/login-icon.png')}
          style={styles.logo}
        />
        <Text style={styles.welcomeText}>Welcome to HUSTLE HUB</Text>
        <Text style={styles.subText}>Login to continue</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Icon name="mail" size={20} color="#777" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Icon name="lock" size={20} color="#777" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Enter your password"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Icon
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#777"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
          <Image
            source={require('../screens/assets/google.png')}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account?</Text>
          <TouchableOpacity onPress={handleCreateAccount}>
            <Text style={styles.signupLink}> Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 250,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  formContainer: {
    paddingHorizontal: 30,
    marginTop: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginLeft: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 10,
  },
  forgotPasswordText: {
    textAlign: 'right',
    color: '#5D3FD3',
    fontSize: 14,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#4A90E2',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    width: 50,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  signupText: {
    color: '#777',
    fontSize: 14,
  },
  signupLink: {
    color: '#5D3FD3',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginPage;