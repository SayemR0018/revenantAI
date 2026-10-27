import { NextResponse } from 'next/server';
import { runReceiptChecks } from '@/lib/receipts-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const receipts = await runReceiptChecks({ quick: true });
  return NextResponse.json(receipts);
}
