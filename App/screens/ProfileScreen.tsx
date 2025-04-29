import React, { useState, useEffect } from "react";
import Icon from "react-native-vector-icons/Ionicons";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  FlatList,
  ScrollView,
  ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { db, storage } from "../../DataBases/firebaseConfig";
import { getAuth } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const ProfileScreen = () => {
  const [user, setUser] = useState({ name: "", email: "", image: "" });
  const [jobs, setJobs] = useState([]);
  const [pickedImageUri, setPickedImageUri] = useState(null);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const navigation = useNavigation();

  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  const checkInternetConnection = async () => {
    const state = await NetInfo.fetch();
    return state.isConnected;
  };

  useEffect(() => {
    if (currentUserId) {
      fetchData();
    } else {
      Alert.alert("Error", "User is not logged in.");
      navigation.navigate("Login");
    }
  }, [currentUserId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchUserDetails(),
        fetchJobs(),
        fetchFollowersCount(),
        fetchFollowingCount()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load profile data.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFollowingCount = async () => {
    try {
      const userRef = doc(db, "users", currentUserId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const data = userSnapshot.data();
        const following = data.following || [];
        setFollowingCount(following.length);
      }
    } catch (error) {
      console.error("Error fetching following count:", error);
      Alert.alert("Error", "Failed to fetch following count.");
    }
  };

  const fetchUserDetails = async () => {
    try {
      const isConnected = await checkInternetConnection();
      if (!isConnected) {
        Alert.alert("No Internet", "Please check your internet connection.");
        return;
      }

      const userRef = doc(db, "users", currentUserId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const data = userSnapshot.data();
        setUser({
          name: data.username || "Unknown",
          email: data.email || "Unknown",
          image: data.profilePicture || "",
        });
      } else {
        Alert.alert("Error", "User data not found.");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      Alert.alert("Error", "Failed to fetch user details.");
    }
  };

  const fetchFollowersCount = async () => {
    try {
      const userRef = doc(db, "users", currentUserId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const data = userSnapshot.data();
        const followers = data.followers || [];
        setFollowersCount(followers.length);
      }
    } catch (error) {
      console.error("Error fetching followers count:", error);
      Alert.alert("Error", "Failed to fetch followers count.");
    }
  };

  const fetchJobs = async () => {
    try {
      const isConnected = await checkInternetConnection();
      if (!isConnected) {
        Alert.alert("No Internet", "Please check your internet connection.");
        return;
      }

      const q = query(
        collection(db, "jobs"),
        where("userId", "==", currentUserId)
      );
      const querySnapshot = await getDocs(q);
      const jobsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setJobs(jobsList);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      Alert.alert("Error", "Failed to fetch jobs.");
    }
  };

  const handleSelectImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== "granted") {
        Alert.alert(
          "Permission required",
          "Permission to access media library is required!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPickedImageUri(result.assets[0].uri);
        setIsImageSelected(true);
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const handleSaveImage = async () => {
    try {
      if (!pickedImageUri) {
        Alert.alert("Error", "Please select an image first.");
        return;
      }

      const isConnected = await checkInternetConnection();
      if (!isConnected) {
        Alert.alert("No Internet", "Please check your internet connection.");
        return;
      }

      setIsUploading(true);
      const storageRef = ref(storage, `profileImages/${currentUserId}`);
      const response = await fetch(pickedImageUri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      const userRef = doc(db, "users", currentUserId);
      await setDoc(userRef, { profilePicture: downloadUrl }, { merge: true });

      setUser((prevUser) => ({ ...prevUser, image: downloadUrl }));
      setPickedImageUri(null);
      setIsImageSelected(false);
      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert("Error", "Failed to update profile picture.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      Alert.alert(
        "Delete Job",
        "Are you sure you want to delete this job?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            onPress: async () => {
              await deleteDoc(doc(db, "jobs", jobId));
              fetchJobs();
              Alert.alert("Success", "Job deleted successfully.");
            },
            style: "destructive",
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting job:", error);
      Alert.alert("Error", "Failed to delete job.");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await auth.signOut();
              await AsyncStorage.removeItem("activeSession");
              await AsyncStorage.removeItem("userData");
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            } catch (error) {
              console.error("Error logging out:", error);
              Alert.alert("Error", "Failed to log out.");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const renderJobItem = ({ item }) => (
    <View style={styles.jobContainer}>
      <Text style={styles.jobTitle}>{item.title}</Text>
      <View style={styles.jobActions}>
        <TouchableOpacity 
          onPress={() => navigation.navigate("EditJob", { jobId: item.id })}
          style={styles.editButton}
        >
          <Icon name="create-outline" size={18} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleDeleteJob(item.id)}
          style={styles.deleteButton}
        >
          <Icon name="trash-outline" size={18} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Icon name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      
      <View style={styles.profileImageContainer}>
        <Image
          source={
            pickedImageUri
              ? { uri: pickedImageUri }
              : user.image
              ? { uri: user.image }
              : require("../screens/assets/profile-logo.png")
          }
          style={styles.profileImage}
        />
        <TouchableOpacity
          onPress={isImageSelected ? handleSaveImage : handleSelectImage}
          style={styles.cameraButton}
        >
          <Icon
            name={isImageSelected ? "save" : "camera"}
            size={20}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.profileName}>{user.name}</Text>
      <Text style={styles.profileEmail}>{user.email}</Text>

      <View style={styles.followCountContainer}>
        <View style={styles.followCountItem}>
          <Text style={styles.followCountNumber}>{followersCount}</Text>
          <Text style={styles.followCountLabel}>Followers</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.followCountItem}>
          <Text style={styles.followCountNumber}>{followingCount}</Text>
          <Text style={styles.followCountLabel}>Following</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        onPress={handleLogout} 
        style={styles.logoutButton}
      >
        <Icon name="log-out-outline" size={18} color="#F44336" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={renderProfileHeader}
        data={jobs}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="briefcase-outline" size={50} color="#CCC" />
            <Text style={styles.emptyText}>No jobs posted yet</Text>
            <TouchableOpacity 
              style={styles.addJobButton}
              onPress={() => navigation.navigate("PostJob")}
            >
              <Text style={styles.addJobButtonText}>Create Your First Job</Text>
            </TouchableOpacity>
          </View>
        }
      />
      
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadBox}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.uploadText}>Uploading Profile Picture...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  listContainer: {
    paddingBottom: 20,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 15,
  },
  backButton: {
    position: "absolute",
    top: 15,
    left: 15,
    zIndex: 1,
    backgroundColor: "#F1F1F1",
    borderRadius: 20,
    padding: 5,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#007BFF",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: "grey",
    fontWeight:'bold',
    marginBottom: 20,
  },
  followCountContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 25,
    alignItems: "center",
  },
  followCountItem: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  followCountNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  followCountLabel: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "#DDD",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderColor: "#F44336",
    borderWidth: 1,
  },
  logoutButtonText: {
    color: "#F44336",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  jobContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 15,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  jobActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    padding: 8,
    marginRight: 10,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    marginTop: 15,
    marginBottom: 25,
  },
  addJobButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  addJobButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  uploadBox: {
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 30,
    borderRadius: 15,
    alignItems: "center",
  },
  uploadText: {
    color: "#FFF",
    marginTop: 15,
    fontSize: 16,
  },

  roleBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 15,
  },
  employerBadge: {
    backgroundColor: '#4CAF50',
  },
  employeeBadge: {
    backgroundColor: '#2196F3',
  },
  roleText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default ProfileScreen;