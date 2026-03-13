export type RootStackParamList = {
  Main: undefined;
  AddEntry: { mode: 'add' };
  EditEntry: { entryId: number };
  CustomerLedger: { customerName: string };
  Bill: { customerName?: string; receivedDate?: string };
  Reports: undefined;
  Settings: undefined;
};
