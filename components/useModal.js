import { useState } from 'react';

const useModal = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: "",
        message: "",
        type: "info",
        showCloseButton: true,
        onConfirm: null,
        confirmText: "OK",
        showCancelButton: false,
        cancelText: "Cancel",
    });

    const showModal = (config) => {
        setModalConfig({
            title: "",
            message: "",
            type: "info",
            showCloseButton: true,
            onConfirm: null,
            confirmText: "OK",
            showCancelButton: false,
            cancelText: "Cancel",
            ...config,
        });
        setModalVisible(true);
    };

    const hideModal = () => {
        setModalVisible(false);
        // Reset modal config after hiding to ensure clean state
        setTimeout(() => {
            setModalConfig({
                title: "",
                message: "",
                type: "info",
                showCloseButton: true,
                onConfirm: null,
                confirmText: "OK",
                showCancelButton: false,
                cancelText: "Cancel",
            });
        }, 300); // Wait for modal animation to complete
    };

    return {
        modalVisible,
        modalConfig,
        showModal,
        hideModal,
    };
};

export default useModal; 