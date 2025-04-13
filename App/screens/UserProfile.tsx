import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { db } from '../../DataBases/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const UserProfile = ({ route }) => {
  const { userId } = route.params; // Get the userId from the navigation parameters
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userRef = doc(db, 'users', userId); // Get the user document from Firestore
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData(userSnap.data()); // Set the user data if found
        } else {
          console.log('No such user!');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false); // Set loading to false once the data is fetched
      }
    };

    fetchUserProfile();
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No user data available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileContainer}>
        <Image
          source={userData.profilePicture ? { uri: userData.profilePicture } : require('../screens/assets/profile-logo.png')}
          style={styles.profileImage}
        />
        <Text style={styles.username}>{userData.username || 'No Username'}</Text>
        <Text style={styles.email}>{userData.email || 'No Email'}</Text>
        <Text style={styles.bio}>{userData.bio || 'No Bio available'}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  profileContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 16,
    color: '#555',
    marginTop: 10,
  },
  bio: {
    fontSize: 14,
    color: '#777',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default UserProfile;
