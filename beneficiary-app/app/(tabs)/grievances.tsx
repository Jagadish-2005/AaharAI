import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { api, getUser } from '../../api';
import { useResponsive } from '../../hooks/useResponsive';

export default function GrievancesScreen() {
  const [issueType, setIssueType] = useState('stock_unavailability');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const user = getUser();
  const { isMobile, contentMaxWidth, screenPadding } = useResponsive();

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description of your issue.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/grievances', {
        beneficiary_id: user.id,
        vendor_id: user.vendorId,
        issue_type: issueType,
        description: description
      });
      Alert.alert('Success', 'Your grievance has been submitted successfully to the authorities.');
      setDescription('');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to submit grievance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const issueTypes = [
    { key: 'under_weighing', label: 'Under Weighing' },
    { key: 'stock_unavailability', label: 'Stock Unavailable' },
    { key: 'overcharging', label: 'Overcharging' },
    { key: 'other', label: 'Other' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { padding: screenPadding },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.innerContainer, { maxWidth: contentMaxWidth }]}>
          <Text style={[styles.title, { fontSize: isMobile ? 20 : 24 }]}>
            Report an Issue
          </Text>
          <Text style={[styles.subtitle, { fontSize: isMobile ? 13 : 14 }]}>
            Let us know if you faced any problems while collecting your ration.
          </Text>

          <View style={[styles.card, { padding: isMobile ? 16 : 24 }]}>
            <Text style={styles.label}>Issue Type</Text>
            <View style={styles.typeSelector}>
              {issueTypes.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.typeBtn,
                    issueType === key && styles.typeBtnActive,
                    { paddingVertical: isMobile ? 6 : 8, paddingHorizontal: isMobile ? 10 : 14 },
                  ]}
                  onPress={() => setIssueType(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typeText,
                      issueType === key && styles.typeTextActive,
                      { fontSize: isMobile ? 12 : 13 },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  padding: isMobile ? 12 : 15,
                  fontSize: isMobile ? 14 : 15,
                  height: isMobile ? 100 : 130,
                },
              ]}
              multiline
              numberOfLines={4}
              placeholder="Please describe what happened..."
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { padding: isMobile ? 14 : 16 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.submitBtnText, { fontSize: isMobile ? 15 : 16 }]}>
                  Submit Report
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f3f4f6' },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontWeight: 'bold', color: '#111827', marginTop: 10 },
  subtitle: { color: '#6b7280', marginTop: 5, marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeBtn: {
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeBtnActive: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  typeText: { color: '#4b5563' },
  typeTextActive: { color: '#065f46', fontWeight: 'bold' },
  textArea: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    color: '#111827',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
    outlineStyle: 'none',
  } as any,
  submitBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
});
