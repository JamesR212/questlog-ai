import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  const { blobUrl, mimeType: rawType } = await req.json();
  if (!blobUrl) return NextResponse.json({ error: 'No blobUrl provided' }, { status: 400 });

  // Normalise MIME types — Gemini accepts video/mov not video/quicktime
  const mimeType = rawType === 'video/quicktime' ? 'video/mov' : (rawType || 'video/mp4');

  // Download file from Vercel Blob (server→server, no payload limit)
  const blobRes = await fetch(blobUrl);
  if (!blobRes.ok) {
    await del(blobUrl);
    return NextResponse.json({ error: `Failed to fetch blob: ${blobRes.status}` }, { status: 500 });
  }
  const bytes = await blobRes.arrayBuffer();

  // Initiate resumable upload session with Gemini
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength),
        'X-Goog-Upload-Header-Content-Type': mimeType,
      },
      body: JSON.stringify({ file: { display_name: 'upload' } }),
    }
  );

  await del(blobUrl); // Delete blob regardless of Gemini outcome

  if (!initRes.ok) {
    const err = await initRes.text();
    return NextResponse.json({ error: `Gemini session init failed (${initRes.status}): ${err}` }, { status: 500 });
  }

  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) return NextResponse.json({ error: 'No upload URL from Gemini' }, { status: 500 });

  // Upload file bytes to Gemini
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(bytes.byteLength),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: bytes,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json({ error: `Gemini upload failed (${uploadRes.status}): ${err}` }, { status: 500 });
  }

  let fileData = (await uploadRes.json()).file;

  // Poll until Gemini finishes processing
  let attempts = 0;
  while (fileData.state === 'PROCESSING' && attempts < 15) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileData.name}?key=${apiKey}`
    );
    fileData = await statusRes.json();
    attempts++;
  }

  if (fileData.state === 'FAILED') {
    return NextResponse.json({ error: 'Gemini file processing failed' }, { status: 500 });
  }

  return NextResponse.json({
    fileUri: fileData.uri as string,
    fileName: fileData.name as string,
    mimeType,
  });
}
