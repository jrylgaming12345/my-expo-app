import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { auth, db } from '../../DataBases/firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, getDoc, where, getDocs } from 'firebase/firestore';
import { writeBatch } from 'firebase/firestore'; // Importing the correct function


const Homepage2 = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('Latest');
  const [userDetails, setUserDetails] = useState({});
  const [currentUser, setCurrentUser] = useState({ username: '', profilePicture: '' });
  const [notificationCount, setNotificationCount] = useState(0);
  const batch = writeBatch(db);  // This is the correct way to initialize a batch write



  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setCurrentUser({
              username: data?.username || 'Unknown User',
              profilePicture: data?.profilePicture || '',
            });
          }
        } catch (error) {
          console.error('Error fetching current user data:', error);
        }
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchNotificationCount = () => {
      const user = auth.currentUser;
      if (!user) return;
  
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid), // Replace with appropriate filter for the user
        where('read', '==', false) // Only fetch unread notifications
      );
  
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setNotificationCount(querySnapshot.size);
      });
  
      return unsubscribe;
    };
  
    const unsubscribe = fetchNotificationCount();
    return () => unsubscribe();
  }, []);

 
const handleNotificationsPress = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', user.uid), // Replace with appropriate filter for the user
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);

    const batch = writeBatch(db); // Using writeBatch() to create a batch instance
    querySnapshot.forEach((doc) => {
      const notificationRef = doc.ref;
      batch.update(notificationRef, { read: true });
    });

    await batch.commit();
    setNotificationCount(0); // Reset the local count
    navigation.navigate('Notifications'); // Navigate to the notifications screen
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
};
  

  const fetchJobs = () => {
    setLoading(true);
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const jobsData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data) {
            jobsData.push({ id: doc.id, ...data });
          }
        });
        setJobs(jobsData);
        fetchUserDetails(jobsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching jobs:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchJobs();
    return () => unsubscribe();
  }, []);

  const fetchUserDetails = async (jobsData) => {
    const userIds = Array.from(new Set(jobsData.map((job) => job.userId).filter(Boolean)));
    const userDetails = {};

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            userDetails[userId] = userDoc.data();
          }
        } catch (error) {
          console.error(`Error fetching data for user ${userId}:`, error);
        }
      })
    );

    setUserDetails(userDetails);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    fetchJobs();
    setRefreshing(false);
  };

  const handleJobPress = (job) => {
    navigation.navigate('JobDetails', job);
  };

  const handleFilterPress = (filterType) => {
    setFilter(filterType);
  };

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'Latest') {
      return true; // Show all jobs for 'Latest' filter
    } else if (filter === 'Blue Collar') {
      return job.jobType === 'blue-collar'; // Filter for Blue Collar jobs
    } else if (filter === 'White Collar') {
      return job.jobType === 'white-collar'; // Filter for White Collar jobs
    }
    return false; // Fallback case (though it shouldn't reach here with the current filter options)
  });
  

  const renderJob = ({ item }) => {
    const user = userDetails[item.userId] || {};
    const imageCount = item.images.length;
  
    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => handleJobPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.postHeader}>
          <Image
            source={
              user.profilePicture
                ? { uri: user.profilePicture }
                : require('../screens/assets/profile-logo.png')
            }
            style={styles.postProfilePic}
          />
          <View>
            <Text style={styles.postUsername}>{user.username || 'Loading...'}</Text>
            <Text style={styles.postTimestamp}>
              {item.createdAt
                ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                : 'Just now'}
            </Text>
          </View>
        </View>
        <Text style={styles.postTitle}>{item.title}</Text>
        <View
          style={[
            styles.imageGridContainer,
            { flexDirection: imageCount === 1 ? 'column' : 'row' }, // Adjust layout based on number of images
          ]}
        >
          {item.images.slice(0, 4).map((image, index) => (
            <Image
              key={`${item.id}-${index}`}
              source={{ uri: image }}
              style={[
                styles.gridImage,
                {
                  width: imageCount === 1 ? '100%' : '48%', // Full width for one image, 2 columns for multiple images
                  height: imageCount === 1 ? 250 : '48%', // Adjust the height for one image
                },
              ]}
            />
          ))}
        </View>
        {item.images.length > 4 && (
          <Text style={styles.moreImagesText}>
            +{item.images.length - 4} more
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="lightblue" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <TouchableOpacity onPress={handleNotificationsPress}>
  <View>
    <Image
      source={require('../screens/assets/notif.png')}
      style={styles.notifButton}
    />
    {notificationCount > 0 && (
      <View style={styles.notificationBadge}>
        <Text style={styles.notificationCount}>{notificationCount}</Text>
      </View>
    )}
  </View>
</TouchableOpacity>




        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.profileHeaderContainer}>
            <Text style={styles.username}>{currentUser.username}</Text>
            <Image
              source={
                currentUser.profilePicture
                  ? { uri: currentUser.profilePicture }
                  : require('../screens/assets/profile-logo.png')
              }
              style={styles.profilePicHeader}
            />
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={['Latest', 'Blue Collar', 'White Collar']}
        horizontal
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleFilterPress(item)}
            style={[
              styles.filterButton,
              filter === item && styles.selectedFilterButton,
            ]}
          >
            <Text style={styles.filterText}>{item}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item, index) => index.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
      />

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.jobsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notifButton: {
    width: 30,
    height: 30,
    marginTop: 4,
    marginLeft: 3,
  },
  profileHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicHeader: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginLeft: 10,
  },
  username: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterList: {
    height: 40,
    marginTop: 10,
    marginBottom: 15,
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    borderColor: 'black',
    borderWidth: 2,
  },
  selectedFilterButton: {
    backgroundColor: 'lightblue',
  },
  filterText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 45,
    paddingBottom:45,
    paddingTop:10,
    shadowRadius: 2,
    borderColor: 'grey',
    alignSelf: 'center',
    width: '100%',  // Use full width of the container
    maxWidth: 320,  // Set a maximum width to control card size
    aspectRatio: 1, // Keeps the card square
    marginHorizontal: '5%', // Add horizontal margin for spacing
    marginTop:30
  },


  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  postProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  postTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  postDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  postImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 5,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    transform: [{ translateX: -10 }],
    width: 40,
    height: 40,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0047AB',
  },
  addButtonText: {
    fontSize: 30,
    color: '#0047AB',
    fontWeight: 'bold',
    top: -3,
  },
  jobsList: {
    paddingBottom: 100,
  },

  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  imageGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 10,
  },

  gridImage: {
    width: '48%', // 2 columns with space between
    aspectRatio: 1, // Keeps the image square
    height: '48%', // Matches the width for a perfect square
    borderRadius: 8,
    marginBottom: 5,
  },

  moreImagesText: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
});



export default Homepage2;
