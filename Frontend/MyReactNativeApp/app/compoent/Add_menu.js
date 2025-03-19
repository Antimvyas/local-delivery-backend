import { View, Text, TextInput, Button, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import axios from 'axios';
import React ,{ useState, useEffect }from 'react'
import API_BASE from "../config1.js"
const Add_menu = ({navigation,route}) => {
   const [food_name, setFoodName] = useState('');
    const [cost, setFoodCost] = useState('');
    const [food_img, setFoodImage] = useState(null);
    const [food_type,setFoodType]=useState('');
    const [food_description,setFoodDescription]=useState('');
    // ✅ Get vendor_id safely
    const vendor_id = route.params?.vendor_id; 
  
  
    useEffect(() => {
      if (!vendor_id) {
        Alert.alert('Error', 'Vendor ID not found!', [
          { text: 'Go Back', onPress: () => navigation.goBack() }
        ]);
      }
    }, [vendor_id]);
  
    
  
    // ✅ Pick Image
    const handlePickImage = () => {
      const options = { mediaType: 'photo', quality: 1 };
  
      ImagePicker.launchImageLibrary(options, (response) => {
        if (response.didCancel) {
          Alert.alert('Image selection cancelled');
        } else if (response.error) {
          Alert.alert('Error picking image:', response.error);
        } else if (response.assets && response.assets.length > 0) {
          setFoodImage(response.assets[0]);
        }
      });
    };
  
    // ✅ Upload Food Item
    const handleAddFood = async () => {
      if (!food_name || !cost || !food_img || !vendor_id) {
        Alert.alert('Please fill all fields and select an image');
        return;
      }
  
      try {
        const formData = new FormData();
        formData.append('food_name', food_name);
        formData.append('cost', cost);
        formData.append('vendor_id', vendor_id);
        formData.append('food_type',food_type);
        formData.append('food_description',food_description);
        formData.append('food_img', {
          uri: food_img.uri,
          name: food_img.fileName || `food_${Date.now()}.jpg`,
          type: food_img.type || 'image/jpeg',
        });
  
        const response = await axios.post(`${API_BASE}/food-set`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
  
        Alert.alert('Success', 'Food added successfully!');
        setFoodName('');
        setFoodCost('');
        setFoodImage(null);
        setFoodDescription('');
        setFoodType('');
      } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        Alert.alert('Error', 'Failed to add food item');
      }
    };
  
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Add Food Item</Text>
        
        <TextInput placeholder="Food Name" style={styles.input} value={food_name} onChangeText={setFoodName} />
        <TextInput placeholder="Food Cost" keyboardType="numeric" style={styles.input} value={cost} onChangeText={setFoodCost} />
        <TextInput placeholder='Food Type' style={styles.input} value={food_type} onChangeText={setFoodType}/>
        <TextInput placeholder='Food Description' style={styles.input} value={food_description} onChangeText={setFoodDescription}/>
        <TouchableOpacity onPress={handlePickImage} style={styles.imagePicker}>
          <Text>Select Image</Text>
        </TouchableOpacity>
        {food_img && <Image source={{ uri: food_img.uri }} style={styles.previewImage} />}
        <Button title="Add Food" onPress={handleAddFood} />
      </View>
    );
  
  
  
}

export default Add_menu

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, marginBottom: 15 },
  input: { borderWidth: 1, marginBottom: 10, padding: 10 },
  imagePicker: {
    backgroundColor: '#ddd',
    padding: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  previewImage: { width: 100, height: 100, marginTop: 10 },
});
