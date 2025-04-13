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
} from "react-native";
import { db, auth } from "../../DataBases/firebaseConfig"; // Firebase configuration
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";

const Messages = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [userData, setUserData] = useState({});

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to view messages.");
      return;
    }

    // Query messages (chat rooms) where the logged-in user is a participant
    const messagesRef = collection(db, "chats");
    const q = query(
      messagesRef,
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const rooms = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(rooms);

      // Fetch user data for all participants in the rooms
      const otherUsers = rooms.flatMap((room) =>
        room.participants.filter((uid) => uid !== user.uid)
      );

      const uniqueUsers = [...new Set(otherUsers)];
      const userDataPromises = uniqueUsers.map(async (uid) => {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          return { [uid]: userSnap.data() };
        }
        return null;
      });

      const fetchedUserData = await Promise.all(userDataPromises);
      const userDataMap = fetchedUserData.reduce((acc, data) => {
        if (data) {
          return { ...acc, ...data };
        }
        return acc;
      }, {});

      setUserData(userDataMap);
    });

    return () => unsubscribe();
  }, []);

  const openChat = (chatId) => {
    navigation.navigate("ChatScreen", { chatId });
  };

  const renderMessage = ({ item }) => {
    const lastMessage = item.lastMessage || {};
    const lastMessageText = lastMessage.text || "No messages yet";
    const lastMessageTime =
      lastMessage.createdAt?.toDate?.()?.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }) || "N/A";

    const otherUserUid = item.participants.find(
      (uid) => uid !== auth.currentUser.uid
    );
    const otherUser = userData[otherUserUid] || {
      username: "Unknown",
      profilePicture: null,
    };

    return (
      <TouchableOpacity
        style={styles.message}
        onPress={() => openChat(item.id)}
      >
        <View style={styles.messageInfo}>
          <Image
            source={{
              uri:
                otherUser.profilePicture || "https://via.placeholder.com/150",
            }}
            style={styles.profilePic}
          />
          <View>
            <Text style={styles.messageTitle}>{otherUser.username}</Text>
            <Text style={styles.messageLast}>{lastMessageText}</Text>
          </View>
        </View>
        <Text style={styles.messageTime}>{lastMessageTime}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      {messages.length === 0 ? (
        <View style={styles.noMessagesContainer}>
          <Text style={styles.noMessagesText}>No messages yet</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    padding: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginBottom: 15,
    height: 100,
    borderBottomColor: "#2F539B",
  },
  headerTitle: {
    color: "#2F539B",
    fontSize: 22,
    fontWeight: "bold",
    paddingTop: 20,
  },
  messageList: {
    paddingHorizontal: 15,
  },
  message: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    marginVertical: 8,
    borderRadius: 100,
    backgroundColor: "#f2f2f2",
  },
  messageInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  messageTitle: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
  },
  messageLast: {
    color: "#777",
    fontSize: 14,
    marginTop: 5,
  },
  messageTime: {
    color: "#aaa",
    fontSize: 12,
    marginLeft: 10,
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noMessagesText: {
    fontSize: 18,
    color: "#333",
  },
});

export default Messages;
