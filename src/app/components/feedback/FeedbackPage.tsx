'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function FeedbackPage({ userId }: { userId: string }) {
  const { userName } = useGameStore();
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);

  function send() {
    const text = input.trim();
    if (!text || loading) return;
    setMessages(m => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    fetch('/api/feedback/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, userId, userName }),
    })
      .then(r => r.json())
      .then((data: { reply?: string }) => {
        setMessages(m => [...m, { role: 'ai', text: data.reply ?? 'Thanks for your feedback!' }]);
      })
      .catch(() => {
        setMessages(m => [...m, { role: 'ai', text: 'Thanks for sharing — we really appreciate it!' }]);
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-ql text-xl font-bold">Feedback</h2>
        <p className="text-ql-3 text-xs mt-0.5">Tell us what you love, what could be better, or a feature you'd like to see.</p>
      </div>

      {messages.length > 0 && (
        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-ql-accent text-white rounded-br-sm'
                  : 'bg-ql-surface border border-ql text-ql rounded-bl-sm'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-ql-surface border border-ql rounded-2xl rounded-bl-sm px-4 py-2.5">
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-ql-3 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-ql-3 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-ql-3 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="bg-ql-surface rounded-2xl border border-ql p-4 flex flex-col gap-3">
          <p className="text-ql-3 text-xs">💡 Some ideas to get started:</p>
          {['I love the habit tracker!', 'Could you add a water reminder?', 'The AI gym plans are amazing'].map(s => (
            <button key={s} onClick={() => setInput(s)}
              className="text-left text-xs text-ql-3 border border-ql rounded-xl px-3 py-2 hover:text-ql hover:border-ql-accent transition-colors">
              &quot;{s}&quot;
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Share your thoughts…"
          className="flex-1 bg-ql-surface border border-ql rounded-xl px-4 py-2.5 text-sm text-ql placeholder:text-ql-3 outline-none focus:border-ql-accent"
        />
        <button onClick={send} disabled={!input.trim() || loading}
          className="px-4 py-2.5 bg-ql-accent disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-opacity">
          Send
        </button>
      </div>
    </div>
  );
}
