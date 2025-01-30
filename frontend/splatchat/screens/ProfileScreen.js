import React, { useContext } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { AuthContext } from '../AuthContext';
import MainButton from '../components/MainButton';

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext); // Access user and logout from AuthContext

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.info}>Username: {user.username}</Text>
      <Text style={styles.info}>Token: {user.token}</Text>
      <MainButton title="Log Out" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  info: { fontSize: 16, marginBottom: 10, textAlign: 'center' },
});
