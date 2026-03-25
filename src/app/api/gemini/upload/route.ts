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
  } catch {
    return NextResponse.json({ error: 'File too large or invalid — keep clips under 25 MB' }, { status: 413 });
  }

  const mimeType = file.type || 'video/mp4';
  const bytes = await file.arrayBuffer();
  const boundary = 'boundary' + Date.now();
  const metadata = JSON.stringify({ file: { display_name: file.name || 'media' } });

  // Build multipart body using Web APIs (no Node.js Buffer in Edge runtime)
  const enc = new TextEncoder();
  const parts = [
    enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n`),
    enc.encode(metadata),
    enc.encode(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    new Uint8Array(bytes),
    enc.encode(`\r\n--${boundary}--`),
  ];
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) { body.set(part, offset); offset += part.length; }

  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': totalLength.toString(),
      },
      body,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json({ error: `Upload failed: ${err}` }, { status: 500 });
  }

  let fileData = (await uploadRes.json()).file;

  // Poll until Gemini finishes processing (stay within 25s edge limit)
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
