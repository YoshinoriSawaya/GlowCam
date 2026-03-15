import React from 'react';
import { HsvColorPicker } from "react-colorful";
// import "react-colorful/styles.css";
import type { GlowParams } from '../hooks/useGlowParams';

interface ControlPanelProps {
    params: GlowParams;
    updateParam: (key: keyof GlowParams, value: number) => void;
    setParams: React.Dispatch<React.SetStateAction<GlowParams>>;
    resetParams: () => void;
}

// RGB変換ヘルパー
const getRgbDisplay = (h: number, s: number, v: number) => {
    const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    const r = Math.round(f(5) * 255);
    const g = Math.round(f(3) * 255);
    const b = Math.round(f(1) * 255);
    return `RGB(${r}, ${g}, ${b})`;
};

/**
 * Hueスライダー上の範囲（矩形）を計算して返すヘルパー関数
 * ラップアラウンド（0-360度の回り込み）に対応
 */
const renderHueRangeSegments = (h: number, range: number, width: number, y: number, height: number) => {
    const degToX = (deg: number) => (deg / 360) * width;
    const start = h - range;
    const end = h + range;

    // 共通のスタイル
    const rectProps = { y, height, fill: "none", stroke: "white", strokeWidth: 2, rx: 4 };
    const segments = [];

    // 1. メインの範囲 (0〜360度の間に収まる部分)
    const mainStart = Math.max(0, start);
    const mainEnd = Math.min(360, end);
    if (mainStart < mainEnd) {
        segments.push(
            <rect key="main" x={degToX(mainStart)} width={degToX(mainEnd - mainStart)} {...rectProps} />
        );
    }

    // 2. 左側へのはみ出し分 (0度を下回った場合 -> 右端に描画)
    if (start < 0) {
        segments.push(
            <rect key="left-oflow" x={degToX(360 + start)} width={degToX(Math.abs(start))} {...rectProps} />
        );
    }

    // 3. 右側へのはみ出し分 (360度を超えた場合 -> 左端に描画)
    if (end > 360) {
        segments.push(
            <rect key="right-oflow" x={0} width={degToX(end - 360)} {...rectProps} />
        );
    }

    return segments;
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ params, updateParam, setParams, resetParams }) => {
    // 手動調整用の定数
    const W = 200;        // ピッカーの幅を少しスリムに
    const SV_H = 200;     // 高さも合わせる
    const M = 12;
    const BAR_H = 24;
    const HUE_Y = SV_H + M;

    const controls: { label: string; key: keyof GlowParams; min: number; max: number; step: number }[] = [
        { label: 'Glow Power', key: 'glowIntensity', min: 0, max: 10, step: 0.1 },
        { label: 'Color Blend (指定色に寄せる)', key: 'glowColorBlend', min: 0, max: 1.0, step: 0.01 },
        { label: 'Hue Range (±)', key: 'rangeH', min: 0, max: 180, step: 1 },
        { label: 'Sat Range (±)', key: 'rangeS', min: 0, max: 0.5, step: 0.01 },
        { label: 'Val Range (±)', key: 'rangeV', min: 0, max: 0.5, step: 0.01 },
        { label: 'Blur Size', key: 'blurSize', min: 0, max: 200.0, step: 0.1 },
        { label: 'Decay', key: 'decayRate', min: 0, max: 0.99, step: 0.01 },
        { label: 'Attack', key: 'attackRate', min: 0.01, max: 1.0, step: 0.01 },
    ];
    return (
        <div style={{ background: '#1e1e1e', padding: '25px', borderRadius: '16px', width: '460px', color: 'white' }}>

            {/* --- ピッカー並列エリア --- */}
            <div style={{
                display: 'flex',
                justifyContent: 'center', // 両端ではなく中央に寄せる
                gap: '40px',             // ピッカー同士の距離をしっかり取る
                marginBottom: '30px'
            }}>
                {/* 左：TARGET (検出) */}
                <div style={{
                    flex: 1,
                    display: 'flex',          // ここから flex
                    flexDirection: 'column',  // 縦並び
                    alignItems: 'center'      // ★ これで中身が中央に寄る
                }}>
                    <h3 style={{ color: '#aaa', fontSize: '11px', marginBottom: '10px', textAlign: 'center' }}>1. TARGET DETECTION</h3>
                    <div style={{ position: 'relative', width: `${W}px` }}>
                        <HsvColorPicker
                            color={{ h: Math.round(params.targetH), s: Math.round(params.targetS * 100), v: Math.round(params.targetV * 100) }}
                            onChange={(color) => setParams(prev => ({ ...prev, targetH: color.h, targetS: color.s / 100, targetV: color.v / 100 }))}
                            style={{ width: `${W}px`, height: `${W + BAR_H + M}px` }}
                        />
                        {/* 範囲ガイドSVG */}
                        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                            <defs><clipPath id="svClip"><rect x="0" y="0" width={W} height={SV_H} /></clipPath></defs>
                            <rect
                                x={(params.targetS - params.rangeS) * W}
                                y={(1.0 - (params.targetV + params.rangeV)) * SV_H}
                                width={(params.rangeS * 2) * W}
                                height={(params.rangeV * 2) * SV_H}
                                fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 2" clipPath="url(#svClip)"
                            />
                            {renderHueRangeSegments(params.targetH, params.rangeH, W, HUE_Y, BAR_H)}
                        </svg>
                    </div>
                    <div style={{ fontSize: '10px', color: '#00ff00', marginTop: '8px', textAlign: 'center', fontFamily: 'monospace' }}>
                        HSV: {Math.round(params.targetH)}°, {Math.round(params.targetS * 100)}%, {Math.round(params.targetV * 100)}%
                    </div>
                </div>

                {/* 右：GLOW COLOR (発光色) */}
                <div style={{
                    flex: 1,
                    display: 'flex',          // ここから flex
                    flexDirection: 'column',  // 縦並び
                    alignItems: 'center'      // ★ これで中身が中央に寄る
                }}>
                    <h3 style={{ color: '#aaa', fontSize: '11px', marginBottom: '10px', textAlign: 'center' }}>2. GLOW APPEARANCE</h3>
                    <HsvColorPicker
                        color={{ h: Math.round(params.glowH), s: Math.round(params.glowS * 100), v: Math.round(params.glowV * 100) }}
                        onChange={(color) => setParams(prev => ({ ...prev, glowH: color.h, glowS: color.s / 100, glowV: color.v / 100 }))}
                        style={{ width: `${W}px`, height: `${W + BAR_H + M}px` }}
                    />
                    <div style={{ fontSize: '10px', color: '#00ff00', marginTop: '8px', textAlign: 'center', fontFamily: 'monospace' }}>
                        {getRgbDisplay(params.glowH, params.glowS, params.glowV)}
                    </div>
                </div>
            </div>

            <hr style={{ borderColor: '#333', marginBottom: '20px' }} />

            {/* --- ブレンドモードと各パラメータ --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '35px', rowGap: '18px' }}>
                <div style={{ gridColumn: '1 / span 2', marginBottom: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '8px' }}>Blend Mode</label>
                    <select
                        value={params.mode}
                        onChange={(e) => updateParam('mode', parseInt(e.target.value))}
                        style={{ width: '100%', padding: '10px', background: '#2a2a2a', color: '#00ff00', border: '1px solid #444', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                    >
                        <option value={0}>Glow Dodge (発光)</option>
                        <option value={1}>Color Dodge (コントラスト)</option>
                        <option value={2}>Add (単純加算)</option>
                        <option value={3}>Overlay (質感維持)</option>
                        <option value={4}>Screen (マイルド)</option>
                    </select>
                </div>

                {controls.map((ctrl) => (
                    <div key={ctrl.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#bbb' }}>{ctrl.label}</label>
                            <span style={{ fontSize: '11px', color: '#00ff00', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                {params[ctrl.key].toFixed(ctrl.step >= 1 ? 0 : 2)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={ctrl.min} max={ctrl.max} step={ctrl.step}
                            value={params[ctrl.key]}
                            onChange={(e) => updateParam(ctrl.key, parseFloat(e.target.value))}
                            style={{
                                width: '100%',
                                accentColor: '#00ff00',
                                cursor: 'pointer',
                                height: '4px'
                            }}
                        />
                    </div>
                ))}
            </div>

            <button
                onClick={resetParams}
                style={{
                    width: '100%', padding: '12px', background: '#333', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                    fontWeight: 'bold', marginTop: '30px', transition: 'background 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#444')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#333')}
            >
                Reset All Parameters
            </button>
        </div>
    );
};