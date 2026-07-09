export type RootStackParamList = {
  Home: undefined;
  PocketDetail: { pocketId: string };
  PocketForm: { pocketId?: string } | undefined;
  Allocate: { pocketId?: string } | undefined;
  Income: undefined;
  History: undefined;
};
