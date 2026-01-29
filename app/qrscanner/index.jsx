import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Platform,
  SafeAreaView,
  Dimensions,
  Alert
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useNavigation } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function QRScanner() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "Scan QR Code",
      headerTintColor: "white",
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });

    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    
    try {
      // Parse the QR code data
      const qrData = JSON.parse(data);
      
      if (qrData.type === 'inspire_transfer' && qrData.accountNumber) {
        // Navigate to quick transfer page with the scanned account number
        router.push({
          pathname: '/quicktransfer',
          params: { 
            accountNumber: qrData.accountNumber,
            recipientName: qrData.name || '',
          }
        });
      } else {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not a valid Inspire Wallet transfer code.',
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Invalid QR Code',
        'Unable to read QR code data. Please try again.',
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-off" size={64} color="#999" />
        <Text style={styles.text}>No access to camera</Text>
        <Text style={styles.subText}>
          Please grant camera permissions in your device settings to scan QR codes.
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} />
      
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={styles.topOverlay}>
            <Text style={styles.instructionText}>
              Position the QR code within the frame
            </Text>
          </View>

          {/* Center frame */}
          <View style={styles.centerRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.frameContainer}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {scanned && (
                <View style={styles.scannedOverlay}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  <Text style={styles.scannedText}>QR Code Scanned!</Text>
                </View>
              )}
            </View>
            <View style={styles.sideOverlay} />
          </View>

          {/* Bottom overlay */}
          <View style={styles.bottomOverlay}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  centerRow: {
    flexDirection: 'row',
    height: width * 0.7,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  frameContainer: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  subText: {
    color: '#999',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
  },
  cancelButtonText: {
    color: Colors.redTheme.background,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: Colors.redTheme.background,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scannedOverlay: {
    alignItems: 'center',
  },
  scannedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
});
