import React from 'react';
import { View, Button, Modal, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function Visualizer({ isVisible, onClose, url }) {
  const injectedJavaScript = `fileURL = "${url}"; true;`;

  return (
    <Modal visible={isVisible} animationType="slide">
      <View style={styles.webviewContainer}>
        <WebView
          originWhitelist={['*']}
          source={require('../assets/splat.html')} // Uncomment for Expo Go
          // source={{ uri: 'file:///android_asset/splat.html' }} // Uncomment for build
          style={styles.webview}
          startInLoadingState={true}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
        />
        <Button title="Close" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  webviewContainer: { flex: 1 },
  webview: { flex: 1 },
});
