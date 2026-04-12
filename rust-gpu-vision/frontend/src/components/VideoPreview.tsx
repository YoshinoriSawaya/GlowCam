import React from 'react';

interface VideoPreviewProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    showControls: boolean;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ canvasRef, videoRef, showControls }) => {
    return (
        <div className={`video-preview-container ${showControls ? 'compact' : 'expanded'}`}>
            <div className="canvas-wrapper">
                <p className="preview-title">GPU Processed Output</p>
                <canvas
                    ref={canvasRef}
                    className="preview-canvas"
                />
            </div>
            <video
                ref={videoRef}
                className="source-video"
                style={{ display: showControls ? 'block' : 'none' }}
                playsInline
                muted
            />
        </div>
    );
};