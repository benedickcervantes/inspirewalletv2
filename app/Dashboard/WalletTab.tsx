import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
    ImageBackground,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { useLanguage } from "../../context/LanguageContext";
import { useResponsive } from "../../utils/responsive";
import { getCardTheme } from "../theme/cardThemes";

const depositSvg = `<svg width="20" height="20" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.07099 0.999942L0.999919 8.07101M0.999919 8.07101L1.20195 2.21213M0.999919 8.07101L6.8588 7.86898" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const withdrawSvg = `<svg width="20" height="20" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.00006 8.0711L8.07113 1.00004M8.07113 1.00004L7.8691 6.85892M8.07113 1.00004L2.21224 1.20207" stroke="#FC821D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Helper functions to generate eye SVGs with dynamic colors
const getOpenEyeSvg = (
  color: string,
) => `<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.375 10.2917C5.225 3.95841 13.775 3.95841 16.625 10.2917" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.5 13.4585C9.18811 13.4585 8.87928 13.3971 8.59113 13.2777C8.30298 13.1584 8.04116 12.9834 7.82062 12.7629C7.60008 12.5423 7.42514 12.2805 7.30579 11.9924C7.18643 11.7042 7.125 11.3954 7.125 11.0835C7.125 10.7716 7.18643 10.4628 7.30579 10.1746C7.42514 9.88647 7.60008 9.62466 7.82062 9.40412C8.04116 9.18358 8.30298 9.00864 8.59113 8.88928C8.87928 8.76993 9.18811 8.7085 9.5 8.7085C10.1299 8.7085 10.734 8.95872 11.1794 9.40412C11.6248 9.84952 11.875 10.4536 11.875 11.0835C11.875 11.7134 11.6248 12.3175 11.1794 12.7629C10.734 13.2083 10.1299 13.4585 9.5 13.4585Z" fill="${color}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const getCloseEyeSvg = (
  color: string,
) => `<svg width="15" height="12" viewBox="0 0 15 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.97642 1.99334C9.16545 1.5058 8.23682 1.2488 7.29058 1.25C6.3452 1.24925 5.41749 1.50624 4.60725 1.99334C4.4655 2.07547 4.29717 2.09867 4.13849 2.05793C3.97981 2.0172 3.84347 1.91579 3.75881 1.77553C3.67416 1.63527 3.64796 1.46738 3.68585 1.308C3.72374 1.14862 3.8227 1.01049 3.96142 0.923335C4.96677 0.318406 6.1181 -0.000829372 7.29142 2.26453e-06C8.46502 -0.000981006 9.61665 0.31826 10.6222 0.923335C10.7585 1.01151 10.8552 1.14925 10.8917 1.30741C10.9283 1.46556 10.9018 1.63173 10.818 1.77075C10.7342 1.90977 10.5996 2.01074 10.4427 2.05228C10.2858 2.09382 10.118 2.07268 9.97642 1.99334ZM1.17475 6.04917L0.904751 6.18417C0.83132 6.22088 0.751376 6.24278 0.669485 6.2486C0.587593 6.25442 0.505357 6.24405 0.427472 6.21809C0.349587 6.19213 0.277578 6.15108 0.215557 6.09729C0.153535 6.0435 0.102716 5.97802 0.0660007 5.90459C0.0292853 5.83115 0.0073927 5.75121 0.00157284 5.66932C-0.00424702 5.58743 0.00611976 5.50519 0.0320815 5.42731C0.0580432 5.34942 0.0990914 5.27741 0.152882 5.21539C0.206673 5.15337 0.272153 5.10255 0.345584 5.06584L1.17892 4.64917C1.25611 4.61073 1.34042 4.58867 1.42654 4.58439C1.51267 4.58011 1.59875 4.5937 1.67937 4.62431C1.75999 4.65491 1.8334 4.70187 1.89499 4.76222C1.95658 4.82257 2.00502 4.89502 2.03725 4.975L2.03892 4.97667L2.04475 4.99167L2.07392 5.05667C2.10058 5.11584 2.14225 5.205 2.19975 5.31667C2.31642 5.54 2.49392 5.8525 2.73892 6.19917C3.23225 6.89667 3.97642 7.7025 5.00392 8.2175C5.71376 8.57291 6.49759 8.75537 7.29142 8.75C8.08531 8.75512 8.86915 8.57236 9.57892 8.21667C10.6064 7.7025 11.3506 6.89667 11.8439 6.19917C12.0991 5.83868 12.3219 5.45636 12.5097 5.05667L12.5381 4.99084L12.5439 4.97667C12.5759 4.89621 12.6244 4.82329 12.6861 4.76253C12.7478 4.70177 12.8214 4.6545 12.9023 4.6237C12.9833 4.59291 13.0697 4.57928 13.1562 4.58366C13.2427 4.58804 13.3273 4.61035 13.4048 4.64917L14.2381 5.06584C14.3864 5.13999 14.4992 5.27001 14.5516 5.42731C14.604 5.5846 14.5918 5.75629 14.5177 5.90459C14.4435 6.05289 14.3135 6.16566 14.1562 6.21809C13.9989 6.27052 13.8272 6.25832 13.6789 6.18417L13.4089 6.04917C13.2308 6.37332 13.0332 6.68639 12.8173 6.98667L13.1073 7.22834C13.2346 7.33464 13.3144 7.48717 13.3293 7.65236C13.3441 7.81754 13.2927 7.98186 13.1864 8.10917C13.0801 8.23647 12.9276 8.31633 12.7624 8.33118C12.5972 8.34603 12.4329 8.29464 12.3056 8.18834L12.0147 7.945C11.6213 8.35156 11.1817 8.71067 10.7048 9.015L10.9639 9.48584C11.0439 9.63104 11.063 9.80208 11.0169 9.96133C10.9708 10.1206 10.8633 10.255 10.7181 10.335C10.5729 10.415 10.4018 10.4341 10.2426 10.388C10.0833 10.3419 9.94892 10.2344 9.86892 10.0892L9.58808 9.57917C9.05153 9.78601 8.489 9.9178 7.91642 9.97084V10.625C7.91642 10.7908 7.85057 10.9497 7.73336 11.0669C7.61615 11.1842 7.45718 11.25 7.29142 11.25C7.12566 11.25 6.96669 11.1842 6.84948 11.0669C6.73227 10.9497 6.66642 10.7908 6.66642 10.625V9.97084C6.09383 9.9178 5.5313 9.78601 4.99475 9.57917L4.71392 10.0892C4.63391 10.2344 4.4995 10.3419 4.34025 10.388C4.181 10.4341 4.00996 10.415 3.86475 10.335C3.71954 10.255 3.61207 10.1206 3.56597 9.96133C3.51986 9.80208 3.53891 9.63104 3.61892 9.48584L3.87892 9.015C3.40171 8.71072 2.96177 8.35161 2.56808 7.945L2.27725 8.1875C2.2149 8.24422 2.14172 8.28775 2.06212 8.31545C1.98252 8.34316 1.89813 8.35448 1.81404 8.34873C1.72994 8.34298 1.64788 8.32028 1.57279 8.282C1.4977 8.24372 1.43112 8.19064 1.37707 8.12596C1.32303 8.06128 1.28262 7.98634 1.25828 7.90564C1.23395 7.82494 1.22619 7.74015 1.23547 7.65638C1.24475 7.5726 1.27088 7.49157 1.31228 7.41815C1.35369 7.34473 1.40952 7.28045 1.47642 7.22917L1.76558 6.9875C1.5496 6.68696 1.35285 6.3736 1.17475 6.04917Z" fill="${color}"/>
</svg>`;

interface WalletTabProps {
  userData: { firstName?: string; accountNumber?: string } | null;
  availableBalance: number;
  isBalanceLoading: boolean;
  agentCommission?: number;
  activeCardDesign?: string | null;
  formatCurrency: (amount: number) => string;
  isWithdrawalLocked?: boolean;
  onWithdrawalLockedPress?: () => void;
}

const getDesignFrontImage = (design?: string) => {
  switch (design) {
    case "DIAMOND_ELITE":
      return require("../../assets/cards/vip_collection/vp2/front.png");
    case "GOLD_ELITE":
      return require("../../assets/cards/vip_collection/vp1/front.png");
    case "ORANGE_ELITE":
      return require("../../assets/cards/design_collection/dc1/front.png");
    case "ROYAL_CURVE":
      return require("../../assets/cards/design_collection/dc2/front.png");
    default:
      return require("../../assets/images/Eecard_2.0.png");
  }
};

const getDesignBackImage = (design?: string) => {
  switch (design) {
    case "DIAMOND_ELITE":
      return require("../../assets/cards/vip_collection/vp2/back.png");
    case "GOLD_ELITE":
      return require("../../assets/cards/vip_collection/vp1/back.png");
    case "ORANGE_ELITE":
      return require("../../assets/cards/design_collection/dc1/back.png");
    case "ROYAL_CURVE":
      return require("../../assets/cards/design_collection/dc2/back.png");
    default:
      return require("../../assets/cards/default/card2.0_back.png");
  }
};

const getActiveCardStorageKey = (accountNumber?: string) =>
  accountNumber ? `active_card_design_${accountNumber}` : "active_card_design";

export default function WalletTab({
  userData,
  availableBalance,
  isBalanceLoading,
  activeCardDesign,
  formatCurrency,
  isWithdrawalLocked = false,
  onWithdrawalLockedPress,
}: WalletTabProps) {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const { horizontalPadding } = useResponsive();
  const isSmallScreen = width < 360;
  const isMediumScreen = width >= 360 && width < 400;
  const cardWidth = width - horizontalPadding * 2;
  const cardHeight = cardWidth / 1.586;
  const containerHeight = cardHeight + 10;
  const fontScale = isSmallScreen ? 0.82 : isMediumScreen ? 0.9 : 1;
  const spacingScale = isSmallScreen ? 0.7 : isMediumScreen ? 0.85 : 1;
  // Scale text by cardWidth - text lives inside the card, so this keeps proportions correct
  const minCardW = 280;
  const maxCardW = 410;
  const cardScale = Math.min(
    1,
    Math.max(0, (cardWidth - minCardW) / (maxCardW - minCardW)),
  );
  const labelFontSize = Math.round(10 + cardScale * 6);
  const currencyFontSize = Math.round(11 + cardScale * 7);
  const amountFontSize = Math.round(18 + cardScale * 22);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [showMinimumBalanceWarning, setShowMinimumBalanceWarning] = useState(false);
  const [activeDesign, setActiveDesign] = useState<string | null>(
    activeCardDesign ?? null,
  );

  const toggleBalanceVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  const handleWithdrawPress = () => {
    if (isWithdrawalLocked) {
      onWithdrawalLockedPress?.();
    } else if (availableBalance <= 1000) {
      // Show warning if balance is at or below minimum required (1000)
      setShowMinimumBalanceWarning(true);
    } else {
      navigation.navigate("Withdraw");
    }
  };

  const maskBalance = (balance: number) => {
    return "•••••";
  };

  // Keep wallet card skin in sync with Cards tab (uses same cached design key).
  useEffect(() => {
    if (activeCardDesign !== undefined) {
      setActiveDesign(activeCardDesign ?? null);
      return;
    }
    const loadActiveDesign = async () => {
      try {
        const key = getActiveCardStorageKey(userData?.accountNumber);
        const cached = await AsyncStorage.getItem(key);
        if (cached) setActiveDesign(cached);
        else setActiveDesign(null);
      } catch (e) {
        console.error("Failed to load active card design for wallet", e);
      }
    };
    loadActiveDesign();
  }, [userData?.accountNumber, activeCardDesign]);

  const theme = getCardTheme(activeDesign);

  return (
    <View
      style={[
        styles.balanceCardContainer,
        { marginHorizontal: horizontalPadding, height: containerHeight },
      ]}
    >
      <View style={[styles.cardFace]}>
        <ImageBackground
          source={getDesignFrontImage(activeDesign || undefined)}
          style={[
            styles.balanceCard,
            {
              width: cardWidth,
              height: cardHeight,
              padding: isSmallScreen ? 14 : 20,
            },
          ]}
          imageStyle={styles.balanceCardImage}
          resizeMode="cover"
        >
          <View
            style={[
              styles.balanceCardInner,
              {
                justifyContent: "flex-end",
                paddingBottom: Math.round(10 * spacingScale),
                paddingTop: Math.round(20 * spacingScale),
              },
            ]}
          >
            <View style={[styles.cardFlipArea, { flex: 0 }]}>
              <View
                style={[
                  styles.balanceHeader,
                  { marginBottom: Math.round(4 * spacingScale) },
                ]}
              >
                <Text
                  style={[
                    styles.balanceLabel,
                    { color: theme.secondaryText, fontSize: labelFontSize },
                  ]}
                  numberOfLines={1}
                >
                  {t("dashboard.availableBalance")}
                </Text>
                <TouchableOpacity
                  onPress={toggleBalanceVisibility}
                  activeOpacity={0.7}
                >
                  <SvgXml
                    xml={
                      isBalanceVisible
                        ? getOpenEyeSvg(theme.eyeIconColor)
                        : getCloseEyeSvg(theme.eyeIconColor)
                    }
                    width={isSmallScreen ? 18 : 20}
                    height={isSmallScreen ? 18 : 20}
                  />
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.balanceAmountContainer,
                  { marginBottom: Math.round(-4 * spacingScale) },
                ]}
              >
                <Text
                  style={[
                    styles.currency,
                    {
                      color: theme.secondaryText,
                      fontSize: currencyFontSize,
                      marginRight: Math.round(8 * spacingScale),
                    },
                  ]}
                >
                  PHP
                </Text>
                {isBalanceLoading ? (
                  <View style={styles.balanceAmountSkeleton} />
                ) : (
                  <Text
                    style={[
                      styles.balanceAmount,
                      { color: theme.primaryText, fontSize: amountFontSize },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {isBalanceVisible
                      ? formatCurrency(availableBalance)
                      : maskBalance(availableBalance)}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.cardSeparator,
                  {
                    backgroundColor: theme.separatorColor,
                    marginVertical: Math.round(6 * spacingScale),
                  },
                ]}
              />
            </View>

            <View
              style={[
                styles.cardActionsRow,
                {
                  gap: Math.round(10 * spacingScale),
                  marginTop: Math.round(10 * spacingScale),
                },
              ]}
              pointerEvents="box-none"
            >
              {isBalanceLoading ? (
                <>
                  <View
                    style={[
                      styles.cardButtonSkeleton,
                      { paddingVertical: Math.round(14 * spacingScale) },
                    ]}
                  >
                    <View style={styles.cardButtonSkeletonIcon} />
                    <View style={styles.cardButtonSkeletonText} />
                  </View>
                  <View
                    style={[
                      styles.cardButtonSkeleton,
                      { paddingVertical: Math.round(14 * spacingScale) },
                    ]}
                  >
                    <View style={styles.cardButtonSkeletonIcon} />
                    <View style={styles.cardButtonSkeletonText} />
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.cardButtonDeposit,
                      {
                        backgroundColor: theme.actionButtonBg,
                        paddingVertical: Math.round(14 * spacingScale),
                        gap: Math.round(7 * spacingScale),
                      },
                    ]}
                    onPress={() => navigation.navigate("Deposit")}
                    activeOpacity={0.7}
                  >
                    <SvgXml
                      xml={depositSvg}
                      width={isSmallScreen ? 14 : 16}
                      height={isSmallScreen ? 14 : 16}
                    />
                    <Text
                      style={[
                        styles.cardButtonDepositText,
                        {
                          color: theme.actionButtonText,
                          fontSize: Math.round(13 * fontScale),
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {t("dashboard.deposit")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.cardButtonWithdraw,
                      isWithdrawalLocked && styles.cardButtonWithdrawLocked,
                      {
                        backgroundColor: theme.withdrawButtonBg,
                        paddingVertical: Math.round(14 * spacingScale),
                        gap: Math.round(7 * spacingScale),
                      },
                    ]}
                    onPress={handleWithdrawPress}
                    activeOpacity={0.7}
                  >
                    <SvgXml
                      xml={`<svg width="20" height="20" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.00006 8.0711L8.07113 1.00004M8.07113 1.00004L7.8691 6.85892M8.07113 1.00004L2.21224 1.20207" stroke="${theme.withdrawButtonText}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`}
                      width={isSmallScreen ? 14 : 16}
                      height={isSmallScreen ? 14 : 16}
                    />
                    <Text
                      style={[
                        styles.cardButtonWithdrawText,
                        isWithdrawalLocked &&
                          styles.cardButtonWithdrawTextLocked,
                        {
                          color: theme.withdrawButtonText,
                          fontSize: Math.round(14 * fontScale),
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {t("dashboard.withdraw")}
                    </Text>
                  </TouchableOpacity>

                </>
              )}
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Minimum Balance Warning Modal */}
      <Modal
        visible={showMinimumBalanceWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMinimumBalanceWarning(false)}
      >
        <View style={styles.minimumBalanceOverlay}>
          <View style={styles.minimumBalanceModal}>
            <View style={styles.minimumBalanceIconContainer}>
              <Text style={styles.minimumBalanceIcon}>⚠️</Text>
            </View>
            <Text style={styles.minimumBalanceTitle}>
              Cannot Withdraw
            </Text>
            <Text style={styles.minimumBalanceMessage}>
              You must maintain a minimum balance of ₱1,000 to keep your account active.
            </Text>
            <View style={styles.minimumBalanceDetails}>
              <View style={styles.minimumBalanceDetailRow}>
                <Text style={styles.minimumBalanceDetailLabel}>
                  Required Minimum
                </Text>
                <Text style={styles.minimumBalanceDetailValue}>₱1,000</Text>
              </View>
              <View style={styles.minimumBalanceDetailRow}>
                <Text style={styles.minimumBalanceDetailLabel}>
                  Current Balance
                </Text>
                <Text style={styles.minimumBalanceDetailValue}>
                  ₱{availableBalance.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.minimumBalanceButton}
              onPress={() => setShowMinimumBalanceWarning(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.minimumBalanceButtonText}>
                Understood
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCardContainer: {
    marginBottom: 10,
  },
  cardFace: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
  },
  cardBack: {
    position: "absolute",
    top: 0,
  },
  cardBackTouchable: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  balanceCard: {
    padding: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    position: "relative",
    height: 230,
  },
  balanceCardImage: {
    borderRadius: 20,
  },
  balanceCardInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardFlipArea: {
    flex: 1,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 1,
  },
  balanceLabel: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "400",
    letterSpacing: 0.3,
  },
  balanceAmountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "nowrap",
  },
  currency: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "400",
    marginRight: 8,
  },
  balanceAmount: {
    flex: 1,
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  balanceAmountSkeleton: {
    flex: 1,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  cardSeparator: {
    height: 1.5,
    backgroundColor: "#FFFFFF",
    opacity: 0.9,
  },
  cardActionsRow: {
    flexDirection: "row",
  },
  cardButtonDeposit: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 15,
  },
  cardButtonDepositText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cardButtonWithdraw: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  cardButtonWithdrawLocked: {
    opacity: 0.55,
  },
  cardButtonWithdrawText: {
    fontSize: 15,
    fontWeight: "600",
    // Color is now theme-based
  },
  cardButtonWithdrawTextLocked: {
    color: "#999",
  },
  cardButtonSkeleton: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    gap: 7,
  },
  cardButtonSkeletonIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  cardButtonSkeletonText: {
    width: 58,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  minimumBalanceOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  minimumBalanceModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    maxWidth: 320,
  },
  minimumBalanceIconContainer: {
    marginBottom: 16,
  },
  minimumBalanceIcon: {
    fontSize: 48,
  },
  minimumBalanceTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E25A17",
    marginBottom: 12,
    textAlign: "center",
  },
  minimumBalanceMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  minimumBalanceDetails: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: "100%",
  },
  minimumBalanceDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  minimumBalanceDetailLabel: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  minimumBalanceDetailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "700",
  },
  minimumBalanceButton: {
    backgroundColor: "#E25A17",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  minimumBalanceButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
