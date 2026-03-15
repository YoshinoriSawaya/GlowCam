import React from 'react';

// 修正後
interface VideoPreviewProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ canvasRef, videoRef }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#00ff00', marginBottom: '5px' }}>GPU Processed Output</p>
                <canvas
                    ref={canvasRef}
                    width="640"
                    height="480"
                    style={{ width: '600px', borderRadius: '12px', border: '2px solid #00ff00', boxShadow: '0 0 20px rgba(0,255,0,0.2)' }}
                />
            </div>
            <video
                ref={videoRef}
                style={{ width: '200px', borderRadius: '8px', border: '1px solid #444', alignSelf: 'center' }}
                playsInline
                muted
            />
        </div>
    );
};