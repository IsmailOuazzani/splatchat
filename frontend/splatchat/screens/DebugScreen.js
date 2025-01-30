// screens/DebugScreen.js
import React, { useState, useContext } from 'react';
import { StyleSheet, View, TextInput, Button, StatusBar, Alert, Text } from 'react-native';
import Visualizer from '../components/Visualize';
import { AuthContext } from '../AuthContext';

export default function DebugScreen() {
  const {user} = useContext(AuthContext);

  const [textInputValue, setTextInputValue] = useState('');
  const [pingAddressValue, setPingAddressValue] = useState('');
  const [isWebViewVisible, setWebViewVisible] = useState(false);

  const handleVisualisePress = () => {
    if (textInputValue.trim()) {
      setWebViewVisible(true);
    } else {
      alert('Please enter a value to visualize.');
    }
  };

  const handleCloseWebView = () => {
    setWebViewVisible(false);
  };

  const handlePingPress = async () => {
    if (!pingAddressValue.trim()) {
      Alert.alert('Validation Error', 'Please enter an address to ping.');
      return;
    }

    try {
      const response = await fetch(pingAddressValue);
      if (response.ok) {
        Alert.alert('Ping Result', 'OK');
      } else {
        Alert.alert(
          'Ping Result',
          `HTTP Error: ${response.status} - ${response.statusText}`
        );
      }
    } catch (error) {
      Alert.alert('Ping Error', error.message);
    }
  };

  const handlePingPressAuth = async () => {
    if (!pingAddressValue.trim()) {
      Alert.alert('Validation Error', 'Please enter an address to ping.');
      return;
    }

    try {
      const response = await fetch(pingAddressValue, 
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer 123` // TODO: remove hardcoded token
          }
        }
      );
      if (response.ok) {
        Alert.alert('Response', JSON.stringify(await response.json()));
      } else {
        Alert.alert(
          'Ping Result',
          `HTTP Error: ${response.status} - ${response.statusText}`
        );
      }
    } catch (error) {
      Alert.alert('Ping Error', error.message);
    }
  };

  console.log('user:', user);

  return (
    <View style={styles.debugContainer}>
       <View style={styles.container}>
      {user ? (
        <>
          <Text style={styles.text}>Logged in as: {user.username}</Text>
          <Text style={styles.text}>Token: {user.token}</Text>
        </>
      ) : (
        <Text style={styles.text}>Not logged in</Text>
      )}
    </View>
      <StatusBar barStyle="dark-content" />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Enter text here"
          value={textInputValue}
          onChangeText={setTextInputValue}
        />
        <Button title="Visualise" onPress={handleVisualisePress} />

        <TextInput
          style={styles.textInput}
          placeholder="Enter address to ping"
          value={pingAddressValue}
          onChangeText={setPingAddressValue}
        />
        <Button title="Ping" onPress={handlePingPress} />
        <Button title="Ping Auth" onPress={handlePingPressAuth} />
      </View>

      <Visualizer
        isVisible={isWebViewVisible}
        onClose={handleCloseWebView}
        url={textInputValue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  debugContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  inputContainer: { width: '80%', alignItems: 'center' },
  textInput: { width: '100%', height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, marginBottom: 10 },
});
