import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ImageBackground,
  TouchableOpacity,
  Platform,
  ScrollView,
  Clipboard,
  TextInput,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation, useRouter } from "expo-router";
import userService from "../../services/userService";
import authService from "../../services/authService";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

export default function Personal() {
  const navigation = useNavigation();
  const router = useRouter();
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempFirstName, setTempFirstName] = useState("");
  const [tempLastName, setTempLastName] = useState("");
  const [isEditingLanguage, setIsEditingLanguage] = useState(false);
  const [tempLanguage, setTempLanguage] = useState("");
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [agentReferrerInfo, setAgentReferrerInfo] = useState(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  // Language options
  const languageOptions = ["English", "Japanese", "Saudi Arabia", "Korea"];

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const profile = await userService.getUserProfile();

        if (!profile) {
          navigation.replace("/register");
          return;
        }

        if (isMounted) {
          setUserData(profile);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  // Force re-render when language changes
  useEffect(() => {
    if (userData.preferredLanguage) {
      setUserData((prev) => ({
        ...prev,
        preferredLanguage: userData.preferredLanguage
      }));
    }
  }, [userData.preferredLanguage]);

  // Fetch agent referrer information
  useEffect(() => {
    const fetchAgentReferrer = async () => {
      // Fetch for both agents and investors
      if (!userData) {
        setAgentReferrerInfo(null);
        return;
      }

      // For agents, parse their agentCode
      if (userData.agent && userData.agentCode && userData.agentCode !== "0" && userData.agentCode !== "pending") {
        setLoadingReferrer(true);
        try {
          const agentCodeParts = userData.agentCode.split("-");
          
          // Check if this is a Master Agent (format: ABC12-00000-00000)
          if (agentCodeParts.length === 3 && agentCodeParts[1] === "00000" && agentCodeParts[2] === "00000") {
            setAgentReferrerInfo({
              type: "Master Agent",
              name: "Master Agent",
              agentNumber: agentCodeParts[0],
            });
            setLoadingReferrer(false);
            return;
          }

          // For sub-agents, determine the referrer
          let referrerAgentNumber = null;
          let referrerType = null;

          // If format is ABC12-XYZ34-00000, this is an Agent under a Master Agent
          if (agentCodeParts.length === 3 && agentCodeParts[2] === "00000") {
            referrerAgentNumber = agentCodeParts[0]; // Master Agent number
            referrerType = "Master Agent";
          }
          // If format is ABC12-XYZ34-DEF56, this is a Consultant Agent under an Agent
          else if (agentCodeParts.length === 3 && agentCodeParts[2] !== "00000") {
            referrerAgentNumber = agentCodeParts[1]; // Agent number (or Consultant Agent)
            referrerType = "Agent";
          }

          const language = userData.preferredLanguage || "English";
          const searchResult = await userService.searchUsers({
            search: referrerAgentNumber || "",
            agent: true,
            limit: 100
          });
          const agents = searchResult?.users || [];
          const exactReferrer = agents.find(
            (agent) => String(agent.agentNumber) === String(referrerAgentNumber)
          );

          if (referrerAgentNumber && exactReferrer) {
            setAgentReferrerInfo({
              type: referrerType,
              name: `${exactReferrer.firstName || ""} ${exactReferrer.lastName || ""}`.trim(),
              agentNumber: referrerAgentNumber,
            });
          } else if (referrerAgentNumber) {
            const consultantReferrer = agents.find((agent) => {
              const parts = agent.agentCode?.split("-");
              return parts?.length === 3 && parts[1] === referrerAgentNumber && parts[2] !== "00000";
            });

            if (consultantReferrer) {
              setAgentReferrerInfo({
                type: "Consultant Agent",
                name: `${consultantReferrer.firstName || ""} ${consultantReferrer.lastName || ""}`.trim(),
                agentNumber: consultantReferrer.agentNumber,
                note: t(language, 'personal.values.consultantAgentNote'),
              });
            } else {
              setAgentReferrerInfo({
                type: referrerType,
                name: t(language, 'personal.values.notFound'),
                agentNumber: referrerAgentNumber,
              });
            }
          } else {
            setAgentReferrerInfo(null);
          }
        } catch (error) {
          console.error("Error fetching agent referrer:", error);
          setAgentReferrerInfo(null);
        } finally {
          setLoadingReferrer(false);
        }
      }
      // For investors, check if they have a refferedAgent field
      else if (!userData.agent && userData.refferedAgent && userData.refferedAgent !== "0") {
        setLoadingReferrer(true);
        try {
          const searchResult = await userService.searchUsers({
            search: userData.refferedAgent,
            agent: true,
            limit: 50
          });
          const agents = searchResult?.users || [];
          const referrerData = agents.find(
            (agent) => String(agent.agentNumber) === String(userData.refferedAgent)
          );

          if (referrerData) {
            setAgentReferrerInfo({
              type: "Agent",
              name: `${referrerData.firstName || ""} ${referrerData.lastName || ""}`.trim(),
              agentNumber: userData.refferedAgent,
            });
          } else {
            setAgentReferrerInfo({
              type: "Agent",
              name: t(userData.preferredLanguage || 'English', 'personal.values.notFound'),
              agentNumber: userData.refferedAgent,
            });
          }
        } catch (error) {
          console.error("Error fetching investor referrer:", error);
          setAgentReferrerInfo(null);
        } finally {
          setLoadingReferrer(false);
        }
      } else {
        setAgentReferrerInfo(null);
      }
    };

    fetchAgentReferrer();
  }, [userData.agent, userData.agentCode, userData.refferedAgent, userData.preferredLanguage]);

  if (loading) {
    return (
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        <SafeAreaView style={styles.androidSafeArea} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t(userData.preferredLanguage || 'English', 'personal.loading.text')}</Text>
        </View>
      </ImageBackground>
    );
  }

  const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
  const accountType = userData.agent ? "Agent" : "Investor";
  const agentNumber = userData.agentNumber || "N/A";
  const formatDate = (value) => {
    if (!value) {
      return t(userData.preferredLanguage || 'English', 'personal.values.notAvailable');
    }
    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
      return t(userData.preferredLanguage || 'English', 'personal.values.notAvailable');
    }
    return dateValue.toLocaleDateString();
  };

  // Function to start editing name
  const startEditingName = () => {
    setTempFirstName(userData.firstName || "");
    setTempLastName(userData.lastName || "");
    setIsEditingName(true);
  };

  // Function to save name changes
  const saveNameChanges = async () => {
    try {
      const result = await userService.updateUserProfile({
        firstName: tempFirstName.trim(),
        lastName: tempLastName.trim(),
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update name.");
      }

      const refreshedProfile = await authService.getCurrentUserProfile();
      if (refreshedProfile) {
        setUserData(refreshedProfile);
      }

      setIsEditingName(false);
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.success'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.success.nameUpdated'),
        type: "success",
        confirmText: "OK",
      });
    } catch (error) {
      console.error("Error updating name:", error);
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.error.nameUpdateFailed'),
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to cancel name editing
  const cancelNameEditing = () => {
    setIsEditingName(false);
    setTempFirstName("");
    setTempLastName("");
  };

  // Function to copy account number to clipboard
  const copyAccountNumber = async () => {
    try {
      const accountNumber = userData.accountNumber || t(userData.preferredLanguage || 'English', 'personal.values.notProvided');
      if (accountNumber !== t(userData.preferredLanguage || 'English', 'personal.values.notProvided')) {
        await Clipboard.setString(accountNumber);
        showModal({
          title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.copied'),
          message: t(userData.preferredLanguage || 'English', 'personal.messages.success.copied'),
          type: "success",
          confirmText: "OK",
        });
      } else {
        showModal({
          title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.noAccountNumber'),
          message: t(userData.preferredLanguage || 'English', 'personal.messages.warning.noAccountNumber'),
          type: "warning",
          confirmText: "OK",
        });
      }
    } catch (error) {
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.error.copyFailed'),
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to start editing language
  const startEditingLanguage = () => {
    setTempLanguage(userData.preferredLanguage || "English");
    setIsEditingLanguage(true);
  };

  // Function to save language changes
  const saveLanguageChanges = async () => {
    try {
      // Start loading state
      setIsChangingLanguage(true);
      const result = await userService.updateUserProfile({
        preferredLanguage: tempLanguage,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update language.");
      }

      const refreshedProfile = await authService.getCurrentUserProfile();
      if (refreshedProfile) {
        setUserData(refreshedProfile);
      }

      setIsEditingLanguage(false);
      
      // Wait 5 seconds to ensure the language change is processed and loaded
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Stop loading state
      setIsChangingLanguage(false);
      
      // Show success message and then navigate to main page
      showModal({
        title: t(tempLanguage || 'English', 'personal.messages.titles.success'),
        message: t(tempLanguage || 'English', 'personal.messages.success.languageUpdated'),
        type: "success",
        confirmText: "OK",
        onConfirm: () => {
          hideModal();
          // Navigate to main page with the new language
          router.push("/main");
        },
      });
    } catch (error) {
      console.error("Error updating language preference:", error);
      setIsChangingLanguage(false); // Stop loading on error
      showModal({
        title: t(userData.preferredLanguage || 'English', 'personal.messages.titles.error'),
        message: t(userData.preferredLanguage || 'English', 'personal.messages.error.languageUpdateFailed'),
        type: "error",
        confirmText: "OK",
      });
    }
  };

  // Function to cancel language editing
  const cancelLanguageEditing = () => {
    setIsEditingLanguage(false);
    setTempLanguage("");
  };

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.redTheme.background} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, getRTLStyles(userData.preferredLanguage || 'English')]}>
              {t(userData.preferredLanguage || 'English', 'personal.header.title')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Hero Profile Section */}
          <View style={styles.heroCard}>
            <View style={styles.profileIconContainer}>
              <Ionicons name="person-circle" size={60} color="white" />
            </View>
            <Text style={[styles.profileName, getRTLStyles(userData.preferredLanguage || 'English')]}>
              {fullName || t(userData.preferredLanguage || 'English', 'personal.values.notProvided')}
            </Text>
            <View style={styles.profileBadges}>
              <View style={[styles.badge, { backgroundColor: accountType === "Agent" ? "#e74c3c" : "#27ae60" }]}>
                <Text style={styles.badgeText}>{accountType}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: userData.accountType === "Premium" ? "#f39c12" : "#95a5a6" }]}>
                <Text style={styles.badgeText}>{userData.accountType || t(userData.preferredLanguage || 'English', 'personal.values.basic')}</Text>
              </View>
            </View>
          </View>

          {/* Personal Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="person-outline" size={24} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.cardTitle, getRTLStyles(userData.preferredLanguage || 'English')]}>
                {t(userData.preferredLanguage || 'English', 'personal.cards.accountDetails.title')}
              </Text>
            </View>

          <View style={styles.infoContainer}>
            {/* Name */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Ionicons name="person" size={20} color={Colors.newYearTheme.text} />
                <Text style={[styles.labelText, getRTLStyles(userData.preferredLanguage || 'English')]} numberOfLines={1} ellipsizeMode="tail">{t(userData.preferredLanguage || 'English', 'personal.fields.name')}</Text>
              </View>
              <View style={styles.nameContainer}>
                <Text style={styles.valueText} numberOfLines={1} ellipsizeMode="tail">{fullName || t(userData.preferredLanguage || 'English', 'personal.values.notProvided')}</Text>
                <TouchableOpacity
                  style={styles.editNameButton}
                  onPress={startEditingName}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={16} color={Colors.newYearTheme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Name Edit Section - Only show when editing */}
            {isEditingName && (
              <View style={styles.editNameSection}>
                <Text style={styles.editSectionTitle}>{t(userData.preferredLanguage || 'English', 'personal.buttons.editName')}</Text>
                <View style={styles.nameInputContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={tempFirstName}
                    onChangeText={setTempFirstName}
                    placeholder={t(userData.preferredLanguage || 'English', 'personal.placeholders.firstName')}
                    placeholderTextColor="#999"
                  />
                  <TextInput
                    style={styles.nameInput}
                    value={tempLastName}
                    onChangeText={setTempLastName}
                    placeholder={t(userData.preferredLanguage || 'English', 'personal.placeholders.lastName')}
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.editButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.editButton, styles.saveButton]}
                    onPress={saveNameChanges}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.editButtonText}>{t(userData.preferredLanguage || 'English', 'personal.buttons.save')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, styles.cancelButton]}
                    onPress={cancelNameEditing}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.editButtonText}>{t(userData.preferredLanguage || 'English', 'personal.buttons.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Email */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Ionicons name="mail" size={20} color={Colors.newYearTheme.text} />
                <Text style={[styles.labelText, getRTLStyles(userData.preferredLanguage || 'English')]} numberOfLines={1} ellipsizeMode="tail">{t(userData.preferredLanguage || 'English', 'personal.fields.emailAddress')}</Text>
              </View>
              <Text style={styles.valueText} numberOfLines={1} ellipsizeMode="tail">{userData.emailAddress || t(userData.preferredLanguage || 'English', 'personal.values.notProvided')}</Text>
            </View>

            {/* Account Number */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Ionicons name="card" size={20} color={Colors.newYearTheme.text} />
                <Text style={styles.labelText} numberOfLines={1} ellipsizeMode="tail">{t(userData.preferredLanguage || 'English', 'personal.fields.accountNumber')}</Text>
              </View>
              <View style={styles.accountNumberContainer}>
                <Text style={styles.valueText} numberOfLines={1} ellipsizeMode="tail">{userData.accountNumber || t(userData.preferredLanguage || 'English', 'personal.values.notProvided')}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={copyAccountNumber}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy" size={16} color={Colors.newYearTheme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Type */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Ionicons name="business" size={20} color={Colors.newYearTheme.text} />
                <Text style={styles.labelText} numberOfLines={1} ellipsizeMode="tail">{t(userData.preferredLanguage || 'English', 'personal.fields.accountType')}</Text>
              </View>
              <View style={styles.accountTypeContainer}>
                <Text style={[
                  styles.accountTypeText,
                  { color: accountType === "Agent" ? "#e74c3c" : "#27ae60" }
                ]} numberOfLines={1} ellipsizeMode="tail">
                  {accountType}
                </Text>
              </View>
            </View>

            {/* Account Type (Basic/Premium) */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Ionicons name="star" size={20} color={Colors.newYearTheme.text} />
                <Text style={styles.labelText} numberOfLines={1} ellipsizeMode="tail">{t(userData.preferredLanguage || 'English', 'personal.fields.accountLevel')}</Text>
              </View>
              <View style={styles.accountLevelContainer}>
                <Text style={[
                  styles.accountTypeText,
                  { color: userData.accountType === "Premium" ? "#f39c12" : "#95a5a6" }
                ]} numberOfLines={1} ellipsizeMode="tail">
                  {userData.accountType || t(userData.preferredLanguage || 'English', 'personal.values.basic')}
                </Text>
                {/* Upgrade to Premium Button - Show when KYC is not approved */}
                {!userData.kycApproved && (
                  <TouchableOpacity
                    style={styles.upgradeButton}
                    onPress={() => {
                      router.push("/inspirekyc");
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="diamond" size={12} color="#fff" />
                    <Text style={styles.upgradeButtonText}>{t(userData.preferredLanguage || 'English', 'personal.buttons.verify')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Agent Number (only show if account type is Agent) */}
            {accountType === "Agent" && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Ionicons name="id-card" size={20} color={Colors.newYearTheme.text} />
                  <Text style={styles.labelText} numberOfLines={1} ellipsizeMode="tail">{t(userData.preferredLanguage || 'English', 'personal.fields.agentNumber')}</Text>
                </View>
                <Text style={styles.valueText} numberOfLines={1} ellipsizeMode="tail">{agentNumber}</Text>
              </View>
            )}

            {/* Agent Referrer (show for both Agents and Investors) */}
            {agentReferrerInfo !== null && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Ionicons name="people" size={20} color={Colors.newYearTheme.text} />
                  <Text style={styles.labelText} numberOfLines={1} ellipsizeMode="tail">{t(userData.preferredLanguage || 'English', 'personal.fields.agentReferrer')}</Text>
                </View>
                {loadingReferrer ? (
                  <ActivityIndicator size="small" color={Colors.newYearTheme.text} />
                ) : agentReferrerInfo ? (
                  <View style={styles.referrerContainer}>
                    {agentReferrerInfo.type === "Master Agent" && agentReferrerInfo.name === "Master Agent" ? (
                      <Text style={[styles.valueText, { color: "#f39c12", fontWeight: "bold" }]} numberOfLines={1} ellipsizeMode="tail">
                        {t(userData.preferredLanguage || 'English', 'personal.values.masterAgent')}
                      </Text>
                    ) : (
                      <>
                        <Text style={styles.valueText} numberOfLines={1} ellipsizeMode="tail">
                          {agentReferrerInfo.name}
                        </Text>
                        {agentReferrerInfo.type === "Consultant Agent" && (
                          <View style={styles.consultantBadge}>
                            <Text style={styles.consultantBadgeText}>
                              {t(userData.preferredLanguage || 'English', 'personal.values.consultantAgent')}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ) : (
                  <Text style={styles.valueText} numberOfLines={1} ellipsizeMode="tail">
                    {t(userData.preferredLanguage || 'English', 'personal.values.notAvailable')}
                  </Text>
                )}
              </View>
            )}

            {/* Agent Referrer Note (only show if note exists) */}
            {agentReferrerInfo && agentReferrerInfo.note && (
              <View style={styles.noteContainer}>
                <Ionicons name="information-circle" size={14} color="#3498db" />
                <Text style={styles.noteText}>{agentReferrerInfo.note}</Text>
              </View>
            )}

            {/* Language Preference */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Ionicons name="language" size={20} color={Colors.newYearTheme.text} />
                <Text style={styles.labelText} numberOfLines={1} ellipsizeMode="tail">{t(userData.preferredLanguage || 'English', 'personal.fields.language')}</Text>
              </View>
              <View style={styles.languageContainer}>
                <Text style={styles.valueText} numberOfLines={1} ellipsizeMode="tail">
                  {userData.preferredLanguage || "English"}
                </Text>
                <TouchableOpacity
                  style={styles.editLanguageButton}
                  onPress={startEditingLanguage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={16} color={Colors.newYearTheme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Language Edit Section - Only show when editing */}
            {isEditingLanguage && (
              <View style={styles.editLanguageSection}>
                <Text style={styles.editSectionTitle}>{t(userData.preferredLanguage || 'English', 'personal.buttons.selectLanguage')}</Text>
                <View style={styles.languageDropdownContainer}>
                  {languageOptions.map((language) => (
                    <TouchableOpacity
                      key={language}
                      style={[
                        styles.languageOption,
                        tempLanguage === language && styles.selectedLanguageOption
                      ]}
                      onPress={() => setTempLanguage(language)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.languageOptionText,
                        tempLanguage === language && styles.selectedLanguageOptionText
                      ]}>
                        {language}
                      </Text>
                      {tempLanguage === language && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.editButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.editButton, 
                      styles.saveButton,
                      isChangingLanguage && styles.disabledButton
                    ]}
                    onPress={saveLanguageChanges}
                    activeOpacity={0.7}
                    disabled={isChangingLanguage}
                  >
                    {isChangingLanguage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                    <Text style={styles.editButtonText}>
                      {isChangingLanguage 
                        ? t(userData.preferredLanguage || 'English', 'personal.buttons.changing') 
                        : t(userData.preferredLanguage || 'English', 'personal.buttons.save')
                      }
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.editButton, 
                      styles.cancelButton,
                      isChangingLanguage && styles.disabledButton
                    ]}
                    onPress={cancelLanguageEditing}
                    activeOpacity={0.7}
                    disabled={isChangingLanguage}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.editButtonText}>{t(userData.preferredLanguage || 'English', 'personal.buttons.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

          {/* Additional Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="information-circle-outline" size={24} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.cardTitle, getRTLStyles(userData.preferredLanguage || 'English')]}>
                {t(userData.preferredLanguage || 'English', 'personal.cards.accountStatus.title')}
              </Text>
            </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                <Text style={styles.labelText} numberOfLines={1} ellipsizeMode="tail">{t(userData.preferredLanguage || 'English', 'personal.fields.status')}</Text>
              </View>
                              <Text style={[styles.valueText, { color: "#27ae60", fontWeight: "bold" }]} numberOfLines={1} ellipsizeMode="tail">
                  {t(userData.preferredLanguage || 'English', 'personal.values.active')}
                </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Ionicons name="calendar" size={20} color={Colors.newYearTheme.text} />
                <Text style={styles.labelText} numberOfLines={1} ellipsizeMode="tail">{t(userData.preferredLanguage || 'English', 'personal.fields.memberSince')}</Text>
              </View>
              <Text style={styles.valueText} numberOfLines={1} ellipsizeMode="tail">
                {formatDate(userData.createdAt)}
              </Text>
            </View>
          </View>
        </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

      {/* Modal for copy confirmation */}
      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={hideModal}
      />

      {/* Loading overlay for language change */}
      {isChangingLanguage && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.newYearTheme.text} />
            <Text style={styles.loadingText}>
              {t(userData.preferredLanguage || 'English', 'personal.loading.text')}
            </Text>
          </View>
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  androidSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 0 : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  backButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
  },
  placeholder: {
    width: 44,
  },

  // Hero Profile Section
  heroCard: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  profileIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
    textAlign: "center",
  },
  profileBadges: {
    flexDirection: "row",
    gap: 12,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: Colors.redTheme.background,
  },

  // Cards
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: Colors.redTheme.background,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    flex: 1,
  },
  infoContainer: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    minHeight: 40,
  },
  infoLabel: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    maxWidth: "50%",
  },
  labelText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
    fontWeight: "500",
  },
  valueText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
  },
  accountTypeContainer: {
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  accountLevelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accountTypeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  accountNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  copyButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 15,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  editNameButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 15,
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  editNameSection: {
    backgroundColor: "rgba(254, 125, 72, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.2)",
    alignItems: "center",
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 12,
    textAlign: "center",
  },
  nameInputContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    justifyContent: "center",
    width: "100%",
  },
  nameInput: {
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "white",
    minWidth: 100,
    textAlign: "center",
  },
  editButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    width: "100%",
  },
  editButton: {
    padding: 12,
    borderRadius: 12,
    minWidth: 100,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#27ae60",
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  disabledButton: {
    opacity: 0.6,
  },
  upgradeButton: {
    backgroundColor: "#f39c12",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    shadowColor: "#f39c12",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#d68910",
    minWidth: 80,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  referrerContainer: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  consultantBadge: {
    backgroundColor: "#3498db",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  consultantBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  noteText: {
    fontSize: 11,
    color: "#1976d2",
    flex: 1,
    lineHeight: 16,
  },
  languageContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  editLanguageButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 15,
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  editLanguageSection: {
    backgroundColor: "rgba(254, 125, 72, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.2)",
    alignItems: "center",
  },
  languageDropdownContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  languageOption: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  languageOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  selectedLanguageOption: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background,
  },
  selectedLanguageOptionText: {
    color: "#fff",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: Colors.redTheme.background,
    fontWeight: "500",
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },
});
