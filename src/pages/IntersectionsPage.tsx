import React from 'react';
import { useTraffic } from '../services/TrafficContext';
import { GitCommit, Camera, Eye, MapPin, Activity, Video } from 'lucide-react';
import { ApproachId } from '../types/traffic';

export const IntersectionsPage: React.FC = () => {
  const { state } = useTraffic();

  if (!state) return null;

  const roads = [
    { id: 'road_1', approach: 'North', video: 'data/roads/detrac/road_1.mp4', fps: 25, lanes: 3, pt: '[480, 3000]' },
    { id: 'road_2', approach: 'East', video: 'data/roads/detrac/road_2.mp4', fps: 25, lanes: 3, pt: '[480, 3000]' },
    { id: 'road_3', approach: 'South', video: 'data/roads/detrac/road_3.mp4', fps: 25, lanes: 3, pt: '[480, 3000]' },
    { id: 'road_4', approach: 'West', video: 'data/roads/detrac/road_4.mp4', fps: 25, lanes: 3, pt: '[480, 3000]' }
  ];

  return (
    <div>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Corridor Geometry & Perception Channels</p>
          <h1>Intersection Approaches</h1>
          <p className="subtitle">
            Camera perception pipelines, Region of Interest (ROI) bounds, ByteTrack vehicle tracking, and approach lane geometry for {state.intersectionName}.
          </p>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {roads.map(r => {
          const appData = state.approaches[r.approach as ApproachId];
          return (
            <div key={r.id} className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="brand-mark" style={{ width: '32px', height: '32px' }}>
                    <Camera size={18} />
                  </span>
                  <div>
                    <h3 className="card-title">{r.approach} Approach ({r.id})</h3>
                    <p className="card-subtitle">{r.video}</p>
                  </div>
                </div>
                <span className={`badge ${appData.cameraStatus === 'healthy' ? 'green' : 'red'}`}>
                  {appData.cameraStatus.toUpperCase()}
                </span>
              </div>

              {/* Video placeholder with detection overlay */}
              <div 
                style={{ 
                  height: '180px', 
                  borderRadius: '10px', 
                  background: 'color-mix(in srgb, var(--surface-raised) 70%, black)', 
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  marginBottom: '16px'
                }}
              >
                <Video size={36} style={{ color: 'var(--muted)', opacity: 0.5, marginBottom: '8px' }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>CCTV Feed: {r.id}</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  YOLOv8 + ByteTrack • 960x540 @ {r.fps} FPS
                </span>

                <div 
                  style={{ 
                    position: 'absolute', 
                    bottom: '12px', 
                    left: '12px', 
                    right: '12px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--text)',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '4px 10px',
                    borderRadius: '6px'
                  }}
                >
                  <span>Detections: <strong>{appData.vehicleCount} vehicles</strong></span>
                  <span>Confidence: <strong style={{ color: 'var(--accent-text)' }}>{appData.cameraConfidence.toFixed(1)}%</strong></span>
                  <span>Signal: <strong style={{ color: appData.aspect === 'green' ? 'var(--traffic-green)' : 'var(--traffic-red)' }}>{appData.aspect.toUpperCase()}</strong></span>
                </div>
              </div>

              {/* Lane Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--surface-raised)' }}>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10px' }}>Inbound Lanes</span>
                  <strong>{r.lanes} Lanes</strong>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--surface-raised)' }}>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10px' }}>Current Queue</span>
                  <strong>{appData.queueLength} veh</strong>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--surface-raised)' }}>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10px' }}>Mean Speed</span>
                  <strong>{appData.avgSpeedMps.toFixed(1)} m/s</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
