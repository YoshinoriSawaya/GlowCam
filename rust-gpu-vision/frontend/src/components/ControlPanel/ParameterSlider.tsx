import React from 'react';

interface ParameterSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    variant?: 'primary' | 'secondary'; // primary: 緑色(Pattern用), secondary: グレー(Global用)
    isActive?: boolean;                // 無効時の透過用
}

export const ParameterSlider: React.FC<ParameterSliderProps> = ({
    label, value, min, max, step, onChange, variant = 'primary', isActive = true
}) => {
    // variant に応じて色を切り替え
    const isPrimary = variant === 'primary';
    const labelColor = isPrimary ? '#bbb' : '#888';
    const valueColor = isPrimary ? '#00ff00' : '#888';
    const accentColor = isPrimary ? '#00ff00' : '#555';

    // Patternが無効な場合は半透明にする
    const opacity = isActive ? 1 : 0.4;
    // stepが1以上の整数の場合は小数点以下を表示しない
    const displayValue = value.toFixed(step >= 1 ? 0 : 2);

    return (
        <div style={{ opacity }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '10px', color: labelColor }}>{label}</label>
                <span style={{ fontSize: '10px', color: valueColor, fontFamily: 'monospace' }}>
                    {displayValue}
                </span>
            </div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor, height: '4px' }}
                disabled={!isActive && isPrimary} // 無効時は操作もブロック
            />
        </div>
    );
};