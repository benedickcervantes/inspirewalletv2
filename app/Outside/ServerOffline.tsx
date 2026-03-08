import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSocket } from '../../context/SocketContext';

const ServerOffline = () => {
    const { refreshConnection } = useSocket();
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = async () => {
        setIsRetrying(true);
        try {
            await refreshConnection();
        } finally {
            setIsRetrying(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#DE5212', '#F38B35']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="cloud-offline-outline" size={80} color="#FFFFFF" />
                    </View>
                    <Text style={styles.title}>System Offline</Text>
                    <Text style={styles.subtitle}>
                        We are currently experiencing connection issues or undergoing scheduled maintenance. Please try again later.
                    </Text>

                    <TouchableOpacity 
                        style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]} 
                        onPress={handleRetry}
                        disabled={isRetrying}
                        activeOpacity={0.8}
                    >
                        {isRetrying ? (
                            <ActivityIndicator color="#F38B35" />
                        ) : (
                            <Text style={styles.retryButtonText}>Retry Connection</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#DE5212', // Match top of gradient for safe area
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Poppins-Bold',
        color: '#FFFFFF',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 48,
    },
    retryButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 999,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    retryButtonDisabled: {
        opacity: 0.8,
    },
    retryButtonText: {
        color: '#DE5212',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
});

export default ServerOffline;
