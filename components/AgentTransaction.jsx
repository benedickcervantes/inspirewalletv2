import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
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
import { getAuth } from "firebase/auth";
import { app } from "../configs/firebase"; // Adjust the import path if necessary
import { Colors } from "../constants/Colors";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";

export default function TransactionDisplay({ userId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [userLanguage, setUserLanguage] = useState("english");
  const windowWidth = Dimensions.get("window").width;

  // Responsive logic for tablet detection
  const isTablet = windowWidth >= 768;
  const itemsPerPage = isTablet ? 20 : 10;

  const fetchUserLanguage = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        const db = getFirestore(app);
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const db = getFirestore(app);
    const transactionsRef = collection(
      db,
      "users",
      userId,
      "agentTransactions"
    );
    const q = query(transactionsRef, orderBy("date", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
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
            referredClient: data.referredClient || "N/A",
            type: data.type,
            date: date,
            amount: amount,
            grossAmount: data.grossAmount || 0,
            taxApplied: data.taxApplied || 0,
            percentage: data.percentage || 0,
          });
        });
        setTransactions(fetchedTransactions);
        setTotalPages(Math.ceil(fetchedTransactions.length / itemsPerPage));
        setLoading(false);
      },
      (err) => {
        // console.error("Error fetching transactions:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [userId, itemsPerPage]);

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
          {t(userLanguage, "agentTransaction.content.loadingText")}
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
          {t(userLanguage, "agentTransaction.content.errorText").replace(
            "{error}",
            error
          )}
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
          {t(userLanguage, "agentTransaction.content.emptyText")}
        </Text>
        <Text style={styles.emptySubtext}>
          Your commission history will appear here
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.mainContainer, isTablet && styles.tabletMainContainer]}
    >
      {/* Transaction List */}
      <View
        style={[styles.listContainer, isTablet && styles.tabletListContainer]}
      >
        <FlatList
          data={getCurrentPageTransactions()}
          keyExtractor={(item) => item.id}
          numColumns={isTablet ? 2 : 1}
          key={isTablet ? "tablet" : "mobile"}
          columnWrapperStyle={isTablet ? styles.tabletRow : null}
          renderItem={({ item }) => {
            // Calculate font size based on text length and device
            const getFontSize = (text) => {
              if (!text) return isTablet ? 16 : 13;
              const baseFontSize = isTablet ? 16 : 13;
              if (text.length <= 8) return baseFontSize;
              if (text.length <= 12) return baseFontSize - 1;
              if (text.length <= 16) return baseFontSize - 2;
              return baseFontSize - 3;
            };

            const displayText =
              item.referredClient && item.referredClient !== "N/A"
                ? item.referredClient
                : item.type || "N/A";

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
                          ]}
                        >
                          {item.referredClient && item.referredClient !== "N/A"
                            ? t(userLanguage, "agentTransaction.content.client")
                            : t(userLanguage, "agentTransaction.content.type")}
                        </Text>
                        <Text
                          style={[
                            styles.transactionText,
                            { fontSize: getFontSize(displayText) },
                            styles.tabletTransactionText,
                          ]}
                        >
                          {displayText}
                        </Text>
                      </View>
                      <View style={styles.tabletTransactionItem}>
                        <Text
                          style={[
                            styles.transactionLabel,
                            styles.tabletTransactionLabel,
                          ]}
                        >
                          {t(userLanguage, "agentTransaction.content.date")}
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
                          ]}
                        >
                          {t(userLanguage, "agentTransaction.content.amount")}
                        </Text>
                        <Text
                          style={[
                            styles.transactionText,
                            styles.tabletTransactionText,
                            item.amount < 0 && styles.negativeAmount,
                          ]}
                        >
                          {item.amount < 0 ? "-" : "+"}PHP{" "}
                          {Math.abs(item.amount).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.tabletTransactionItem}>
                        <Text
                          style={[
                            styles.transactionLabel,
                            styles.tabletTransactionLabel,
                          ]}
                        >
                          {t(
                            userLanguage,
                            "agentTransaction.content.commission"
                          )}
                        </Text>
                        <Text
                          style={[
                            styles.transactionText,
                            styles.tabletTransactionText,
                          ]}
                        >
                          {item.percentage}%
                        </Text>
                      </View>
                    </View>
                    {item.grossAmount > 0 && (
                      <View style={styles.tabletTransactionRow}>
                        <View style={styles.tabletTransactionItem}>
                          <Text
                            style={[
                              styles.transactionLabel,
                              styles.tabletTransactionLabel,
                            ]}
                          >
                            {t(userLanguage, "agentTransaction.content.gross")}
                          </Text>
                          <Text
                            style={[
                              styles.transactionText,
                              styles.tabletTransactionText,
                            ]}
                          >
                            PHP {item.grossAmount.toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.tabletTransactionItem}>
                          <Text
                            style={[
                              styles.transactionLabel,
                              styles.tabletTransactionLabel,
                            ]}
                          >
                            {t(userLanguage, "agentTransaction.content.tax")}
                          </Text>
                          <Text
                            style={[
                              styles.transactionText,
                              styles.tabletTransactionText,
                            ]}
                          >
                            PHP {item.taxApplied.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  // Mobile layout - Modern card design
                  <>
                    <View style={styles.transactionIconContainer}>
                      <Ionicons
                        name={item.amount < 0 ? "arrow-up-circle" : "cash"}
                        size={32}
                        color={
                          item.amount < 0
                            ? Colors.redTheme.background
                            : "#10B981"
                        }
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionType} numberOfLines={1}>
                        {displayText}
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
                          item.amount < 0 && styles.transactionAmountNegative,
                        ]}
                      >
                        {item.amount < 0 ? "-" : "+"}PHP{" "}
                        {Math.abs(item.amount).toFixed(2)}
                      </Text>
                      {item.percentage > 0 && (
                        <Text style={styles.transactionPercentage}>
                          {item.percentage}%
                        </Text>
                      )}
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
                ]}
              >
                {t(userLanguage, "agentTransaction.content.firstPage")}
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
                ]}
              >
                {t(userLanguage, "agentTransaction.content.previousPage")}
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
                }
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
                ]}
              >
                {t(userLanguage, "agentTransaction.content.nextPage")}
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
                ]}
              >
                {t(userLanguage, "agentTransaction.content.lastPage")}
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
              {t(userLanguage, "agentTransaction.modal.title")}
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
                      {t(userLanguage, "agentTransaction.modal.date")}
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
                      {t(
                        userLanguage,
                        "agentTransaction.modal.typeOfTransaction"
                      )}
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
                      {t(userLanguage, "agentTransaction.modal.amount")}
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                        selectedTransaction.amount < 0 && styles.negativeAmount,
                      ]}
                    >
                      {selectedTransaction.amount < 0 ? "-" : "+"}PHP{" "}
                      {Math.abs(selectedTransaction.amount).toFixed(2)}
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
                      {t(userLanguage, "agentTransaction.modal.grossAmount")}
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                      ]}
                    >
                      PHP {selectedTransaction.grossAmount.toFixed(2)}
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
                      {t(userLanguage, "agentTransaction.modal.taxApplied")}
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                      ]}
                    >
                      PHP {selectedTransaction.taxApplied.toFixed(2)}
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
                      {t(userLanguage, "agentTransaction.modal.commission")}
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                      ]}
                    >
                      {selectedTransaction.percentage}%
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
                      {t(userLanguage, "agentTransaction.modal.referralName")}
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isTablet && styles.tabletDetailValue,
                      ]}
                    >
                      {selectedTransaction.referredClient || "N/A"}
                    </Text>
                  </View>
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
                {t(userLanguage, "agentTransaction.content.close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
    height: "auto",
    minHeight: 140,
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
    backgroundColor: "#10B981" + "15",
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
    color: "#10B981",
    marginBottom: 2,
  },
  transactionAmountNegative: {
    color: Colors.redTheme.background,
  },
  negativeAmount: {
    color: Colors.redTheme.background,
  },
  transactionPercentage: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.icon,
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
    fontSize: 13,
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
