import React, { useState } from 'react';
import { HsvColorPicker } from "react-colorful";
import type { GlowParams, GlowPattern } from '../hooks/useGlowParams';

// updateGlobalParam を削除し、使われていなかった updatePatternParam を正しく定義
interface ControlPanelProps {
    params: GlowParams;
    updatePatternParam: (index: number, key: keyof GlowPattern, value: number) => void;
    setParams: React.Dispatch<React.SetStateAction<GlowParams>>;
    resetParams: () => void;
}

const getRgbDisplay = (h: number, s: number, v: number) => {
    const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    const r = Math.round(f(5) * 255);
    const g = Math.round(f(3) * 255);
    const b = Math.round(f(1) * 255);
    return `RGB(${r}, ${g}, ${b})`;
};

const renderHueRangeSegments = (h: number, range: number, width: number, y: number, height: number) => {
    const degToX = (deg: number) => (deg / 360) * width;
    const start = h - range;
    const end = h + range;
    const rectProps = { y, height, fill: "none", stroke: "white", strokeWidth: 2, rx: 4 };
    const segments = [];
    const mainStart = Math.max(0, start);
    const mainEnd = Math.min(360, end);
    if (mainStart < mainEnd) {
        segments.push(<rect key="main" x={degToX(mainStart)} width={degToX(mainEnd - mainStart)} {...rectProps} />);
    }
    if (start < 0) {
        segments.push(<rect key="left-oflow" x={degToX(360 + start)} width={degToX(Math.abs(start))} {...rectProps} />);
    }
    if (end > 360) {
        segments.push(<rect key="right-oflow" x={0} width={degToX(end - 360)} {...rectProps} />);
    }
    return segments;
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ params, updatePatternParam, setParams, resetParams }) => {
    const [tabIndex, setTabIndex] = useState(0);

    // Propsから渡された関数を利用するように修正
    const updatePattern = (key: keyof GlowPattern, value: number) => {
        updatePatternParam(tabIndex, key, value);
    };

    // 全体設定を更新
    const updateGlobal = (key: Exclude<keyof GlowParams, 'patterns'>, value: any) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const W = 200;
    const SV_H = 200;
    const M = 12;
    const BAR_H = 24;
    const HUE_Y = SV_H + M;

    const currentPattern = params.patterns[tabIndex];

    // GlowParams から 'patterns' を除外した型を定義することで toFixed() エラーを回避
    type GlobalParamKey = Exclude<keyof GlowParams, 'patterns'>;

    const globalControls: { label: string; key: GlobalParamKey; min: number; max: number; step: number }[] = [
        { label: 'Blur Size', key: 'blurSize', min: 0, max: 200.0, step: 0.1 },
        { label: 'Decay', key: 'decayRate', min: 0, max: 0.99, step: 0.01 },
        { label: 'Attack', key: 'attackRate', min: 0.01, max: 1.0, step: 0.01 },
    ];

    const patternControls: { label: string; key: keyof GlowPattern; min: number; max: number; step: number }[] = [
        { label: 'Glow Power', key: 'glowIntensity', min: 0, max: 10, step: 0.1 },
        { label: 'Color Blend', key: 'glowColorBlend', min: 0, max: 1.0, step: 0.01 },
        { label: 'Hue Range (±)', key: 'rangeH', min: 0, max: 180, step: 1 },
        { label: 'Sat Range (±)', key: 'rangeS', min: 0, max: 0.5, step: 0.01 },
        { label: 'Val Range (±)', key: 'rangeV', min: 0, max: 0.5, step: 0.01 },
    ];

    return (
        <div style={{ background: '#1e1e1e', padding: '25px', borderRadius: '16px', width: '480px', color: 'white' }}>

            {/* --- タブ切り替え --- */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
                {params.patterns.map((p, i) => (
                    <button
                        key={i}
                        onClick={() => setTabIndex(i)}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '6px', border: 'none',
                            cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                            background: tabIndex === i ? '#00ff00' : '#333',
                            color: tabIndex === i ? '#000' : '#aaa',
                            transition: 'all 0.2s'
                        }}
                    >
                        PATTERN {i + 1}
                        <span style={{ fontSize: '9px', display: 'block', opacity: 0.7 }}>
                            {p.isActive > 0.5 ? "● ON" : "○ OFF"}
                        </span>
                    </button>
                ))}
            </div>

            {/* --- 有効/無効トグル --- */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                    type="checkbox"
                    checked={currentPattern.isActive > 0.5}
                    onChange={(e) => updatePattern('isActive', e.target.checked ? 1.0 : 0.0)}
                />
                <label style={{ fontSize: '12px' }}>Enable this pattern</label>
            </div>

            {/* --- ピッカー並列エリア --- */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px', opacity: currentPattern.isActive ? 1 : 0.4 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ color: '#aaa', fontSize: '10px', marginBottom: '8px' }}>1. TARGET DETECTION</h3>
                    <div style={{ position: 'relative', width: `${W}px` }}>
                        <HsvColorPicker
                            color={{ h: currentPattern.targetH, s: currentPattern.targetS * 100, v: currentPattern.targetV * 100 }}
                            onChange={(color) => {
                                updatePattern('targetH', color.h);
                                updatePattern('targetS', color.s / 100);
                                updatePattern('targetV', color.v / 100);
                            }}
                            style={{ width: `${W}px`, height: `${W + BAR_H + M}px` }}
                        />
                        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                            <defs><clipPath id="svClip"><rect x="0" y="0" width={W} height={SV_H} /></clipPath></defs>
                            <rect
                                x={(currentPattern.targetS - currentPattern.rangeS) * W}
                                y={(1.0 - (currentPattern.targetV + currentPattern.rangeV)) * SV_H}
                                width={(currentPattern.rangeS * 2) * W}
                                height={(currentPattern.rangeV * 2) * SV_H}
                                fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 2" clipPath="url(#svClip)"
                            />
                            {renderHueRangeSegments(currentPattern.targetH, currentPattern.rangeH, W, HUE_Y, BAR_H)}
                        </svg>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ color: '#aaa', fontSize: '10px', marginBottom: '8px' }}>2. GLOW APPEARANCE</h3>
                    <HsvColorPicker
                        color={{ h: currentPattern.glowH, s: currentPattern.glowS * 100, v: currentPattern.glowV * 100 }}
                        onChange={(color) => {
                            updatePattern('glowH', color.h);
                            updatePattern('glowS', color.s / 100);
                            updatePattern('glowV', color.v / 100);
                        }}
                        style={{ width: `${W}px`, height: `${W + BAR_H + M}px` }}
                    />
                    <div style={{ fontSize: '10px', color: '#00ff00', marginTop: '8px', fontFamily: 'monospace' }}>
                        {getRgbDisplay(currentPattern.glowH, currentPattern.glowS, currentPattern.glowV)}
                    </div>
                </div>
            </div>

            <hr style={{ borderColor: '#333', marginBottom: '20px' }} />

            {/* --- パラメータ調整 --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '30px', rowGap: '15px' }}>
                <div style={{ gridColumn: '1 / span 2' }}>
                    <label style={{ fontSize: '11px', color: '#aaa' }}>Blend Mode</label>
                    <select
                        value={params.mode}
                        onChange={(e) => updateGlobal('mode', parseInt(e.target.value))}
                        style={{ width: '100%', padding: '8px', background: '#2a2a2a', color: '#00ff00', border: '1px solid #444', borderRadius: '6px', fontSize: '12px' }}
                    >
                        <option value={0}>Glow Dodge</option>
                        <option value={1}>Color Dodge</option>
                        <option value={2}>Add</option>
                        <option value={3}>Overlay</option>
                        <option value={4}>Screen</option>
                    </select>
                </div>

                {/* 各パターンのスライダー */}
                {patternControls.map((ctrl) => (
                    <div key={ctrl.key} style={{ opacity: currentPattern.isActive ? 1 : 0.4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <label style={{ fontSize: '10px', color: '#bbb' }}>{ctrl.label}</label>
                            <span style={{ fontSize: '10px', color: '#00ff00', fontFamily: 'monospace' }}>
                                {currentPattern[ctrl.key].toFixed(ctrl.step >= 1 ? 0 : 2)}
                            </span>
                        </div>
                        <input
                            type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step}
                            value={currentPattern[ctrl.key]}
                            onChange={(e) => updatePattern(ctrl.key, parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#00ff00', height: '4px' }}
                        />
                    </div>
                ))}

                {/* 全体設定のスライダー */}
                {globalControls.map((ctrl) => (
                    <div key={ctrl.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <label style={{ fontSize: '10px', color: '#888' }}>{ctrl.label}</label>
                            <span style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace' }}>
                                {params[ctrl.key].toFixed(2)}
                            </span>
                        </div>
                        <input
                            type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step}
                            value={params[ctrl.key]}
                            onChange={(e) => updateGlobal(ctrl.key, parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#555', height: '4px' }}
                        />
                    </div>
                ))}
            </div>

            <button
                onClick={resetParams}
                style={{
                    width: '100%', padding: '10px', background: '#333', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                    fontWeight: 'bold', marginTop: '20px'
                }}
            >
                Reset All
            </button>
        </div>
    );
};