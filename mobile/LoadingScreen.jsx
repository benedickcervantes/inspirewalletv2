import React from 'react';
import { View, Text, ActivityIndicator, SafeAreaView } from 'react-native';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#2196f3" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center'
  }
};

export default LoadingScreen;