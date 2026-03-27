'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { ActiveSection } from '@/types';

interface AIAdvisorProps {
  section: ActiveSection;
}

export default function AIAdvisor({ section }: AIAdvisorProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const { stats, calendarEvents, vices, gymLog, wakeQuest } = useGameStore();

  const context = { stats, calendarEvents: calendarEvents.slice(-5), vices: vices.slice(-5), gymLog: gymLog.slice(-3), wakeQuest };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, section, context }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || data.error }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Connection lost. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return null;

  // Hidden — functionality moved to GAINN AI floating assistant
  return ( // eslint-disable-line no-unreachable
    <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ql">
        <span className="text-base">🔮</span>
        <span className="text-sm font-semibold text-ql">AI Support</span>
        <div className="ml-auto flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-ql-accent" />
          <div className="w-1.5 h-1.5 rounded-full bg-ql-surface3" />
          <div className="w-1.5 h-1.5 rounded-full bg-ql-surface3" />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4 max-h-44 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-ql-3 text-xs text-center py-4">Ask your advisor for guidance...</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-xs px-3 py-2.5 rounded-xl leading-relaxed max-w-[85%] ${
              m.role === 'user'
                ? 'bg-ql-accent text-white self-end'
                : 'bg-ql-surface2 text-ql self-start'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-ql-3 px-3 py-2 self-start">
            <span className="inline-flex gap-1">
              <span className="animate-bounce [animation-delay:0ms]">·</span>
              <span className="animate-bounce [animation-delay:150ms]">·</span>
              <span className="animate-bounce [animation-delay:300ms]">·</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask for guidance..."
          className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-xs text-ql outline-none focus:border-ql-accent transition-colors"
        />
        <button
          onClick={send}
          disabled={loading}
          className="px-4 py-2 bg-ql-accent hover:bg-ql-accent-h disabled:opacity-40 rounded-xl text-xs font-semibold text-white transition-colors"
        >
          Ask
        </button>
      </div>
    </div>
  );
}
