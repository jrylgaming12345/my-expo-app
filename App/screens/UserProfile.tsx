import React, { useEffect, useState } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  Dimensions
} from 'react-native';
import { db, auth } from '../../DataBases/firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const UserProfile = ({ route, navigation }) => {
  const { userId } = route.params;
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    posts: 0
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData({
            profilePicture: data.profilePicture || null,
            username: data.username || 'No Username',
            email: data.email || 'No Email',
            bio: data.bio || 'No bio available',
            profession: data.role === 'Jobseeker' ? (data.professionalHeadline || '') : '',
            role: data.role || 'Not specified',

          });
          
          // Fetch stats
          const followers = data.followers?.length || 0;
          const following = data.following?.length || 0;
          setStats({
            followers,
            following,
            posts: 0 // You can add posts count if available
          });
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    const checkFollowStatus = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const currentUserSnap = await getDoc(currentUserRef);
        if (currentUserSnap.exists()) {
          const following = currentUserSnap.data().following || [];
          setIsFollowing(following.includes(userId));
        }
      }
    };

    fetchUserProfile();
    checkFollowStatus();
  }, [userId]);

  const handleFollowToggle = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to follow users.');
      return;
    }

    try {
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const userRef = doc(db, 'users', userId);

      if (isFollowing) {
        // Unfollow user
        await updateDoc(currentUserRef, { following: arrayRemove(userId) });
        await updateDoc(userRef, { followers: arrayRemove(currentUser.uid) });
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        // Follow user
        await updateDoc(currentUserRef, { following: arrayUnion(userId) });
        await updateDoc(userRef, { followers: arrayUnion(currentUser.uid) });
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      Alert.alert('Error', 'Unable to update follow status. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to send a message.');
      return;
    }
  
    try {
      const chatRef = collection(db, 'chats');
      const participants = [currentUser.uid, userId].sort(); // Sort for consistent comparison
  
      // Query for existing chat between these exact two users
      const chatQuery = query(
        chatRef,
        where('participants', 'array-contains', currentUser.uid)
      );
      
      const chatSnap = await getDocs(chatQuery);
      let existingChat = null;
  
      // Check each chat to find one with exactly these two participants
      chatSnap.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.participants && 
            chatData.participants.length === 2 &&
            chatData.participants.includes(currentUser.uid) && 
            chatData.participants.includes(userId)) {
          existingChat = doc;
        }
      });
  
      if (existingChat) {
        navigation.navigate('ChatScreen', { 
          chatId: existingChat.id,
          otherUserId: userId // Pass the other user's ID explicitly
        });
      } else {
        const newChat = await addDoc(chatRef, {
          participants,
          createdAt: Timestamp.now(),
          lastMessage: { 
            text: 'Chat started', 
            senderId: currentUser.uid,
            createdAt: Timestamp.now() 
          },
        });
        navigation.navigate('ChatScreen', { 
          chatId: newChat.id,
          otherUserId: userId // Pass the other user's ID explicitly
        });
      }
    } catch (error) {
      console.error('Error creating or opening chat room:', error);
      Alert.alert('Error', 'Unable to start a chat.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#5D3FD3" />
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={60} color="#d9534f" />
          <Text style={styles.errorText}>User profile not found!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <LinearGradient
          colors={['#4A90E2', '#3F51B5']}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Profile</Text>
        </LinearGradient>

        <View style={styles.profileContainer}>
          <View style={styles.profileImageContainer}>
            <Image
              source={userData.profilePicture ? 
                { uri: userData.profilePicture } : 
                require('../screens/assets/profile-logo.png')}
              style={styles.profileImage}
            />
            <View style={styles.onlineIndicator} />
          </View>

          <Text style={styles.username}>{userData.username}</Text>
          <Text style={styles.role}>{userData.role}</Text>
          <Text style={styles.profession}>{userData.profession}</Text>
          <Text style={styles.bio}>{userData.bio}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                styles.followButton,
                isFollowing && styles.unfollowButton
              ]} 
              onPress={handleFollowToggle}
            >
              <Icon 
                name={isFollowing ? "person-remove" : "person-add"} 
                size={20} 
                color="#fff" 
                style={styles.buttonIcon}
              />
              <Text style={styles.actionButtonText}>
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.messageButton]} 
              onPress={handleSendMessage}
            >
              <Icon 
                name="message" 
                size={20} 
                color="#fff" 
                style={styles.buttonIcon}
              />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Icon name="email" size={20} color="#5D3FD3" style={styles.detailIcon} />
            <Text style={styles.detailText}>{userData.email}</Text>
          </View>
          {/* Add more details here as needed */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    height: 120,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  role: {
    fontSize: 16,
    color: 'green',
    fontWeight: '600',
    marginBottom: 10,
  },

  profession: {
    fontSize: 12,
    color: '#5D3FD3',
    fontWeight: '600',
    marginBottom: 10,
  },

  
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#777',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  followButton: {
    backgroundColor: '#4A90E2',
  },
  unfollowButton: {
    backgroundColor: '#d9534f',
  },
  messageButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 5,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailIcon: {
    marginRight: 15,
  },
  detailText: {
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#d9534f',
    marginTop: 15,
    fontWeight: 'bold',
  },
});

export default UserProfile;