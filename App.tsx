import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Image } from "react-native";
import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";
import { auth, db } from "./DataBases/firebaseConfig"; // Assuming you have Firebase setup
import { doc, getDoc } from "firebase/firestore";
import { collection, query, where, onSnapshot } from "firebase/firestore";

enableScreens();

// Import Screens
import home from "./App/screens/home";
import Homepage2 from "./App/screens/Homepage2";
import Messages from "./App/screens/Messages";
import ChatScreen from "./App/screens/ChatScreen";
import Login from "./App/screens/login";
import PostJob from "./App/screens/PostJob";
import CreateAccount from "./App/screens/CreateAccount";
import JobDetails from "./App/screens/JobDetails";
import JobSearch from "./App/screens/JobSearch";
import JobApplication from "./App/screens/JobApplication";
import MyMap from "./App/screens/MyMap";
import ProfileScreen from "./App/screens/ProfileScreen";
import UploadProfilePicture from "./App/screens/UploadProfilePicture";
import Notifications from "./App/screens/Notifications";
import UserProfile from "./App/screens/UserProfile";
import CreateAccountEmployer from "./App/screens/CreateAccountEmployer";

// Create Navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Icons for Bottom Tabs
const ICONS = {
  Home: require("./assets/home-icon.png"),
  Homepage2: require("./assets/home-icon.png"),
  JobSearch: require("./App/screens/assets/search_logo.png"),
  Messages: require("./App/screens/assets/message-logo.png"),
  MyMap: require("./App/screens/assets/map-icon.png"),
  Profile: require("./App/screens/assets/profile-logo.png"),
};

const Badge = ({ count }) => {
  if (count <= 0) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: -5,
        right: -10,
        backgroundColor: "red",
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 2,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 16,
        height: 16,
      }}
    >
      <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>
        {count}
      </Text>
    </View>
  );
};

// Main Tabs Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: "#fff",
        height: 60,
        paddingBottom: 5,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        color: "#333",
      },
      tabBarIcon: ({ focused }) => {
        const icon = ICONS[route.name as keyof typeof ICONS];
        return (
          <Image
            source={icon}
            style={{
              width: 24,
              height: 24,
              tintColor: focused ? "#2F539B" : "#888",
            }}
          />
        );
      },
    })}
  >
    <Tab.Screen
      name="Home"
      component={home}
      options={{ tabBarLabel: "Home" }}
    />
    <Tab.Screen
      name="JobSearch"
      component={JobSearch}
      options={{ tabBarLabel: "Search" }}
    />
    <Tab.Screen
      name="Messages"
      component={Messages}
      options={{ tabBarLabel: "Messages" }}
    />
    <Tab.Screen
      name="MyMap"
      component={MyMap}
      options={{ tabBarLabel: "Map" }}
    />
  </Tab.Navigator>
);

// Conditional Tabs Navigator for Jobseekers and Employers
const MainTabs2 = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: "#fff",
        height: 60,
        paddingBottom: 5,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        color: "#333",
      },
      tabBarIcon: ({ focused }) => {
        const icon = ICONS[route.name as keyof typeof ICONS];
        return (
          <Image
            source={icon}
            style={{
              width: 24,
              height: 24,
              tintColor: focused ? "#2F539B" : "#888",
            }}
          />
        );
      },
    })}
  >
    <Tab.Screen
      name="Homepage2"
      component={Homepage2}
      options={{ tabBarLabel: "Home" }}
    />
    <Tab.Screen
      name="JobSearch"
      component={JobSearch}
      options={{ tabBarLabel: "Search" }}
    />
    <Tab.Screen
      name="Messages"
      component={Messages}
      options={{ tabBarLabel: "Messages" }}
    />
    <Tab.Screen
      name="MyMap"
      component={MyMap}
      options={{ tabBarLabel: "Map" }}
    />
  </Tab.Navigator>
);

// Root Stack Navigator
const App = () => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role);
          } else {
            console.error("User document does not exist");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      }
      setLoading(false);
    };

    fetchUserRole();
  }, []);

  if (loading) {
    return null; // You can replace this with a loading spinner or splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />

        <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
          {() => <MainTabs />}
        </Stack.Screen>
        <Stack.Screen name="MainTabs2" options={{ headerShown: false }}>
          {() => <MainTabs2 />}
        </Stack.Screen>
        <Stack.Screen name="CreateAccount" component={CreateAccount} />
        <Stack.Screen
          name="CreateAccountEmployer"
          component={CreateAccountEmployer}
        />
        <Stack.Screen name="PostJob" component={PostJob} />
        <Stack.Screen name="JobDetails" component={JobDetails} />
        <Stack.Screen name="JobApplication" component={JobApplication} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen
          name="UploadProfilePicture"
          component={UploadProfilePicture}
        />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen name="UserProfile" component={UserProfile} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
