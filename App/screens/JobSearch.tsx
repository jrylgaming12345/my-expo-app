import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from "react-native";
import { db , auth } from "../../DataBases/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

const JobSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    console.log("Starting search with term:", normalizedSearchTerm);

    const jobsRef = collection(db, "jobs");
    const usersRef = collection(db, "users");

    try {
      // Fetch jobs matching search term
      const jobSnapshot = await getDocs(jobsRef);
      const jobResults = jobSnapshot.docs
        .map((doc) => ({ id: doc.id, type: "job", ...doc.data() }))
        .filter((job) =>
          job.title?.toLowerCase().includes(normalizedSearchTerm)
        );

      // Fetch user details for each job
      const userIds = [...new Set(jobResults.map((job) => job.userId))];
      const userPromises = userIds.map((userId) =>
        getDocs(query(usersRef, where("id", "==", userId)))
      );
      const userSnapshots = await Promise.all(userPromises);

      const users = userSnapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

      // Combine job data with user details
      const jobsWithUserDetails = jobResults.map((job) => {
        const user = users.find((user) => user.id === job.userId) || {};
        return { ...job, user };
      });

      // Fetch users matching search term
      const userSnapshot = await getDocs(usersRef);
      const userResults = userSnapshot.docs
        .map((doc) => ({ id: doc.id, type: "user", ...doc.data() }))
        .filter((user) =>
          user.username?.toLowerCase().includes(normalizedSearchTerm)
        );

      const results = [...jobsWithUserDetails, ...userResults];
      console.log("Search results:", results);

      setSearchResults(results);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchItem = ({ item }) => {
    const user = item.type === "job" ? item.user : item;
    const isUserResult = item.type === "user";
    const currentUser = auth.currentUser; // Add this line to get current user
  
    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => {
          if (isUserResult) {
            // Check if this is the current user's profile
            if (user.id === currentUser?.uid) {
              navigation.navigate("Profile");
            } else {
              navigation.navigate("UserProfile", { userId: item.id });
            }
          } else {
            navigation.navigate("JobDetails", { jobId: item.id });
          }
        }}
        activeOpacity={0.8}
      >
        {/* Rest of your render code remains the same */}
        {user && (
          <View style={styles.postHeader}>
            <Image
              source={
                user.profilePicture
                  ? { uri: user.profilePicture }
                  : require("../screens/assets/profile-logo.png")
              }
              style={styles.postProfilePic}
            />
            <View style={styles.userInfo}>
              <Text style={styles.postUsername}>
                {user.username || "Anonymous"}
              </Text>
              <Text style={styles.postTimestamp}>
                {item.createdAt
                  ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                  : "Recently"}
              </Text>
            </View>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>
                {isUserResult ? "Profile" : "Job"}
              </Text>
            </View>
          </View>
        )}
        
        {!isUserResult && (
          <>
            <Text style={styles.postTitle}>{item.title || "No Title"}</Text>
            <Text style={styles.postDescription} numberOfLines={2}>
              {item.description || "No description available"}
            </Text>
          </>
        )}
  
        {item.images && item.images.length > 0 && (
          <FlatList
            data={item.images}
            horizontal
            keyExtractor={(image, index) => `${item.id}-${index}`}
            renderItem={({ item: image }) => (
              <Image source={{ uri: image }} style={styles.postImage} />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageList}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Jobs & People</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for jobs or users..."
          placeholderTextColor="#999"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Image
              source={require("../screens/assets/search_logo.png")}
              style={styles.searchIcon}
            />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchItem}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Image
            source={require("../screens/assets/search_logo.png")}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyText}>
            {searchTerm ? "No results found" : "Search for jobs or people"}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2c3e50",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F4",
    borderRadius: 100,
    paddingHorizontal: 15,
    paddingVertical: 12,
    width: 300,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4A90E2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft:10,
  },
  searchIcon: {
    width: 24,
    height: 24,
    tintColor: "#fff",
  },
  postCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  postProfilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  postUsername: {
    color: "#2c3e50",
    fontSize: 16,
    fontWeight: "600",
  },
  postTimestamp: {
    color: "#95a5a6",
    fontSize: 12,
    marginTop: 2,
  },
  typeBadge: {
    backgroundColor: "#e1f0ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: "#0047AB",
    fontSize: 12,
    fontWeight: "600",
  },
  postTitle: {
    color: "#2c3e50",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  postDescription: {
    color: "#7f8c8d",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  imageList: {
    paddingTop: 8,
  },
  postImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#0047AB",
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyImage: {
    width: 150,
    height: 150,
    opacity: 0.6,
    marginBottom: 20,
  },
  emptyText: {
    color: "#95a5a6",
    fontSize: 18,
    textAlign: "center",
    marginTop: 10,
  },
  resultsList: {
    paddingBottom: 20,
  },
});

export default JobSearch;