import React from 'react';
import type { GlowPattern } from '../../hooks/useGlowParams';
import { calculateHueSegments } from '../../utils/colorUtils';
import { UI_CONSTANTS } from '../../constants/controlPanel';

interface TargetOverlayProps {
    pattern: GlowPattern;
}

export const TargetOverlay: React.FC<TargetOverlayProps> = ({ pattern }) => {
    const { W, SV_H, BAR_H, HUE_Y } = UI_CONSTANTS;
    const hueSegments = calculateHueSegments(pattern.targetH, pattern.rangeH, W);

    return (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
            <defs><clipPath id="svClip"><rect x="0" y="0" width={W} height={SV_H} /></clipPath></defs>
            <rect
                x={(pattern.targetS - pattern.rangeS) * W}
                y={(1.0 - (pattern.targetV + pattern.rangeV)) * SV_H}
                width={(pattern.rangeS * 2) * W}
                height={(pattern.rangeV * 2) * SV_H}
                fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 2" clipPath="url(#svClip)"
            />
            {hueSegments.map(seg => (
                <rect key={seg.key} x={seg.x} width={seg.width} y={HUE_Y} height={BAR_H} fill="none" stroke="white" strokeWidth={2} rx={4} />
            ))}
        </svg>
    );
};