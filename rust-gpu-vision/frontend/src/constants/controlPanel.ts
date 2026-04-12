import type { GlowParams, GlowPattern } from '../hooks/useGlowParams';

export const UI_CONSTANTS = {
    W: 200,
    SV_H: 200,
    M: 12,
    BAR_H: 24,
    get HUE_Y() { return this.SV_H + this.M; }
};

type GlobalParamKey = Exclude<keyof GlowParams, 'patterns'>;

export const GLOBAL_CONTROLS: { label: string; key: GlobalParamKey; min: number; max: number; step: number }[] = [
    { label: 'Blur Size', key: 'blurSize', min: 0, max: 200.0, step: 0.1 },
    { label: 'Decay', key: 'decayRate', min: 0, max: 0.99, step: 0.01 },
    { label: 'Attack', key: 'attackRate', min: 0.01, max: 1.0, step: 0.01 },
];

export const PATTERN_CONTROLS: { label: string; key: keyof GlowPattern; min: number; max: number; step: number }[] = [
    { label: 'Glow Power', key: 'glowIntensity', min: 0, max: 10, step: 0.1 },
    { label: 'Color Blend', key: 'glowColorBlend', min: 0, max: 1.0, step: 0.01 },
    { label: 'Hue Range (±)', key: 'rangeH', min: 0, max: 180, step: 1 },
    { label: 'Sat Range (±)', key: 'rangeS', min: 0, max: 0.5, step: 0.01 },
    { label: 'Val Range (±)', key: 'rangeV', min: 0, max: 0.5, step: 0.01 },
];

// 例: 新しいコントロール用
export const EXTRA_CONTROLS = [
    { key: 'blurSamples', label: 'Blur Quality', min: 4, max: 16, step: 4 },
];