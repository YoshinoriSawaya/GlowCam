import { useRef } from 'react';
import { useGlowParams } from './hooks/useGlowParams';
import { useGpuEngine } from './hooks/useGpuEngine';
import { VideoPreview } from './components/VideoPreview';
import { ControlPanel } from './components/ControlPanel';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // カスタムフックでロジックを分離
  const { params, paramsRef, updateParam, setParams, resetParams } = useGlowParams();
  const { status, fps } = useGpuEngine({ videoRef, canvasRef, paramsRef });

  return (
    <div style={{ padding: '20px', color: 'white', background: '#121212', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', textAlign: 'center' }}>
        GlowCam Engine: <span style={{ color: '#00ff00' }}>{status}</span>
        {fps > 0 && (
          <span style={{ marginLeft: '15px', background: '#333', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', color: '#ffcc00', border: '1px solid #665500' }}>
            {fps} FPS
          </span>
        )}
      </h2>

      <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <VideoPreview
          canvasRef={canvasRef}
          videoRef={videoRef}
        />
        <ControlPanel
          params={params}
          updateParam={updateParam}
          setParams={setParams}
          resetParams={resetParams}
        />
      </div>
    </div>
  );
}

export default App;