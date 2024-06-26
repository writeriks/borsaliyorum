export interface SecurityRoles {
  userId: string;
  role: Role;
}

export enum SecurityRolesCollectionEnum {
  USER_ID = "userId",
  ROLE = "role",
}

export enum Role {
  DEFAULT = "default",
  ADMIN = "admin",
  MODERATOR = "moderator",
}
