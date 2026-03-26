import { subscribeToNewTicketMessage, subscribeToTicketCreated } from "@/lib/ticketingEvents";
import { listUserTickets, type Ticket } from "@/lib/tickets";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

  // Debug selected ticket changes
  useEffect(() => {
    console.log("[TicketList] selectedTicket changed:", selectedTicket ? selectedTicket.id : "null");
  }, [selectedTicket]);

  useEffect(() => {
    loadTickets();
  }, [page]);

  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) loadTickets();
  }, [refreshTrigger]);

  useFocusEffect(
    React.useCallback(() => {
      loadTickets();
    }, [])
  );

  // Setup WebSocket listeners for real-time ticket updates
  useEffect(() => {
    if (!accessToken) return;

    const unsubscribe = subscribeToNewTicketMessage(() => {
      loadTickets();
    });
    const unsubscribeCreated = subscribeToTicketCreated(() => {
      loadTickets();
    });

    return () => {
      unsubscribe();
      unsubscribeCreated();
    };
  }, [accessToken]);

  const loadTickets = async () => {
    if (page === 1) setLoading(true);
    try {
      const data = await listUserTickets(accessToken, {
        page,
        limit: 10,
      });
      setTickets(data.tickets);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadTickets();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "#3b82f6";
      case "IN_PROGRESS":
        return "#f97316";
      case "RESOLVED":
        return "#22c55e";
      case "CLOSED":
        return "#6b7280";
      default:
        return "#3b82f6";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "#ef4444";
      case "MEDIUM":
        return "#f97316";
      case "LOW":
        return "#22c55e";
      default:
        return "#3b82f6";
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
          {tickets.map((ticket: Ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={styles.ticketCard}
              onPress={() => {
                console.log("[TicketList] Ticket clicked:", ticket.id, ticket.title);
                setSelectedTicket(ticket);
                onTicketSelected?.(true);
                console.log("[TicketList] Selected ticket set");
              }}
            >
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketTitle} numberOfLines={2}>
                  {ticket.title}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(ticket.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{t(`tickets.status.${ticket.status}`)}</Text>
                </View>
              </View>

              <Text style={styles.ticketDescription} numberOfLines={2}>
                {ticket.description}
              </Text>

              <View style={styles.ticketFooter}>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(ticket.priority) },
                  ]}
                >
                  <Text style={styles.priorityText}>{t(`tickets.priority.${ticket.priority}`)}</Text>
                </View>
                <Text style={styles.dateText}>
                  {formatDate(ticket.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>{t("tickets.noTickets")}</Text>
          <Text style={styles.emptySubText}>
            {t("tickets.getStarted")}
          </Text>
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
    backgroundColor: "#f5f5f5",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  skeletonContainer: {
    padding: 12,
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 10,
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
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
  },
  ticketsList: {
    padding: 12,
    gap: 12,
  },
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  ticketDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  paginationText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  pageIndicator: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  disabled: {
    opacity: 0.5,
  },
});
