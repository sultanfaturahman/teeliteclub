export const formatPaymentMethod = (method?: string | null): string => {
  if (!method) {
    return 'Tidak diketahui';
  }

  const normalized = method.trim().toLowerCase();
  if (!normalized) {
    return 'Tidak diketahui';
  }

  const mapping: Record<string, string> = {
    midtrans: 'Midtrans',
    'midtrans payment gateway': 'Midtrans',
    bank_transfer: 'Bank Transfer',
    gopay: 'GoPay',
    qris: 'QRIS',
    shopeepay: 'ShopeePay',
    credit_card: 'Kartu Kredit/Debit',
    cstore: 'Convenience Store',
    'mandiri bill payment': 'Mandiri Bill Payment',
  };

  if (mapping[normalized]) {
    return mapping[normalized];
  }

  if (normalized.startsWith('bank transfer')) {
    return method
      .split(' ')
      .map((segment) => {
        if (!segment.length) {
          return segment;
        }
        const [firstChar, ...rest] = segment;
        return firstChar.toUpperCase() + rest.join('');
      })
      .join(' ');
  }

  return method;
};
