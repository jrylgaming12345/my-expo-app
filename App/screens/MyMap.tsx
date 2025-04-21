import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Dimensions, 
  Text, 
  TouchableOpacity, 
  Image,
  Platform
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { db } from '../../DataBases/firebaseConfig';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const MyMap = () => {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [region, setRegion] = useState({
    latitude: 10.5737,
    longitude: 122.0310,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedJob, setSelectedJob] = useState(null);

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
          price: job.price || 'Negotiable',
          createdAt: job.createdAt?.toDate() || new Date(),
        });
      });
      setJobs(jobData);
    });

    return () => unsubscribe();
  }, []);

  // Center map on the first job
  useEffect(() => {
    if (jobs.length > 0 && mapRef.current) {
      const firstJob = jobs[0];
      mapRef.current.animateToRegion({
        latitude: firstJob.coordinates.latitude,
        longitude: firstJob.coordinates.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 1000);
    }
  }, [jobs]);

  const handleJobPress = (job) => {
    setSelectedJob(job);
    navigation.navigate('JobDetails', {
      jobId: job.id,
      title: job.title,
      description: job.description,
      address: job.address,
      coordinates: job.coordinates,
      collarType: job.collarType,
      images: job.images,
      userId: job.userId,
      price: job.price,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMarkerIcon = (collarType) => {
    if (collarType === 'blue-collar') {
      return require('./assets/blue-collar-marker.png');
    } else if (collarType === 'white-collar') {
      return require('./assets/white-collar-marker.png');
    }
    return require('./assets/default-marker.png');
  };
  const focusOnJob = (job) => {
    setSelectedJob(job);
    mapRef.current.animateToRegion({
      latitude: job.coordinates.latitude,
      longitude: job.coordinates.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        toolbarEnabled={true}
        customMapStyle={mapStyle}
      >
        {jobs.map((job) => (
          <Marker
            key={job.id}
            coordinate={job.coordinates}
            onPress={() => focusOnJob(job)}
          >
            <Image 
              source={getMarkerIcon(job.collarType)} 
              style={styles.markerImage}
              resizeMode="contain"
            />
            <Callout 
              tooltip={true} 
              onPress={() => handleJobPress(job)}
              style={styles.callout}
            >
              <View style={styles.calloutContainer}>
                <View style={styles.calloutHeader}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>{job.title}</Text>
                  <View style={[
                    styles.jobTypeBadge,
                    job.collarType === 'blue-collar' ? styles.blueCollarBadge : styles.whiteCollarBadge
                  ]}>
                    <Text style={styles.jobTypeText}>
                      {job.collarType === 'blue-collar' ? 'Blue Collar' : 'White Collar'}
                    </Text>
                  </View>
                </View>
                <View style={styles.calloutBody}>
                  <View style={styles.calloutRow}>
                    <Ionicons name="location" size={14} color="#666" />
                    <Text style={styles.calloutAddress} numberOfLines={1}>{job.address}</Text>
                  </View>
                  <View style={styles.calloutRow}>
                    <MaterialIcons name="attach-money" size={14} color="#666" />
                    <Text style={styles.calloutPrice}>{job.price}</Text>
                  </View>
                  <View style={styles.calloutRow}>
                    <MaterialIcons name="date-range" size={14} color="#666" />
                    <Text style={styles.calloutDate}>{formatDate(job.createdAt)}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.viewDetailsButton}
                  onPress={() => handleJobPress(job)}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Recenter Button */}
      <TouchableOpacity 
        style={styles.recenterButton}
        onPress={() => {
          if (jobs.length > 0) {
            focusOnJob(jobs[0]);
          }
        }}
      >
        <Ionicons name="locate" size={24} color="#4A90E2" />
      </TouchableOpacity>
    </View>
  );
};

const mapStyle = [
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width,
    height,
  },
  markerImage: {
    width: 40,
    height: 40,
  },
  callout: {
    width: width * 0.7,
    borderRadius: 8,
  },
  calloutContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  calloutBody: {
    marginBottom: 8,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  calloutAddress: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  calloutPrice: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  calloutDate: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  jobTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  blueCollarBadge: {
    backgroundColor: '#E3F2FD',
  },
  whiteCollarBadge: {
    backgroundColor: '#E8F5E9',
  },
  jobTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewDetailsText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default MyMap;







