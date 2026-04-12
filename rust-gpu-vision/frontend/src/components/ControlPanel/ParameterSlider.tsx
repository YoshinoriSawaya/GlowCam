import React from 'react';

interface ParameterSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    variant?: 'primary' | 'secondary';
    isActive?: boolean;
}

export const ParameterSlider: React.FC<ParameterSliderProps> = ({
    label, value, min, max, step, onChange, variant = 'primary', isActive = true
}) => {
    const isPrimary = variant === 'primary';
    const displayValue = value.toFixed(step >= 1 ? 0 : 2);

    // CSSクラスによるスタイリング
    const variantClass = isPrimary ? 'slider-primary' : 'slider-secondary';
    const activeClass = isActive ? '' : 'dimmed';

    return (
        <div className={`slider-container ${variantClass} ${activeClass}`}>
            <div className="slider-header">
                <label className="slider-label">{label}</label>
                <span className="slider-value">
                    {displayValue}
                </span>
            </div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="slider-input"
                disabled={!isActive && isPrimary}
            />
        </div>
    );
};