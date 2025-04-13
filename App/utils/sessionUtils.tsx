import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../DataBases/firebaseConfig'; // Adjust path to your Firebase config if needed

/**
 * Validate session for the current user
 * @param userId - The user's unique ID
 * @param localSessionId - The session ID stored locally
 * @returns boolean indicating if the session is valid
 */
export const validateSession = async (
  userId: string,
  localSessionId: string | null
): Promise<boolean> => {
  // Ensure user ID and session ID are provided
  if (!userId || !localSessionId) {
    console.warn('Missing user ID or session ID.');
    return false;
  }

  try {
    // Fetch user document from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.error('User document not found.');
      return false;
    }

    // Extract active session ID from the document (using optional chaining to handle missing field)
    const { activeSession } = userDoc.data() as { activeSession?: string };

    // If activeSession is missing or doesn't match, return false
    if (!activeSession) {
      console.error('No active session found in the document.');
      return false;
    }

    // Compare the active session ID with the local session ID
    return activeSession === localSessionId;
  } catch (error) {
    // Handle any errors during Firestore operations
    console.error('Error validating session:', error);
    return false;
  }
};
