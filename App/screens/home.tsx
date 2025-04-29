import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { auth, db } from "../../DataBases/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const Home = () => {
  // Navigation
  const navigation = useNavigation<NavigationProp<any>>();

  // State management
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("Latest");
  const [userDetails, setUserDetails] = useState({});
  const [currentUser, setCurrentUser] = useState({
    username: "",
    profilePicture: "",
  });
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setCurrentUser({
              username: data?.username || "Unknown User",
              profilePicture: data?.profilePicture || "",
            });
          }
        } catch (error) {
          console.error("Error fetching current user data:", error);
        }
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch notification count
  useEffect(() => {
    const fetchNotificationCount = () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("read", "==", false)
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setNotificationCount(querySnapshot.size);
      });

      return unsubscribe;
    };

    const unsubscribe = fetchNotificationCount();
    return () => unsubscribe();
  }, []);

  // Handle marking notifications as read
  const handleNotificationsPress = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const notificationsRef = collection(db, "notifications");
      const q = query(
        notificationsRef,
        where("userId", "==", user.uid),
        where("read", "==", false)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
      setNotificationCount(0);
      navigation.navigate("Notifications");
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  // Fetch jobs data
  const fetchJobs = () => {
    setLoading(true);
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));

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
        console.error("Error fetching jobs:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchJobs();
    return () => unsubscribe();
  }, []);

  // Fetch user details for jobs
  const fetchUserDetails = async (jobsData) => {
    const userIds = Array.from(
      new Set(jobsData.map((job) => job.userId).filter(Boolean))
    );
    const userDetails = {};

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
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

  // Refresh control
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  // Navigation handlers
  const handleJobPress = (job) => {
    navigation.navigate("JobDetails", job);
  };

  const handleFilterPress = (filterType) => {
    setFilter(filterType);
  };

  // Filter jobs based on selected filter
  const filteredJobs = jobs.filter((job) => {
    switch (filter) {
      case "Latest":
        return true;
      case "Blue Collar":
        return job.jobType === "blue-collar";
      case "White Collar":
        return job.jobType === "white-collar";
      default:
        return false;
    }
  });

  // Render individual job item
  const renderJob = ({ item }) => {
    const user = userDetails[item.userId] || {};
    const imageCount = item.images.length;
    const jobDate = item.createdAt
      ? new Date(item.createdAt.seconds * 1000)
      : new Date();
    const formattedDate = `${jobDate.getDate()}/${
      jobDate.getMonth() + 1
    }/${jobDate.getFullYear()}`;

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => handleJobPress(item)}
        activeOpacity={0.9}
      >
        <View style={styles.postHeader}>
          <Image
            source={
              user.profilePicture
                ? { uri: user.profilePicture }
                : require("../screens/assets/profile-logo.png")
            }
            style={styles.postProfilePic}
          />
          <View style={styles.postUserInfo}>
            <Text style={styles.postUsername}>
              {user.username || "Loading..."}
            </Text>
            <Text style={styles.postTimestamp}>{formattedDate}</Text>
          </View>
          <View style={styles.jobTypeBadge}>
            <Text style={styles.jobTypeText}>
              {item.jobType === "blue collar" ? "Blue Collar" : "White Collar"}
            </Text>
          </View>
        </View>

        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postDescription} numberOfLines={2}>
          {item.description}
        </Text>

        {imageCount > 0 && (
          <View
            style={[
              styles.imageGridContainer,
              { flexDirection: imageCount === 1 ? "column" : "row" },
            ]}
          >
            {item.images.slice(0, 4).map((image, index) => (
              <Image
                key={`${item.id}-${index}`}
                source={{ uri: image }}
                style={[
                  styles.gridImage,
                  {
                    width: imageCount === 1 ? "100%" : "48%",
                    height: imageCount === 1 ? 180 : 100,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {item.images.length > 4 && (
          <Text style={styles.moreImagesText}>
            +{item.images.length - 4} more images
          </Text>
        )}

        <View style={styles.postFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>${item.price || "Negotiable"}</Text>
          </View>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.locationText}>
              {item.location || "Location not specified"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading opportunities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require("./assets/google.png")} style={styles.logo} />
          <Text style={styles.headerTitle}>HustleHub</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleNotificationsPress}
            style={styles.notificationButton}
          >
            <Ionicons name="notifications" size={24} color="#333" />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
            <Image
              source={
                currentUser.profilePicture
                  ? { uri: currentUser.profilePicture }
                  : require("../screens/assets/profile-logo.png")
              }
              style={styles.profilePicHeader}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          style={styles.searchInput}
          onPress={() => navigation.navigate("JobSearch")}
        >
          <Ionicons name="search" size={20} color="#999" />
          <Text style={styles.searchPlaceholder}>
            Search for jobs or services
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        {["Latest", "Blue Collar", "White Collar"].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => handleFilterPress(item)}
            style={[
              styles.filterButton,
              filter === item && styles.selectedFilterButton,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === item && styles.selectedFilterText,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Jobs List */}
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.jobsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#4A90E2"]}
            tintColor="#4A90E2"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="work-outline" size={60} color="#DDD" />
            <Text style={styles.emptyText}>No jobs available</Text>
            <Text style={styles.emptySubtext}>
              Check back later or post your own opportunity
            </Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("PostJob")}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
};

// Modern Styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 50,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C3E50",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationButton: {
    marginRight: 20,
    position: "relative",
  },
  profilePicHeader: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -8,
    backgroundColor: "#E74C3C",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationCount: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "white",
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F4",
    borderRadius: 100,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    marginLeft: 10,
    color: "#999",
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  filterButton: {
    backgroundColor: "#F1F3F4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
  },
  selectedFilterButton: {
    backgroundColor: "#4A90E2",
  },
  filterText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedFilterText: {
    color: "white",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 15,
    color: "#666",
    fontSize: 16,
  },
  jobsList: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  postUserInfo: {
    marginLeft: 10,
    flex: 1,
  },
  postUsername: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C3E50",
  },
  postTimestamp: {
    fontSize: 12,
    color: "#95A5A6",
    marginTop: 2,
  },
  jobTypeBadge: {
    backgroundColor: "#E8F4FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  jobTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A90E2",
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 12,
    lineHeight: 20,
  },
  imageGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  gridImage: {
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F1F3F4",
  },
  moreImagesText: {
    fontSize: 13,
    color: "#95A5A6",
    marginBottom: 12,
    textAlign: "center",
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 12,
  },
  priceContainer: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27AE60",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    color: "#95A5A6",
    marginTop: 15,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#BDC3C7",
    marginTop: 5,
  },
});

export default Home;
