import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "../../DataBases/firebaseConfig";
import { useAuth } from "../useAuth"; // Assume this is a hook to get the logged-in user

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth(); // Get logged-in user's ID

  useEffect(() => {
    if (!user) return;

    // Fetch notifications for the logged-in user
    const notificationsRef = collection(db, "notifications");
    const notificationsQuery = query(
      notificationsRef,
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribeNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const fetchedNotifications = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(fetchedNotifications);
      }
    );

    return () => unsubscribeNotifications();
  }, [user]);

  const handleDeleteNotification = async (notificationId) => {
    try {
      // Ask for confirmation before deleting
      Alert.alert(
        "Delete Notification",
        "Are you sure you want to delete this notification?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const notificationRef = doc(
                  db,
                  "notifications",
                  notificationId
                );
                await deleteDoc(notificationRef);
                Alert.alert("Success", "Notification deleted successfully.");
              } catch (error) {
                console.error("Error deleting notification:", error);
                Alert.alert("Error", "Failed to delete notification.");
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error handling notification delete:", error);
      Alert.alert("Error", "Failed to handle notification deletion.");
    }
  };

  const renderNotification = ({ item }) => {
    let icon = require("./assets/notif.png");
    let backgroundColor = "#f9f9f9";

    if (item.type === "follow") {
      icon = require("./assets/notif.png");
      backgroundColor = "#e8f5e9";
    }

    return (
      <TouchableOpacity
        style={[styles.notificationItem, { backgroundColor }]}
        onPress={() => console.log("Notification tapped", item)}
        onLongPress={() => handleDeleteNotification(item.id)}
      >
        <Image source={icon} style={styles.notificationIcon} />
        <Text style={styles.notificationText}>{item.message}</Text>
      </TouchableOpacity>
    );

    return (
      <View style={[styles.notificationContainer, { backgroundColor }]}>
        <Image source={icon} style={styles.icon} />
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp.toDate()).toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteNotification(item.id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 10,
    textAlign: "center",
  },
  listContainer: {
    paddingBottom: 20,
  },
  notificationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    padding: 10,
    borderRadius: 8,
    justifyContent: "space-between",
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 5,
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FF4C4C",
    borderRadius: 5,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },

  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
    marginHorizontal: 10,
    elevation: 2,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  notificationText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
});
