import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    // Handle token generation request from @vercel/blob/client upload()
    if (body.type === 'blob.generate-client-token') {
      const { pathname } = body.payload;
      const clientToken = await generateClientTokenFromReadWriteToken({
        token: process.env.BLOB_READ_WRITE_TOKEN!,
        pathname,
        maximumSizeInBytes: 35 * 1024 * 1024,
        allowedContentTypes: ['image/*', 'video/*'],
        validUntil: Date.now() + 5 * 60 * 1000, // 5 minutes
      });
      return NextResponse.json({ clientToken });
    }

    // Acknowledge webhook callbacks (upload completed etc.) — nothing to do
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[blob/upload] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
