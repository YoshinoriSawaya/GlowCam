import React from 'react';

// 修正後
interface VideoPreviewProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    showControls: boolean;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ canvasRef, videoRef, showControls }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#00ff00', marginBottom: '5px' }}>GPU Processed Output</p>
                <canvas
                    ref={canvasRef}
                    // width="640"
                    // height="480"
                    style={{
                        // 2. コントロール非表示時はサイズを大きくする (例: 960px)
                        width: showControls ? '600px' : '960px',
                        borderRadius: '12px',
                        border: '2px solid #00ff00',
                        boxShadow: '0 0 20px rgba(0,255,0,0.2)',
                        transition: 'width 0.1s ease' // スムーズにサイズ変更させるアニメーション
                    }}
                />
            </div>
            <video
                ref={videoRef}
                style={{
                    width: '200px',
                    borderRadius: '8px',
                    border: '1px solid #444',
                    alignSelf: 'center',
                    // 3. コントロール非表示時は生カメラ映像を隠す（display: noneでも内部的な再生は継続されCanvasに描画されます）
                    display: showControls ? 'block' : 'none'
                }}
                playsInline
                muted
            />
        </div>
    );
};