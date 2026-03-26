import React from "react";
import { Modal, ModalProps, View } from "react-native";
import { useIdleTimeout } from "../../context/IdleTimeoutContext";

export default function ActivityModal({ children, ...props }: ModalProps) {
  const { getActivityProps } = useIdleTimeout();

  return (
    <Modal {...props}>
      <View style={{ flex: 1 }} {...getActivityProps()}>
        {children}
      </View>
    </Modal>
  );
}
