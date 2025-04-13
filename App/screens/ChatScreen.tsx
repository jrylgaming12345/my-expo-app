import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { db, auth } from '../../DataBases/firebaseConfig';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

const ChatScreen = ({ route, navigation }) => {
  const { chatId } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUserName, setOtherUserName] = useState('');
  const [otherUserProfilePic, setOtherUserProfilePic] = useState(
    'https://via.placeholder.com/150'
  );
  const flatListRef = useRef(null);

  // Fetch messages in real-time
  useEffect(() => {
    const fetchMessages = () => {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
    
        console.log("Fetched messages:", msgs); // Log fetched messages
        setMessages(msgs);
        setLoading(false);
      });
    
      return () => unsubscribe();
    };

    fetchMessages();
  }, [chatId]);

  // Fetch the other user's details
  useEffect(() => {
    const fetchOtherUserDetails = async () => {
      try {
        const currentUserUid = auth.currentUser?.uid;
        if (!currentUserUid) {
          throw new Error('You must be logged in to view chat details.');
        }

        // Fetch chat document
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
          throw new Error('Chat document does not exist.');
        }

        const chatData = chatSnap.data();
        const { participants } = chatData;

        if (!Array.isArray(participants) || participants.length !== 2) {
          throw new Error('Chat participants data is invalid.');
        }

        // Identify the other participant
        const otherUserUid = participants.find((uid) => uid !== currentUserUid);
        if (!otherUserUid) {
          throw new Error(
            'Could not identify the other participant in this chat.'
          );
        }

        // Fetch other user's details
        const userRef = doc(db, 'users', otherUserUid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          throw new Error('User details are unavailable.');
        }

        const userData = userSnap.data();
        setOtherUserName(userData.username || 'Unknown');
        setOtherUserProfilePic(
          userData.profilePicture || 'https://via.placeholder.com/150'
        );
      } catch (error) {
        console.error('Error fetching other user details:', error.message);
        Alert.alert('Error', error.message || 'Failed to load chat details.');
      }
    };

    fetchOtherUserDetails();
  }, [chatId]);

  // Scroll to the bottom when new messages arrive
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to send a message.');
      return;
    }

    if (!newMessage.trim()) {
      Alert.alert('Error', 'Please enter a message.');
      return;
    }

    try {
      // Send the message
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: newMessage,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      // Update the lastMessage field in the chat document
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: {
          text: newMessage,
          createdAt: serverTimestamp(),
        },
      });

      setNewMessage(''); // Clear the message input field
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Unable to send message.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <Text style={styles.loadingText}>Loading messages...</Text>
      ) : (
        <>
          {/* Header with profile picture and name */}
          <View style={styles.chatHeaderContainer}>
            <Image
              source={{ uri: otherUserProfilePic }}
              style={styles.profilePic}
              onError={() =>
                setOtherUserProfilePic('https://via.placeholder.com/150')
              }
            />
            <Text style={styles.chatHeader}>
              Chat with {otherUserName || 'Loading...'}
            </Text>
          </View>

          {/* Messages list */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.message,
                  item.senderId === auth.currentUser?.uid
                    ? styles.sentMessage
                    : styles.receivedMessage,
                ]}
              >
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            )}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={styles.noMessages}>No messages yet.</Text>
            }
          />

          {/* Input field for sending messages */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message"
                placeholderTextColor="#888"
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  chatHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  chatHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  noMessages: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
  message: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 100,
    marginVertical: 5,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ddd',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ChatScreen;
