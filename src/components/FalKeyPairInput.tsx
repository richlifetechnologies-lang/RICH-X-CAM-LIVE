import React from 'react';

interface FalKeyPairInputProps {
  value: string;
  onChange: (combinedKey: string) => void;
  disabled?: boolean;
  compact?: boolean;
  dark?: boolean;
  className?: string;
}

const splitKey = (combined: string): [string, string] => {
  const idx = combined.indexOf(':');
  if (idx === -1) return [combined, ''];
  return [combined.slice(0, idx), combined.slice(idx + 1)];
};

const combineKey = (keyId: string, keySecret: string): string => {
  const id = keyId.trim();
  const secret = keySecret.trim();
  if (id && secret) return `${id}:${secret}`;
  return id || secret;
};

export const FalKeyPairInput: React.FC<FalKeyPairInputProps> = ({
  value,
  onChange,
  disabled = false,
  compact = false,
  dark = false,
  className = '',
}) => {
  const [keyId, keySecret] = splitKey(value);
  const pad = compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';
  const bg = dark ? 'bg-slate-950' : 'bg-slate-900';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <input
        type="password"
        value={keyId}
        disabled={disabled}
        onChange={(e) => onChange(combineKey(e.target.value, keySecret))}
        placeholder="fal.ai Key ID..."
        autoComplete="off"
        className={`w-full ${bg} border border-slate-700 disabled:opacity-40 rounded-lg ${pad} text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500`}
      />
      <input
        type="password"
        value={keySecret}
        disabled={disabled}
        onChange={(e) => onChange(combineKey(keyId, e.target.value))}
        placeholder="fal.ai Key Secret..."
        autoComplete="off"
        className={`w-full ${bg} border border-slate-700 disabled:opacity-40 rounded-lg ${pad} text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500`}
      />
      <p className="text-[10px] text-slate-500 leading-snug">
        Find both values at fal.ai &rarr; Dashboard &rarr; Keys. Saved as{' '}
        <span className="font-mono text-slate-400">key-id:key-secret</span>.
      </p>
    </div>
  );
};
