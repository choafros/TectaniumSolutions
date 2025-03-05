import { format } from "date-fns";

export function generateReferenceNumber(prefix: "TS" | "INV", id: number): string {
  const paddedId = id.toString().padStart(6, "0");
  return `${prefix}-${paddedId}`;
}

export function calculateInvoiceTotal(
  normalHours: number,
  overtimeHours: number,
  normalRate: number,
  overtimeRate: number,
  vatRate: number,
  cisRate: number
): {
  subtotal: number;
  vatAmount: number;
  cisAmount: number;
  total: number;
} {
  const normalTotal = normalHours * normalRate;
  const overtimeTotal = overtimeHours * overtimeRate;
  const subtotal = normalTotal + overtimeTotal;
  const vatAmount = subtotal * (vatRate / 100);
  const cisAmount = subtotal * (cisRate / 100);
  const total = subtotal + vatAmount - cisAmount;

  return {
    subtotal,
    vatAmount,
    cisAmount,
    total,
  };
}