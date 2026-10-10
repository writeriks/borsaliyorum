/**
 * Görsel yoksa avatar baş harfleri; Türkçe büyük harf kuralıyla (i → İ). Saf modül: Server
 * Component'ler de çağırır, bu yüzden `'use client'` bir dosyada durmamalı.
 */
export const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toLocaleUpperCase('tr-TR');
