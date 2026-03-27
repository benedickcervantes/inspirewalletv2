import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Image, Keyboard, KeyboardAvoidingView, Linking, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PinchGestureHandler, State } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  deleteMessage,
  editMessage,
  getMessages,
  sendMessage,
  uploadSupportAttachment,
} from "../../configs/api";
import { useLanguage } from "../../context/LanguageContext";
import { subscribeToConnectionStatus } from "../../lib/connectionStatus";
import { isServiceUnderMaintenance } from "../../lib/maintenance";
import { subscribeToNewSupportMessage } from "../../lib/messagingEvents";
import type { NavProp } from "../../types/navigation";
import TicketCreation from "../Tickets/TicketCreation";
import TicketList from "../Tickets/TicketList";

import ActivityModal from '../components/ActivityModal';
interface ApiMessage {
  id: string;
  content: string;
  createdAt: string;
  status: "SENT" | "READ";
  senderName?: string;
  direction?: "ADMIN_TO_USER" | "USER_TO_ADMIN";
  attachment?: { name: string; url: string; type: string; size?: number };
}

interface DisplayMessage {
  id: string;
  text: string;
  isSent: boolean;
  timestamp: Date;
  status: "SENT" | "READ";
  isEdited?: boolean;
  attachment?: { name: string; url: string; type: string; size?: number };
}

interface LocalAttachment {
  uri: string;
  type?: string;
  name: string;
}

function DeleteFunctionIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
      <Path d="M8 8.2V17.2C8 18 8.7 18.7 9.5 18.7H14.5C15.3 18.7 16 18 16 17.2V8.2" stroke="#E15816" strokeWidth="2" strokeLinecap="round" />
      <Path d="M6.5 6.8H17.5" stroke="#E15816" strokeWidth="2" strokeLinecap="round" />
      <Path d="M10 6.7V5.8C10 5.3 10.4 4.9 10.9 4.9H13.1C13.6 4.9 14 5.3 14 5.8V6.7" stroke="#E15816" strokeWidth="2" strokeLinecap="round" />
      <Path d="M10.2 10.4V15.7M13.8 10.4V15.7" stroke="#E15816" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

const formatTime = (date: Date, lang: string) => {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const locale = lang === "ar" ? "ar-SA" : lang === "ko" ? "ko-KR" : lang === "ja" ? "ja-JP" : "en-US";

  if (isToday) {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function mapApiToDisplay(api: ApiMessage[]): DisplayMessage[] {
  // API returns newest first; we want oldest at top, newest at bottom (chronological)
  const mapped = api.map((m) => ({
    id: m.id,
    text: m.content,
    isSent: m.direction === "USER_TO_ADMIN",
    timestamp: new Date(m.createdAt),
    status: m.status ?? "SENT",
    attachment: m.attachment,
    // Backend does not yet persist an "edited" flag, but we can infer
    // from a common convention if needed later.
    isEdited: /\(edited\)$/.test(m.content),
  }));
  return mapped.reverse();
}

function isImageAttachment(type?: string, name?: string) {
  const mime = String(type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const file = String(name || "").toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((ext) =>
    file.endsWith(ext),
  );
}

export default function Message() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showTicketCreation, setShowTicketCreation] = useState(false);
  const [viewMode, setViewMode] = useState<"messages" | "tickets">("messages");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<DisplayMessage | null>(
    null,
  );
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DisplayMessage | null>(
    null,
  );
  const [editText, setEditText] = useState("");
  const [ticketSelected, setTicketSelected] = useState(false);
  const [ticketListRefreshKey, setTicketListRefreshKey] = useState(0);
  const [selectedAttachment, setSelectedAttachment] =
    useState<LocalAttachment | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const { t, language } = useLanguage();
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = useRef(Animated.multiply(baseScale, pinchScale)).current;
  const lastScale = useRef(1);

  // Debug ticket selection
  useEffect(() => {
    console.log("[Message] ticketSelected state changed:", ticketSelected);
  }, [ticketSelected]);

  // Check maintenance status on focus (DEVELOPER / ADMIN / SUPER_ADMIN bypass)
  useFocusEffect(
    useCallback(() => {
      const checkMaintenance = async () => {
        try {
          // Read user role — privileged roles bypass maintenance
          const userJson = await AsyncStorage.getItem('user');
          let userRole: string | undefined;
          if (userJson) {
            try {
              const parsed = JSON.parse(userJson) as Record<string, unknown>;
              userRole = parsed.role as string | undefined;
            } catch { /* ignore */ }
          }
          const BYPASS_ROLES = ['DEVELOPER', 'ADMIN', 'SUPER_ADMIN'];
          if (userRole && BYPASS_ROLES.includes(userRole)) {
            setIsUnderMaintenance(false);
            return;
          }
          const isMaintenance = await isServiceUnderMaintenance('message');
          setIsUnderMaintenance(isMaintenance);
          if (isMaintenance) {
            setShowMaintenanceModal(true);
          }
        } catch (error) {
          console.error('Error checking maintenance:', error);
        }
      };
      checkMaintenance();
    }, []),
  );

  const fetchMessages = useCallback(async () => {
    if (isUnderMaintenance) return;

    const token = await AsyncStorage.getItem("access_token");
    setAccessToken(token);

    if (!token) {
      setError(t("support.loginRequired"));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const result = await getMessages(token, { page: 1, limit: 100 });
    if (result.success && result.messages) {
      setMessages(mapApiToDisplay(result.messages as ApiMessage[]));
      setError(null);
    } else {
      setError(result.error || t("support.failedToLoad"));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = useCallback(async () => {
    const trimmed = message.trim();
    if ((!trimmed && !selectedAttachment) || sending) return;

    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      setError(t("support.loginRequired"));
      return;
    }

    setSending(true);
    let payloadContent = trimmed;
    if (selectedAttachment) {
      const uploaded = await uploadSupportAttachment(
        accessToken,
        selectedAttachment.uri,
        selectedAttachment.type || "image/jpeg",
      );
      if (!uploaded.success || !uploaded.data) {
        setSending(false);
        setError(uploaded.error || t("support.failedToSend"));
        return;
      }
      payloadContent = JSON.stringify({
        v: 1,
        text: trimmed,
        attachment: uploaded.data,
      });
    }

    const result = await sendMessage(accessToken, payloadContent);
    setSending(false);

    if (result.success) {
      setMessage("");
      setSelectedAttachment(null);
      await fetchMessages();
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } else {
      setError(result.error || t("support.failedToSend"));
    }
  }, [message, selectedAttachment, sending, fetchMessages, t]);

  const handlePickAttachment = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Permission to access photos is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setSelectedAttachment({
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: asset.fileName || "attachment.jpg",
    });
  }, []);

  const handleLongPress = useCallback((msg: DisplayMessage) => {
    if (!msg.isSent) return; // Only allow actions on sent messages
    setSelectedMessage(msg);
    setShowMessageActions(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setEditText(selectedMessage.text);
    setShowMessageActions(false);
  }, [selectedMessage]);

  const handleDelete = useCallback(() => {
    if (!selectedMessage) return;
    setShowMessageActions(false);
    setShowDeleteConfirm(true);
  }, [selectedMessage, fetchMessages]);

  const handleConfirmDelete = useCallback(
    async (deleteForEveryone: boolean) => {
      if (!selectedMessage) return;
      setShowDeleteConfirm(false);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;
      const result = await deleteMessage(
        token,
        selectedMessage.id,
        deleteForEveryone,
      );
      if (result.success) {
        await fetchMessages();
      } else {
        setError(result.error || t("support.failedToDelete"));
      }
    },
    [selectedMessage, fetchMessages, t],
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessage || !editText.trim()) return;

    const token = await AsyncStorage.getItem("access_token");
    if (!token) return;

    const result = await editMessage(token, editingMessage.id, editText.trim());
    if (result.success) {
      // Optimistically update local state so user immediately sees the change
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessage.id
            ? { ...m, text: editText.trim(), isEdited: true }
            : m,
        ),
      );
      setEditingMessage(null);
      setEditText("");
    } else {
      setError(result.error || t("support.failedToEdit"));
    }
  }, [editingMessage, editText, fetchMessages]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setEditText("");
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMessages();
    }, [fetchMessages]),
  );

  useEffect(() => {
    const unsubscribe = subscribeToNewSupportMessage(() => {
      fetchMessages();
    });
    return () => {
      unsubscribe();
    };
  }, [fetchMessages]);

  useEffect(() => {
    const unsubscribe = subscribeToConnectionStatus(setIsOnline);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates?.height ?? 80);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Scroll to bottom when messages load or change (show latest at bottom)
  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [messages]);

  if (isUnderMaintenance) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>{t("support.serviceMaintenance")}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (navigation as unknown as NavProp).goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <MaterialCommunityIcons name="headset" size={22} color="#E15816" />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t("support.title")}</Text>
            <Text style={styles.headerSubtitle}>
              {isOnline
                ? t("support.online")
                : t("support.offline")}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => Linking.openURL("tel:+63253221002")}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="call-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, viewMode === "messages" && styles.tabActive]}
          onPress={() => setViewMode("messages")}
        >
          <Text
            style={[
              styles.tabText,
              viewMode === "messages" && styles.tabTextActive,
            ]}
          >
            {t("support.messagesTab")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === "tickets" && styles.tabActive]}
          onPress={() => setViewMode("tickets")}
        >
          <Text
            style={[
              styles.tabText,
              viewMode === "tickets" && styles.tabTextActive,
            ]}
          >
            {t("support.ticketsTab")}
          </Text>
        </TouchableOpacity>
      </View>

      {error && messages.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color="#999"
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === "tickets" && accessToken ? (
        <>
          <View style={styles.ticketsContainer}>
            <TicketList
              accessToken={accessToken}
              onTicketSelected={setTicketSelected}
              refreshTrigger={ticketListRefreshKey}
            />
          </View>
          {/* Circular Create Button - Below Tickets */}
          {!ticketSelected && (
            <TouchableOpacity
              style={[styles.circularCreateButton, { bottom: 20 + insets.bottom }]}
              onPress={() => setShowTicketCreation(true)}
            >
              <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={[
              styles.messagesContent,
              messages.length === 0 && styles.messagesContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#E15816"
              />
            }
          >
            {loading ? (
              <View style={styles.supportSkeletonContainer}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.supportSkeletonRow,
                      idx % 2 === 0
                        ? styles.supportSkeletonRowSent
                        : styles.supportSkeletonRowReceived,
                    ]}
                  >
                    <View style={styles.supportSkeletonBubble}>
                      <View style={styles.supportSkeletonLineLong} />
                      <View style={styles.supportSkeletonLineShort} />
                    </View>
                  </View>
                ))}
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="message-outline"
                  size={64}
                  color="#CCC"
                />
                <Text style={styles.emptyTitle}>{t("support.noMessagesYet")}</Text>
                <Text style={styles.emptySubtitle}>
                  {t("support.startConversation")}
                </Text>
              </View>
            ) : (
              messages.map((msg) => (
                <TouchableOpacity
                  key={msg.id}
                  onLongPress={() => handleLongPress(msg)}
                  activeOpacity={0.9}
                  style={[
                    styles.bubbleRow,
                    msg.isSent
                      ? styles.bubbleRowSent
                      : styles.bubbleRowReceived,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      msg.isSent ? styles.bubbleSent : styles.bubbleReceived,
                    ]}
                  >
                    {(() => {
                      const isDeletedForEveryone =
                        msg.text === "This message was deleted for everyone.";
                      const isDeletedForMe =
                        msg.text === "You deleted this message.";
                      const isDeleted = isDeletedForEveryone || isDeletedForMe;
                      const deletedForEveryoneText = t(
                        "support.messageDeletedForEveryone"
                      );
                      const deletedForMeText = t("support.messageDeletedForMe");
                      const displayText = isDeletedForEveryone
                        ? deletedForEveryoneText &&
                          deletedForEveryoneText !==
                            "support.messageDeletedForEveryone"
                          ? deletedForEveryoneText
                          : "Deleted"
                        : isDeletedForMe
                          ? deletedForMeText &&
                            deletedForMeText !== "support.messageDeletedForMe"
                            ? deletedForMeText
                            : "Deleted on your side"
                          : msg.text;

                      return (
                        <>
                          {msg.attachment && (
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => {
                                if (isImageAttachment(msg.attachment?.type, msg.attachment?.name)) {
                                  setPreviewImage({
                                    url: msg.attachment?.url || "",
                                    name: msg.attachment?.name || "Image",
                                  });
                                  lastScale.current = 1;
                                  baseScale.setValue(1);
                                  pinchScale.setValue(1);
                                  return;
                                }
                                Linking.openURL(msg.attachment?.url || "").catch(() => undefined);
                              }}
                              style={styles.attachmentWrap}
                            >
                              {isImageAttachment(msg.attachment.type, msg.attachment.name) ? (
                                <Image
                                  source={{ uri: msg.attachment.url }}
                                  style={styles.attachmentImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.fileAttachment}>
                                  <Ionicons name="attach" size={16} color={msg.isSent ? "#FFF" : "#333"} />
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.fileAttachmentText,
                                      msg.isSent ? styles.bubbleTextSent : styles.bubbleTextReceived,
                                    ]}
                                  >
                                    {msg.attachment.name}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          )}
                          <Text
                            style={[
                              styles.bubbleText,
                              msg.isSent
                                ? styles.bubbleTextSent
                                : styles.bubbleTextReceived,
                              isDeleted &&
                                (msg.isSent
                                  ? styles.deletedTextSent
                                  : styles.deletedTextReceived),
                            ]}
                          >
                            {displayText}
                          </Text>
                          {!isDeleted && msg.isEdited && (
                            <Text style={styles.editedLabel}>
                              {t("support.edited") || "Edited"}
                            </Text>
                          )}
                        </>
                      );
                    })()}
                    <View style={styles.bubbleFooter}>
                      <Text
                        style={[
                          styles.bubbleTime,
                          msg.isSent
                            ? styles.bubbleTimeSent
                            : styles.bubbleTimeReceived,
                        ]}
                      >
                        {formatTime(msg.timestamp, language)}
                      </Text>
                      {msg.isSent ? (
                        <View style={styles.readStatus}>
                          <Ionicons
                            name={
                              msg.status === "READ"
                                ? "checkmark-done"
                                : "checkmark"
                            }
                            size={14}
                            color={
                              msg.status === "READ"
                                ? "#4CAF50"
                                : "#9CA3AF"
                            }
                          />
                        </View>
                      ) : msg.status === "SENT" ? (
                        <View style={styles.unreadDot} />
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View
            style={[
              styles.inputBar,
              {
                marginBottom:
                  Platform.OS === "android"
                    ? Math.max(0, keyboardHeight)
                    :0,
                paddingBottom:
                  Platform.OS === "ios"
                    ? keyboardVisible
                      ? 8
                      : Math.max(insets.bottom, 16)
                    : 20,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handlePickAttachment}
              activeOpacity={0.8}
              disabled={sending}
            >
              <Ionicons name="attach" size={20} color="#666" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder={t("support.typeMessage")}
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={10000}
              editable={!sending}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                ((!message.trim() && !selectedAttachment) || sending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              activeOpacity={0.7}
              disabled={(!message.trim() && !selectedAttachment) || sending}
            >
              {sending ? (
                <Image
                  source={require("../../assets/icons/loader.gif")}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              ) : (
                <MaterialCommunityIcons
                  name="send"
                  size={22}
                  color={message.trim() || selectedAttachment ? "#FFFFFF" : "#999"}
                />
              )}
            </TouchableOpacity>
          </View>
          {selectedAttachment && (
            <View style={styles.selectedAttachmentBar}>
              <Text style={styles.selectedAttachmentText} numberOfLines={1}>
                Attached: {selectedAttachment.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedAttachment(null)} activeOpacity={0.75}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {/* Ticket Creation Modal */}
      {accessToken && (
        <TicketCreation
          open={showTicketCreation}
          onClose={() => setShowTicketCreation(false)}
          onSuccess={() => {
            setViewMode("tickets");
            setTicketListRefreshKey((k) => k + 1);
          }}
          accessToken={accessToken}
        />
      )}

      {/* Delete Confirm Modal */}
      <ActivityModal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <TouchableOpacity
          style={styles.centerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteConfirm(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.deleteConfirmModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.deleteConfirmIconWrap}>
              <DeleteFunctionIcon />
            </View>
            <Text style={styles.deleteConfirmTitle}>{t("support.deleteMessage")}</Text>
            <Text style={styles.deleteConfirmSubtitle}>{t("support.deleteConfirm")}</Text>
            <TouchableOpacity
              style={[styles.deleteConfirmAction, styles.deleteConfirmActionPrimary]}
              onPress={() => handleConfirmDelete(true)}
            >
              <Text style={styles.deleteConfirmActionPrimaryText}>{t("support.deleteForEveryone")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteConfirmAction}
              onPress={() => handleConfirmDelete(false)}
            >
              <Text style={styles.deleteConfirmActionText}>{t("support.deleteForMe")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteConfirmAction}
              onPress={() => setShowDeleteConfirm(false)}
            >
              <Text style={styles.deleteConfirmActionText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </ActivityModal>

      {/* Message Actions Modal */}
      <ActivityModal
        visible={showMessageActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageActions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMessageActions(false)}
        >
          <View style={styles.actionSheet}>
            <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
              <MaterialCommunityIcons name="pencil" size={22} color="#333" />
              <Text style={styles.actionButtonText}>{t("support.editMessage")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <MaterialCommunityIcons name="delete" size={22} color="#E15816" />
              <Text
                style={[styles.actionButtonText, styles.actionButtonTextDanger]}
              >
                {t("support.deleteMessage")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonCancel]}
              onPress={() => setShowMessageActions(false)}
            >
              <Text style={styles.actionButtonCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ActivityModal>

      {/* Edit Message Modal */}
      <ActivityModal
        visible={!!editingMessage}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCancelEdit}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.editModal}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>{t("support.editMessage")}</Text>
                <TouchableOpacity onPress={handleCancelEdit}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                maxLength={10000}
                autoFocus
                placeholder={t("support.editPlaceholder")}
                placeholderTextColor="#999"
              />
              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={styles.editCancelButton}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.editCancelButtonText}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editSaveButton,
                    !editText.trim() && styles.editSaveButtonDisabled,
                  ]}
                  onPress={handleSaveEdit}
                  disabled={!editText.trim()}
                >
                  <Text style={styles.editSaveButtonText}>{t("support.save")}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </ActivityModal>

      <ActivityModal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPreviewImage(null);
          lastScale.current = 1;
          baseScale.setValue(1);
          pinchScale.setValue(1);
        }}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.imagePreviewBackdrop}
            activeOpacity={1}
            onPress={() => setPreviewImage(null)}
          />
          <View style={styles.imagePreviewContent}>
            <View style={styles.imagePreviewHeader}>
              <Text style={styles.imagePreviewTitle} numberOfLines={1}>
                {previewImage?.name || "Image"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPreviewImage(null);
                  lastScale.current = 1;
                  baseScale.setValue(1);
                  pinchScale.setValue(1);
                }}
                style={styles.imagePreviewCloseBtn}
              >
                <Ionicons name="close" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.imagePreviewImageWrap}>
              {!!previewImage?.url && (
                <PinchGestureHandler
                  onGestureEvent={Animated.event(
                    [{ nativeEvent: { scale: pinchScale } }],
                    { useNativeDriver: true },
                  )}
                  onHandlerStateChange={(event) => {
                    if (event.nativeEvent.oldState === State.ACTIVE) {
                      let next = lastScale.current * event.nativeEvent.scale;
                      if (!Number.isFinite(next)) next = 1;
                      next = Math.max(1, Math.min(next, 4));
                      lastScale.current = next;
                      baseScale.setValue(next);
                      pinchScale.setValue(1);
                    }
                  }}
                >
                  <Animated.Image
                    source={{ uri: previewImage.url }}
                    style={[styles.imagePreviewImage, { transform: [{ scale }] }]}
                    resizeMode="contain"
                  />
                </PinchGestureHandler>
              )}
            </View>
          </View>
        </View>
      </ActivityModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8E8E8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#E15816",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#E15816",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#E15816",
  },
  ticketsContainer: {
    flex: 1,
  },
  circularCreateButton: {
    position: "absolute",
    bottom: 20,
    left: "50%",
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E15816",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  headerRight: {
    padding: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  supportSkeletonContainer: {
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 10,
  },
  supportSkeletonRow: {
    flexDirection: "row",
  },
  supportSkeletonRowSent: {
    justifyContent: "flex-end",
  },
  supportSkeletonRowReceived: {
    justifyContent: "flex-start",
  },
  supportSkeletonBubble: {
    maxWidth: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  supportSkeletonLineLong: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ECECEC",
    width: 170,
  },
  supportSkeletonLineShort: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ECECEC",
    width: 100,
  },
  errorText: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#E15816",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  messagesScroll: { flex: 1 },
  messagesContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 20,
  },
  messagesContentEmpty: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  bubbleRowSent: {
    justifyContent: "flex-end",
  },
  bubbleRowReceived: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleSent: {
    backgroundColor: "#E15816",
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
  },
  bubbleReceived: {
    backgroundColor: "#FFFFFF",
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  attachmentWrap: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  attachmentImage: {
    width: 220,
    height: 180,
    borderRadius: 12,
    backgroundColor: "#DDD",
  },
  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    maxWidth: 220,
  },
  fileAttachmentText: {
    fontSize: 13,
    flexShrink: 1,
  },
  bubbleTextSent: {
    color: "#FFFFFF",
  },
  bubbleTextReceived: {
    color: "#333",
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 6,
  },
  bubbleTime: {
    fontSize: 11,
  },
  readStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  readStatusText: {
    fontSize: 10,
  },
  readStatusSent: {
    color: "rgba(255,255,255,0.8)",
  },
  readStatusRead: {
    color: "#4FC3F7",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E15816",
  },
  bubbleTimeSent: {
    color: "rgba(255,255,255,0.8)",
  },
  bubbleTimeReceived: {
    color: "#999",
  },
  deletedTextSent: {
    fontStyle: "italic",
    color: "rgba(255,255,255,0.82)",
  },
  deletedTextReceived: {
    fontStyle: "italic",
    color: "#333",
  },
  editedLabel: {
    marginTop: 2,
    fontSize: 11,
    fontStyle: "italic",
    color: "#9CA3AF",
  },
  keyboardView: { flex: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 10,
  },
  attachButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    marginBottom: 3,
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    paddingTop: 12,
    maxHeight: 100,
    fontSize: 16,
    color: "#333",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E15816",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  selectedAttachmentBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#ECECEC",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectedAttachmentText: {
    fontSize: 13,
    color: "#444",
    flex: 1,
    marginRight: 10,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePreviewContent: {
    width: "100%",
    height: "100%",
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  imagePreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  imagePreviewTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  imagePreviewCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  imagePreviewImageWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagePreviewImage: {
    width: "100%",
    height: "100%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  deleteConfirmModal: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  deleteConfirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(225,88,22,0.15)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  deleteConfirmSubtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
  deleteConfirmAction: {
    width: "100%",
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    marginBottom: 10,
    paddingVertical: 10,
  },
  deleteConfirmActionPrimary: {
    backgroundColor: "#E15816",
    marginBottom: 12,
  },
  deleteConfirmActionPrimaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  deleteConfirmActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  actionSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8F8F8",
  },
  actionButtonCancel: {
    backgroundColor: "#E8E8E8",
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  actionButtonTextDanger: {
    color: "#E15816",
  },
  actionButtonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    flex: 1,
  },
  deleteModal: {
    width: "90%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignSelf: "center",
    marginBottom: 80,
  },
  deleteModalTopBar: {
    height: 4,
    width: 52,
    borderRadius: 2,
    backgroundColor: "#E15816",
    alignSelf: "center",
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  deleteModalSubtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 16,
  },
  deleteModalPrimaryButton: {
    backgroundColor: "#E15816",
    borderRadius: 12,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  deleteModalPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteModalSecondaryButton: {
    borderWidth: 1,
    borderColor: "#E15816",
    borderRadius: 12,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#FFF7F3",
  },
  deleteModalSecondaryButtonText: {
    color: "#E15816",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteModalCancelButton: {
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalCancelButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  editModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  editInput: {
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    minHeight: 120,
    maxHeight: 300,
    textAlignVertical: "top",
  },
  editModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
  },
  editCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  editSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E15816",
    alignItems: "center",
  },
  editSaveButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  editSaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
