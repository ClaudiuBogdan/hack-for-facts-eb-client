import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateHash(message: string): string {
  let hash = 0x811c9dc5; // FNV1a 32-bit offset basis

  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i);
    // Math.imul performs a 32-bit integer multiplication.
    // This helps keep the hash within 32-bit integer behavior
    // and is efficient.
    hash = Math.imul(hash, 0x01000193); // FNV1a 32-bit prime
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}