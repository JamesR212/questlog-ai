import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

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
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const mimeType = file.type || 'video/mp4';
  const bytes = await file.arrayBuffer();
  const boundary = 'boundary' + Date.now();
  const metadata = JSON.stringify({ file: { display_name: file.name || 'media' } });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n`),
    Buffer.from(metadata),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    Buffer.from(bytes),
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': body.length.toString(),
      },
      body,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json({ error: `Upload failed: ${err}` }, { status: 500 });
  }

  let fileData = (await uploadRes.json()).file;

  while (fileData.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileData.name}?key=${apiKey}`
    );
    fileData = await statusRes.json();
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
