import { readAuthString } from './AuthJson';

export type AuthUserProfileJson = {
  avatar?: unknown;
  nickname?: unknown;
  phone?: unknown;
  user_id?: unknown;
};

export type AuthUserProfileProps = {
  avatar: string;
  nickname: string;
  phone: string;
  userId: string;
};

class AuthUserProfile {
  readonly avatar: string;
  readonly nickname: string;
  readonly phone: string;
  readonly userId: string;

  constructor(props: AuthUserProfileProps) {
    this.avatar = props.avatar;
    this.nickname = props.nickname;
    this.phone = props.phone;
    this.userId = props.userId;
  }

  get avatarInitial() {
    return (this.nickname.trim()[0] || this.phone.trim()[0] || 'U').toUpperCase();
  }

  static fromJson(json: AuthUserProfileJson) {
    return new AuthUserProfile({
      avatar: readAuthString(json.avatar, 'avatar'),
      nickname: readAuthString(json.nickname, 'nickname'),
      phone: readAuthString(json.phone, 'phone'),
      userId: readAuthString(json.user_id, 'user_id'),
    });
  }
}

export default AuthUserProfile;
