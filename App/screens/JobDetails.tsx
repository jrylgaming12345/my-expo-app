import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { db, doc, getDoc } from "../../DataBases/firebaseConfig"; // Firebase imports
import { auth } from "../../DataBases/firebaseConfig";
import { getAuth } from "firebase/auth";

type JobDetailsRouteProp = RouteProp<
  {
    params: {
      title: string;
      description: string;
      companyName: string;
      coordinates?: { latitude: number; longitude: number } | string;
      collarType: string;
      images: string[];
      userId: string;
      requiredDocuments: string[];
    };
  },
  "params"
>;

const JobDetails = () => {
  const route = useRoute<JobDetailsRouteProp>();
  const navigation = useNavigation();
  const {
    title,
    description,
    companyName,
    coordinates,
    jobType,
    images,
    userId,
    requiredDocuments,
  } = route.params;

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [userProfilePic, setUserProfilePic] = useState<string>("");

  const [latitude, longitude] = React.useMemo(() => {
    if (
      typeof coordinates === "object" &&
      coordinates.latitude &&
      coordinates.longitude
    ) {
      return [coordinates.latitude, coordinates.longitude];
    }
    if (typeof coordinates === "string") {
      const coords = coordinates
        .split(",")
        .map((coord) => parseFloat(coord.trim()));
      return [coords[0] || 0, coords[1] || 0];
    }
    return [null, null];
  }, [coordinates]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          setCurrentUserId(user.uid);
        }

        if (userId) {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserInfo(data);
            if (data?.profilePicture) {
              setUserProfilePic(data.profilePicture);
            }
          } else {
            console.error("User data not found");
          }
        } else {
          console.error("Invalid userId");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserInfo();
  }, [userId]);

  const handleApply = () => {
    navigation.navigate("JobApplication", { jobId: route.params.jobId });
  };

  const openImageModal = (image: string) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  const handleStartChat = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to send a message.");
      return;
    }

    try {
      const chatRef = collection(db, "chats");
      const participants = [currentUser.uid, userId];

      const chatQuery = query(
        chatRef,
        where("participants", "array-contains", currentUser.uid)
      );
      const chatSnap = await getDocs(chatQuery);

      let chatId;
      let existingChat = null;

      if (!chatSnap.empty) {
        chatSnap.forEach((doc) => {
          const chat = doc.data();
          if (chat.participants.includes(userId)) {
            existingChat = doc;
          }
        });
      }

      if (existingChat) {
        chatId = existingChat.id;
      } else {
        const newChat = await addDoc(chatRef, {
          participants,
          createdAt: Timestamp.now(),
          lastMessage: { text: "", createdAt: Timestamp.now() },
        });
        chatId = newChat.id;
      }

      navigation.navigate("ChatScreen", { chatId });
    } catch (error) {
      console.error("Error creating or opening chat room:", error);
      Alert.alert("Error", "Unable to start a chat.");
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    switch (item.type) {
      case "userInfo":
        return (
          <>
            <View style={styles.userInfo}>
              {userProfilePic ? (
                <Image
                  source={{ uri: userProfilePic }}
                  style={styles.profilePic}
                />
              ) : (
                <View style={styles.defaultProfilePic}></View>
              )}
              <Text style={styles.userInfoText}>
                Posted by: {userInfo?.username || "N/A"}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userInfoText}>
                {userInfo?.email || "N/A"}
              </Text>
            </View>
          </>
        );
      case "details":
        return (
          <View>
            <Text style={styles.sectionHeader}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <Text style={styles.sectionHeader}>Company:</Text>
            <Text style={styles.description}>{companyName}</Text>

            <Text style={styles.sectionHeader}>Collar Type:</Text>
            <Text style={styles.description}>{jobType}</Text>
            <Text style={styles.sectionHeader}>Required Documents:</Text>
            <Text style={styles.description}>{requiredDocuments}</Text>
          </View>
        );

      // Add the following inside the renderItem function for 'userInfo'
      case "messageButton":
        return (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => handleStartChat()}
          >
            <Text style={styles.messageButtonText}>Message User</Text>
          </TouchableOpacity>
        );

      case "images":
        return (
          <View>
            <Text style={styles.sectionHeader}>Images:</Text>
            <FlatList
              data={images}
              keyExtractor={(item, index) => `${item}-${index}`}
              horizontal
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => openImageModal(item)}>
                  <Image source={{ uri: item }} style={styles.image} />
                </TouchableOpacity>
              )}
            />
          </View>
        );
      case "map":
        return (
          latitude &&
          longitude && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{ latitude, longitude }}
                title="Job Location"
              />
            </MapView>
          )
        );
      case "applyButton":
        return (
          <TouchableOpacity
            style={[
              styles.applyButton,
              currentUserId === userId && styles.disabledButton,
            ]}
            onPress={handleApply}
            disabled={currentUserId === userId}
          >
            <Text style={styles.applyButtonText}>
              {currentUserId === userId ? "Your Job Post" : "Apply Now"}
            </Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const data = [
    { type: "userInfo" },
    { type: "details" },
    { type: "documents" },
    { type: "images" },
    { type: "map" },
    { type: "applyButton" },
    { type: "messageButton" }, // Add this
  ];

  return (
    <FlatList
      style={styles.container}
      data={data}
      keyExtractor={(item, index) => `${item.type}-${index}`}
      renderItem={renderItem}
      ListFooterComponent={
        modalVisible && (
          <Modal
            visible={modalVisible}
            transparent
            onRequestClose={closeImageModal}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity
                onPress={closeImageModal}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.modalImage}
                />
              )}
            </View>
          </Modal>
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  description: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#808080",
  },
  company: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#808080",
  },
  collarType: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#808080",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 8,
    color: "#000",
  },
  documentItem: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 16, // Adjusted to space out horizontally
    color: "#808080",
  },
  map: {
    height: 200,
    marginVertical: 16,
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    width: 100,
    height: 100,
    marginRight: 8,
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: 300,
    height: 300,
    borderRadius: 10,
  },
  modalCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 18,
  },
  applyButton: {
    padding: 12,
    borderRadius: 50,
    alignItems: "center",
    marginVertical: 16,
    borderColor: "#007BFF",
    borderWidth: 2,
  },
  applyButtonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#d3d3d3", // Grey color when disabled
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  defaultProfilePic: {
    width: 40,
    height: 40,
    backgroundColor: "#ccc",
    borderRadius: 20,
    marginRight: 8,
  },
  userInfoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#808080",
  },

  messageButton: {
    padding: 12,
    borderRadius: 100,
    backgroundColor: "#28a745", // Green color
    alignItems: "center",
    marginVertical: 16,
  },
  messageButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default JobDetails;
