import React, { useState } from 'react';
import { Key, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Info, Sparkles } from 'lucide-react';

interface FalKeyPairInputProps {
  value: string;
  onChange: (combinedKey: string) => void;
  disabled?: boolean;
  compact?: boolean;
  dark?: boolean;
  className?: string;
}

/**
 * Splits a combined key string "key-id:key-secret" into its parts.
 * Handles accidental prefixes like "Key " or whitespace.
 */
const splitKey = (combined: string): [string, string] => {
  if (!combined) return ['', ''];
  let clean = combined.trim();
  if (clean.startsWith('Key ')) {
    clean = clean.slice(4).trim();
  }
  const idx = clean.indexOf(':');
  if (idx === -1) return [clean, ''];
  return [clean.slice(0, idx).trim(), clean.slice(idx + 1).trim()];
};

/**
 * Combines separate key ID and secret into "key-id:key-secret".
 */
const combineKey = (keyId: string, keySecret: string): string => {
  const id = keyId.trim().replace(/^Key\s+/i, '');
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
  const [showValues, setShowValues] = useState<boolean>(false);
  const [autoSplitNotice, setAutoSplitNotice] = useState<boolean>(false);

  const [keyId, keySecret] = splitKey(value);
  const pad = compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs';
  const bg = dark ? 'bg-slate-950' : 'bg-slate-900';

  const hasKeyId = Boolean(keyId);
  const hasKeySecret = Boolean(keySecret);
  const isComplete = hasKeyId && hasKeySecret;

  // Smart paste handler: if user pastes a combined key containing ":" into either box,
  // automatically split it into Key ID and Key Secret!
  const handleKeyIdChange = (raw: string) => {
    let clean = raw.trim();
    if (clean.startsWith('Key ')) {
      clean = clean.slice(4).trim();
    }
    if (clean.includes(':')) {
      const parts = clean.split(':');
      const newId = parts[0].trim();
      const newSecret = parts.slice(1).join(':').trim();
      onChange(combineKey(newId, newSecret));
      setAutoSplitNotice(true);
      setTimeout(() => setAutoSplitNotice(false), 3000);
    } else {
      onChange(combineKey(clean, keySecret));
    }
  };

  const handleKeySecretChange = (raw: string) => {
    let clean = raw.trim();
    if (clean.startsWith('Key ')) {
      clean = clean.slice(4).trim();
    }
    if (clean.includes(':')) {
      const parts = clean.split(':');
      const newId = parts[0].trim();
      const newSecret = parts.slice(1).join(':').trim();
      onChange(combineKey(newId, newSecret));
      setAutoSplitNotice(true);
      setTimeout(() => setAutoSplitNotice(false), 3000);
    } else {
      onChange(combineKey(keyId, clean));
    }
  };

  return (
    <div className={`space-y-2 rounded-xl p-2.5 border border-slate-800/80 bg-slate-950/40 ${className}`}>
      {/* Top Bar with Show/Hide Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-purple-400 tracking-wide uppercase flex items-center gap-1">
            <Key className="w-3.5 h-3.5" />
            fal.ai Key Pair Credentials
          </span>
          {autoSplitNotice && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded animate-pulse">
              <Sparkles className="w-3 h-3" />
              Auto-split Key ID & Secret
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowValues(!showValues)}
          className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-700/80 hover:border-slate-600 px-2 py-0.5 rounded transition-colors"
          title={showValues ? 'Hide API key values' : 'Show API key values for verification'}
        >
          {showValues ? (
            <>
              <EyeOff className="w-3 h-3" />
              <span>Hide Keys</span>
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              <span>Verify / Show Keys</span>
            </>
          )}
        </button>
      </div>

      {/* Box 1: Key ID */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Key className="w-3 h-3 text-purple-400" />
            <span>1. FAL.AI KEY ID (Identifier / UUID)</span>
          </label>
          {hasKeyId ? (
            <span className="text-[10px] text-emerald-400 font-medium">✓ Key ID Entered</span>
          ) : (
            <span className="text-[10px] text-amber-400/90 font-medium">Required Part 1</span>
          )}
        </div>
        <input
          type={showValues ? 'text' : 'password'}
          value={keyId}
          disabled={disabled}
          onChange={(e) => handleKeyIdChange(e.target.value)}
          placeholder="e.g. 018f3a5b-7c8d-4e9f-8a1b-2c3d4e5f6a7b"
          autoComplete="off"
          spellCheck={false}
          className={`w-full ${bg} border ${
            hasKeyId ? 'border-purple-500/50' : 'border-slate-700'
          } disabled:opacity-40 rounded-lg ${pad} text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors`}
        />
      </div>

      {/* Box 2: Key Secret */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>2. FAL.AI KEY SECRET (Private Secret)</span>
          </label>
          {hasKeySecret ? (
            <span className="text-[10px] text-emerald-400 font-medium">✓ Key Secret Entered</span>
          ) : (
            <span className="text-[10px] text-amber-400/90 font-medium">Required Part 2</span>
          )}
        </div>
        <input
          type={showValues ? 'text' : 'password'}
          value={keySecret}
          disabled={disabled}
          onChange={(e) => handleKeySecretChange(e.target.value)}
          placeholder="e.g. a8f9c2e1b0d3e5f7a9b8c0d1e2f3a4b5..."
          autoComplete="off"
          spellCheck={false}
          className={`w-full ${bg} border ${
            hasKeySecret ? 'border-emerald-500/50' : 'border-slate-700'
          } disabled:opacity-40 rounded-lg ${pad} text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors`}
        />
      </div>

      {/* Status & Guidance Indicator */}
      <div className="pt-0.5 flex items-center justify-between text-[10px]">
        {isComplete ? (
          <div className="flex items-center gap-1 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Both Key ID & Key Secret configured (Saved as key-id:key-secret)</span>
          </div>
        ) : hasKeyId && !hasKeySecret ? (
          <div className="flex items-center gap-1 text-amber-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Missing Key Secret. fal.ai requires BOTH Key ID and Key Secret.</span>
          </div>
        ) : !hasKeyId && hasKeySecret ? (
          <div className="flex items-center gap-1 text-amber-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Missing Key ID. fal.ai requires BOTH Key ID and Key Secret.</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-slate-400">
            <Info className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span>Get your Key ID and Key Secret at fal.ai &rarr; Dashboard &rarr; Keys.</span>
          </div>
        )}
      </div>
    </div>
  );
};
