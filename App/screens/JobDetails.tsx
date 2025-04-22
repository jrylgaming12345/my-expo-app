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
  Alert,
  Linking
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { db, doc, getDoc, collection, query, where, getDocs, addDoc, Timestamp } from "../../DataBases/firebaseConfig";
import { auth } from "../../DataBases/firebaseConfig";
import { getAuth } from "firebase/auth";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

type JobDetailsRouteProp = RouteProp<
  {
    params: {
      title: string;
      description: string;
      companyName: string;
      coordinates?: { latitude: number; longitude: number } | string;
      jobType: string;
      images: string[];
      userId: string;
      requiredDocuments: string[];
      jobId: string;
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
    jobId
  } = route.params;

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [userProfilePic, setUserProfilePic] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

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
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserInfo();
  }, [userId]);

  const handleApply = () => {
    navigation.navigate("JobApplication", { jobId });
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

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallEmployer = () => {
    if (userInfo?.phoneNumber) {
      Linking.openURL(`tel:${userInfo.phoneNumber}`);
    } else {
      Alert.alert("Info", "Phone number not available for this employer.");
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    switch (item.type) {
      case "header":
        return (
          <LinearGradient
            colors={['#6C63FF', '#4A42E8']}
            style={styles.headerGradient}
          >
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.jobTitle}>{title}</Text>
            <Text style={styles.companyName}>{companyName}</Text>
          </LinearGradient>
        );
      case "userInfo":
        return (
          <View style={styles.userInfoContainer}>
            <View style={styles.userInfoHeader}>
              {userProfilePic ? (
                <Image
                  source={{ uri: userProfilePic }}
                  style={styles.profilePic}
                />
              ) : (
                <View style={styles.defaultProfilePic}>
                  <Icon name="person" size={24} color="#FFF" />
                </View>
              )}
              <View style={styles.userTextContainer}>
                <Text style={styles.postedByText}>Posted by</Text>
                <Text style={styles.userName}>{userInfo?.username || "N/A"}</Text>
              </View>
            </View>
            <View style={styles.userContactContainer}>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={handleStartChat}
                disabled={isLoading}
              >
                <Icon name="message" size={18} color="#FFF" />
                <Text style={styles.contactButtonText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.contactButton, styles.callButton]}
                onPress={handleCallEmployer}
              >
                <Icon name="call" size={18} color="#FFF" />
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case "details":
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Description</Text>
              <Text style={styles.sectionContent}>{description}</Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Type</Text>
              <View style={styles.jobTypeBadge}>
                <Text style={styles.jobTypeText}>{jobType}</Text>
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Required Documents</Text>
              <View style={styles.documentsContainer}>
                {requiredDocuments?.map((doc, index) => (
                  <View key={index} style={styles.documentBadge}>
                    <Text style={styles.documentText}>{doc}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        );
      case "images":
        return images?.length > 0 ? (
          <View style={styles.imagesContainer}>
            <Text style={styles.sectionTitle}>Job Images</Text>
            <FlatList
              data={images}
              keyExtractor={(item, index) => `${item}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => openImageModal(item)}
                  style={styles.imageWrapper}
                >
                  <Image source={{ uri: item }} style={styles.image} />
                </TouchableOpacity>
              )}
            />
          </View>
        ) : null;
      case "map":
        return latitude && longitude ? (
          <View style={styles.mapContainer}>
            <Text style={styles.sectionTitle}>Location</Text>
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
              >
                <View style={styles.marker}>
                  <Icon name="place" size={24} color="#6C63FF" />
                </View>
              </Marker>
            </MapView>
          </View>
        ) : null;
      case "applyButton":
        return (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.applyButton,
                currentUserId === userId && styles.disabledButton,
              ]}
              onPress={handleApply}
              disabled={currentUserId === userId}
            >
              <LinearGradient
                colors={currentUserId === userId ? ['#CCCCCC', '#AAAAAA'] : ['#6C63FF', '#4A42E8']}
                style={styles.buttonGradient}
              >
                <Text style={styles.applyButtonText}>
                  {currentUserId === userId ? "Your Job Post" : "Apply Now"}
                </Text>
                <Icon name="send" size={20} color="#FFF" style={styles.buttonIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  const data = [
    { type: "header" },
    { type: "userInfo" },
    { type: "details" },
    { type: "images" },
    { type: "map" },
    { type: "applyButton" },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
      
      <Modal
        visible={modalVisible}
        transparent
        onRequestClose={closeImageModal}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            onPress={closeImageModal}
            style={styles.modalCloseButton}
          >
            <Icon name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  listContent: {
    paddingBottom: 20,
  },
  headerGradient: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 10,
  },
  companyName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  userInfoContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultProfilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6C63FF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTextContainer: {
    flex: 1,
  },
  postedByText: {
    fontSize: 12,
    color: '#666',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userContactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  callButton: {
    backgroundColor: '#4CAF50',
    marginRight: 0,
  },
  contactButtonText: {
    color: '#FFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  detailsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  jobTypeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  jobTypeText: {
    color: '#1976D2',
    fontWeight: '500',
  },
  documentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  documentBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  documentText: {
    color: '#666',
    fontSize: 12,
  },
  imagesContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageWrapper: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  mapContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  map: {
    height: 200,
    borderRadius: 8,
  },
  marker: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 5,
    borderRadius: 20,
  },
  footer: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  applyButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 10,
  },
});

export default JobDetails;