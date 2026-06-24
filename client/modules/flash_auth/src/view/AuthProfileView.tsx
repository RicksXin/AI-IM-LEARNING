import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type AuthUserProfile from '../model/AuthUserProfile';

type AuthProfileViewProps = {
  hasPassword?: boolean;
  profile: AuthUserProfile;
  tokenPreview?: string;
  onLogout: () => void;
};

function AuthProfileView({
  hasPassword,
  profile,
  tokenPreview,
  onLogout,
}: AuthProfileViewProps) {
  return (
    <View style={styles.card}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.avatarInitial}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.nickname}>{profile.nickname}</Text>
          <Text style={styles.phone}>{profile.phone}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text numberOfLines={1} style={styles.infoValue}>
            {profile.userId}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>头像地址</Text>
          <Text numberOfLines={1} style={styles.infoValue}>
            {profile.avatar}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Token</Text>
          <Text numberOfLines={1} style={styles.infoValue}>
            {tokenPreview ?? '已保存'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>登录密码</Text>
          <Text numberOfLines={1} style={styles.infoValue}>
            {hasPassword ? '已设置登录密码' : '未设置登录密码'}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="退出用户认证"
        onPress={onLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.logoutText}>退出登录</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    marginRight: 14,
    width: 58,
  },
  avatarText: {
    color: '#f7d889',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  profileCopy: {
    flex: 1,
  },
  nickname: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  phone: {
    color: '#667085',
    fontSize: 15,
    letterSpacing: 0,
    marginTop: 4,
  },
  infoGrid: {
    gap: 10,
    marginTop: 20,
  },
  infoItem: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 13,
  },
  infoLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 5,
  },
  infoValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#fff1f0',
    borderColor: '#f2b8b5',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  logoutText: {
    color: '#b42318',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.72,
  },
});

export default AuthProfileView;
