import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  StyleSheet 
} from "react-native";
import axios from "axios";
import API_BASE from "../config1.js"
import VendorNavigation from "./VendorNavigation.js";
export default function UdarRequestsScreen({ route }) {
  const vendor_id = route.params?.vendor_id;
  const [requests, setRequests] = useState([]);
  
  useEffect(() => {
    if (!vendor_id) {
      console.error("Error: vendor_id is undefined!");
      return;
    }

    axios.get(`${API_BASE}/udar-requests/${vendor_id}`)
      .then(res => {
        console.log("API Response:", res.data); // ✅ Log data for debugging
        setRequests(res.data);
      })
      .catch(err => console.error("Error fetching requests:", err));
  }, [vendor_id]);

  const acceptRequest = (request_id) => {
    axios.post(`${API_BASE}/accept-udar`, { request_id })
      .then(() => {
        Alert.alert("Accepted", "Udar account created.");
        setRequests(requests.filter(req => req.request_id !== request_id));
      })
      .catch(err => console.error("Error accepting request:", err));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}> Udar Requests </Text>
      {requests.length === 0 ? (
        <Text style={styles.noRequests}> No pending requests </Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.request_id?.toString() }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.customerName}>
                {item.Name }  {/* ✅ Handles missing name */}
              </Text>
              <TouchableOpacity 
                style={styles.acceptButton} 
                onPress={() => acceptRequest(item.request_id)}
              >
                <Text style={styles.acceptText}> Accept </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <VendorNavigation vendor_id={vendor_id}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F3",
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#D84315",
    marginBottom: 15,
    textAlign: "center",
  },
  noRequests: {
    textAlign: "center",
    color: "#FF5722",
    fontSize: 16,
    marginTop: 20,
  },
  card: {
    backgroundColor: "#FFCCBC",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#BF360C",
    marginBottom: 8,
  },
  acceptButton: {
    backgroundColor: "#D84315",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: "flex-start",
    marginTop: 5,
  },
  acceptText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
