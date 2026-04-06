import { THEME_ORANGE } from "@/constants/theme";
import { subscribeToNewTicketMessage, subscribeToTicketCreated } from "@/lib/ticketingEvents";
import { listUserTickets, type Ticket } from "@/lib/tickets";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../../context/LanguageContext";
import TicketDetail from "./TicketDetail";

import ActivityModal from '../components/ActivityModal';
interface TicketListProps {
  accessToken: string;
  onTicketSelected?: (selected: boolean) => void;
  refreshTrigger?: number;
}

function TicketList({ accessToken, onTicketSelected, refreshTrigger }: TicketListProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { t, language } = useLanguage();

  const loadTickets = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (page === 1) setLoading(true);
    try {
      const data = await listUserTickets(accessToken, {
        page,
        limit: 10,
      });
      setTickets(data.tickets);
      setTotalPages(Math.max(1, data.pagination?.pages ?? 1));
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) {
      void loadTickets();
    }
  }, [refreshTrigger, loadTickets]);

  // Setup WebSocket listeners for real-time ticket updates
  useEffect(() => {
    if (!accessToken) return;

    const unsubscribe = subscribeToNewTicketMessage(() => {
      void loadTickets();
    });
    const unsubscribeCreated = subscribeToTicketCreated(() => {
      void loadTickets();
    });

    return () => {
      unsubscribe();
      unsubscribeCreated();
    };
  }, [accessToken, loadTickets]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (page !== 1) {
      setPage(1);
      return;
    }
    void loadTickets();
  }, [page, loadTickets]);

  /** Soft chips aligned with TicketCreation / Support — avoids solid orange on orange clash with priority */
  const getStatusBadgeStyle = (status: string) => {
    switch (String(status).toUpperCase()) {
      case "OPEN":
        return { bg: "rgba(225, 88, 22, 0.12)", text: "#C2410C" };
      case "IN_PROGRESS":
        return { bg: "rgba(245, 158, 11, 0.12)", text: "#B45309" };
      case "RESOLVED":
        return { bg: "rgba(34, 197, 94, 0.12)", text: "#15803D" };
      case "CLOSED":
        return { bg: "rgba(107, 114, 128, 0.12)", text: "#4B5563" };
      default:
        return { bg: "rgba(225, 88, 22, 0.12)", text: "#C2410C" };
    }
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (String(priority).toUpperCase()) {
      case "HIGH":
        return { bg: "rgba(239, 68, 68, 0.12)", text: "#DC2626" };
      case "MEDIUM":
        return { bg: "rgba(245, 158, 11, 0.12)", text: "#B45309" };
      case "LOW":
        return { bg: "rgba(34, 197, 94, 0.12)", text: "#16A34A" };
      default:
        return { bg: "rgba(59, 130, 246, 0.12)", text: "#2563EB" };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === "ar" ? "ar-SA" : language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : "en-US";
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={THEME_ORANGE}
          colors={Platform.OS === "android" ? [THEME_ORANGE] : undefined}
        />
      }
    >
      {loading && !tickets.length ? (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <View key={idx} style={styles.skeletonCard}>
              <View style={styles.skeletonLineLong} />
              <View style={styles.skeletonLineMedium} />
              <View style={styles.skeletonFooter}>
                <View style={styles.skeletonBadge} />
                <View style={styles.skeletonDate} />
              </View>
            </View>
          ))}
        </View>
      ) : tickets.length > 0 ? (
        <View style={styles.ticketsList}>
          {tickets.map((ticket: Ticket) => {
            const statusStyle = getStatusBadgeStyle(ticket.status);
            const priorityStyle = getPriorityBadgeStyle(ticket.priority);
            return (
              <TouchableOpacity
                key={ticket.id}
                style={styles.ticketCard}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedTicket(ticket);
                  onTicketSelected?.(true);
                }}
              >
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketTitle} numberOfLines={2}>
                    {ticket.title}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {t(`tickets.status.${ticket.status}`)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ticketDescription} numberOfLines={2}>
                  {ticket.description ?? ""}
                </Text>

                <View style={styles.ticketFooter}>
                  <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
                    <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
                      {t(`tickets.priority.${ticket.priority}`)}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(ticket.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="ticket-outline" size={56} color="#CCC" />
          <Text style={styles.emptyText}>{t("tickets.noTickets")}</Text>
          <Text style={styles.emptySubText}>{t("tickets.getStarted")}</Text>
        </View>
      )}

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page === 1}
            onPress={() => setPage(page - 1)}
            style={[styles.paginationButton, page === 1 && styles.disabled]}
          >
            <Text style={styles.paginationText}>{t("tickets.previous")}</Text>
          </TouchableOpacity>

          <Text style={styles.pageIndicator}>
            {t("tickets.pageIndicator")
              .replace("{page}", page.toString())
              .replace("{total}", totalPages.toString())}
          </Text>

          <TouchableOpacity
            disabled={page === totalPages}
            onPress={() => setPage(page + 1)}
            style={[
              styles.paginationButton,
              page === totalPages && styles.disabled,
            ]}
          >
            <Text style={styles.paginationText}>{t("tickets.next")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>

    <ActivityModal
      visible={!!selectedTicket}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        setSelectedTicket(null);
        onTicketSelected?.(false);
      }}
    >
      {selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          accessToken={accessToken}
          onBack={() => {
            setSelectedTicket(null);
            onTicketSelected?.(false);
            loadTickets();
          }}
        />
      )}
    </ActivityModal>
    </>
  );
}

export default TicketList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8E8E8",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 96,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  skeletonLineLong: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ECECEC",
    width: "100%",
  },
  skeletonLineMedium: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ECECEC",
    width: "75%",
  },
  skeletonFooter: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonBadge: {
    width: 72,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ECECEC",
  },
  skeletonDate: {
    width: 80,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ECECEC",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  ticketsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 0,
  },
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 12,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    minWidth: 0,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  ticketDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 14,
    lineHeight: 22,
  },
  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  dateText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 14,
  },
  paginationButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: THEME_ORANGE,
    borderRadius: 12,
    minWidth: 96,
    alignItems: "center",
  },
  paginationText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  pageIndicator: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
});
