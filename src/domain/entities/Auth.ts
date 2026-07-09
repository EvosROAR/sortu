export type AuthUser = {
  uid: string;
  email: string;
  displayName: string;
};

export type SortuCloudData = {
  unallocated: number;
  pockets: unknown[];
  events: unknown[];
  remindersEnabled: boolean;
  updatedAt?: string;
};
