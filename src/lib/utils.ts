import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHora(isoOrVeStr: string | null | undefined): string {
  if (!isoOrVeStr) return "—";
  const m = isoOrVeStr.match(/(\d{2}):(\d{2})/);
  if (!m) return "—";
  const h = parseInt(m[1], 10);
  const min = m[2];
  if (isNaN(h)) return `${m[1]}:${min}`;
  const period = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${period}`;
}

