import React, { useState } from 'react';
import { HsvColorPicker } from "react-colorful";
import type { GlowParams, GlowPattern } from '../../hooks/useGlowParams';
import { TargetOverlay } from './TargetOverlay';
import { getRgbDisplay } from '../../utils/colorUtils';
import { ParameterSlider } from './ParameterSlider';
import { UI_CONSTANTS, GLOBAL_CONTROLS, PATTERN_CONTROLS } from '../../constants/controlPanel';

export interface ControlPanelProps {
    params: GlowParams;
    updatePatternParam: (index: number, key: keyof GlowPattern, value: number) => void;
    setParams: React.Dispatch<React.SetStateAction<GlowParams>>;
    resetParams: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ params, updatePatternParam, setParams, resetParams }) => {
    const [tabIndex, setTabIndex] = useState(0);

    const updatePattern = (key: keyof GlowPattern, value: number) => {
        updatePatternParam(tabIndex, key, value);
    };

    const updateGlobal = (key: Exclude<keyof GlowParams, 'patterns'>, value: any) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const currentPattern = params.patterns[tabIndex];
    const isPatternActive = currentPattern.isActive > 0.5;
    const { W, BAR_H, M } = UI_CONSTANTS;

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
                    checked={isPatternActive}
                    onChange={(e) => updatePattern('isActive', e.target.checked ? 1.0 : 0.0)}
                />
                <label style={{ fontSize: '12px' }}>Enable this pattern</label>
            </div>

            {/* --- ピッカー並列エリア --- */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px', opacity: isPatternActive ? 1 : 0.4 }}>

                {/* 1. Target Detection */}
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
                        <TargetOverlay pattern={currentPattern} />
                    </div>
                </div>

                {/* 2. Glow Appearance */}
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

                {/* ✨ 各パターンのスライダー (Component化でスッキリ！) */}
                {PATTERN_CONTROLS.map((ctrl) => (
                    <ParameterSlider
                        key={ctrl.key}
                        label={ctrl.label}
                        value={currentPattern[ctrl.key] as number}
                        min={ctrl.min} max={ctrl.max} step={ctrl.step}
                        onChange={(val) => updatePattern(ctrl.key, val)}
                        variant="primary"
                        isActive={isPatternActive}
                    />
                ))}

                {/* ✨ 全体設定のスライダー */}
                {GLOBAL_CONTROLS.map((ctrl) => (
                    <ParameterSlider
                        key={ctrl.key}
                        label={ctrl.label}
                        value={params[ctrl.key] as number}
                        min={ctrl.min} max={ctrl.max} step={ctrl.step}
                        onChange={(val) => updateGlobal(ctrl.key, val)}
                        variant="secondary"
                    />
                ))}
            </div>

            <button onClick={resetParams} style={{/* 既存のスタイル */ }}>
                Reset All
            </button>
        </div>
    );
};