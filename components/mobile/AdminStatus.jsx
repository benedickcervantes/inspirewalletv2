import React from 'react';
import { View, Text } from 'react-native';

const AdminStatus = ({ adminName, isOnline, lastSeen, compact = false }) => {
  const getStatusText = () => {
    if (isOnline) {
      return 'Online now';
    }

    if (lastSeen) {
      const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
      const now = new Date();
      const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours}h ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days}d ago`;
      }
    }

    return 'Offline';
  };

  const getStatusColor = () => {
    return isOnline ? '#4caf50' : '#757575';
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={[styles.compactText, { color: getStatusColor() }]}>
          {adminName && `${adminName} • `}{getStatusText()}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.adminInfo}>
        <Text style={styles.adminName}>
          {adminName || 'Support Agent'}
        </Text>

        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  adminInfo: {
    alignItems: 'center'
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
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
  compactText: {
    fontSize: 12,
    fontWeight: '500'
  }
};

export default AdminStatus;