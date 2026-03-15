import React from 'react';
import Wheel from '@uiw/react-color-wheel';
// 修正後（type を追加）
import type { GlowParams } from '../hooks/useGlowParams';

interface ControlPanelProps {
    params: GlowParams;
    updateParam: (key: keyof GlowParams, value: number) => void;
    setParams: React.Dispatch<React.SetStateAction<GlowParams>>;
    resetParams: () => void;
}
export const ControlPanel: React.FC<ControlPanelProps> = ({ params, updateParam, setParams, resetParams }) => {
    const controls: { label: string; key: keyof GlowParams; min: number; max: number; step: number }[] = [
        { label: 'Hue Range', key: 'rangeH', min: 0, max: 180, step: 1 },
        { label: 'Sat Range', key: 'rangeS', min: 0, max: 1.0, step: 0.01 }, // 範囲を1.0まで拡大
        { label: 'Val Range', key: 'rangeV', min: 0, max: 1.0, step: 0.01 }, // 範囲を1.0まで拡大
        { label: 'Glow Power', key: 'glowIntensity', min: 0, max: 10, step: 0.1 },
        { label: 'Color Blend (色を寄せる)', key: 'glowColorBlend', min: 0, max: 1.0, step: 0.01 }, // ★追加
        { label: 'Blur Size', key: 'blurSize', min: 0, max: 200.0, step: 0.1 }, // 単位に合わせて調整
        { label: 'Decay (余韻)', key: 'decayRate', min: 0, max: 0.99, step: 0.01 },
        { label: 'Attack (立ち上がり)', key: 'attackRate', min: 0.01, max: 1.0, step: 0.01 },
    ];

    const getRgbDisplay = (h: number, s: number, v: number) => {
        const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
        const r = Math.round(f(5) * 255);
        const g = Math.round(f(3) * 255);
        const b = Math.round(f(1) * 255);
        return `RGB(${r}, ${g}, ${b})`;
    };

    return (
        <div style={{ background: '#1e1e1e', padding: '25px', borderRadius: '16px', width: '350px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', color: 'white' }}>
            <h3 style={{ marginTop: 0, color: '#aaa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>1. Detection (何を光らせるか)</h3>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>Target Hue:</span>
                    <div style={{
                        flexGrow: 1, height: '20px', borderRadius: '4px',
                        backgroundColor: `hsl(${params.targetH}, ${params.targetS * 100}%, ${params.targetV * 100}%)`,
                    }} />
                </div>
                {/* 数値表示エリア */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '5px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    backgroundColor: '#2a2a2a',
                    padding: '8px',
                    borderRadius: '6px',
                    color: '#00ff00'
                }}>
                    <div>HSV: {Math.round(params.targetH)}°, {Math.round(params.targetS * 100)}%, {Math.round(params.targetV * 100)}%</div>
                    <div style={{ textAlign: 'right' }}>{getRgbDisplay(params.targetH, params.targetS, params.targetV)}</div>
                </div>
                <Wheel
                    color={{ h: params.targetH, s: params.targetS * 100, v: params.targetV * 100, a: 1 }}
                    onChange={(color) => setParams(prev => ({ ...prev, targetH: color.hsva.h, targetS: color.hsva.s / 100, targetV: color.hsva.v / 100 }))}
                    style={{ width: '160px', height: '160px' }}
                />
            </div>

            <hr style={{ borderColor: '#333', marginBottom: '20px' }} />

            <h3 style={{ color: '#aaa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>2. Glow Color (どう光らせるか)</h3>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>Glow Hue:</span>
                    <div style={{
                        flexGrow: 1, height: '20px', borderRadius: '4px',
                        backgroundColor: `hsl(${params.glowH}, ${params.glowS * 100}%, ${params.glowV * 100}%)`,
                        boxShadow: `0 0 15px hsl(${params.glowH}, 100%, 50%)` // Glowのプレビュー
                    }} />
                </div>
                {/* 数値表示エリア */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '5px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    backgroundColor: '#2a2a2a',
                    padding: '8px',
                    borderRadius: '6px',
                    color: '#00ff00'
                }}>
                    <div>HSV: {Math.round(params.glowH)}°, {Math.round(params.glowS * 100)}%, {Math.round(params.glowV * 100)}%</div>
                    <div style={{ textAlign: 'right' }}>{getRgbDisplay(params.glowH, params.glowS, params.glowV)}</div>
                </div>
                <Wheel
                    color={{ h: params.glowH, s: params.glowS * 100, v: params.glowV * 100, a: 1 }}
                    onChange={(color) => setParams(prev => ({ ...prev, glowH: color.hsva.h, glowS: color.hsva.s / 100, glowV: color.hsva.v / 100 }))}
                    style={{ width: '160px', height: '160px' }}
                />
            </div>

            <hr style={{ borderColor: '#333', marginBottom: '20px' }} />

            <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', color: '#ddd', display: 'block', marginBottom: '5px' }}>Blend Mode</label>
                <select
                    value={params.mode}
                    onChange={(e) => updateParam('mode', parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px', background: '#2a2a2a', color: '#00ff00', border: '1px solid #444', borderRadius: '8px' }}
                >
                    <option value={0}>Glow Dodge (発光)</option>
                    <option value={1}>Color Dodge (コントラスト)</option>
                    <option value={2}>Add (単純加算)</option>
                    <option value={3}>Overlay (質感維持)</option>
                    <option value={4}>Screen (マイルド)</option>
                </select>
            </div>

            {controls.map((ctrl) => (
                <div key={ctrl.key} style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <label style={{ fontSize: '12px', color: '#bbb' }}>{ctrl.label}</label>
                        <span style={{ fontSize: '12px', color: '#00ff00', fontFamily: 'monospace' }}>
                            {ctrl.key === 'rangeH' ? Math.round(params[ctrl.key]) : params[ctrl.key].toFixed(2)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={ctrl.min} max={ctrl.max} step={ctrl.step}
                        value={params[ctrl.key]}
                        onChange={(e) => updateParam(ctrl.key, parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#00ff00', cursor: 'pointer' }}
                    />
                </div>
            ))}

            <button
                onClick={resetParams}
                style={{ width: '100%', padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
            >
                Reset All Params
            </button>
        </div>
    );
};