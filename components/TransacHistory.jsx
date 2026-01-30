import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, app } from "../configs/firebase";
import { Colors } from "../constants/Colors";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";

const TransacHistory = ({ userId, trigger }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userLanguage, setUserLanguage] = useState("english");
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  // Function to fetch user language
  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(getFirestore(app), "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
      setUserLanguage("english");
    }
  };

  // Responsive logic for tablet detection
  const isTablet = windowWidth >= 768;
  const itemsPerPage = isTablet ? 20 : 10;

  // Real-time transactions listener
  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const db = getFirestore(app);
    const transactionsRef = collection(db, "users", userId, "transactions");
    const q = query(transactionsRef, orderBy("date", "desc"));

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        try {
          const fetchedTransactions = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();

            const date = data.date?.toDate
              ? data.date.toDate()
              : new Date(data.date);
            const amount =
              typeof data.amount === "number"
                ? data.amount
                : parseFloat(data.amount) || 0;

            fetchedTransactions.push({
              id: doc.id,
              type: data.type,
              date: date,
              amount: amount,
              // Add additional fields that might be available
              description: data.description || "N/A",
              status: data.status || "Completed",
              reference: data.reference || "N/A",
              fee: data.fee || 0,
              balanceAfter: data.balanceAfter || "N/A",
            });
          });

          setTransactions(fetchedTransactions);
          setTotalPages(Math.ceil(fetchedTransactions.length / itemsPerPage));
          setError(null);
          // console.log("💳 TransacHistory real-time update:", {
          //   transactionCount: fetchedTransactions.length,
          //   pages: Math.ceil(fetchedTransactions.length / itemsPerPage),
          //   timestamp: new Date().toISOString(),
          // });
        } catch (err) {
          // console.error("❌ Error processing transactions:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        // console.error("❌ TransacHistory listener error:", error);
        setError(error.message);
        setLoading(false);
      },
    );

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, [userId, itemsPerPage]);

  // Handle trigger prop for additional real-time updates
  useEffect(() => {
    if (trigger > 0) {
      // console.log("💳 TransacHistory triggered update:", trigger);
      // The onSnapshot listener will automatically handle updates
      // This effect is just for logging trigger events
    }
  }, [trigger]);

  // Fetch user language on component mount and listen for real-time changes
  useEffect(() => {
    fetchUserLanguage();

    // Set up real-time listener for language changes
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(getFirestore(app), "users", user.uid);
      const unsubscribeLanguage = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const newLanguage = userData.preferredLanguage || "english";
          setUserLanguage((prevLanguage) => {
            // Only update if the language actually changed
            if (prevLanguage !== newLanguage) {
              console.log(
                `TransacHistory: Language changed from ${prevLanguage} to ${newLanguage}`,
              );
              return newLanguage;
            }
            return prevLanguage;
          });
        }
      });

      return () => unsubscribeLanguage();
    }
  }, []);

  // Get current page transactions
  const getCurrentPageTransactions = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return transactions.slice(startIndex, endIndex);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  const openTransactionModal = (transaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTransaction(null);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          isTablet && styles.tabletLoadingContainer,
        ]}
      >
        <ActivityIndicator size="large" color={Colors.newYearTheme.primary} />
        <Text
          style={[
            styles.loadingText,
            isTablet && styles.tabletLoadingText,
            getRTLStyles(userLanguage),
          ]}
        >
          {t(userLanguage, "transactionHistory.loadingText")}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.errorContainer, isTablet && styles.tabletErrorContainer]}
      >
        <Text
          style={[
            styles.errorText,
            isTablet && styles.tabletErrorText,
            getRTLStyles(userLanguage),
          ]}
        >
          {t(userLanguage, "transactionHistory.errorText")} {error}
        </Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, isTablet && styles.tabletEmptyContainer]}
      >
        <Ionicons
          name="receipt-outline"
          size={48}
          color={Colors.redTheme.background}
          style={styles.emptyIcon}
        />
        <Text
          style={[
            styles.emptyText,
            isTablet && styles.tabletEmptyText,
            getRTLStyles(userLanguage),
          ]}
        >
          {t(userLanguage, "transactionHistory.noTransactionsText")}
        </Text>
        <Text style={styles.emptySubtext}>
          Your transaction history will appear here
        </Text>
      </View>
    );
  }

  const currentTransactions = getCurrentPageTransactions();

  // Helper function to determine if transaction adds to available balance
  const isPositiveTransaction = (transactionType) => {
    if (!transactionType) return false;
    const type = transactionType.toLowerCase();
    return (
      type.includes("received") ||
      type.includes("deposit") ||
      type.includes("cash in") ||
      type.includes("earnings") ||
      type.includes("returned") ||
      type.includes("agent wallet transfer") ||
      type.includes("add") ||
      type.includes("added") ||
      type.includes("credit") ||
      type.includes("refund") ||
      type.includes("bonus") ||
      type.includes("reward") ||
      type.includes("stock transfer received")
    );
  };

  return (
    <View
      style={[styles.mainContainer, isTablet && styles.tabletMainContainer]}
    >
      {/* Transaction History Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerIconContainer}>
          <Ionicons
            name="time-outline"
            size={20}
            color={Colors.redTheme.background}
          />
        </View>
        <Text style={[styles.headerTitle, getRTLStyles(userLanguage)]}>
          {t(userLanguage, "transactionHistory.headerTitle")}
        </Text>
      </View>

      {/* Transaction List */}
      <View
        style={[styles.listContainer, isTablet && styles.tabletListContainer]}
      >
        <FlatList
          data={currentTransactions}
          keyExtractor={(item) => item.id}
          numColumns={isTablet ? 2 : 1}
          key={isTablet ? "tablet" : "mobile"}
          columnWrapperStyle={isTablet ? styles.tabletRow : null}
          renderItem={({ item }) => {
            // Calculate font size based on type length and device
            const getFontSize = (text) => {
              if (!text) return isTablet ? 16 : 13;
              const baseFontSize = isTablet ? 16 : 13;
              if (text.length <= 8) return baseFontSize;
              if (text.length <= 12) return baseFontSize - 1;
              if (text.length <= 16) return baseFontSize - 2;
              return baseFontSize - 3;
            };

            return (
              <TouchableOpacity
                style={[
                  styles.transactionBox,
                  isTablet && styles.tabletTransactionBox,
                ]}
                onPress={() => openTransactionModal(item)}
                activeOpacity={0.7}
              >
                {isTablet ? (
                  // Tablet layout with more information
                  <>
                    <View style={styles.tabletTransactionRow}>
                      <View style={styles.tabletTransactionItem}>
                        <Text
                          style={[
                            styles.transactionLabel,
                            styles.tabletTransactionLabel,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {t(userLanguage, "transactionHistory.labels.type")}
                        </Text>
                        <Text
                          style={[
                            styles.transactionText,
                            { fontSize: getFontSize(item.type) },
                            styles.tabletTransactionText,
                          ]}
                        >
                          {item.type}
                        </Text>
                      </View>
                      <View style={styles.tabletTransactionItem}>
                        <Text
                          style={[
                            styles.transactionLabel,
                            styles.tabletTransactionLabel,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {t(userLanguage, "transactionHistory.labels.date")}
                        </Text>
                        <Text
                          style={[
                            styles.transactionText,
                            styles.tabletTransactionText,
                          ]}
                        >
                          {item.date.toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.tabletTransactionRow}>
                      <View style={styles.tabletTransactionItem}>
                        <Text
                          style={[
                            styles.transactionLabel,
                            styles.tabletTransactionLabel,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {t(userLanguage, "transactionHistory.labels.amount")}
                        </Text>
                        <Text
                          style={[
                            styles.transactionText,
                            styles.tabletTransactionText,
                          ]}
                        >
                          {isPositiveTransaction(item.type) ? "+" : "-"}₱{" "}
                          {item.amount.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.tabletTransactionItem}>
                        <Text
                          style={[
                            styles.transactionLabel,
                            styles.tabletTransactionLabel,
                            getRTLStyles(userLanguage),
                          ]}
                        >
                          {t(userLanguage, "transactionHistory.labels.status")}
                        </Text>
                        <Text
                          style={[
                            styles.transactionText,
                            styles.tabletTransactionText,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  // Mobile layout - Modern card design
                  <>
                    <View style={styles.transactionIconContainer}>
                      <Ionicons
                        name={
                          isPositiveTransaction(item.type)
                            ? "arrow-down-circle"
                            : item.type.toLowerCase().includes("sent") ||
                                item.type.toLowerCase().includes("withdraw") ||
                                item.type.toLowerCase().includes("cash out") ||
                                item.type
                                  .toLowerCase()
                                  .includes("transfer money")
                              ? "arrow-up-circle"
                              : "swap-horizontal"
                        }
                        size={32}
                        color={
                          isPositiveTransaction(item.type)
                            ? "#10B981"
                            : Colors.redTheme.background
                        }
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionType} numberOfLines={1}>
                        {item.type}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {item.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                    <View style={styles.transactionAmountContainer}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          isPositiveTransaction(item.type) &&
                            styles.transactionAmountPositive,
                        ]}
                      >
                        {isPositiveTransaction(item.type) ? "+" : "-"}₱
                        {item.amount.toFixed(2)}
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            );
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            isTablet && styles.tabletListContent,
          ]}
        />
      </View>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <View
          style={[
            styles.paginationContainer,
            isTablet && styles.tabletPaginationContainer,
          ]}
        >
          <View
            style={[
              styles.paginationRow,
              isTablet && styles.tabletPaginationRow,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.paginationButton,
                isTablet && styles.tabletPaginationButton,
                currentPage === 1 && styles.disabledButton,
              ]}
              onPress={goToFirstPage}
              disabled={currentPage === 1}
            >
              <Text
                style={[
                  styles.paginationButtonText,
                  isTablet && styles.tabletPaginationButtonText,
                  currentPage === 1 && styles.disabledButtonText,
                  getRTLStyles(userLanguage),
                ]}
              >
                {t(userLanguage, "transactionHistory.pagination.first")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                isTablet && styles.tabletPaginationButton,
                currentPage === 1 && styles.disabledButton,
              ]}
              onPress={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <Text
                style={[
                  styles.paginationButtonText,
                  isTablet && styles.tabletPaginationButtonText,
                  currentPage === 1 && styles.disabledButtonText,
                  getRTLStyles(userLanguage),
                ]}
              >
                {t(userLanguage, "transactionHistory.pagination.previous")}
              </Text>
            </TouchableOpacity>

            <View
              style={[styles.pageNumbers, isTablet && styles.tabletPageNumbers]}
            >
              {Array.from(
                { length: Math.min(isTablet ? 3 : 2, totalPages) },
                (_, i) => {
                  let pageNum;
                  const maxVisible = isTablet ? 3 : 2;
                  const halfVisible = Math.floor(maxVisible / 2);

                  if (totalPages <= maxVisible) {
                    pageNum = i + 1;
                  } else if (currentPage <= halfVisible + 1) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - halfVisible) {
                    pageNum = totalPages - maxVisible + 1 + i;
                  } else {
                    pageNum = currentPage - halfVisible + i;
                  }

                  return (
                    <TouchableOpacity
                      key={pageNum}
                      style={[
                        styles.pageNumberButton,
                        isTablet && styles.tabletPageNumberButton,
                        currentPage === pageNum && styles.activePageButton,
                      ]}
                      onPress={() => setCurrentPage(pageNum)}
                    >
                      <Text
                        style={[
                          styles.pageNumberText,
                          isTablet && styles.tabletPageNumberText,
                          currentPage === pageNum && styles.activePageText,
                        ]}
                      >
                        {pageNum}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                isTablet && styles.tabletPaginationButton,
                currentPage === totalPages && styles.disabledButton,
              ]}
              onPress={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <Text
                style={[
                  styles.paginationButtonText,
                  isTablet && styles.tabletPaginationButtonText,
                  currentPage === totalPages && styles.disabledButtonText,
                  getRTLStyles(userLanguage),
                ]}
              >
                {t(userLanguage, "transactionHistory.pagination.next")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                isTablet && styles.tabletPaginationButton,
                currentPage === totalPages && styles.disabledButton,
              ]}
              onPress={goToLastPage}
              disabled={currentPage === totalPages}
            >
              <Text
                style={[
                  styles.paginationButtonText,
                  isTablet && styles.tabletPaginationButtonText,
                  currentPage === totalPages && styles.disabledButtonText,
                  getRTLStyles(userLanguage),
                ]}
              >
                {t(userLanguage, "transactionHistory.pagination.last")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Transaction Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, isTablet && styles.tabletModalContent]}
          >
            <Text
              style={[
                styles.modalTitle,
                isTablet && styles.tabletModalTitle,
                getRTLStyles(userLanguage),
              ]}
            >
              {t(userLanguage, "transactionHistory.modal.title")}
            </Text>
            <ScrollView
              style={[
                styles.modalScrollView,
                isTablet && styles.tabletModalScrollView,
              ]}
            >
              {selectedTransaction && (
                <View style={styles.detailContainer}>
                  <View
                    style={[
                      styles.detailRow,
                      isTablet && styles.tabletDetailRow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailLabel,
                        isTablet && styles.tabletDetailLabel,
                        getRTLStyles(userLanguage),
                      ]}
                    >
                      {t(userLanguage, "transactionHistory.labels.date")}:
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                      ]}
                    >
                      {selectedTransaction.date.toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.detailRow,
                      isTablet && styles.tabletDetailRow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailLabel,
                        isTablet && styles.tabletDetailLabel,
                        getRTLStyles(userLanguage),
                      ]}
                    >
                      {t(userLanguage, "transactionHistory.labels.type")}:
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                      ]}
                    >
                      {selectedTransaction.type || "N/A"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.detailRow,
                      isTablet && styles.tabletDetailRow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailLabel,
                        isTablet && styles.tabletDetailLabel,
                        getRTLStyles(userLanguage),
                      ]}
                    >
                      {t(userLanguage, "transactionHistory.labels.amount")}:
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                      ]}
                    >
                      {isPositiveTransaction(selectedTransaction.type)
                        ? "+"
                        : "-"}
                      ₱ {selectedTransaction.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.detailRow,
                      isTablet && styles.tabletDetailRow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailLabel,
                        isTablet && styles.tabletDetailLabel,
                        getRTLStyles(userLanguage),
                      ]}
                    >
                      {t(userLanguage, "transactionHistory.labels.description")}
                      :
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                      ]}
                    >
                      {selectedTransaction.description || "N/A"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.detailRow,
                      isTablet && styles.tabletDetailRow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailLabel,
                        isTablet && styles.tabletDetailLabel,
                        getRTLStyles(userLanguage),
                      ]}
                    >
                      {t(userLanguage, "transactionHistory.labels.status")}:
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                      ]}
                    >
                      {selectedTransaction.status || "N/A"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.detailRow,
                      isTablet && styles.tabletDetailRow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailLabel,
                        isTablet && styles.tabletDetailLabel,
                        getRTLStyles(userLanguage),
                      ]}
                    >
                      {t(userLanguage, "transactionHistory.labels.reference")}:
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                      ]}
                    >
                      {selectedTransaction.reference || "N/A"}
                    </Text>
                  </View>
                  {selectedTransaction.fee > 0 && (
                    <View
                      style={[
                        styles.detailRow,
                        isTablet && styles.tabletDetailRow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailLabel,
                          isTablet && styles.tabletDetailLabel,
                          getRTLStyles(userLanguage),
                        ]}
                      >
                        {t(userLanguage, "transactionHistory.labels.fee")}:
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          isTablet && styles.tabletDetailValue,
                        ]}
                      >
                        ₱ {selectedTransaction.fee.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {selectedTransaction.balanceAfter !== "N/A" && (
                    <View
                      style={[
                        styles.detailRow,
                        isTablet && styles.tabletDetailRow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailLabel,
                          isTablet && styles.tabletDetailLabel,
                          getRTLStyles(userLanguage),
                        ]}
                      >
                        {t(
                          userLanguage,
                          "transactionHistory.labels.balanceAfter",
                        )}
                        :
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          isTablet && styles.tabletDetailValue,
                        ]}
                      >
                        ₱ {selectedTransaction.balanceAfter.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeButton, isTablet && styles.tabletCloseButton]}
              onPress={closeModal}
            >
              <Text
                style={[
                  styles.closeButtonText,
                  isTablet && styles.tabletCloseButtonText,
                  getRTLStyles(userLanguage),
                ]}
              >
                {t(userLanguage, "transactionHistory.modal.closeButton")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: "transparent",
  },
  tabletMainContainer: {
    maxWidth: "95%",
    paddingHorizontal: 20,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerIconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  tabletLoadingContainer: {
    minHeight: 300,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.newYearTheme.text,
    fontSize: 16,
    textAlign: "center",
  },
  tabletLoadingText: {
    fontSize: 20,
    marginTop: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  tabletErrorContainer: {
    minHeight: 300,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
  tabletErrorText: {
    fontSize: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
    paddingVertical: 40,
  },
  tabletEmptyContainer: {
    minHeight: 300,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    color: Colors.redTheme.background,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  tabletEmptyText: {
    fontSize: 20,
  },
  emptySubtext: {
    color: Colors.light.icon,
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 20,
  },
  tabletHeader: {
    paddingHorizontal: 20,
    paddingTop: 30,
    marginBottom: 30,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
    marginBottom: 8,
    textAlign: "center",
  },
  tabletHeaderText: {
    fontSize: 28,
    marginBottom: 12,
  },
  pageInfo: {
    fontSize: 14,
    color: Colors.newYearTheme.text,
    opacity: 0.8,
    textAlign: "center",
  },
  tabletPageInfo: {
    fontSize: 18,
  },
  listContainer: {
    flex: 1,
    marginBottom: 20,
  },
  tabletListContainer: {
    marginBottom: 30,
  },
  listContent: {
    paddingHorizontal: 10,
  },
  tabletListContent: {
    paddingHorizontal: 20,
  },
  tabletRow: {
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  transactionBox: {
    flexDirection: "row",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  tabletTransactionBox: {
    flexDirection: "column",
    width: "48%",
    height: 120,
    padding: 20,
    marginBottom: 15,
    borderRadius: 15,
  },
  tabletTransactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.redTheme.background + "10",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
    justifyContent: "center",
  },
  transactionType: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  transactionAmountContainer: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  transactionAmountPositive: {
    color: "#10B981",
  },
  transactionItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    height: "100%",
  },
  tabletTransactionItem: {
    flex: 1,
    alignItems: "flex-start",
    paddingHorizontal: 5,
  },
  transactionLabel: {
    fontSize: 11,
    color: Colors.newYearTheme.text,
    opacity: 0.7,
    marginBottom: 4,
    fontWeight: "500",
    textAlign: "center",
  },
  tabletTransactionLabel: {
    fontSize: 14,
    textAlign: "left",
    marginBottom: 6,
  },
  transactionText: {
    color: Colors.newYearTheme.text,
    textAlign: "center",
    fontWeight: "600",
    flexWrap: "wrap",
    textAlignVertical: "center",
  },
  tabletTransactionText: {
    fontSize: 16,
    textAlign: "left",
  },
  paginationContainer: {
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  tabletPaginationContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap",
  },
  tabletPaginationRow: {
    justifyContent: "center",
  },
  paginationButton: {
    backgroundColor: Colors.redTheme.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 44,
    alignItems: "center",
    marginHorizontal: 4,
  },
  tabletPaginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 60,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: Colors.light.icon,
    opacity: 0.5,
  },
  paginationButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  tabletPaginationButtonText: {
    fontSize: 16,
  },
  disabledButtonText: {
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 2,
  },
  tabletPageNumbers: {
    marginHorizontal: 6,
  },
  pageNumberButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: Colors.light.background,
    minWidth: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  tabletPageNumberButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 6,
    minWidth: 48,
  },
  activePageButton: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background,
  },
  pageNumberText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
  tabletPageNumberText: {
    fontSize: 16,
  },
  activePageText: {
    color: "white",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  tabletModalContent: {
    width: "70%",
    maxHeight: "85%",
    padding: 30,
    borderRadius: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: Colors.newYearTheme.text,
  },
  tabletModalTitle: {
    fontSize: 26,
    marginBottom: 25,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  tabletModalScrollView: {
    maxHeight: 500,
  },
  detailContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  tabletDetailRow: {
    paddingVertical: 15,
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.newYearTheme.text,
    flex: 1,
  },
  tabletDetailLabel: {
    fontSize: 20,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.newYearTheme.text,
    flex: 1,
    textAlign: "right",
  },
  tabletDetailValue: {
    fontSize: 20,
  },
  closeButton: {
    backgroundColor: Colors.redTheme.background,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  tabletCloseButton: {
    padding: 20,
    borderRadius: 12,
    marginTop: 15,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  tabletCloseButtonText: {
    fontSize: 20,
  },
});

export default TransacHistory;
