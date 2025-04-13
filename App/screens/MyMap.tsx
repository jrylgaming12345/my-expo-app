import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Text, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { db } from '../../DataBases/firebaseConfig';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

const MyMap = () => {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState([]);
  const [region, setRegion] = useState({
    latitude: 10.5737,
    longitude: 122.0310,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Fetch jobs from Firestore
  useEffect(() => {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const jobData = [];
      querySnapshot.forEach((doc) => {
        const job = doc.data();
        let latitude, longitude;

        if (job.coordinates && typeof job.coordinates === 'object') {
          latitude = parseFloat(job.coordinates.latitude);
          longitude = parseFloat(job.coordinates.longitude);
        } else if (job.coordinates && typeof job.coordinates === 'string') {
          const coords = job.coordinates.split(',').map(coord => parseFloat(coord.trim()));
          latitude = coords[0];
          longitude = coords[1];
        }

        if (isNaN(latitude) || isNaN(longitude)) {
          console.error("Invalid coordinates:", job.coordinates);
          return;
        }

        jobData.push({
          id: doc.id,
          title: job.title,
          description: job.description,
          images: job.images || [],
          address: job.address,
          coordinates: { latitude, longitude },
          collarType: job.collarType || 'Unknown',
          userId: job.userId,
        });
      });
      setJobs(jobData);
    });

    return () => unsubscribe();
  }, []);

  // Center map on the first job
  useEffect(() => {
    if (jobs.length > 0) {
      const firstJob = jobs[0];
      setRegion({
        latitude: firstJob.coordinates.latitude,
        longitude: firstJob.coordinates.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [jobs]);

  // Navigate to job details
  const handleJobPress = (job) => {
    navigation.navigate('JobDetails', {
      title: job.title,
      description: job.description,
      address: job.address,
      coordinates: job.coordinates,
      collarType: job.collarType,
      images: job.images,
      userId: job.userId,
    });
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView style={styles.map} region={region}>
        {jobs.map((job) => (
          <Marker
            key={job.id}
            coordinate={job.coordinates}
            title={job.title}
            description={job.address}
          >
            <Callout onPress={() => handleJobPress(job)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutText}>Available Job</Text>
                <Text>{job.title}</Text>
                <Text>{job.address}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 40,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 60,
  },
  calloutContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  calloutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'green',
  },
});

export default MyMap;
