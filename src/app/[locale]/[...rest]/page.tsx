import { notFound } from 'next/navigation';

// Tanımsız yollar yerelleştirilmiş [locale]/not-found.tsx'e düşsün (Next'in İngilizce varsayılanına değil)
const CatchAll = (): never => notFound();

export default CatchAll;
