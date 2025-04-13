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
  const [pickedImageUri, setPickedImageUri] = useState(null); // To store selected image URI
  const [isImageSelected, setIsImageSelected] = useState(false); // To track if a new image is selected
  const navigation = useNavigation();
  const [followersCount, setFollowersCount] = useState(0); // Add followers count state
  const [followingCount, setFollowingCount] = useState(0);

  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  const checkInternetConnection = async () => {
    const state = await NetInfo.fetch();
    return state.isConnected;
  };

  useEffect(() => {
    if (currentUserId) {
      fetchUserDetails(); // Fetch user details
      fetchJobs(); // Fetch jobs created by the user
      fetchFollowersCount(); // Fetch followers count
      fetchFollowingCount(); // Fetch following count
    } else {
      Alert.alert("Error", "User is not logged in.");
      navigation.navigate("Login");
    }
  }, [currentUserId]);

  const fetchFollowingCount = async () => {
    try {
      const userRef = doc(db, "users", currentUserId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const data = userSnapshot.data();
        const following = data.following || []; // Ensure the array exists
        setFollowingCount(following.length); // Count the elements in the array
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
          name: data.fullName || "Unknown",
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
        const followers = data.followers || []; // Ensure the array exists
        setFollowersCount(followers.length); // Count the elements in the array
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
        quality: 1,
      });

      if (!result.canceled) {
        setPickedImageUri(result.assets[0].uri); // Temporarily store selected image URI
        setIsImageSelected(true); // Set to true when an image is selected
      } else {
        console.log("Image selection cancelled.");
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

      const storageRef = ref(storage, `profileImages/${currentUserId}`);
      const response = await fetch(pickedImageUri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      const userRef = doc(db, "users", currentUserId);
      await setDoc(userRef, { profilePicture: downloadUrl }, { merge: true });

      setUser((prevUser) => ({ ...prevUser, image: downloadUrl }));
      setPickedImageUri(null); // Clear selected image URI after saving
      setIsImageSelected(false); // Reset the image selection state
      Alert.alert("Success", "Profile picture updated successfully.");
    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert("Error", "Failed to update profile picture.");
    }
  };

  const renderItem = ({ item }) => {
    if (item.id) {
      return (
        <View style={styles.jobContainer}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <TouchableOpacity onPress={() => handleDeleteJob(item.id)}>
            <Text style={styles.deleteButton}>Delete</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const handleLogout = () => {
      auth
        .signOut()
        .then(() => {
          // Clear the active session and other stored user data
          AsyncStorage.removeItem("activeSession");
          AsyncStorage.removeItem("userData"); // Assuming you've stored some user data
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        })
        .catch((error) => {
          console.error("Error logging out:", error);
          Alert.alert("Error", "Failed to log out.");
        });
    };

    return (
      <View style={styles.profileContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
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
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>

        {/* Follow Count Section */}
        <View style={styles.followCountContainer}>
          <View style={styles.followCountItem}>
            <Text style={styles.followCountNumber}>{followersCount}</Text>
            <Text style={styles.followCountLabel}>Followers</Text>
          </View>
          <View style={styles.followCountItem}>
            <Text style={styles.followCountNumber}>{followingCount}</Text>
            <Text style={styles.followCountLabel}>Following</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (pickedImageUri) {
              handleSaveImage(); // Save the profile picture if an image is selected
            } else {
              handleSelectImage(); // Select a new image if no image is selected
            }
          }}
          style={styles.changeProfileButton}
        >
          <Icon
            name={pickedImageUri ? "save" : "camera"}
            size={20}
            color="#007BFF"
            style={styles.icon}
          />
          <Text style={styles.changeProfileButtonText}>
            {pickedImageUri ? "Save Profile Picture" : "Change Profile Picture"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={[{ id: null }, ...jobs]}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 40,
    paddingVertical: 20,
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    borderBottomLeftRadius: 100,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: "#555",
    marginBottom: 15,
  },
  changeProfileButton: {
    marginTop: 10,
    flexDirection: "row", // Align icon and text horizontally
    alignItems: "center", // Center the items vertically
  },
  changeProfileButtonText: {
    color: "#007BFF",
    fontSize: 16,
    fontWeight: "500",
    textDecorationLine: "underline",
    marginLeft: 8, // Add space between icon and text
  },
  icon: {
    // You can style the icon here (if needed)
  },
  logoutButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    borderColor: "red",
    borderWidth: 2,
  },
  logoutButtonText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
  },
  jobContainer: {
    padding: 16,
    backgroundColor: "#f2f2f2",
    marginBottom: 15,
    borderRadius: 10,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  deleteButton: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },

  backButton: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  followCountContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  followCountItem: {
    alignItems: "center",
    marginHorizontal: 15,
  },
  followCountNumber: {
    fontSize: 18,
    fontWeight: "bold",
  },
  followCountLabel: {
    fontSize: 14,
    color: "#888",
  },
});

export default ProfileScreen;
