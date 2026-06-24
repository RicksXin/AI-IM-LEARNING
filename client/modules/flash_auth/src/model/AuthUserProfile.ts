import { readAuthString } from './AuthJson';

export type AuthUserProfileJson = {
  account_id?: unknown;
  avatar?: unknown;
  nickname?: unknown;
  phone?: unknown;
  user_id?: unknown;
};

export type AuthUserProfileProps = {
  accountId?: string;
  avatar: string;
  nickname: string;
  phone: string;
  userId: string;
};

class AuthUserProfile {
  readonly accountId: string;
  readonly avatar: string;
  readonly nickname: string;
  readonly phone: string;
  readonly userId: string;

  constructor(props: AuthUserProfileProps) {
    this.accountId = props.accountId ?? props.userId;
    this.avatar = props.avatar;
    this.nickname = props.nickname;
    this.phone = props.phone;
    this.userId = props.userId;
  }

  get avatarInitial() {
    return (this.nickname.trim()[0] || this.phone.trim()[0] || 'U').toUpperCase();
  }

  static fromJson(json: AuthUserProfileJson) {
    const userId = readAuthString(json.user_id, 'user_id');

    return new AuthUserProfile({
      accountId:
        typeof json.account_id === 'string'
          ? json.account_id
          : userId,
      avatar: readAuthString(json.avatar, 'avatar'),
      nickname: readAuthString(json.nickname, 'nickname'),
      phone: readAuthString(json.phone, 'phone'),
      userId,
    });
  }
}

export default AuthUserProfile;
