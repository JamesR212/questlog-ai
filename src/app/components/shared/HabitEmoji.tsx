// Renders a HabitDef emoji — handles regular emoji strings and custom image data URLs
const SIZE_MAP: Record<string, string> = {
  'text-2xl': 'w-8 h-8',
  'text-xl':  'w-6 h-6',
  'text-lg':  'w-5 h-5',
  'text-base':'w-4 h-4',
  'text-sm':  'w-4 h-4',
};

export default function HabitEmoji({ emoji, className }: { emoji: string; className?: string }) {
  const isImg = emoji.startsWith('data:') || emoji.startsWith('blob:');
  if (isImg) {
    const match = Object.keys(SIZE_MAP).find(k => className?.includes(k));
    const sizeClass = match ? SIZE_MAP[match] : 'w-6 h-6';
    return <img src={emoji} alt="" className={`${sizeClass} rounded-md object-cover inline-block shrink-0`} />;
  }
  return <span className={className}>{emoji}</span>;
}
