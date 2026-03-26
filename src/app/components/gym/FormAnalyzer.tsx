'use client';

import { getDownloadURL, ref, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { useRef, useState } from 'react';
import { storage } from '@/lib/firebase';

interface FormAnalysis {
  exercise: string;
  rating: 'Good' | 'Fair' | 'Needs Work';
  positives: string[];
  issues: string[];
  corrections: string[];
  safetyNote: string;
}

const RATING_CONFIG = {
  'Good':       { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-400', icon: '✅' },
  'Fair':       { bg: 'bg-amber-500/15',   border: 'border-amber-500/40',   text: 'text-amber-400',   icon: '⚠️' },
  'Needs Work': { bg: 'bg-red-500/15',     border: 'border-red-500/40',     text: 'text-red-400',     icon: '🔧' },
};

export default function FormAnalyzer() {
  const inputRef                = useRef<HTMLInputElement>(null);
  const fileRef                 = useRef<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('video/mp4');
  const [isVideo, setIsVideo]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Uploading…');
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const handleFile = (file: File) => {
    setAnalysis(null);
    setError(null);

    if (file.size > 35 * 1024 * 1024) {
      setError('File too large — please keep clips under 35 MB. Trim your video or reduce resolution in your phone settings.');
      return;
    }

    const type = file.type || 'video/mp4';
    setMimeType(type);
    setIsVideo(type.startsWith('video/'));
    fileRef.current = file;

    // Only generate a preview URL (no base64 conversion)
    setMediaUrl(URL.createObjectURL(file));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const analyse = async () => {
    if (!fileRef.current || loading) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Step 1: upload directly to Firebase Storage (no payload limits)
      setLoadingMsg('Uploading file… (1/3)');
      const ext      = fileRef.current.name.split('.').pop() ?? 'bin';
      const path     = `form-analysis/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const fileRef2 = ref(storage, path);

      const fileUrl = await new Promise<string>((resolve, reject) => {
        const task = uploadBytesResumable(fileRef2, fileRef.current!);
        const timer = setTimeout(() => { task.cancel(); reject(new Error('Upload timed out — check your connection')); }, 120_000);
        task.on('state_changed', null,
          (err) => { clearTimeout(timer); reject(err); },
          async () => {
            clearTimeout(timer);
            try { resolve(await getDownloadURL(task.snapshot.ref)); }
            catch (e) { reject(e); }
          }
        );
      });

      // Step 2: tell our server to pull from Firebase Storage and forward to Gemini
      setLoadingMsg('Sending to AI… (2/3)');
      const geminiRes = await fetch('/api/gemini/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blobUrl: fileUrl, mimeType: fileRef.current.type, storagePath: path }),
      });
      const rawText = await geminiRes.text();
      let uploadData: Record<string, unknown>;
      try { uploadData = JSON.parse(rawText); }
      catch { throw new Error(`HTTP ${geminiRes.status} — ${rawText.slice(0, 200)}`); }
      if (!uploadData.fileUri) {
        throw new Error(uploadData.error as string ?? 'Upload failed');
      }

      // Step 3: analyse using the file URI
      setLoadingMsg('Analysing form… (3/3)');
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'analyze_form_video',
          context: { fileUri: uploadData.fileUri, mimeType: uploadData.mimeType },
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setError(data.error ?? 'Could not analyse — try a clearer, well-lit clip.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrl(null);
    fileRef.current = null;
    setAnalysis(null);
    setError(null);
  };

  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const ratingCfg = analysis ? RATING_CONFIG[analysis.rating] : null;

  return (
    <div className="bg-ql-surface rounded-2xl border border-ql shadow-ql overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-ql">
        <span className="text-lg">🎥</span>
        <div>
          <p className="text-ql text-sm font-semibold leading-tight">AI Form Check</p>
          <p className="text-ql-3 text-[11px]">Upload a clip or photo of your exercise</p>
        </div>
      </div>

      {/* Disclaimer — collapsible */}
      <div className="mx-4 mt-4 rounded-xl border border-amber-500/40 bg-amber-400/20 overflow-hidden">
        <button
          onClick={() => setDisclaimerOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-2.5"
        >
          <span className="text-sm shrink-0">⚠️</span>
          <p className="text-ql text-xs font-semibold flex-1 text-left">AI Guidance Only — Not Professional Advice</p>
          <span className={`text-ql text-xs transition-transform duration-200 ${disclaimerOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {disclaimerOpen && (
          <p className="text-ql-2 text-[11px] leading-relaxed px-4 pb-3">
            This tool provides general form feedback and is <strong>not a substitute</strong> for a qualified personal trainer or physiotherapist. AI analysis may miss subtle technique issues. Always prioritise your safety — <strong>stop immediately if you feel pain</strong>. Use as a learning aid only.
          </p>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* Upload area */}
        {!mediaUrl ? (
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-ql rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors hover:border-ql-accent"
            onClick={() => inputRef.current?.click()}
          >
            <span className="text-4xl">📹</span>
            <div className="text-center">
              <p className="text-ql text-sm font-medium">Drop a video or photo here</p>
              <p className="text-ql-3 text-xs mt-1">or tap to browse — max 25 MB, keep clips under 30 seconds</p>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={e => { e.stopPropagation(); inputRef.current!.setAttribute('capture', 'environment'); inputRef.current?.click(); }}
                className="px-3 py-1.5 rounded-lg bg-ql-surface2 border border-ql text-ql-2 text-xs font-medium hover:bg-ql-surface3 transition-colors"
              >
                📷 Camera
              </button>
              <button
                onClick={e => { e.stopPropagation(); inputRef.current!.removeAttribute('capture'); inputRef.current?.click(); }}
                className="px-3 py-1.5 rounded-lg bg-ql-surface2 border border-ql text-ql-2 text-xs font-medium hover:bg-ql-surface3 transition-colors"
              >
                🖼️ Gallery
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Media preview */}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              {isVideo ? (
                <video src={mediaUrl} controls className="w-full h-full object-contain" />
              ) : (
                <img src={mediaUrl} alt="Form preview" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={analyse}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-ql-accent text-white text-sm font-semibold hover:bg-ql-accent-h transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce [animation-delay:0ms]">·</span>
                      <span className="animate-bounce [animation-delay:150ms]">·</span>
                      <span className="animate-bounce [animation-delay:300ms]">·</span>
                    </span>
                    {loadingMsg}
                  </>
                ) : (
                  '🔍 Analyse Form'
                )}
              </button>
              <button
                onClick={reset}
                className="px-4 py-2.5 rounded-xl bg-ql-surface2 border border-ql text-ql-3 text-sm hover:bg-ql-surface3 transition-colors"
              >
                Retake
              </button>
            </div>
            {loading && (
              <p className="text-ql-3 text-[11px] text-center">This can take 20–40 seconds for videos — hang tight</p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex gap-3 items-start">
            <span className="text-base shrink-0">⚠️</span>
            <div>
              <p className="text-red-400 text-sm font-semibold">Upload error</p>
              <p className="text-red-300 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {analysis && ratingCfg && (
          <div className="flex flex-col gap-3">

            {/* Exercise + rating */}
            <div className={`rounded-xl border ${ratingCfg.border} ${ratingCfg.bg} px-4 py-3 flex items-center justify-between`}>
              <div>
                <p className="text-ql text-sm font-semibold">{analysis.exercise}</p>
                <p className={`text-xs font-medium mt-0.5 ${ratingCfg.text}`}>{ratingCfg.icon} {analysis.rating}</p>
              </div>
            </div>

            {/* Positives */}
            {analysis.positives.length > 0 && (
              <div className="rounded-xl bg-ql-surface2 border border-ql px-4 py-3 flex flex-col gap-2">
                <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">✅ What you&apos;re doing well</p>
                <ul className="flex flex-col gap-1">
                  {analysis.positives.map((p, i) => (
                    <li key={i} className="text-ql text-xs flex gap-2">
                      <span className="text-emerald-400 shrink-0">·</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Issues + corrections */}
            {analysis.issues.length > 0 && (
              <div className="rounded-xl bg-ql-surface2 border border-ql px-4 py-3 flex flex-col gap-3">
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide">🔧 Form corrections</p>
                {analysis.issues.map((issue, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <p className="text-ql text-xs font-medium">{issue}</p>
                    {analysis.corrections[i] && (
                      <p className="text-ql-2 text-[11px] pl-3 border-l-2 border-ql-accent">{analysis.corrections[i]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Safety note */}
            <div className="rounded-xl border border-ql bg-ql-surface2 px-4 py-3 flex gap-2.5">
              <span className="text-sm shrink-0">🛡️</span>
              <p className="text-ql-2 text-[11px] leading-relaxed">{analysis.safetyNote}</p>
            </div>

            {/* Analyse another */}
            <button
              onClick={reset}
              className="w-full py-2.5 rounded-xl bg-ql-surface2 border border-ql text-ql-2 text-sm hover:bg-ql-surface3 transition-colors"
            >
              Analyse another clip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
