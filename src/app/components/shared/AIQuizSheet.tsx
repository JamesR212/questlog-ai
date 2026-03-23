'use client';

import { useState } from 'react';

export interface QuizQuestion {
  id: string;
  question: string;
  emoji: string;
  multiSelect?: boolean;
  options: { label: string; emoji: string; value: string }[];
}

interface Props {
  title: string;
  questions: QuizQuestion[];
  savedAnswers?: Record<string, string> | null;
  onComplete: (answers: Record<string, string>) => void;
  onClose: () => void;
}

export default function AIQuizSheet({ title, questions, savedAnswers, onComplete, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [usingSaved, setUsingSaved] = useState(!!savedAnswers);
  // multi-select: track selected values for current step
  const [multiSelected, setMultiSelected] = useState<string[]>([]);

  const q = questions[step];
  const progress = (step / questions.length) * 100;
  const isLast = step === questions.length - 1;

  // Reset multi-select when step changes
  const goToStep = (s: number) => {
    setMultiSelected([]);
    setStep(s);
  };

  const pick = (value: string) => {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (isLast) {
      onComplete(next);
    } else {
      goToStep(step + 1);
    }
  };

  const toggleMulti = (value: string) => {
    setMultiSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const confirmMulti = () => {
    const joined = multiSelected.join(', ') || q.options[0].value;
    const next = { ...answers, [q.id]: joined };
    setAnswers(next);
    if (isLast) {
      onComplete(next);
    } else {
      goToStep(step + 1);
    }
  };

  // Saved preferences quick-use panel
  if (usingSaved && savedAnswers) {
    const summaryParts = questions.map(q => savedAnswers[q.id]).filter(Boolean);
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
        <div className="bg-ql-surface rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-ql-surface3" />
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-ql">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span className="text-ql text-sm font-semibold">{title}</span>
            </div>
            <button onClick={onClose} className="text-ql-3 text-sm">✕</button>
          </div>
          <div className="px-5 py-5 flex flex-col gap-4">
            <div>
              <p className="text-ql text-sm font-semibold mb-1">Use saved preferences?</p>
              <p className="text-ql-3 text-xs leading-relaxed">{summaryParts.join(' · ')}</p>
            </div>
            <button
              onClick={() => onComplete(savedAnswers)}
              className="w-full py-3.5 bg-ql-accent text-white text-sm font-semibold rounded-2xl"
            >
              ⚡ Generate with saved settings
            </button>
            <button
              onClick={() => setUsingSaved(false)}
              className="w-full py-3 text-ql-3 text-sm text-center underline"
            >
              Change preferences
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="bg-ql-surface rounded-t-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-ql-surface3">
          <div
            className="h-full bg-ql-accent transition-all duration-400"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ql">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <span className="text-ql text-sm font-semibold">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-ql-3 text-xs">{step + 1} / {questions.length}</span>
            <button onClick={onClose} className="text-ql-3 text-sm">✕</button>
          </div>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Question */}
          <div className="flex flex-col gap-1">
            <span className="text-3xl">{q.emoji}</span>
            <h3 className="text-ql text-lg font-bold mt-2">{q.question}</h3>
            {q.multiSelect && (
              <p className="text-ql-3 text-xs">Select all that apply</p>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2 pb-2">
            {q.options.map(opt => {
              if (q.multiSelect) {
                const selected = multiSelected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleMulti(opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded-2xl transition-all text-left ${
                      selected
                        ? 'bg-ql-accent/15 border-ql-accent'
                        : 'bg-ql-surface2 border-ql hover:border-ql-accent'
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className={`text-sm font-medium transition-colors flex-1 ${selected ? 'text-ql-accent' : 'text-ql'}`}>
                      {opt.label}
                    </span>
                    <span className={`text-base transition-colors ${selected ? 'text-ql-accent' : 'text-ql-3'}`}>
                      {selected ? '✓' : '○'}
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={opt.value}
                  onClick={() => pick(opt.value)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-ql-surface2 border border-ql hover:border-ql-accent rounded-2xl transition-all text-left group"
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-ql text-sm font-medium group-hover:text-ql-accent transition-colors">
                    {opt.label}
                  </span>
                  <span className="ml-auto text-ql-3 text-xs group-hover:text-ql-accent">›</span>
                </button>
              );
            })}
          </div>

          {/* Multi-select confirm button */}
          {q.multiSelect && (
            <button
              onClick={confirmMulti}
              disabled={multiSelected.length === 0}
              className="w-full py-3 bg-ql-accent disabled:opacity-40 text-white text-sm font-semibold rounded-2xl transition-colors"
            >
              {isLast ? 'Generate Plan' : 'Next →'}
            </button>
          )}

          {/* Back button */}
          {step > 0 && (
            <button
              onClick={() => goToStep(step - 1)}
              className="text-ql-3 text-xs text-center underline pb-2"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
