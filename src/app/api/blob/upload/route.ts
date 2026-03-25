import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['video/*', 'image/*'],
        maximumSizeInBytes: 20 * 1024 * 1024, // 20 MB
      }),
      onUploadCompleted: async () => {
        // Nothing to do — we delete the blob after Gemini analysis
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
