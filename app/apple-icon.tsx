import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
          borderRadius: 36,
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 112,
            height: 112,
            borderRadius: 22,
            background: 'rgba(248, 250, 252, 0.96)',
            color: '#0f766e',
            fontSize: 54,
            fontWeight: 700,
            letterSpacing: -2
          }}
        >
          SR
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
