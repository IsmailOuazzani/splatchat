import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard, BackHandler } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Visualizer from './Visualize';
import { AuthContext } from '../AuthContext'; 
import { API_URL } from '../api/constants';

export default function Conversation({ conversationID, onClose }) {
  const { user } = useContext(AuthContext); 
  const [conversationData, setConversationData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisualizerVisible, setVisualizerVisible] = useState(false);
  const [currentSplatUrl, setCurrentSplatUrl] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchConversationData();
  }, [conversationID, user.username]);

  useEffect(() => {
    const handleBackPress = () => {
      onClose(); 
      return true; 
    };
  
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
  
    return () => backHandler.remove(); 
  }, [onClose]);

  const fetchConversationData = async () => {
    setIsLoading(true);
    try {
      url = API_URL + '/conversations/' + conversationID;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation data');
      }

      const data = await response.json();
      const formattedData = data.map((item, index) => ({
        id: index.toString(),
        type: item.type,
        content: item.message || '',
        preview: item.preview,
        url: item.url,
        origin: item.sender === user.username ? 'self' : 'other',
      }));
      setConversationData(formattedData);
    } catch (error) {
      console.error('Error fetching conversation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplatPress = (url) => {
    setCurrentSplatUrl(url);
    setVisualizerVisible(true);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      url = API_URL + '/send_message?conversation_id=' + conversationID + '&message=' + encodeURIComponent(newMessage);
      const response = await fetch(
        url,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
      Keyboard.dismiss();
      await fetchConversationData(); // Reload the conversation to include the new message
    } catch (error) {
      console.error('Error sending message:', error);
      console.log('Error message:', error.message); 
      console.log('Error stack:', error.stack);     
      console.log('Error name:', error.name); 
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isSelf = item.origin === 'self';
    const messageStyle = isSelf ? styles.selfMessage : styles.otherMessage;
    const containerStyle = isSelf ? styles.selfMessageContainer : styles.otherMessageContainer;

    if (item.type === 'text') {
      return (
        <View style={[styles.messageContainer, containerStyle]}>
          <Text style={messageStyle}>{item.content}</Text>
        </View>
      );
    } else if (item.type === 'splat') {
      return (
        <View style={[styles.messageContainer, containerStyle]}>
          <TouchableOpacity onPress={() => handleSplatPress(item.url)} style={styles.splatWrapper}>
            <Image source={{ uri: item.preview }} style={styles.splatPreview} />
            <Ionicons
              name="cube"
              size={24}
              color="#fff"
              style={styles.previewIcon}
            />
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <FlatList
        data={conversationData}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.messagesContainer, { paddingBottom: 80 }]}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            { height: Math.min(100, Math.max(30, (1+newMessage.split('\n').length) * 20)) },
          ]}
          multiline
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          onSubmitEditing={handleSendMessage} // Send message on "Enter"
          editable={!isSending}
        />
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton} disabled={isSending}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Visualizer
        isVisible={isVisualizerVisible}
        onClose={() => setVisualizerVisible(false)}
        url={currentSplatUrl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    padding: 16,
    paddingTop: 60,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  selfMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  selfMessage: {
    padding: 10,
    backgroundColor: '#000000',
    borderRadius: 10,
    fontSize: 16,
    color: '#ffffff', 
},
  otherMessage: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
  },
  splatWrapper: {
    position: 'relative',
  },
  splatPreview: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
  previewIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  textInput: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007bff',
    borderRadius: 20,
    padding: 10,
  },
});
