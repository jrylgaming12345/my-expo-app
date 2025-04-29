import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Dimensions, 
  Text, 
  TouchableOpacity, 
  Image,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { db } from '../../DataBases/firebaseConfig';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const MyMap = () => {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [region, setRegion] = useState({
    latitude: 10.5737,
    longitude: 122.0310,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });
  const [selectedJob, setSelectedJob] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Get Google Maps API key from environment variables
  const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey;

  // Request location permission and get current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        setLocationPermission(false);
        return;
      }
      setLocationPermission(true);

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      // Set the region to user's location
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    })();
  }, []);

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
          ...job,
          coordinates: { latitude, longitude },
          createdAt: job.createdAt?.toDate() || new Date(),
        });
      });
      setJobs(jobData);
    });

    return () => unsubscribe();
  }, []);

  // Filter jobs within 2 square kilometers when user location or jobs change
  useEffect(() => {
    if (userLocation && jobs.length > 0) {
      const nearby = jobs.filter(job => {
        return calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          job.coordinates.latitude,
          job.coordinates.longitude
        ) <= 2; // 2 kilometers
      });
      setNearbyJobs(nearby);
    }
  }, [userLocation, jobs]);

  // Handle search for places
  const handleSearch = async () => {
    if (!searchQuery.trim() || !GOOGLE_MAPS_API_KEY) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          searchQuery
        )}&location=${userLocation?.latitude},${userLocation?.longitude}&radius=10000&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Focus map on a searched location
  const focusOnSearchResult = (result) => {
    const { geometry } = result;
    if (geometry && geometry.location) {
      mapRef.current.animateToRegion({
        latitude: geometry.location.lat,
        longitude: geometry.location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
      setShowSearchResults(false);
      setSearchQuery(result.name);
    }
  };

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  const handleJobPress = (job) => {
    navigation.navigate("JobDetails", job);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMarkerIcon = (collarType) => {
    if (collarType === 'blue collar') {
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

  const focusOnUserLocation = () => {
    if (userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }, 1000);
    }
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
        onRegionChangeComplete={setRegion}
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a place..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={handleSearch}
            disabled={!GOOGLE_MAPS_API_KEY}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#4A90E2" />
            ) : (
              <Feather name="search" size={20} color="#4A90E2" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {showSearchResults && (
          <View style={styles.searchResultsContainer}>
            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
              </View>
            ) : searchResults.length > 0 ? (
              <ScrollView 
                style={styles.searchResultsScroll}
                keyboardShouldPersistTaps="handled"
              >
                {searchResults.map((result, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchResultItem}
                    onPress={() => focusOnSearchResult(result)}
                  >
                    <Ionicons name="location-sharp" size={20} color="#4A90E2" />
                    <View style={styles.searchResultText}>
                      <Text style={styles.searchResultName} numberOfLines={1}>
                        {result.name}
                      </Text>
                      <Text style={styles.searchResultAddress} numberOfLines={1}>
                        {result.formatted_address}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                  {GOOGLE_MAPS_API_KEY ? 'No results found' : 'Google Maps API key not configured'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Nearby Jobs List */}
      {userLocation && nearbyJobs.length > 0 && (
        <View style={styles.jobsListContainer}>
          <Text style={styles.jobsListTitle}>Nearby Jobs ({nearbyJobs.length})</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.jobsListScroll}
          >
            {nearbyJobs.map(job => (
              <TouchableOpacity 
                key={job.id} 
                style={styles.jobCard}
                onPress={() => focusOnJob(job)}
              >
                <Text style={styles.jobCardTitle} numberOfLines={1}>{job.title}</Text>
                <Text style={styles.jobCardDistance}>
                  {calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    job.coordinates.latitude,
                    job.coordinates.longitude
                  ).toFixed(1)} km away
                </Text>
                <Text style={styles.jobCardPrice}>{job.price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recenter Button */}
      <TouchableOpacity 
        style={styles.recenterButton}
        onPress={focusOnUserLocation}
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
    bottom: 120,
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
  jobsListContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    maxHeight: 150,
  },
  jobsListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  jobsListScroll: {
    paddingRight: 20,
  },
  jobCard: {
    width: 150,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
  },
  jobCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  jobCardDistance: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  jobCardPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 5,
  },
  searchButton: {
    padding: 5,
  },
  searchResultsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 10,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultsScroll: {
    padding: 10,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultText: {
    flex: 1,
    marginLeft: 10,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  searchResultAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
  },
});

export default MyMap;