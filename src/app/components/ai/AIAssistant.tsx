'use client';

import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

interface Message {
  role: 'user' | 'ai';
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  loadingLabel?: string;
}

function buildUserContext(store: ReturnType<typeof useGameStore.getState>) {
  const today = new Date().toISOString().slice(0, 10);
  const recentHabits = store.habitLog.filter(h => {
    const d = new Date(h.date); const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 86400000;
  });
  const todaySteps    = store.stepLog.find(s => s.date === today)?.steps ?? 0;
  const recentSleep   = store.sleepLog.slice(-3).map(s => s.onTime ? 'on time' : 'late').join(', ');
  const todayMeals    = store.mealLog.filter(m => m.date === today);
  const totalCalories = todayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const recentGym     = store.gymSessions.slice(-3).map(s => s.planId).join(', ');
  const savingsSoFar  = store.vices.reduce((sum, v) => sum + (v.goldSaved ?? 0), 0);

  return `User profile:
- Name: ${store.userName || 'User'}
- Age: ${store.characterAppearance.age ?? 'unknown'}, Height: ${store.characterAppearance.height ?? '?'}cm, Weight: ${store.characterAppearance.startingWeight ?? '?'}kg
- Activity level: ${store.characterAppearance.activityLevel ?? 'moderate'}
- Level: ${store.stats.level}, XP: ${store.stats.xp}
- Stats: STR ${store.stats.str}, CON ${store.stats.con}, DEX ${store.stats.dex}, GOLD ${store.stats.gold}
- Step goal: ${store.stepGoal.toLocaleString()} — today: ${todaySteps.toLocaleString()} steps
- Sleep recent: ${recentSleep || 'no data'}
- Habits completed this week: ${recentHabits.length}
- Today's calories logged: ${totalCalories} kcal
- Recent gym sessions: ${recentGym || 'none'}
- Savings goal: ${store.currencySymbol}${store.savingsGoal} — saved so far: ${store.currencySymbol}${savingsSoFar.toFixed(2)}
- Login streak: ${store.loginStreak} days`;
}

const SECTION_CONTEXT: Record<string, string> = {
  dashboard:   'The user is on their dashboard overview.',
  training:    'The user is in their training/habits section.',
  gym:         'The user is in the gym & fitness section.',
  nutrition:   'The user is in the food & nutrition section.',
  vices:       'The user is in the vices/bad habits tracker.',
  calendar:    'The user is in the calendar section.',
  habits:      'The user is in the habits tracker.',
  settings:    'The user is in settings.',
  social:      'The user is in the social/friends section.',
  leaderboard: 'The user is on the leaderboard.',
};

const CHUNK = 3 * 1024 * 1024;

export default function AIAssistant() {
  const store = useGameStore();
  const { activeSection, userName } = store;

  const [open,        setOpen]        = useState(false);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Thinking…');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      if (messages.length === 0) {
        const name = userName ? userName.split(' ')[0] : 'there';
        setMessages([{ role: 'ai', text: `Hey ${name}! I know your stats, your goals, and what you've been up to. Ask me anything, or send a photo of your food / a video of your form for instant analysis.` }]);
      }
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addAiMsg = (text: string) =>
    setMessages(prev => [...prev, { role: 'ai', text }]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    setLoadingLabel('Thinking…');
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'assistant',
          message: text,
          section: activeSection,
          context: {
            userContext: buildUserContext(store),
            sectionContext: SECTION_CONTEXT[activeSection] ?? '',
          },
        }),
      });
      const data = await res.json();
      addAiMsg(data.reply ?? data.error ?? 'Sorry, something went wrong.');
    } catch {
      addAiMsg('Having trouble connecting. Try again in a moment.');
    }
    setLoading(false);
  };

  const handleFile = async (file: File) => {
    if (loading) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) { addAiMsg('Please send an image or video file.'); return; }
    if (file.size > 50 * 1024 * 1024) { addAiMsg('File too large — please keep it under 50 MB.'); return; }

    const previewUrl = URL.createObjectURL(file);
    setMessages(prev => [...prev, {
      role: 'user',
      text: isImage ? '📷 Food photo' : '🎥 Form video',
      mediaUrl: previewUrl,
      mediaType: isImage ? 'image' : 'video',
    }]);
    setLoading(true);

    try {
      if (isImage) {
        // ── Food photo: base64 encode ─────────────────────────────────────
        setLoadingLabel('Analysing food…');
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => {
            const url = e.target?.result as string;
            resolve(url.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res  = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'analyze_food_image', context: { imageBase64: base64, mimeType: file.type } }),
        });
        const data = await res.json();
        if (data.food) {
          const f = data.food;
          addAiMsg(`**${f.name}** — ~${f.calories} kcal\nProtein: ${f.protein}g · Carbs: ${f.carbs}g · Fat: ${f.fat}g\n\nWant me to log this for you?`);
        } else {
          addAiMsg(data.error ?? 'Could not analyse that image.');
        }

      } else {
        // ── Form video: chunked upload ────────────────────────────────────
        const total  = file.size;
        const chunks = Math.ceil(total / CHUNK);
        const uploadId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

        let fileUri = '';
        let fileName = '';

        for (let i = 0; i < chunks; i++) {
          const isLast = i === chunks - 1;
          const blob   = file.slice(i * CHUNK, (i + 1) * CHUNK);
          const mb     = Math.round(Math.min((i + 1) * CHUNK, total) / 1024 / 1024);
          const totMb  = Math.round(total / 1024 / 1024);
          setLoadingLabel(`Uploading… ${mb} / ${totMb} MB`);

          const form = new FormData();
          form.append('chunk',    blob,        `chunk-${i}`);
          form.append('uploadId', uploadId);
          form.append('index',    String(i));
          form.append('total',    String(chunks));
          form.append('mimeType', file.type);
          if (isLast) form.append('isLast', '1');

          const res  = await fetch('/api/gemini/upload-chunk', { method: 'POST', body: form });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          if (isLast) { fileUri = data.fileUri ?? ''; fileName = data.fileName ?? ''; }
        }

        setLoadingLabel('Analysing form…');
        const res  = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'analyze_form_video', context: { fileUri, fileName, mimeType: file.type } }),
        });
        const data = await res.json();
        if (data.analysis) {
          const a = data.analysis;
          const positives  = (a.positives  ?? []).map((p: string) => `✅ ${p}`).join('\n');
          const issues     = (a.issues     ?? []).map((p: string) => `⚠️ ${p}`).join('\n');
          const corrections = (a.corrections ?? []).map((p: string) => `🔧 ${p}`).join('\n');
          addAiMsg(`**${a.exercise}** — ${a.rating}\n\n${positives}${issues ? '\n' + issues : ''}${corrections ? '\n' + corrections : ''}${a.safetyNote ? '\n\n' + a.safetyNote : ''}`);
        } else {
          addAiMsg(data.error ?? 'Could not analyse that video.');
        }
      }
    } catch (e: any) {
      addAiMsg(`Upload failed: ${e.message ?? 'Unknown error'}`);
    }
    setLoading(false);
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      {/* Drawer */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ height: '52vh' }}
      >
        <div className="h-full bg-ql-surface border-t border-ql rounded-t-3xl flex flex-col overflow-hidden shadow-2xl"
          style={{ maxWidth: 512, margin: '0 auto' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'linear-gradient(135deg, #4285f4, #34a853, #fbbc04, #ea4335)' }}>
                ✦
              </div>
              <span className="text-ql text-sm font-semibold">GAINN AI</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-ql-3 text-lg leading-none px-1">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl text-sm leading-relaxed overflow-hidden ${
                  m.role === 'user'
                    ? 'bg-ql-accent text-white rounded-br-sm'
                    : 'bg-ql-surface2 text-ql rounded-bl-sm border border-ql'
                }`}>
                  {m.mediaUrl && m.mediaType === 'image' && (
                    <img src={m.mediaUrl} alt="food" className="w-full max-h-36 object-cover" />
                  )}
                  {m.mediaUrl && m.mediaType === 'video' && (
                    <video src={m.mediaUrl} className="w-full max-h-36 object-cover" muted playsInline />
                  )}
                  <p className="px-3 py-2 whitespace-pre-line">{m.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-ql-surface2 border border-ql px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-ql-3 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <span className="text-ql-3 text-xs">{loadingLabel}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div className="shrink-0 px-4 pb-5 pt-2 flex gap-2 items-center">
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-ql-surface2 border border-ql text-ql-3 hover:text-ql transition-colors disabled:opacity-40"
              title="Upload photo or video"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>

            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything…"
              className="flex-1 bg-ql-surface2 border border-ql rounded-2xl px-4 py-2.5 text-ql text-sm outline-none focus:border-ql-accent transition-colors placeholder:text-ql-3"
            />

            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
              style={{ background: '#16a34a' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-20 right-4 z-50 w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-200 ${open ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        style={{ background: 'linear-gradient(135deg, #4285f4 0%, #34a853 50%, #16a34a 100%)' }}
        aria-label="Open AI assistant"
      >
        <span className="text-white text-lg">✦</span>
      </button>
    </>
  );
}
