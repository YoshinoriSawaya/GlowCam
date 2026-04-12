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
        <div className="control-panel">
            <div className="tabs-container">
                {params.patterns.map((p, i) => (
                    <button
                        key={i}
                        onClick={() => setTabIndex(i)}
                        className={`tab-button ${tabIndex === i ? 'active' : 'inactive'}`}
                    >
                        PATTERN {i + 1}
                        <span className="tab-status">
                            {p.isActive > 0.5 ? "● ON" : "○ OFF"}
                        </span>
                    </button>
                ))}
            </div>

            <div className="checkbox-container">
                <input
                    type="checkbox"
                    checked={isPatternActive}
                    onChange={(e) => updatePattern('isActive', e.target.checked ? 1.0 : 0.0)}
                />
                <label className="checkbox-label">Enable this pattern</label>
            </div>

            <div className={`pickers-container ${isPatternActive ? '' : 'dimmed'}`}>
                <div className="picker-column">
                    <h3 className="picker-title">1. TARGET DETECTION</h3>
                    {/* Wに依存するためインラインスタイルを残す */}
                    <div className="target-wrapper" style={{ width: `${W}px` }}>
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

                <div className="picker-column">
                    <h3 className="picker-title">2. GLOW APPEARANCE</h3>
                    <HsvColorPicker
                        color={{ h: currentPattern.glowH, s: currentPattern.glowS * 100, v: currentPattern.glowV * 100 }}
                        onChange={(color) => {
                            updatePattern('glowH', color.h);
                            updatePattern('glowS', color.s / 100);
                            updatePattern('glowV', color.v / 100);
                        }}
                        style={{ width: `${W}px`, height: `${W + BAR_H + M}px` }}
                    />
                    <div className="rgb-display">
                        {getRgbDisplay(currentPattern.glowH, currentPattern.glowS, currentPattern.glowV)}
                    </div>
                </div>
            </div>

            <hr className="divider" />

            <div className="sliders-grid">
                <div className="blend-mode-wrapper">
                    <label className="input-label">Blend Mode</label>
                    <select
                        value={params.mode}
                        onChange={(e) => updateGlobal('mode', parseInt(e.target.value))}
                        className="select-input"
                    >
                        <option value={0}>Glow Dodge</option>
                        <option value={1}>Color Dodge</option>
                        <option value={2}>Add</option>
                        <option value={3}>Overlay</option>
                        <option value={4}>Screen</option>
                    </select>
                </div>

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

            <button onClick={resetParams} className="reset-button">
                Reset All
            </button>
        </div>
    );
};