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
} from "react-native";
import { db } from "../../DataBases/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

const JobSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return; // Ensure search term is not empty
    setLoading(true);

    const normalizedSearchTerm = searchTerm.trim().toLowerCase(); // Normalize the search term to lowercase

    console.log("Starting search with term:", normalizedSearchTerm);

    const jobsRef = collection(db, "jobs");
    const usersRef = collection(db, "users");

    try {
      // Fetch all jobs that match the search term
      const jobSnapshot = await getDocs(jobsRef);
      const jobResults = jobSnapshot.docs
        .map((doc) => ({ id: doc.id, type: "job", ...doc.data() }))
        .filter((job) =>
          job.title?.toLowerCase().includes(normalizedSearchTerm)
        );

      // Fetch user details for each job
      const userIds = [...new Set(jobResults.map((job) => job.userId))]; // Get unique userIds
      const userPromises = userIds.map((userId) =>
        getDocs(query(usersRef, where("id", "==", userId)))
      );
      const userSnapshots = await Promise.all(userPromises);

      const users = userSnapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

      // Attach user data to each job
      const jobsWithUserDetails = jobResults.map((job) => {
        const user = users.find((user) => user.id === job.userId) || {};
        return { ...job, user };
      });

      // Combine results (jobs with user details + other users matching the search term)
      const userSnapshot = await getDocs(usersRef);
      const userResults = userSnapshot.docs
        .map((doc) => ({ id: doc.id, type: "user", ...doc.data() }))
        .filter((user) =>
          user.username?.toLowerCase().includes(normalizedSearchTerm)
        );

      const results = [...jobsWithUserDetails, ...userResults];
      console.log("Search results:", results);

      setSearchResults(results); // Update search results state
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchItem = ({ item }) => {
    let user = null;

    if (item.type === "job") {
      // For jobs, we assume the userId corresponds to a user in the 'users' collection
      user = item.userId; // Assuming userId is stored in the job document
    } else if (item.type === "user") {
      // For users, directly use the user data
      user = item;
    }

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => {
          if (item.type === "job") {
            // Navigate to JobDetails with the jobId
            navigation.navigate("JobDetails", { jobId: item.id });
          } else if (item.type === "user") {
            // Navigate to UserProfile with the userId
            navigation.navigate("UserProfile", { userId: item.id });
          }
        }}
        activeOpacity={0.8}
      >
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
            <View>
              <Text style={styles.postUsername}>
                {user.username || "Loading..."}
              </Text>
              <Text style={styles.postTimestamp}>
                {item.createdAt
                  ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                  : "Just now"}
              </Text>
            </View>
          </View>
        )}
        <Text style={styles.postTitle}>{item.role || "No Title"}</Text>
        {item.images && (
          <FlatList
            data={item.images}
            horizontal
            keyExtractor={(image, index) => `${item.id}-${index}`}
            renderItem={({ item: image }) => (
              <Image source={{ uri: image }} style={styles.postImage} />
            )}
            showsHorizontalScrollIndicator={false}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a job title or user..."
          placeholderTextColor="#888"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Image
            source={require("../screens/assets/search_logo.png")}
            style={styles.searchIcon}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Searching...</Text>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchItem}
          contentContainerStyle={styles.resultsList}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 20,
    paddingBottom: 50,
  },
  searchContainer: {
    flexDirection: "row",

    alignItems: "center",
    marginBottom: 15,
    marginTop: 30,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    color: "#333",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderColor: "grey",
    borderWidth: 1,
  },
  searchButton: {
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#0047AB",
    borderWidth: 2,
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: "black",
  },
  postCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 40,
    marginBottom: 15,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  postProfilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  postUsername: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  postTimestamp: {
    color: "#555",
    fontSize: 14,
    marginLeft: 10,
  },
  postTitle: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  postDescription: {
    color: "#555",
    fontSize: 14,
    marginTop: 5,
  },
  postImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 5,
  },
  loadingText: {
    color: "#4CAF50",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  resultsList: {
    paddingBottom: 100,
  },
});

export default JobSearch;
