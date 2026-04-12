import { useState, useRef, useEffect, useCallback } from 'react';

export interface GlowPattern {
    targetH: number; targetS: number; targetV: number; rangeH: number;
    rangeS: number; rangeV: number; glowH: number; glowS: number;
    glowV: number; glowColorBlend: number; glowIntensity: number;
    isActive: number; // 0.0=無効, 1.0=有効 (WASMに合わせるためnumber)
}

export interface GlowParams {
    patterns: GlowPattern[]; // ここに3要素入れる
    blurSize: number;
    mode: number;
    decayRate: number;
    attackRate: number;
    // --- 新規追加 ---
    blurSamples: number;
    blurDirection: number;
    decoupleSpread: number;
    blurAngle: number; // padding から変更
}

const DEFAULT_PATTERN: GlowPattern = {
    targetH: 180, targetS: 0.75, targetV: 0.75,
    rangeH: 45, rangeS: 0.3, rangeV: 0.3,
    glowH: 180, glowS: 0.75, glowV: 0.75,
    glowColorBlend: 0.5,
    glowIntensity: 5.0,
    isActive: 1.0, // デフォルトで有効
};

const DEFAULT_PARAMS: GlowParams = {
    patterns: [
        { ...DEFAULT_PATTERN }, // パターン1 (水色系)
        { ...DEFAULT_PATTERN, targetH: 60, glowH: 60, isActive: 0.0 }, // パターン2 (黄色系・初期無効)
        { ...DEFAULT_PATTERN, targetH: 300, glowH: 300, isActive: 0.0 }, // パターン3 (紫系・初期無効)
    ],
    blurSize: 20.0,
    mode: 2,
    decayRate: 0.85,
    attackRate: 0.04,

    blurSamples: 0,
    blurDirection: 0,
    decoupleSpread: 0,
    blurAngle: 0,
};

export function useGlowParams() {
    const [params, setParams] = useState<GlowParams>(DEFAULT_PARAMS);
    const paramsRef = useRef<GlowParams>(params);

    // 描画ループで常に最新のパラメータを参照できるようにRefを同期
    useEffect(() => {
        paramsRef.current = params;
    }, [params]);

    const updatePatternParam = useCallback((index: number, key: keyof GlowPattern, value: number) => {
        setParams(prev => {
            const newPatterns = [...prev.patterns];
            newPatterns[index] = { ...newPatterns[index], [key]: value };
            return { ...prev, patterns: newPatterns };
        });
    }, []);

    const resetParams = useCallback(() => {
        setParams(DEFAULT_PARAMS);
    }, []);

    return { params, paramsRef, updatePatternParam, resetParams, setParams };
}