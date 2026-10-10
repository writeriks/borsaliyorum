export interface UserConnection {
  userId: number;
  username: string;
  displayName: string;
  profilePhoto: string | null;
  bio: string | null;
  isFollowing: boolean;
}

export enum ConnectionType {
  FOLLOWERS = 'followers',
  FOLLOWING = 'following',
}

export interface UserConnectionsModalProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  followerCount: number;
  followingCount: number;
  initialTab?: ConnectionType;
}
