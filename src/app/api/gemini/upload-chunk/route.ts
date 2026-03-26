import { put, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

    const chunkIndex  = parseInt(req.headers.get('x-chunk-index')   ?? '0');
    const totalChunks = parseInt(req.headers.get('x-total-chunks')  ?? '1');
    const totalSize   = parseInt(req.headers.get('x-total-size')    ?? '0');
    const rawType     = req.headers.get('x-mime-type')              ?? 'video/mp4';
    const uploadId    = req.headers.get('x-upload-id')              ?? `tmp-${Date.now()}`;
    const prevUrls: string[] = JSON.parse(req.headers.get('x-chunk-urls') ?? '[]');
    const isLast      = chunkIndex === totalChunks - 1;

    const mimeType = rawType === 'video/quicktime' ? 'video/mov' : rawType;
    const chunk = await req.arrayBuffer();

    // Store this chunk server-side in Vercel Blob (outgoing PUT — no payload limit)
    const { url: chunkUrl } = await put(
      `form-analysis-${uploadId}-chunk-${chunkIndex}`,
      chunk,
      { access: 'private' }
    );

    if (!isLast) {
      return NextResponse.json({ chunkUrl });
    }

    // ── Final chunk: reassemble all chunks, upload to Gemini, clean up ──
    const allUrls = [...prevUrls, chunkUrl];

    // Download all chunks from Vercel Blob and concatenate
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN ?? '';
    const combined = new Uint8Array(totalSize);
    let writeOffset = 0;
    for (const url of allUrls) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${blobToken}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch chunk from Blob: ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      combined.set(bytes, writeOffset);
      writeOffset += bytes.length;
    }

    // Delete temp chunks (fire-and-forget)
    Promise.all(allUrls.map(url => del(url))).catch(() => null);

    // Initiate Gemini resumable upload
    const initRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(combined.byteLength),
          'X-Goog-Upload-Header-Content-Type': mimeType,
        },
        body: JSON.stringify({ file: { display_name: 'upload' } }),
      }
    );
    if (!initRes.ok) {
      const err = await initRes.text();
      return NextResponse.json({ error: `Gemini session init failed: ${err}` }, { status: 500 });
    }
    const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) return NextResponse.json({ error: 'No upload URL from Gemini' }, { status: 500 });

    // Upload assembled file to Gemini
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': String(combined.byteLength),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: combined,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: `Gemini upload failed: ${err}` }, { status: 500 });
    }

    const fileData = (await uploadRes.json()).file;

    // Return immediately — polling happens in the analysis route
    return NextResponse.json({
      fileUri:  fileData.uri  as string,
      fileName: fileData.name as string,
      mimeType,
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[upload-chunk] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
