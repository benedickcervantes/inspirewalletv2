import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const Settings = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  const securityOptions = [
    {
      id: 1,
      icon: 'lock-closed-outline' as const,
      title: 'Passcode',
      subtitle: 'Change your PIN',
      onPress: () => {},
    },
    {
      id: 2,
      icon: 'close-circle-outline' as const,
      title: 'Delete Account',
      subtitle: '',
      onPress: () => {},
    },
  ];

  const customerRelationshipOptions = [
    {
      id: 1,
      icon: 'information-circle-outline' as const,
      title: 'About us',
      onPress: () => {},
    },
    {
      id: 2,
      icon: 'people-outline' as const,
      title: 'Agent Request',
      onPress: () => {},
    },
    {
      id: 3,
      icon: 'headset-outline' as const,
      title: 'Help Center',
      onPress: () => {},
    },
    {
      id: 4,
      icon: 'shield-outline' as const,
      title: 'Privacy Policy',
      onPress: () => {},
    },
    {
      id: 5,
      icon: 'document-text-outline' as const,
      title: 'Terms and Condition',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#DE5212', '#F38B35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0.01, 1]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search settings..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.sectionCard}>
          {securityOptions.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionItem,
                index !== securityOptions.length - 1 && styles.optionBorder,
              ]}
              onPress={option.onPress}
            >
              <View style={styles.optionLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={option.icon} size={24} color="#F38B35" />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  {option.subtitle ? (
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Customer Relationship</Text>
        <View style={styles.sectionCard}>
          {customerRelationshipOptions.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionItem,
                index !== customerRelationshipOptions.length - 1 && styles.optionBorder,
              ]}
              onPress={option.onPress}
            >
              <View style={styles.optionLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={option.icon} size={24} color="#F38B35" />
                </View>
                <Text style={styles.optionTitle}>{option.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={20} color="#666" />
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 19,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  notificationButton: {
    padding: 4,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 0,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#FFF1E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    opacity: 0.7,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  signOutButton: {
    backgroundColor: '#E8E8E8',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 8,
    letterSpacing: 1,
  },
});

export default Settings;
