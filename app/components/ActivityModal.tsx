import React from "react";
import { Modal, ModalProps, Platform, View } from "react-native";
import { useIdleTimeout } from "../../context/IdleTimeoutContext";

export default function ActivityModal({ children, ...props }: ModalProps) {
  const { getActivityProps } = useIdleTimeout();

  return (
    <Modal
      statusBarTranslucent={Platform.OS === "android"}
      navigationBarTranslucent={Platform.OS === "android"}
      {...props}
    >
      <View style={{ flex: 1 }} {...getActivityProps()}>
        {children}
      </View>
    </Modal>
  );
}
