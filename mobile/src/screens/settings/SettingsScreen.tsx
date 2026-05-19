import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
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
import {
  Typography,
  Spacing,
  Radius,
  Shadow,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { SettingsScreenProps } from '@/navigation/types';

type SheetKind = 'color' | 'language' | null;

export function SettingsScreen({ navigation }: SettingsScreenProps<'Settings'>) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, isRTL } = useTranslation();
  const { logout, providerProfile } = useAuthStore();
  const { showToast } = useUIStore();
  const { language, colorMode, setLanguage, setColorMode } = useSettingsStore();

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

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

  const confirmLogout = async () => {
    setLogoutOpen(false);
    await logout();
    showToast(t('settings.logoutSuccess'), 'success');
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
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? c.error : c.primary}
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
        <Ionicons name={chevron} size={16} color={c.textDisabled} />
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
          {!!providerProfile && (
            <Row
              icon="construct-outline"
              label={t('settings.providerProfile')}
              onPress={() => navigation.navigate('ProviderEdit')}
            />
          )}
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
            onPress={() => setLogoutOpen(true)}
            danger
          />
        </View>

        <Text style={styles.version}>{t('common.version')}</Text>
      </ScrollView>

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
                    <Ionicons name="checkmark" size={20} color={c.primary} />
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
                    <Ionicons name="checkmark" size={20} color={c.primary} />
                  )}
                </Pressable>
              ))}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={logoutOpen}
        title={t('settings.logoutConfirmTitle')}
        message={t('settings.logoutConfirmMessage')}
        confirmLabel={t('settings.logout')}
        cancelLabel={t('common.cancel')}
        destructive
        icon="log-out-outline"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    group: {
      backgroundColor: c.surface,
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
      borderBottomColor: c.divider,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      backgroundColor: `${c.primary}14`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIconDanger: { backgroundColor: c.errorLight },
    rowLabel: { ...Typography.bodyLarge, color: c.text, flex: 1 },
    rowLabelDanger: { color: c.error },
    rowValue: { ...Typography.body, color: c.textSecondary },
    version: {
      ...Typography.caption,
      color: c.textDisabled,
      textAlign: 'center',
      marginTop: Spacing.xl,
    },

    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
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
      backgroundColor: c.border,
      marginBottom: Spacing.base,
    },
    sheetTitle: { ...Typography.h4, color: c.text, marginBottom: Spacing.sm },
    option: {
      alignItems: 'center',
      paddingVertical: Spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    optionText: { ...Typography.bodyLarge, color: c.text, flex: 1 },
    optionTextSelected: { color: c.primary, fontWeight: '600' },
  });
