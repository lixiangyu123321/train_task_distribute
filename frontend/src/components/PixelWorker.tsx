import './PixelWorker.css';

type WorkerState = 'idle' | 'working' | 'completed' | 'sleeping' | 'error';

type Props = {
  state: WorkerState;
  name?: string;
  size?: 'small' | 'medium' | 'large';
};

export default function PixelWorker({ state, name, size = 'medium' }: Props) {
  const sizeMap = { small: 0.6, medium: 1, large: 1.5 };
  const scale = sizeMap[size];

  return (
    <div className={`pixel-worker pixel-worker--${state}`} style={{ transform: `scale(${scale})` }}>
      {/* 角色身体 */}
      <div className="pw-body">
        {/* 头部 */}
        <div className="pw-head">
          <div className="pw-eyes">
            <div className="pw-eye pw-eye--left" />
            <div className="pw-eye pw-eye--right" />
          </div>
          <div className="pw-mouth" />
        </div>
        {/* 身体 */}
        <div className="pw-torso" />
        {/* 手臂 */}
        <div className="pw-arm pw-arm--left" />
        <div className="pw-arm pw-arm--right" />
        {/* 腿部 */}
        <div className="pw-legs">
          <div className="pw-leg pw-leg--left" />
          <div className="pw-leg pw-leg--right" />
        </div>
      </div>

      {/* 道具/特效 */}
      {state === 'working' && (
        <div className="pw-tool">
          <div className="pw-pickaxe" />
          <div className="pw-sparkles">
            <span className="pw-sparkle pw-sparkle--1">✦</span>
            <span className="pw-sparkle pw-sparkle--2">✧</span>
            <span className="pw-sparkle pw-sparkle--3">·</span>
          </div>
        </div>
      )}

      {state === 'sleeping' && (
        <div className="pw-zzz">
          <span>z</span><span>Z</span><span>Z</span>
        </div>
      )}

      {state === 'completed' && (
        <div className="pw-done">
          <span>★</span>
        </div>
      )}

      {state === 'error' && (
        <div className="pw-error-mark">!</div>
      )}

      {/* 阴影 */}
      <div className="pw-shadow" />

      {/* 名称标签 */}
      {name && (
        <div className="pw-label">
          {name.length > 8 ? name.substring(0, 8) + '..' : name}
        </div>
      )}
    </div>
  );
}
