import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../AuthContext';
import Conversation from '../components/Conversation';
import { defaultTabBarStyle } from '../App';  //isnt this a circular dependency?
import { API_URL } from '../api/constants';

export default function ConversationsListScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversationID, setSelectedConversationID] = useState(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      url = API_URL + '/me';
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: selectedConversationID
        ? { ...defaultTabBarStyle, display: 'none' } // Merge with display:none
        : defaultTabBarStyle, // Use default tab bar style
    });
  }, [selectedConversationID, navigation]);

  const handleConversationPress = (conversationID) => {
    setSelectedConversationID(conversationID); // Set the selected conversation ID to show the conversation
  };

  const handleCloseConversation = () => {
    setSelectedConversationID(null); // Deselect the conversation and show the list again
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item.id)}
    >
      <Text style={styles.correspondantName}>{item.correspondant}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  // If a conversation is selected, show the `Conversation` component
  if (selectedConversationID) {
    return (
      <Conversation
        conversationID={selectedConversationID}
        onClose={handleCloseConversation} // Go back to the conversations list
      />
    );
  }

  // Otherwise, show the list of conversations
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Conversations</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  conversationItem: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginVertical: 5,
  },
  correspondantName: {
    fontSize: 18,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});
