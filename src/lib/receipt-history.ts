export interface ReceiptHistoryPayload {
  storeId: string;
  parsedDate: string;
  amount: number;
  payee: string;
  note: string;
  category: string;
}

export function buildReceiptHistoryPayload({
  storeId,
  parsedDate,
  amount,
  payee,
  note,
  category,
}: ReceiptHistoryPayload) {
  return {
    storeId,
    parsedDate,
    amount,
    payee: payee.trim(),
    note: note.trim(),
    category: category.trim(),
  };
}
