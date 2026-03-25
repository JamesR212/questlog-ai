import { NextRequest, NextResponse } from 'next/server';

// Edge runtime: 25MB body limit vs 4.5MB serverless limit
export const runtime = 'edge';
export const maxDuration = 25;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  let file: File;
  try {
    const formData = await req.formData();
    const f = formData.get('file');
    if (!f || typeof f === 'string') return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    file = f as File;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `FormData parse failed: ${msg}` }, { status: 413 });
  }

  // Normalise MIME types — Gemini accepts video/mov not video/quicktime
  const rawType = file.type || 'video/mp4';
  const mimeType = rawType === 'video/quicktime' ? 'video/mov' : rawType;
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
  const bytes = await file.arrayBuffer();

  // ── Step 1: initiate resumable upload session ──────────────────────────────
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

  if (!initRes.ok) {
    const err = await initRes.text();
    return NextResponse.json(
      { error: `Session init failed (${initRes.status}): ${err}`, debug: { fileSizeMB, mimeType } },
      { status: 500 }
    );
  }

  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    return NextResponse.json({ error: 'No upload URL returned from Gemini' }, { status: 500 });
  }

  // ── Step 2: upload file bytes ───────────────────────────────────────────────
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
    return NextResponse.json(
      { error: `File upload failed (${uploadRes.status}): ${err}`, debug: { fileSizeMB, mimeType } },
      { status: 500 }
    );
  }

  let fileData = (await uploadRes.json()).file;

  // ── Step 3: poll until active ───────────────────────────────────────────────
  let attempts = 0;
  while (fileData.state === 'PROCESSING' && attempts < 8) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileData.name}?key=${apiKey}`
    );
    fileData = await statusRes.json();
    attempts++;
  }

  if (fileData.state === 'FAILED') {
    return NextResponse.json({ error: 'File processing failed on Gemini servers' }, { status: 500 });
  }

  return NextResponse.json({
    fileUri: fileData.uri as string,
    fileName: fileData.name as string,
    mimeType,
  });
}
