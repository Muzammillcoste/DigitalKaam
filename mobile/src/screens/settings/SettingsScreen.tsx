import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  useSettingsStore,
  type ColorMode,
  type Language,
} from '@/store/settingsStore';
import { useTranslation } from '@/i18n';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/theme';
import type { SettingsScreenProps } from '@/navigation/types';

type SheetKind = 'color' | 'language' | null;

export function SettingsScreen({ navigation }: SettingsScreenProps<'Settings'>) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const { logout } = useAuthStore();
  const { showToast } = useUIStore();
  const { language, colorMode, setLanguage, setColorMode } = useSettingsStore();

  const [sheet, setSheet] = useState<SheetKind>(null);

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';
  const chevron = isRTL ? 'chevron-back' : 'chevron-forward';

  const colorModeLabel: Record<ColorMode, string> = {
    light: t('settings.colorMode.light'),
    dark: t('settings.colorMode.dark'),
    system: t('settings.colorMode.system'),
  };
  const languageLabel: Record<Language, string> = {
    en: t('settings.language.english'),
    ur: t('settings.language.urdu'),
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          showToast(t('settings.logoutSuccess'), 'success');
        },
      },
    ]);
  };

  const Row = ({
    icon,
    label,
    onPress,
    value,
    danger,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    value?: string;
    danger?: boolean;
  }) => (
    <Pressable
      style={[styles.row, { flexDirection: rowDir }]}
      onPress={onPress}
    >
      <View
        style={[styles.rowIcon, danger && styles.rowIconDanger]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? Colors.error : Colors.primary}
        />
      </View>
      <Text
        style={[
          styles.rowLabel,
          { textAlign: align },
          danger && styles.rowLabelDanger,
        ]}
      >
        {label}
      </Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {!danger && (
        <Ionicons name={chevron} size={16} color={Colors.textDisabled} />
      )}
    </Pressable>
  );

  const colorOptions: ColorMode[] = ['light', 'dark', 'system'];
  const langOptions: Language[] = ['en', 'ur'];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.base,
          paddingBottom: insets.bottom + Spacing['2xl'],
        }}
      >
        <View style={styles.group}>
          <Row
            icon="person-outline"
            label={t('settings.profile')}
            onPress={() => navigation.navigate('Profile')}
          />
          <Row
            icon="shield-checkmark-outline"
            label={t('settings.permissions')}
            onPress={() => navigation.navigate('Permissions')}
          />
          <Row
            icon="contrast-outline"
            label={t('settings.colorMode')}
            value={colorModeLabel[colorMode]}
            onPress={() => setSheet('color')}
          />
          <Row
            icon="language-outline"
            label={t('settings.language')}
            value={languageLabel[language]}
            onPress={() => setSheet('language')}
          />
        </View>

        <View style={[styles.group, styles.groupSpaced]}>
          <Row
            icon="log-out-outline"
            label={t('settings.logout')}
            onPress={handleLogout}
            danger
          />
        </View>

        <Text style={styles.version}>{t('common.version')}</Text>
      </ScrollView>

      {/* Selection bottom-sheet */}
      <Modal
        visible={sheet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.base }]}
            onPress={() => {}}
          >
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { textAlign: align }]}>
              {sheet === 'color'
                ? t('settings.colorMode')
                : t('settings.language')}
            </Text>

            {sheet === 'color' &&
              colorOptions.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.option, { flexDirection: rowDir }]}
                  onPress={() => {
                    setColorMode(opt);
                    setSheet(null);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { textAlign: align },
                      colorMode === opt && styles.optionTextSelected,
                    ]}
                  >
                    {colorModeLabel[opt]}
                  </Text>
                  {colorMode === opt && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </Pressable>
              ))}

            {sheet === 'language' &&
              langOptions.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.option, { flexDirection: rowDir }]}
                  onPress={() => {
                    setLanguage(opt);
                    setSheet(null);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { textAlign: align },
                      language === opt && styles.optionTextSelected,
                    ]}
                  >
                    {languageLabel[opt]}
                  </Text>
                  {language === opt && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </Pressable>
              ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  group: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  groupSpaced: { marginTop: Spacing.base },
  row: {
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: `${Colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: Colors.errorLight },
  rowLabel: { ...Typography.bodyLarge, color: Colors.text, flex: 1 },
  rowLabelDanger: { color: Colors.error },
  rowValue: { ...Typography.body, color: Colors.textSecondary },
  version: {
    ...Typography.caption,
    color: Colors.textDisabled,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },

  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.base,
    ...Shadow.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    marginBottom: Spacing.base,
  },
  sheetTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  option: {
    alignItems: 'center',
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  optionText: { ...Typography.bodyLarge, color: Colors.text, flex: 1 },
  optionTextSelected: { color: Colors.primary, fontWeight: '600' },
});
