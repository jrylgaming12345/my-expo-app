import React, { useState, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
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
  ActivityIndicator,
  Animated,
  Dimensions
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
import Icon from 'react-native-vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');

const ChatScreen = ({ route, navigation }) => {
  const { chatId } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUserName, setOtherUserName] = useState('');
  const [otherUserProfilePic, setOtherUserProfilePic] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Header animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch messages in real-time
  useEffect(() => {
    const fetchMessages = () => {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
    
        setMessages(msgs);
        setLoading(false);
        
        // Scroll to bottom when new messages arrive
        if (flatListRef.current && msgs.length > 0) {
          setTimeout(() => {
            flatListRef.current.scrollToEnd({ animated: true });
          }, 100);
        }
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
          throw new Error('Could not identify the other participant in this chat.');
        }

        // Fetch other user's details
        const userRef = doc(db, 'users', otherUserUid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setOtherUserName(userData.fullName || userData.username || 'Unknown');
          setOtherUserProfilePic(userData.profilePicture || null);
          
          // Set header title
          navigation.setOptions({
            title: userData.fullName || userData.username || 'Chat',
          });
        }
      } catch (error) {
        console.error('Error fetching other user details:', error.message);
        Alert.alert('Error', error.message || 'Failed to load chat details.');
      }
    };

    fetchOtherUserDetails();
  }, [chatId]);

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
      setIsSending(true);
      
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
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === auth.currentUser?.uid;
    const messageTime = formatDistanceToNow(item.createdAt, { addSuffix: true });

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
        ]}
      >
        {!isCurrentUser && otherUserProfilePic && (
          <Image
            source={{ uri: otherUserProfilePic }}
            style={styles.userAvatar}
            onError={() => setOtherUserProfilePic(null)}
          />
        )}
        
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          ]}
        >
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.currentUserTime : styles.otherUserTime
          ]}>
            {messageTime}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : (
        <>
          {/* Custom Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            {otherUserProfilePic && (
              <Image
                source={{ uri: otherUserProfilePic }}
                style={styles.headerAvatar}
                onError={() => setOtherUserProfilePic(null)}
              />
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName} numberOfLines={1}>
                {otherUserName}
              </Text>
              <Text style={styles.headerStatus}>Online</Text>
            </View>
          </Animated.View>

          {/* Messages list */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="chatbubbles-outline" size={60} color="#D3D3D3" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
                  Start the conversation with {otherUserName || 'your contact'}
                </Text>
              </View>
            }
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />

          {/* Input field for sending messages */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputContainer}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                multiline
                blurOnSubmit={false}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  newMessage.trim() === '' && styles.disabledButton
                ]}
                onPress={handleSendMessage}
                disabled={newMessage.trim() === '' || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Icon name="send" size={20} color="#FFF" />
                )}
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
    backgroundColor: '#F5F7FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6C63FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#4A90E2',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  headerStatus: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  messagesContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    maxWidth: width * 0.8,
  },
  currentUserContainer: {
    alignSelf: 'flex-end',
  },
  otherUserContainer: {
    alignSelf: 'flex-start',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  currentUserBubble: {
    backgroundColor: '#4A90E2',
    borderTopRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  currentUserText: {
    color: '#FFF',
  },
  otherUserText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 5,
    textAlign: 'right',
  },
  currentUserTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherUserTime: {
    color: '#999',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderColor: '#EEE',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 120,
    marginRight: 10,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
});

export default ChatScreen;