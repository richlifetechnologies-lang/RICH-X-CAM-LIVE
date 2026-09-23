import React, { useState } from 'react';
import { Upload, Trash2, CheckCircle2, Sparkles, Play, AlertCircle } from 'lucide-react';
import { ClonedVoiceItem } from '../types/cloudCall';

interface VoiceCloningSectionProps {
  voices: ClonedVoiceItem[];
  activeVoiceId: string;
  voiceEngineApiKey: string;
  onSelectVoice: (id: string) => void;
  onVoiceAdded: (voice: ClonedVoiceItem) => void;
  onVoiceDeleted: (id: string) => void;
}

export const VoiceCloningSection: React.FC<VoiceCloningSectionProps> = ({
  voices,
  activeVoiceId,
  voiceEngineApiKey,
  onSelectVoice,
  onVoiceAdded,
  onVoiceDeleted,
}) => {
  const [voiceName, setVoiceName] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.mp3') && !file.name.endsWith('.wav')) {
        setErrorMsg('Please upload an MP3 or WAV file.');
        return;
      }
      setAudioFile(file);
      if (!voiceName) {
        setVoiceName(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      }
    }
  };

  const handleUploadAndClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !voiceName.trim()) {
      setErrorMsg('Please enter a voice profile name and choose an audio sample.');
      return;
    }

    if (!voiceEngineApiKey) {
      setErrorMsg('Voice Engine API Key required. Please configure it in Settings.');
      return;
    }

    setIsCloning(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('name', voiceName.trim());
      formData.append('files', audioFile);
      formData.append('description', 'RICH X CAM LIVE Custom Profile');

      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'xi-api-key': voiceEngineApiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(data.detail?.message || data.detail || `Upload failed (${response.status})`);
      }

      const resData = await response.json();
      const newVoice: ClonedVoiceItem = {
        id: `clone_${Date.now()}`,
        name: voiceName.trim(),
        providerVoiceId: resData.voice_id,
        sampleFileName: audioFile.name,
        sampleDurationSec: 30,
        audioBlobUrl: URL.createObjectURL(audioFile),
        createdAt: Date.now(),
        category: 'custom_cloned',
      };

      onVoiceAdded(newVoice);
      onSelectVoice(newVoice.providerVoiceId);
      setSuccessMsg(`"${newVoice.name}" ready and synchronized for RICH X CAM LIVE!`);
      setVoiceName('');
      setAudioFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize voice profile.');
    } finally {
      setIsCloning(false);
    }
  };

  const playPreview = (voice: ClonedVoiceItem) => {
    if (voice.audioBlobUrl) {
      const audio = new Audio(voice.audioBlobUrl);
      audio.play().catch(() => {});
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Upload Audio & Clone Voice for RICHX CAM</span>
        </h3>
        <span className="text-[10px] text-emerald-400 font-mono font-semibold">RICH X AUDIO</span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Upload your reference audio sample (MP3 or WAV). RICH X CAM LIVE synchronizes your speech with the video output.
      </p>

      {/* Upload Form */}
      <form onSubmit={handleUploadAndClone} className="space-y-3 pt-1">
        <input
          type="text"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="Voice Profile Name (e.g. Executive Voice)"
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        <div className="border border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-3 text-center cursor-pointer transition-colors relative bg-slate-950/40">
          <input
            type="file"
            accept="audio/mp3,audio/wav"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="flex items-center justify-center gap-2 pointer-events-none text-xs text-slate-300">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span className="truncate max-w-[200px]">
              {audioFile ? audioFile.name : 'Select reference audio (MP3 / WAV)'}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-900/40 p-2 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 p-2 rounded-lg flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isCloning}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-medium py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow"
        >
          {isCloning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Audio Sample...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>Clone Voice for Call</span>
            </>
          )}
        </button>
      </form>

      {/* Available Cloned Voices List */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <label className="block text-[11px] font-semibold text-slate-300">
          Active Voice for RICHX CAM:
        </label>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {voices.map((v) => {
            const isSelected = activeVoiceId === v.providerVoiceId;
            return (
              <div
                key={v.id}
                className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div
                  className="flex-1 cursor-pointer truncate mr-2"
                  onClick={() => onSelectVoice(v.providerVoiceId)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white truncate">{v.name}</span>
                    {isSelected && (
                      <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 rounded">
                        PIPELINED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block truncate">
                    Profile ID: {v.providerVoiceId.slice(0, 10)}...
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {v.audioBlobUrl && (
                    <button
                      type="button"
                      onClick={() => playPreview(v)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Preview reference audio"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}

                  {v.category === 'custom_cloned' && (
                    <button
                      type="button"
                      onClick={() => onVoiceDeleted(v.id)}
                      className="p-1 rounded bg-slate-800 hover:bg-rose-900/50 hover:text-rose-300 text-slate-400 transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
