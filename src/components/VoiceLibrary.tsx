import React, { useState } from 'react';
import { Upload, Play, Trash2, CheckCircle2, ShieldAlert, Sparkles, Volume2, Plus } from 'lucide-react';
import { VoiceProfile, EngineSettings } from '../types/voiceEngine';
import { VoiceEngineFactory } from '../services/voiceEngine/VoiceEngineFactory';

interface VoiceLibraryProps {
  profiles: VoiceProfile[];
  selectedVoiceId: string;
  settings: EngineSettings;
  onSelectVoice: (id: string) => void;
  onSaveProfile: (profile: VoiceProfile) => void;
  onDeleteProfile: (id: string) => void;
}

export const VoiceLibrary: React.FC<VoiceLibraryProps> = ({
  profiles,
  selectedVoiceId,
  settings,
  onSelectVoice,
  onSaveProfile,
  onDeleteProfile,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [voiceName, setVoiceName] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav')) {
        setUploadError('Invalid format. Please upload an uncompressed WAV or MP3 recording.');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setUploadError('File size exceeds 25MB limit.');
        return;
      }
      setAudioFile(file);
      if (!voiceName) {
        // Auto-fill friendly voice name
        setVoiceName(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      }
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !voiceName.trim()) {
      setUploadError('Please specify a voice profile name and select an audio sample.');
      return;
    }
    if (!consentChecked) {
      setUploadError('You must acknowledge and verify voice ownership/authorization before cloning.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setSuccessMsg(null);

    try {
      const engine = VoiceEngineFactory.createEngine(settings.provider, settings);
      const newProfile = await engine.createVoiceProfile(audioFile, voiceName.trim(), consentChecked);
      onSaveProfile(newProfile);
      setSuccessMsg(`Voice profile "${newProfile.name}" created and synced successfully!`);
      setVoiceName('');
      setAudioFile(null);
      setConsentChecked(false);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to create voice profile on cloud provider.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTestPreview = async (profile: VoiceProfile) => {
    if (previewPlayingId === profile.id) return;
    setPreviewPlayingId(profile.id);

    try {
      const engine = VoiceEngineFactory.createEngine(settings.provider, settings);
      const rawAudio = await engine.testVoiceSample(profile.providerVoiceId);

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const pcm16 = new Int16Array(rawAudio);
      const audioBuffer = ctx.createBuffer(1, pcm16.length, 24000);
      const channel = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcm16.length; i++) {
        channel[i] = pcm16[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setPreviewPlayingId(null);
        ctx.close();
      };
      source.start();
    } catch (err) {
      console.error('Audio preview error', err);
      setPreviewPlayingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Voice Profile Library & Cloning Manager
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Upload reference audio recordings (MP3 or WAV) to extract vocal timbre and formants.
          Voice profiles are synchronized with your selected voice engine for real-time speech transformation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload & Create Voice Profile Form */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-md">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Create New Voice Profile
          </h3>

          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Profile Display Name
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g. Commander Shepard or Warm Narrator"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reference Audio Sample (MP3 or WAV)
              </label>
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/70 rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-slate-950/50">
                <input
                  type="file"
                  accept="audio/mp3,audio/wav,audio/mpeg"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                  <Upload className="w-6 h-6 text-indigo-400" />
                  <span className="text-xs font-medium text-slate-200">
                    {audioFile ? audioFile.name : 'Click or drag reference audio here'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Recommended: 30–60s clean speech without background music or echo
                  </span>
                </div>
              </div>
            </div>

            {/* Biometric Ownership Verification & Ethics */}
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-200/90 leading-tight">
                  <strong>Ethical AI & Legal Verification:</strong> Voice cloning requires explicit authorization.
                  You must own or hold written legal permission to clone and synthesize this vocal likeness.
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-1 pt-1 border-t border-amber-900/30">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900"
                />
                <span className="text-xs text-slate-300 select-none">
                  I confirm I hold full ownership or explicit consent to use this voice.
                </span>
              </label>
            </div>

            {uploadError && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg">
                {uploadError}
              </div>
            )}

            {successMsg && (
              <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Voice Embedding...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Upload & Generate Profile</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Voices Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              Available Voice Profiles ({profiles.length})
            </h3>
            <span className="text-xs text-slate-400">
              Active Engine: <strong className="text-slate-200">{settings.provider}</strong>
            </span>
          </div>

          <div className="space-y-3">
            {profiles.map((profile) => {
              const isSelected = selectedVoiceId === profile.id;
              return (
                <div
                  key={profile.id}
                  className={`border rounded-xl p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{profile.name}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                          ACTIVE FOR CALLS
                        </span>
                      )}
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                        {profile.category.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {profile.description || 'Reference sample calibrated for real-time speech transformation.'}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono pt-1">
                      <span>Provider: {profile.provider}</span>
                      <span>Sample: {profile.sampleFileName}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleTestPreview(profile)}
                      disabled={previewPlayingId === profile.id}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors border border-slate-700"
                      title="Audition reference sample"
                    >
                      {previewPlayingId === profile.id ? (
                        <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span>Test</span>
                    </button>

                    <button
                      onClick={() => onSelectVoice(profile.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Use Voice'}
                    </button>

                    {profile.category === 'custom' && (
                      <button
                        onClick={() => onDeleteProfile(profile.id)}
                        className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 text-xs transition-colors border border-slate-700/80"
                        title="Delete profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
