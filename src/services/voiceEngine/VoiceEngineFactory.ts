import { EngineSettings, IVoiceConversionEngine, ProviderType } from '../../types/voiceEngine';
import { ElevenLabsEngine } from './ElevenLabsEngine';
import { MockOrLocalEngine } from './MockOrLocalEngine';

export class VoiceEngineFactory {
  public static createEngine(provider: ProviderType, settings: EngineSettings): IVoiceConversionEngine {
    let engine: IVoiceConversionEngine;

    switch (provider) {
      case 'elevenlabs':
        engine = new ElevenLabsEngine();
        break;
      case 'rvc_cloud':
      case 'simulation_local':
      default:
        engine = new MockOrLocalEngine();
        break;
    }

    engine.init(settings);
    return engine;
  }
}
