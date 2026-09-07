export function formatCurrency(
  value: string | number,
  currency = "INR",
): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) return String(value);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Display label for a transaction counterparty. The backend returns:
 *   - a person's name for a P2P transfer,
 *   - "System" for top-ups (no reference_id),
 *   - "Deleted User" when the counterparty closed their account.
 * Returns the string as-is, with a dash fallback for unexpected nulls.
 */
export function counterpartyLabel(name: string | null | undefined): string {
  return name && name.trim() ? name : "—";
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
