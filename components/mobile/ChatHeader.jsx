import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const ChatHeader = ({ adminName, isOnline, isConnected, onBack }) => {
  const getStatusText = () => {
    if (!isConnected) return 'Connecting...';
    if (isOnline) return 'Online';
    return 'Offline';
  };

  const getStatusColor = () => {
    if (!isConnected) return '#ff9800';
    if (isOnline) return '#4caf50';
    return '#757575';
  };

  return (
    <View style={styles.header}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      )}

      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>
          {adminName ? `Support - ${adminName}` : 'Support Chat'}
        </Text>

        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        {/* Add additional header actions here if needed */}
      </View>
    </View>
  );
};

const styles = {
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  backButton: {
    marginRight: 12,
    padding: 8
  },
  backButtonText: {
    fontSize: 24,
    color: '#2196f3',
    fontWeight: 'bold'
  },
  headerContent: {
    flex: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  }
};

export default ChatHeader;