import React from 'react';

interface VideoPreviewProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    showControls: boolean;
}

// SafariなどベンダープレフィックスAPIしか無いブラウザ向けの型
type FullscreenCapableElement = HTMLElement & {
    webkitRequestFullscreen?: () => void;
    msRequestFullscreen?: () => void;
};

/** 存在するFullscreen APIを探して呼び出す（標準/Safari/古いEdge対応） */
function requestFullscreen(el: HTMLElement) {
    const target = el as FullscreenCapableElement;
    if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {
            // 非対応環境やユーザー操作なしでの呼び出し失敗は静かに無視する
        });
    } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
    } else if (target.msRequestFullscreen) {
        target.msRequestFullscreen();
    }
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ canvasRef, videoRef, showControls }) => {
    const handleFullscreen = () => {
        if (canvasRef.current) {
            requestFullscreen(canvasRef.current);
        }
    };

    return (
        <div className={`video-preview-container ${showControls ? 'compact' : 'expanded'}`}>
            <div className="canvas-wrapper">
                <div className="canvas-header">
                    <p className="preview-title">GPU Processed Output</p>
                    <button
                        className="fullscreen-button"
                        onClick={handleFullscreen}
                        title="フルスクリーン表示"
                        aria-label="フルスクリーン表示"
                    >
                        ⛶
                    </button>
                </div>
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
