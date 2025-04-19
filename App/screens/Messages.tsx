import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
  ActivityIndicator
} from "react-native";
import { db, auth } from "../../DataBases/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

const Messages = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to view messages.");
      navigation.goBack();
      return;
    }

    const messagesRef = collection(db, "chats");
    const q = query(
      messagesRef,
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      try {
        setLoading(true);
        const rooms = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(rooms);

        const otherUsers = rooms.flatMap((room) =>
          room.participants.filter((uid) => uid !== user.uid)
        );

        const uniqueUsers = [...new Set(otherUsers)];
        const userDataPromises = uniqueUsers.map(async (uid) => {
          const userRef = doc(db, "users", uid);
          const userSnap = await getDoc(userRef);
          return userSnap.exists() ? { [uid]: userSnap.data() } : null;
        });

        const fetchedUserData = await Promise.all(userDataPromises);
        const userDataMap = fetchedUserData.reduce((acc, data) => {
          return data ? { ...acc, ...data } : acc;
        }, {});

        setUserData(userDataMap);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigation]);

  const openChat = (chatId) => {
    navigation.navigate("ChatScreen", { chatId });
  };

  const renderMessage = ({ item }) => {
    const lastMessage = item.lastMessage || {};
    const lastMessageText = lastMessage.text 
      ? lastMessage.text.length > 30 
        ? `${lastMessage.text.substring(0, 30)}...` 
        : lastMessage.text
      : "No messages yet";

    const lastMessageTime = lastMessage.createdAt?.toDate?.()?.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }) || "N/A";

    const otherUserUid = item.participants.find(
      (uid) => uid !== auth.currentUser.uid
    );
    const otherUser = userData[otherUserUid] || {
      username: "Unknown User",
      profilePicture: null,
    };

    return (
      <TouchableOpacity
        style={styles.messageCard}
        onPress={() => openChat(item.id)}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri: otherUser.profilePicture || "https://i.imgur.com/sOg3WbJ.png",
          }}
          style={styles.profilePic}
        />
        
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <Text style={styles.username}>{otherUser.username}</Text>
            <Text style={styles.time}>{lastMessageTime}</Text>
          </View>
          <Text style={styles.messagePreview} numberOfLines={1}>
            {lastMessageText}
          </Text>
          {lastMessage.sender === auth.currentUser.uid && (
            <Ionicons 
              name="checkmark-done" 
              size={16} 
              color={lastMessage.read ? "#4CAF50" : "#9E9E9E"} 
              style={styles.readIndicator}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newChatButton}>
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5D3FD3" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Image
            source={require("./assets/empty-messages.png")}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a conversation with someone!
          </Text>
          <TouchableOpacity style={styles.startChatButton}>
            <Text style={styles.startChatText}>Start New Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#4A90E2",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  newChatButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  messageList: {
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  messageCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#eee",
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
  },
  time: {
    fontSize: 12,
    color: "#95A5A6",
  },
  messagePreview: {
    fontSize: 14,
    color: "#7F8C8D",
    marginRight: 30,
  },
  readIndicator: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 20,
  },
  startChatButton: {
    backgroundColor: "#5D3FD3",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startChatText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Messages;