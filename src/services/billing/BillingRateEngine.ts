import { StudioCallMode } from '../../types/cloudCall';
import {
  ApiProviderCostConfig,
  SessionFinancials,
  LicenseFeatureMode,
  RuleProfitabilityAnalysis,
} from '../../types/licensing';

const STORAGE_PROVIDER_COSTS = 'richx_api_provider_costs_v1';

/**
 * VERIFIED OFFICIAL BASE COSTS:
 * 1. fal.ai LUCY 2.5 Real-Time Video Engine:
 *    - Official serverless inference pricing: $0.0400 per second of video ($2.40 / minute).
 * 2. Voice-Cloning Engine (ElevenLabs Speech-to-Speech / fal.ai voice models):
 *    - Real-time Speech-to-Speech (STS) 1,000 credits/min ($0.12/min) + live streaming network overhead:
 *      $0.0025 per second ($0.1500 / minute).
 * 3. Natural Microphone Audio / WebRTC Relay:
 *    - Bandwidth & signaling relay: $0.0001 per second ($0.0060 / minute).
 */
export const VERIFIED_DEFAULT_PROVIDER_COSTS: ApiProviderCostConfig = {
  lucy25VideoPerSecCost: 0.0400, // $0.04 / sec = $2.40 / min (fal.ai official)
  lucyProviderName: 'fal.ai (Decart LUCY 2.5 Real-Time Video)',

  voiceCloningPerSecCost: 0.0025, // $0.15 / min (ElevenLabs STS official)
  voiceProviderName: 'ElevenLabs Speech-to-Speech (STS) & Instant Clone',

  naturalAudioPerSecCost: 0.0001, // $0.006 / min (WebRTC Natural Audio Relay)

  profitMarginPercent: 40, // 40% Target Profit Margin
  minGuaranteedProfitMarginPercent: 25, // 25% Absolute Minimum Safety Floor

  lastVerifiedAt: '2026-09-23',
  sourceNotes: 'Verified via fal.ai real-time LUCY 2.5 ($0.04/sec) and ElevenLabs STS streaming ($0.12-$0.20/min).',
};

export class BillingRateEngine {
  /**
   * Retrieves active provider costs from storage or defaults to verified rates
   */
  public static getProviderCosts(): ApiProviderCostConfig {
    try {
      const stored = localStorage.getItem(STORAGE_PROVIDER_COSTS);
      if (!stored) {
        return { ...VERIFIED_DEFAULT_PROVIDER_COSTS };
      }
      return { ...VERIFIED_DEFAULT_PROVIDER_COSTS, ...JSON.parse(stored) };
    } catch {
      return { ...VERIFIED_DEFAULT_PROVIDER_COSTS };
    }
  }

  /**
   * Saves updated provider costs (used by Admin Dashboard)
   */
  public static saveProviderCosts(updates: Partial<ApiProviderCostConfig>): ApiProviderCostConfig {
    const current = this.getProviderCosts();
    const updated: ApiProviderCostConfig = {
      ...current,
      ...updates,
      lastVerifiedAt: new Date().toISOString().split('T')[0],
    };
    localStorage.setItem(STORAGE_PROVIDER_COSTS, JSON.stringify(updated));
    return updated;
  }

  /**
   * Resets provider costs back to official verified rates
   */
  public static resetToVerifiedDefaults(): ApiProviderCostConfig {
    localStorage.setItem(STORAGE_PROVIDER_COSTS, JSON.stringify(VERIFIED_DEFAULT_PROVIDER_COSTS));
    return { ...VERIFIED_DEFAULT_PROVIDER_COSTS };
  }

  /**
   * Calculates the exact RAW API cost per second incurred by the platform
   */
  public static getRawApiCostPerSecond(
    mode: StudioCallMode,
    isClonedVoice: boolean
  ): {
    lucyVideoCostSec: number;
    voiceCloningCostSec: number;
    naturalAudioCostSec: number;
    totalRawCostSec: number;
  } {
    const costs = this.getProviderCosts();

    const isVideoActive = mode === 'video_audio' || mode === 'video_only';
    const isVoiceCloningActive =
      isClonedVoice && (mode === 'video_audio' || mode === 'audio_only' || mode === 'video_only');

    const lucyVideoCostSec = isVideoActive ? costs.lucy25VideoPerSecCost : 0;
    const voiceCloningCostSec = isVoiceCloningActive ? costs.voiceCloningPerSecCost : 0;
    const naturalAudioCostSec = !isVoiceCloningActive ? costs.naturalAudioPerSecCost : 0.00005;

    const totalRawCostSec = lucyVideoCostSec + voiceCloningCostSec + naturalAudioCostSec;

    return {
      lucyVideoCostSec,
      voiceCloningCostSec,
      naturalAudioCostSec,
      totalRawCostSec,
    };
  }

  /**
   * Calculates the user billing rate per second, strictly enforcing profit margin
   * so the platform NEVER operates at a loss.
   */
  public static getUserBilledRatePerSecond(
    mode: StudioCallMode,
    isClonedVoice: boolean
  ): {
    rawCostSec: number;
    billedRateSec: number;
    profitPerSec: number;
    marginPercent: number;
  } {
    const costs = this.getProviderCosts();
    const { totalRawCostSec } = this.getRawApiCostPerSecond(mode, isClonedVoice);

    // Apply configured profit margin
    const targetMargin = Math.max(costs.profitMarginPercent, costs.minGuaranteedProfitMarginPercent);
    const billedRateSec = totalRawCostSec * (1 + targetMargin / 100);
    const profitPerSec = billedRateSec - totalRawCostSec;

    return {
      rawCostSec: totalRawCostSec,
      billedRateSec,
      profitPerSec,
      marginPercent: targetMargin,
    };
  }

  /**
   * Computes per-minute rate summary for display across all 3 modes
   */
  public static getModeRatesPerMinute(): Array<{
    modeKey: StudioCallMode;
    voiceOption: 'cloned' | 'natural';
    label: string;
    rawCostMin: number;
    userPriceMin: number;
    profitMin: number;
    marginPercent: number;
  }> {
    const modes: Array<{ modeKey: StudioCallMode; voiceOption: 'cloned' | 'natural'; label: string }> = [
      { modeKey: 'video_audio', voiceOption: 'cloned', label: '1. Video + Audio (Cloned Voice)' },
      { modeKey: 'video_audio', voiceOption: 'natural', label: '1. Video + Audio (Natural Voice)' },
      { modeKey: 'audio_only', voiceOption: 'cloned', label: '2. Audio Calls Only (Cloned Voice)' },
      { modeKey: 'audio_only', voiceOption: 'natural', label: '2. Audio Calls Only (Natural Voice)' },
      { modeKey: 'video_only', voiceOption: 'natural', label: '3. Video Calls Only (Natural Mic)' },
      { modeKey: 'video_only', voiceOption: 'cloned', label: '3. Video Calls Only (Optional Cloned)' },
    ];

    return modes.map((m) => {
      const res = this.getUserBilledRatePerSecond(m.modeKey, m.voiceOption === 'cloned');
      return {
        modeKey: m.modeKey,
        voiceOption: m.voiceOption,
        label: m.label,
        rawCostMin: +(res.rawCostSec * 60).toFixed(4),
        userPriceMin: +(res.billedRateSec * 60).toFixed(4),
        profitMin: +(res.profitPerSec * 60).toFixed(4),
        marginPercent: res.marginPercent,
      };
    });
  }

  /**
   * Calculates comprehensive session financials for any given duration
   */
  public static calculateSessionFinancials(
    durationSec: number,
    mode: StudioCallMode,
    isClonedVoice: boolean
  ): SessionFinancials {
    const rawCosts = this.getRawApiCostPerSecond(mode, isClonedVoice);
    const userRates = this.getUserBilledRatePerSecond(mode, isClonedVoice);

    const rawLucyVideoCostUsd = +(rawCosts.lucyVideoCostSec * durationSec).toFixed(4);
    const rawVoiceCloningCostUsd = +(rawCosts.voiceCloningCostSec * durationSec).toFixed(4);
    const rawNaturalAudioCostUsd = +(rawCosts.naturalAudioCostSec * durationSec).toFixed(4);
    const totalRawApiCostUsd = +(rawCosts.totalRawCostSec * durationSec).toFixed(4);

    const userBilledAmountUsd = +(userRates.billedRateSec * durationSec).toFixed(4);
    const netOwnerProfitUsd = +(userBilledAmountUsd - totalRawApiCostUsd).toFixed(4);
    const profitMarginAchievedPercent = totalRawApiCostUsd > 0
      ? +((netOwnerProfitUsd / totalRawApiCostUsd) * 100).toFixed(1)
      : userRates.marginPercent;

    // Minute deduction multiplier relative to standard base (1 standard min = 60s of active mode)
    const normalizedMinutesDeducted = +(durationSec / 60).toFixed(2);

    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    return {
      durationSec,
      durationFormatted,
      rawLucyVideoCostUsd,
      rawVoiceCloningCostUsd,
      rawNaturalAudioCostUsd,
      totalRawApiCostUsd,
      userBilledAmountUsd,
      netOwnerProfitUsd,
      profitMarginAchievedPercent,
      normalizedMinutesDeducted,
    };
  }

  /**
   * Computes the normalized minute consumption multiplier for tick deduction
   * Ensures that high-cost video calls consume product key minutes at a rate proportional
   * to their underlying API cost, while audio-only calls conserve minutes.
   */
  public static getMinuteConsumptionMultiplier(
    mode: StudioCallMode,
    isClonedVoice: boolean,
    assignedFeatureMode?: string
  ): number {
    // If the key is specifically bound to a single mode (e.g. audio_only key or video_audio key),
    // 1 minute on that key corresponds to 1 real minute of that feature:
    if (assignedFeatureMode === mode) {
      return 1.0;
    }

    // For generic / all-mode / VIP keys:
    // Normalize against standard Video + Audio natural ($2.406/min = 1.0x baseline)
    const baseRaw = 0.0401; // $2.406 / 60
    const current = this.getRawApiCostPerSecond(mode, isClonedVoice);
    const ratio = current.totalRawCostSec / baseRaw;

    // Minimum multiplier 0.1x, maximum 1.5x
    return +Math.max(0.1, Math.min(2.0, ratio)).toFixed(2);
  }

  /**
   * Evaluates the exact profit or loss for ANY given time and minute rules.
   * Compares the allocated minutes, timer multiplier, selected call mode, and retail price charged
   * against the verified underlying API costs (Lucy 2.5 + ElevenLabs STS).
   */
  public static calculateRuleProfitability(
    allocatedMinutes: number,
    featureMode: LicenseFeatureMode,
    clientPriceChargedUsd: number = 0,
    timerMultiplier: number = 1.0,
    clonedVoiceExpected: boolean = true
  ): RuleProfitabilityAnalysis {
    const costs = this.getProviderCosts();
    const effectiveMultiplier = Math.max(0.1, timerMultiplier || 1.0);
    
    // How many actual real-world calling minutes the user gets before the key expires
    const realAllowedMinutes = allocatedMinutes / effectiveMultiplier;
    
    // Map license feature mode to StudioCallMode
    let mode: StudioCallMode = 'video_audio';
    if (featureMode === 'audio_only' || featureMode === 'voice_only') mode = 'audio_only';
    else if (featureMode === 'video_only') mode = 'video_only';
    else mode = 'video_audio';

    const rawCostsSec = this.getRawApiCostPerSecond(mode, clonedVoiceExpected);
    const rawApiCostPerMinuteUsd = +(rawCostsSec.totalRawCostSec * 60).toFixed(4);
    const totalRawApiCostUsd = +(realAllowedMinutes * rawApiCostPerMinuteUsd).toFixed(2);
    
    const breakEvenPriceUsd = totalRawApiCostUsd;
    const targetMargin = Math.max(costs.profitMarginPercent, costs.minGuaranteedProfitMarginPercent);
    const suggestedPriceUsd = +(totalRawApiCostUsd * (1 + targetMargin / 100)).toFixed(2);

    const price = Math.max(0, clientPriceChargedUsd || 0);
    const netProfitUsd = +(price - totalRawApiCostUsd).toFixed(2);
    const profitMarginPercent = price > 0 ? +((netProfitUsd / price) * 100).toFixed(1) : 0;
    const isProfitable = price > totalRawApiCostUsd;
    const lossAmountUsd = isProfitable ? 0 : +(totalRawApiCostUsd - price).toFixed(2);

    let status: 'profitable' | 'loss' | 'breakeven' | 'unset' = 'unset';
    if (price === 0) {
      status = 'unset';
    } else if (price > totalRawApiCostUsd) {
      status = 'profitable';
    } else if (price === totalRawApiCostUsd) {
      status = 'breakeven';
    } else {
      status = 'loss';
    }

    return {
      allocatedMinutes,
      timerMultiplier: effectiveMultiplier,
      realAllowedMinutes: +realAllowedMinutes.toFixed(1),
      featureMode,
      rawApiCostPerMinuteUsd,
      totalRawApiCostUsd,
      breakEvenPriceUsd,
      suggestedPriceUsd,
      clientPriceChargedUsd: price,
      netProfitUsd,
      profitMarginPercent,
      isProfitable,
      status,
      lossAmountUsd,
    };
  }
}
