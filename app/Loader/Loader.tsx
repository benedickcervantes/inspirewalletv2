import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface LoaderProps {
  text?: string;
}

const SPINNER_COLOR = '#E15816';

export default function Loader({ text }: LoaderProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={SPINNER_COLOR} />
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
});
