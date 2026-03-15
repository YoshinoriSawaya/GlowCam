import { useState, useRef, useEffect, useCallback } from 'react';

// パラメータの型を厳密に定義（Rust側と一致させる）
export interface GlowParams {
    targetH: number;
    targetS: number;
    targetV: number;
    rangeH: number;
    rangeS: number;
    rangeV: number;
    glowH: number;         // 追加: 光らせる先の色相
    glowS: number;         // 追加: 光らせる先の彩度
    glowV: number;         // 追加: 光らせる先の明度
    glowColorBlend: number;// 追加: 色の寄せ具合 (0.0=元の色, 1.0=Glow色)
    glowIntensity: number;
    blurSize: number;
    mode: number;
    decayRate: number;
    attackRate: number;
}

const DEFAULT_PARAMS: GlowParams = {
    targetH: 180, targetS: 0.75, targetV: 0.75,
    rangeH: 45, rangeS: 0.3, rangeV: 0.3,
    glowH: 180, glowS: 0.75, glowV: 0.75, // 光の色はデフォルトで鮮やかな水色
    glowColorBlend: 0.5,                    // デフォルトは元の色を維持 (0.0)
    glowIntensity: 5.0,
    blurSize: 20.0,
    mode: 2,
    decayRate: 0.85,
    attackRate: 0.04,
};

export function useGlowParams() {
    const [params, setParams] = useState<GlowParams>(DEFAULT_PARAMS);
    const paramsRef = useRef<GlowParams>(params);

    // 描画ループで常に最新のパラメータを参照できるようにRefを同期
    useEffect(() => {
        paramsRef.current = params;
    }, [params]);

    const updateParam = useCallback((key: keyof GlowParams, value: number) => {
        setParams(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetParams = useCallback(() => {
        setParams(DEFAULT_PARAMS);
    }, []);

    return { params, paramsRef, updateParam, resetParams, setParams };
}