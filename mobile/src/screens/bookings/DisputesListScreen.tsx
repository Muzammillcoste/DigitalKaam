import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../utils/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  Typography,
  Spacing,
  Radius,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import { formatDateTime, formatPrice } from '@/utils/format';

interface DisputeRow {
  id: string;
  booking_id: string;
  user_id: string;
  provider_id: string;
  type: string;
  status: string;
  description?: string | null;
  resolution?: string | null;
  refund_amount?: number | null;
  created_at: string;
  providers?: { name?: string; service_type?: string } | null;
  user_profiles?: { full_name?: string; phone?: string; home_area?: string } | null;
  bookings?: { user_request?: string; scheduled_time?: string; price?: number } | null;
}

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  no_show: 'Provider No-Show',
  quality: 'Poor Quality',
  price: 'Price Dispute',
  cancellation: 'Cancellation',
  overrun: 'Time Overrun',
  other: 'Other Issue',
};

const STATUS_COLOR_MAP = (c: ColorPalette): Record<string, string> => ({
  open: c.warning,
  under_review: c.warning,
  resolved: c.success,
  rejected: c.error,
  escalated: c.error,
});

function prettify(value: string): string {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function DisputesListScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { userId, providerProfile, isProviderMode } = useAuthStore();
  const { showToast } = useUIStore();

  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDisputes = useCallback(async () => {
    try {
      let rows: DisputeRow[] = [];
      if (isProviderMode && providerProfile?.id) {
        rows = (await api.dispute.listByProvider(providerProfile.id)) ?? [];
      } else if (userId) {
        rows = (await api.dispute.listByUser(userId)) ?? [];
      }
      setDisputes(rows);
    } catch (err) {
      console.error('Failed to load disputes:', err);
      showToast('Failed to load disputes', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isProviderMode, providerProfile?.id, userId, showToast]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDisputes();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={disputes}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons
            name="shield-checkmark-outline"
            size={48}
            color={c.textDisabled}
          />
          <Text style={styles.emptyTitle}>No disputes</Text>
          <Text style={styles.emptySubtitle}>
            {isProviderMode
              ? 'No customer disputes have been filed against your jobs.'
              : "You haven't reported any issues yet."}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const statusColors = STATUS_COLOR_MAP(c);
        const status = item.status ?? 'open';
        const accent = statusColors[status] ?? c.warning;
        const typeLabel =
          DISPUTE_TYPE_LABELS[item.type] ?? prettify(item.type ?? 'issue');
        const counterpartyLabel = isProviderMode ? 'Customer' : 'Provider';
        const counterpartyName = isProviderMode
          ? item.user_profiles?.full_name ?? 'Customer'
          : item.providers?.name ?? 'Provider';
        const scheduledAt = item.bookings?.scheduled_time;
        const refund = item.refund_amount ?? 0;

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.typeText}>{typeLabel}</Text>
                <Text style={styles.dateText}>
                  Filed {formatDateTime(item.created_at)}
                </Text>
              </View>
              <View
                style={[styles.statusBadge, { backgroundColor: `${accent}1A` }]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: accent }]}
                />
                <Text style={[styles.statusText, { color: accent }]}>
                  {prettify(status)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Ionicons
                name="person-outline"
                size={14}
                color={c.textSecondary}
              />
              <Text style={styles.metaText}>
                {counterpartyLabel}: {counterpartyName}
              </Text>
            </View>

            {!!scheduledAt && (
              <View style={styles.metaRow}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={c.textSecondary}
                />
                <Text style={styles.metaText}>
                  Scheduled {formatDateTime(scheduledAt)}
                </Text>
              </View>
            )}

            {!!item.bookings?.user_request && (
              <View style={styles.requestBlock}>
                <Text style={styles.requestLabel}>Service Request</Text>
                <Text style={styles.requestText} numberOfLines={2}>
                  {item.bookings.user_request}
                </Text>
              </View>
            )}

            {!!item.description && (
              <View style={styles.descBlock}>
                <Text style={styles.descLabel}>Your description</Text>
                <Text style={styles.descText}>{item.description}</Text>
              </View>
            )}

            {!!item.resolution && (
              <View style={styles.resolutionBlock}>
                <Ionicons name="sparkles-outline" size={14} color={c.primary} />
                <Text style={styles.resolutionText} numberOfLines={3}>
                  {item.resolution}
                </Text>
              </View>
            )}

            {refund > 0 && (
              <View style={styles.refundRow}>
                <Text style={styles.refundLabel}>Refund</Text>
                <Text style={styles.refundValue}>{formatPrice(refund)}</Text>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing['2xl'] },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.background,
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing['2xl'],
      gap: Spacing.sm,
      marginTop: Spacing['2xl'],
    },
    emptyTitle: { ...Typography.h4, color: c.text },
    emptySubtitle: {
      ...Typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: Spacing.base,
      borderWidth: 1,
      borderColor: c.border,
      gap: Spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    typeText: { ...Typography.bodyLarge, fontWeight: '700', color: c.text },
    dateText: { ...Typography.caption, color: c.textSecondary, marginTop: 2 },

    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.full,
      gap: 6,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { ...Typography.caption, fontWeight: '700' },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    metaText: { ...Typography.body, color: c.textSecondary },

    requestBlock: {
      borderTopWidth: 1,
      borderTopColor: c.divider,
      paddingTop: Spacing.sm,
      gap: 2,
    },
    requestLabel: { ...Typography.caption, color: c.textSecondary },
    requestText: { ...Typography.body, color: c.text, fontStyle: 'italic' },

    descBlock: { gap: 2 },
    descLabel: { ...Typography.caption, color: c.textSecondary },
    descText: { ...Typography.body, color: c.text },

    resolutionBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.xs,
      backgroundColor: `${c.primary}10`,
      padding: Spacing.sm,
      borderRadius: Radius.md,
    },
    resolutionText: { ...Typography.body, color: c.text, flex: 1 },

    refundRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: c.divider,
      paddingTop: Spacing.sm,
    },
    refundLabel: { ...Typography.caption, color: c.textSecondary, fontWeight: '600' },
    refundValue: { ...Typography.bodyLarge, fontWeight: '800', color: c.success },
  });
