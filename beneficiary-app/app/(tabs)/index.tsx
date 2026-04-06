import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, TouchableOpacity, Modal, Pressable, RefreshControl } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { api, getUser, clearAuth } from '../../api';
import { Redirect, useRouter, useFocusEffect } from 'expo-router';
import { useResponsive } from '../../hooks/useResponsive';

export default function DashboardScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const user = getUser();
  const router = useRouter();
  const { isMobile, contentMaxWidth, screenPadding, scale } = useResponsive();

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get(`/beneficiaries/${user.id}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Fetch fresh data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Declarative redirect — waits for layout to mount before navigating
  if (!user) {
    return <Redirect href="/login" />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!data) return <Text style={{ padding: 20 }}>Failed to load data.</Text>;

  const { beneficiary, entitlements, vendorStock } = data;

  const handleLogout = () => {
    setProfileVisible(false);
    clearAuth();
    router.replace('/login');
  };

  const getIconName = (name: string) => {
    switch (name) {
      case 'Rice': return 'leaf';
      case 'Wheat': return 'pagelines';
      case 'Kerosene': return 'tint';
      case 'Sugar': return 'cube';
      case 'Dal': return 'shopping-bag';
      default: return 'shopping-bag';
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { padding: screenPadding },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
      >
        <View style={[styles.innerContainer, { maxWidth: contentMaxWidth }]}>
          {/* Header Profile Section */}
          <View style={[styles.profileCard, { padding: isMobile ? 16 : 20 }]}>
            <View style={styles.profileInfo}>
              <Text style={[styles.greeting, { fontSize: isMobile ? 20 : 24 * scale }]}>
                Hello, {beneficiary.name}!
              </Text>
              <Text style={[styles.rationId, { fontSize: isMobile ? 13 : 14 }]}>
                Card ID: {beneficiary.ration_card_no}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setProfileVisible(true)}
              activeOpacity={0.7}
            >
              <FontAwesome name="user-circle" size={isMobile ? 40 : 50} color="#10b981" />
            </TouchableOpacity>
          </View>

          {/* Monthly Ration Entitlement */}
          <Text style={[styles.sectionTitle, { fontSize: isMobile ? 16 : 18 }]}>
            This Month's Ration
          </Text>
          <View style={[styles.quotaCard, { padding: isMobile ? 16 : 20 }]}>
            {entitlements.map((e: any, idx: number) => {
              const isCollected = e.collectedQty >= e.entitledQty;
              const progress = e.entitledQty > 0 ? e.collectedQty / e.entitledQty : 0;

              return (
                <View
                  style={[
                    styles.quotaItem,
                    {
                      width: isMobile ? '45%' : '30%',
                      marginBottom: isMobile ? 16 : 12,
                    },
                  ]}
                  key={idx}
                >
                  <View style={[
                    styles.iconCircle,
                    { backgroundColor: isCollected ? '#dcfce7' : '#fef3c7' },
                  ]}>
                    <FontAwesome
                      name={getIconName(e.commodityName)}
                      size={isMobile ? 18 : 22}
                      color={isCollected ? '#16a34a' : '#d97706'}
                    />
                  </View>
                  <Text style={[styles.itemTitle, { fontSize: isMobile ? 13 : 14 }]}>
                    {e.commodityName}
                  </Text>
                  <Text style={[styles.itemAmount, { fontSize: isMobile ? 15 : 16 }]}>
                    {e.entitledQty} {e.unit}
                  </Text>
                  {/* Progress bar */}
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(progress * 100, 100)}%` as any,
                          backgroundColor: isCollected ? '#16a34a' : '#f59e0b',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.statusText, { color: isCollected ? '#16a34a' : '#d97706' }]}>
                    {isCollected ? '✓ Collected' : `${e.remainingQty} ${e.unit} left`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Nearest Shop & Vendor Stock */}
          <Text style={[styles.sectionTitle, { fontSize: isMobile ? 16 : 18 }]}>
            Your Assigned Vendor
          </Text>
          <View style={[styles.shopCard, { padding: isMobile ? 16 : 20 }]}>
            <View style={styles.shopDetails}>
              <Text style={[styles.shopName, { fontSize: isMobile ? 15 : 16 }]}>
                {beneficiary.shop_name}
              </Text>
              <Text style={styles.shopStatusActive}>
                {beneficiary.vendor_name} ({beneficiary.vendor_code})
              </Text>
              <Text style={styles.stockLabel}>Shop Live Stock:</Text>
              {vendorStock.map((vs: any, idx: number) => (
                <Text key={idx} style={styles.stockItem}>
                  • {vs.commodity_name}: {vs.remaining_qty} {vs.unit} left
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={profileVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setProfileVisible(false)}
        >
          <Pressable
            style={[styles.modalContent, { maxWidth: contentMaxWidth, width: isMobile ? '92%' : '100%' }]}
            onPress={() => {}}
          >
            {/* Profile Header */}
            <View style={styles.modalHeader}>
              <View style={styles.avatarCircle}>
                <FontAwesome name="user" size={36} color="#fff" />
              </View>
              <Text style={styles.modalName}>{beneficiary.name}</Text>
              <Text style={styles.modalCardType}>{beneficiary.card_type} Card Holder</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Details Rows */}
            <View style={styles.detailRow}>
              <FontAwesome name="id-card" size={16} color="#6b7280" />
              <Text style={styles.detailLabel}>Card ID</Text>
              <Text style={styles.detailValue}>{beneficiary.ration_card_no}</Text>
            </View>
            <View style={styles.detailRow}>
              <FontAwesome name="credit-card" size={16} color="#6b7280" />
              <Text style={styles.detailLabel}>Card Type</Text>
              <Text style={[styles.detailValue, styles.cardTypeBadge]}>{beneficiary.card_type}</Text>
            </View>
            <View style={styles.detailRow}>
              <FontAwesome name="phone" size={16} color="#6b7280" />
              <Text style={styles.detailLabel}>Mobile No.</Text>
              <Text style={styles.detailValue}>{beneficiary.phone}</Text>
            </View>
            <View style={styles.detailRow}>
              <FontAwesome name="users" size={16} color="#6b7280" />
              <Text style={styles.detailLabel}>Family Size</Text>
              <Text style={styles.detailValue}>{beneficiary.family_size} members</Text>
            </View>
            <View style={styles.detailRow}>
              <FontAwesome name="map-marker" size={16} color="#6b7280" />
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{beneficiary.address}</Text>
            </View>
            <View style={styles.detailRow}>
              <FontAwesome name="shopping-cart" size={16} color="#6b7280" />
              <Text style={styles.detailLabel}>Vendor</Text>
              <Text style={styles.detailValue}>{beneficiary.shop_name}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <FontAwesome name="sign-out" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.logoutBtnText}>Log Out</Text>
            </TouchableOpacity>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setProfileVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scrollContent: {
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 25,
  },
  profileInfo: { flex: 1 },
  greeting: { fontWeight: 'bold', color: '#111827' },
  rationId: { color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontWeight: 'bold', color: '#374151', marginBottom: 15 },
  quotaCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 25,
    justifyContent: 'center',
  },
  quotaItem: { alignItems: 'center' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: { color: '#4b5563', marginTop: 6 },
  itemAmount: { fontWeight: 'bold', color: '#111827', marginTop: 2 },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  shopCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 30,
  },
  shopDetails: { flex: 1 },
  shopName: { fontWeight: 'bold', color: '#111827' },
  shopStatusActive: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  stockLabel: {
    marginTop: 15,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 5,
  },
  stockItem: { color: '#6b7280', fontSize: 13 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCardType: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cardTypeBadge: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
    fontSize: 13,
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeBtnText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
});
