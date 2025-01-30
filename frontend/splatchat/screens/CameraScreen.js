import React, { useState, useRef, useContext, useEffect } from 'react';
import { StyleSheet, View, Text, Button, TouchableOpacity, Alert, FlatList } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { AuthContext } from '../AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MainButton from '../components/MainButton';
import Checkbox from 'expo-checkbox';
import { API_URL } from '../api/constants';

export default function CameraScreen() {
  const { user } = useContext(AuthContext);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [showReceiverList, setShowReceiverList] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const cameraRef = useRef(null);

  useEffect(() => {
    // Fetch conversations when the component mounts
    const fetchConversations = async () => {
      try {
        url = API_URL + '/me';
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        const data = await response.json();
        setConversations(data.conversations || []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        Alert.alert('Error', 'Could not fetch conversations.');
      }
    };

    fetchConversations();
  }, []);

  if (!cameraPermission || !microphonePermission) {
    return <View />;
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera and microphone</Text>
        <Button
          onPress={async () => {
            await requestCameraPermission();
            await requestMicrophonePermission();
          }}
          title="Grant Permissions"
        />
      </View>
    );
  }

  const handleRecordPress = async () => {
    if (cameraRef.current) {
      if (isRecording) {
        try {
          console.log('Stopping recording...');
          await cameraRef.current.stopRecording();
        } catch (error) {
          console.error('Error stopping recording:', error);
        } finally {
          setIsRecording(false);
        }
      } else {
        try {
          setIsRecording(true);
          console.log('Recording started');
          const video = await cameraRef.current.recordAsync();
          setVideoUri(video.uri);
          setShowReceiverList(true);
        } catch (error) {
          console.error('Error recording video:', error);
        }
      }
    }
  };

  const handleCancel = () => {
    setShowReceiverList(false);
    setVideoUri(null);
    setSelectedConversations([]);
  };

  const handleSend = async () => {
    try {
      if (!videoUri || selectedConversations.length === 0) {
        Alert.alert('Error', 'Please specify both the video and at least one recipient.');
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: videoUri,
        name: 'video.mp4',
        type: 'video/mp4',
      });
      formData.append('conversation_ids', selectedConversations.join(','));
      formData.append('username', user.username);

      setShowReceiverList(false);
      setVideoUri(null);

      url = API_URL + '/send_splat';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
        body: formData,
      });

      if (response.ok) {
        console.log('Video sent successfully!');
        Alert.alert('Success', 'Video sent successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to upload video:', errorData);
        Alert.alert('Upload Failed', JSON.stringify(errorData));
      }
    } catch (error) {
      console.error('Error during upload:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const toggleSelection = (conversationId) => {
    setSelectedConversations((prevSelected) =>
      prevSelected.includes(conversationId)
        ? prevSelected.filter((id) => id !== conversationId)
        : [...prevSelected, conversationId]
    );
  };

  return (
    <View style={styles.container}>
      {showReceiverList ? (
        <View style={styles.listContainer}>
          <Text style={styles.label}>Select Recipients:</Text>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.checkboxContainer}>
                <Checkbox
                  value={selectedConversations.includes(item.id)}
                  onValueChange={() => toggleSelection(item.id)}
                />
                <Text style={styles.checkboxLabel}>{item.correspondant}</Text>
              </View>
            )}
          />
          <View style={styles.buttonGroup}>
            <MainButton title="Cancel" onPress={handleCancel} />
            <MainButton title="Send" onPress={handleSend} />
          </View>
        </View>
      ) : (
        <CameraView
          mode="video"
          style={styles.camera}
          facing="back"
          ref={cameraRef}
          onRecordingEnd={() => setIsRecording(false)}
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.recordButton} onPress={handleRecordPress}>
              <Ionicons
                name={isRecording ? 'stop-circle-outline' : 'radio-button-on-outline'}
                size={80}
                color={isRecording ? 'red' : 'white'}
              />
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  message: { textAlign: 'center', paddingBottom: 10 },
  camera: { flex: 1 },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 60,
  },
  recordButton: {
    padding: 15,
    borderRadius: 40,
  },
  listContainer: { flex: 1, padding: 20 },
  label: { fontSize: 16, marginBottom: 10 },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxLabel: { marginLeft: 10, fontSize: 16 },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 50, 
  },
});

