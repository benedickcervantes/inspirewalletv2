import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import jpeg from "jpeg-js";
import jsQR from "jsqr";

export const pickAndDecodeQR = async (): Promise<string | null> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const originalUri = result.assets[0].uri;

      // Force convert to JPEG using ImageManipulator
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 800 } }], // Resize for faster processing
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
      );

      const base64Data = await FileSystem.readAsStringAsync(
        manipulatedImage.uri,
        {
          encoding: "base64",
        },
      );

      // Decode JPEG to raw pixels
      const rawImageData = jpeg.decode(Buffer.from(base64Data, "base64"), {
        useTArray: true,
      });

      // Read QR from pixels
      const code = jsQR(
        new Uint8ClampedArray(rawImageData.data.buffer),
        rawImageData.width,
        rawImageData.height,
      );

      if (code && code.data) {
        return code.data;
      }
    }
    return null;
  } catch (error) {
    console.error("Error scanning from image:", error);
    throw error;
  }
};
