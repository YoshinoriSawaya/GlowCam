import { useRef, useState } from 'react';
import { useGlowParams } from './hooks/useGlowParams';
import { useGpuEngine } from './hooks/useGpuEngine';
import { VideoPreview } from './components/VideoPreview';
import { ControlPanel } from './components/ControlPanel';
import './App.css'; // 必ずCSSをインポート

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showControls, setShowControls] = useState(true);

  // カスタムフックでロジックを分離
  const { params, paramsRef, updatePatternParam, setParams, resetParams } = useGlowParams();
  const { status, fps } = useGpuEngine({ videoRef, canvasRef, paramsRef });

  return (
    <div className="app-container">
      <h2 className="app-header">
        GlowCam Engine: <span className="engine-status">{status}</span>
        {fps > 0 && (
          <span className="fps-badge">
            {fps} FPS
          </span>
        )}
        <button
          onClick={() => setShowControls(!showControls)}
          className="toggle-button"
        >
          {showControls ? 'Hide Controls' : 'Show Controls'}
        </button>
      </h2>

      <div className="main-layout">
        <VideoPreview
          canvasRef={canvasRef}
          videoRef={videoRef}
          showControls={showControls}
        />

        {showControls && (
          <div className="control-panel-wrapper">
            <ControlPanel
              params={params}
              updatePatternParam={updatePatternParam}
              setParams={setParams}
              resetParams={resetParams}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;