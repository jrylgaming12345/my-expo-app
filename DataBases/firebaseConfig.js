import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  setDoc, 
  enableNetwork, 
  disableNetwork, 
  serverTimestamp 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyAwT0WXG_6LWAoeK_t7x17s-sC1t63vaGk",
  authDomain: "hustle-hub-auth.firebaseapp.com",
  projectId: "hustle-hub-auth",
  storageBucket: "hustle-hub-auth.appspot.com",
  messagingSenderId: "136140255432",
  appId: "1:136140255432:web:d0d679f290f6a1c78eb5fd",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable Firebase network if it's offline
const enableFirebaseNetwork = async () => {
  try {
    await enableNetwork(db);
    console.log("Firebase network is enabled.");
  } catch (error) {
    console.error("Error enabling network:", error);
  }
};

// Disable Firebase network if needed (offline persistence)
const disableFirebaseNetwork = async () => {
  try {
    await disableNetwork(db);
    console.log("Firebase network is disabled.");
  } catch (error) {
    console.error("Error disabling network:", error);
  }
};

// Upload an image to Firebase Storage
const uploadImageToStorage = async (fileUri, path) => {
  try {
    const fileName = fileUri.split('/').pop();
    const storageRef = ref(storage, `${path}/${fileName}`);
    const response = await fetch(fileUri);
    const fileBlob = await response.blob();

    await uploadBytes(storageRef, fileBlob);
    console.log('Image uploaded successfully.');

    const imageUrl = await getDownloadURL(storageRef);
    return { fileName, imageUrl };
  } catch (error) {
    console.error("Error uploading image to storage:", error);
    throw new Error("Failed to upload image. Please try again.");
  }
};

// Create or open a chat room
const createOrOpenChatRoom = async (targetUserId) => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("User is not authenticated. Please log in.");
    }

    if (!targetUserId) {
      throw new Error("Target user ID is missing.");
    }

    // Generate a unique chat ID (alphabetically sorted participant UIDs)
    const chatId = [currentUser.uid, targetUserId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);

    // Check if the chat room already exists
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      // Create a new chat room with the necessary fields
      await setDoc(chatRef, {
        participants: [currentUser.uid, targetUserId],
        lastMessage: null, // Initial state with no messages
        createdAt: serverTimestamp(), // Set the creation timestamp
      });
      console.log("New chat room created:", chatId);
    } else {
      console.log("Chat room already exists:", chatId);
    }

    return chatId; // Return the chat room ID
  } catch (error) {
    console.error("Error creating or opening chat room:", error.message || error);
    throw error;
  }
};

// Export services and helper functions
export { 
  auth, 
  db, 
  storage, 
  doc, 
  getDoc, 
  collection, 
  setDoc, 
  enableNetwork, 
  disableNetwork, 
  createOrOpenChatRoom, 
  uploadImageToStorage, 
  enableFirebaseNetwork 
};
