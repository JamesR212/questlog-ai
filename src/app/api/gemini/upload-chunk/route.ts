import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  const offset    = parseInt(req.headers.get('x-upload-offset')    ?? '0');
  const totalSize = parseInt(req.headers.get('x-total-size')       ?? '0');
  const isLast    = req.headers.get('x-is-last')                    === '1';
  const rawType   = req.headers.get('x-mime-type')                  ?? 'video/mp4';
  const sessionUrl = req.headers.get('x-upload-url')               ?? '';

  const mimeType = rawType === 'video/quicktime' ? 'video/mov' : rawType;
  const chunk = await req.arrayBuffer();

  let uploadUrl = sessionUrl;

  // First chunk — initiate the Gemini resumable session
  if (!uploadUrl) {
    const initRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(totalSize),
          'X-Goog-Upload-Header-Content-Type': mimeType,
        },
        body: JSON.stringify({ file: { display_name: 'upload' } }),
      }
    );
    if (!initRes.ok) {
      const err = await initRes.text();
      return NextResponse.json({ error: `Gemini session init failed: ${err}` }, { status: 500 });
    }
    uploadUrl = initRes.headers.get('X-Goog-Upload-URL') ?? '';
    if (!uploadUrl) return NextResponse.json({ error: 'No upload URL from Gemini' }, { status: 500 });
  }

  // Upload this chunk
  const command = isLast ? 'upload, finalize' : 'upload';
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(chunk.byteLength),
      'X-Goog-Upload-Offset': String(offset),
      'X-Goog-Upload-Command': command,
    },
    body: chunk,
  });

  if (!isLast) {
    // Intermediate chunk — return the session URL for next request
    if (!uploadRes.ok && uploadRes.status !== 308) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: `Chunk upload failed: ${err}` }, { status: 500 });
    }
    return NextResponse.json({ uploadUrl });
  }

  // Final chunk — wait for Gemini to finish processing
  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json({ error: `Final chunk upload failed: ${err}` }, { status: 500 });
  }

  let fileData = (await uploadRes.json()).file;

  let attempts = 0;
  while (fileData?.state === 'PROCESSING' && attempts < 15) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileData.name}?key=${apiKey}`
    );
    fileData = await statusRes.json();
    attempts++;
  }

  if (fileData?.state === 'FAILED') {
    return NextResponse.json({ error: 'Gemini file processing failed' }, { status: 500 });
  }

  return NextResponse.json({
    fileUri: fileData.uri as string,
    fileName: fileData.name as string,
    mimeType,
  });
}
