import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Button, StyleSheet } from 'react-native';
import socket from '../socket';
import API_BASE from '../config1';

const socket = new WebSocket('ws://192.168.1.22:3000'); // Replace with your server's WebSocket URL

const OrderStatus = ({ route }) => {
  const { customer_id } = route.params;
  const [orderStatus, setOrderStatus] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    socket.onopen = () => {
      console.log("WebSocket Connected");
      socket.send(JSON.stringify({ customer_id })); // Send customer_id to the backend
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.order_status) {
        setOrderStatus(data.order_status);
        setModalVisible(true);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected");
    };

    return () => socket.close();
  }, []);

  return (
    <View style={styles.container}>
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.statusText}>
              Order Status: {orderStatus}
            </Text>
            <Button title="OK" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>

      <Text>Welcome, Customer!</Text>
    </View>
  );
};

export default OrderStatus;

// ✅ Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
