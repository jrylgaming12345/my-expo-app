import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const RoleSelection = () => {
  const navigation = useNavigation();

  const handleRoleSelection = (role) => {
    if (role === 'jobseeker') {
      navigation.navigate('CreateAccount'); // Navigate to Jobseeker Account Creation
    } else if (role === 'employer') {
      navigation.navigate('CreateAccountEmployer'); // Navigate to Employer Account Creation
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Role</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => handleRoleSelection('jobseeker')}
      >
        <Text style={styles.buttonText}>Jobseeker</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => handleRoleSelection('employer')}
      >
        <Text style={styles.buttonText}>Employer</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RoleSelection;
