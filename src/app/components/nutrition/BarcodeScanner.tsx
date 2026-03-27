'use client';

import { useEffect, useRef, useState } from 'react';
import type { Micros } from '@/types';

export interface ScannedProduct {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  servingSize?: string;
  micros?: Micros;
}

interface Props {
  onResult: (product: ScannedProduct) => void;
  onClose: () => void;
}

// Map Open Food Facts nutriments → our Micros type (per 100g keys)
function extractMicros(n: Record<string, number>, factor: number): Micros | undefined {
  const get = (key: string) => {
    const v = n[key + '_100g'];
    return v != null ? parseFloat((v * factor).toFixed(2)) : undefined;
  };
  const m: Micros = {
    vitA:      get('vitamin-a'),
    vitC:      get('vitamin-c'),
    vitD:      get('vitamin-d'),
    vitE:      get('vitamin-e'),
    vitK:      get('vitamin-k'),
    vitB6:     get('vitamin-b6'),
    vitB12:    get('vitamin-b12'),
    folate:    get('folate') ?? get('vitamin-b9'),
    calcium:   get('calcium'),
    iron:      get('iron'),
    magnesium: get('magnesium'),
    zinc:      get('zinc'),
    potassium: get('potassium'),
    sodium:    get('sodium'),
  };
  // Only return if at least one micro was found
  return Object.values(m).some(v => v != null) ? m : undefined;
}

async function lookupBarcode(code: string): Promise<ScannedProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,nutriments,serving_size,serving_quantity`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const n = p.nutriments ?? {};

    // Determine serving size in grams (fallback 100g)
    const servingG = parseFloat(p.serving_quantity) || 100;
    const factor   = servingG / 100;

    const cal = (n['energy-kcal'] ?? (n['energy'] ? n['energy'] / 4.184 : 0));
    // If `energy-kcal` is already per-serving use it, else scale from 100g
    const caloriesPerServing = n['energy-kcal_serving'] ?? parseFloat((
      (n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0)) * factor
    ).toFixed(0));

    return {
      name:        p.product_name || 'Unknown Product',
      calories:    Math.round(caloriesPerServing || cal * factor),
      protein:     parseFloat(((n.proteins_100g   ?? 0) * factor).toFixed(1)),
      carbs:       parseFloat(((n.carbohydrates_100g ?? 0) * factor).toFixed(1)),
      fat:         parseFloat(((n.fat_100g         ?? 0) * factor).toFixed(1)),
      sugar:       parseFloat(((n.sugars_100g      ?? 0) * factor).toFixed(1)),
      servingSize: p.serving_size,
      micros:      extractMicros(n, factor),
    };
  } catch {
    return null;
  }
}

export default function BarcodeScanner({ onResult, onClose }: Props) {
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const divId = 'ql-barcode-scanner';
  const [status, setStatus] = useState<'scanning' | 'loading' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('');
  const scannedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function start() {
      // Dynamically import to avoid SSR issues
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(divId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 140 } },
          async (decodedText) => {
            if (scannedRef.current || !mounted) return;
            scannedRef.current = true;

            setStatus('loading');
            try { await scanner.stop(); } catch { /* ignore */ }

            const product = await lookupBarcode(decodedText);
            if (!mounted) return;

            if (product) {
              onResult(product);
            } else {
              setErrorMsg(`Barcode "${decodedText}" not found in database. Try typing manually.`);
              setStatus('error');
            }
          },
          undefined
        );
      } catch (err) {
        if (!mounted) return;
        setErrorMsg('Camera access denied or unavailable.');
        setStatus('error');
        console.error(err);
      }
    }

    start();

    return () => {
      mounted = false;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-3" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="text-white/70 text-sm">Cancel</button>
        <p className="text-white text-sm font-semibold">Scan Barcode</p>
        <div className="w-12" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4" onClick={e => e.stopPropagation()}>
        {status === 'scanning' && (
          <>
            {/* Scanner viewport */}
            <div
              id={divId}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ minHeight: 260 }}
            />
            <p className="text-white/60 text-xs text-center">
              Point at any barcode or QR code on the product packaging
            </p>
          </>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white text-sm">Looking up nutritional info…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <p className="text-3xl">😕</p>
            <p className="text-white text-sm">{errorMsg}</p>
            <button
              onClick={onClose}
              className="bg-white/10 text-white rounded-2xl px-6 py-2.5 text-sm font-semibold"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
