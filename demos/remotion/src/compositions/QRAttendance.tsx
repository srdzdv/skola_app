import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  AbsoluteFill,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "500", "700"],
  subsets: ["latin"],
});

const COLORS = {
  primary: "#C76542",
  secondary: "#41476E",
  accent: "#FFBB50",
  grass: "#A0D468",
  grassDark: "#8CC152",
  white: "#FFFFFF",
  dark: "#191015",
};

const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({ frame, fps, config: { damping: 15 } });

  return (
    <div
      style={{
        width: 380,
        height: 760,
        borderRadius: 50,
        background: "#1a1a2e",
        padding: 12,
        transform: `scale(${phoneScale})`,
        boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 2px #333",
        position: "relative",
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          width: 160,
          height: 30,
          background: "#1a1a2e",
          borderRadius: "0 0 20px 20px",
          zIndex: 10,
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 40,
          overflow: "hidden",
          background: COLORS.white,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const ScannerView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scanLineY = interpolate(frame % (2 * fps), [0, 2 * fps], [0, 300], {
    extrapolateRight: "clamp",
  });

  const cornerSize = 40;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `linear-gradient(180deg, ${COLORS.grassDark} 0%, ${COLORS.grass} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 60,
          fontFamily,
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.white,
        }}
      >
        Escanear QR
      </div>

      {/* Scanner frame */}
      <div
        style={{
          width: 240,
          height: 240,
          position: "relative",
        }}
      >
        {/* Corners */}
        {[
          { top: 0, left: 0, borderTop: "4px solid white", borderLeft: "4px solid white" },
          { top: 0, right: 0, borderTop: "4px solid white", borderRight: "4px solid white" },
          { bottom: 0, left: 0, borderBottom: "4px solid white", borderLeft: "4px solid white" },
          { bottom: 0, right: 0, borderBottom: "4px solid white", borderRight: "4px solid white" },
        ].map((style, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: cornerSize,
              height: cornerSize,
              ...style,
              borderRadius: i === 0 ? "8px 0 0 0" : i === 1 ? "0 8px 0 0" : i === 2 ? "0 0 0 8px" : "0 0 8px 0",
            }}
          />
        ))}

        {/* Scan line */}
        <div
          style={{
            position: "absolute",
            top: scanLineY,
            left: 10,
            right: 10,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
            boxShadow: `0 0 20px ${COLORS.accent}`,
          }}
        />

        {/* QR Pattern (simplified) */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            right: 40,
            bottom: 40,
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridTemplateRows: "repeat(7, 1fr)",
            gap: 3,
            opacity: 0.3,
          }}
        >
          {Array.from({ length: 49 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: Math.random() > 0.4 ? COLORS.white : "transparent",
                borderRadius: 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Instruction text */}
      <div
        style={{
          marginTop: 40,
          fontFamily,
          fontSize: 16,
          color: `${COLORS.white}CC`,
          textAlign: "center",
        }}
      >
        Acerca el QR del alumno
      </div>
    </div>
  );
};

const SuccessView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const checkScale = spring({ frame, fps, config: { damping: 8, stiffness: 80 } });
  const textSpring = spring({ frame, fps, config: { damping: 200 }, delay: 15 });

  const ringScale = interpolate(
    spring({ frame, fps, config: { damping: 200 } }),
    [0, 1],
    [0.5, 1]
  );
  const ringOpacity = interpolate(frame, [0, fps], [1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: COLORS.white,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Success ring animation */}
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: `4px solid ${COLORS.grass}`,
          transform: `scale(${ringScale * 1.5})`,
          opacity: ringOpacity,
        }}
      />

      {/* Checkmark circle */}
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.grass}, ${COLORS.grassDark})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${checkScale})`,
          boxShadow: `0 20px 40px ${COLORS.grass}40`,
        }}
      >
        <span style={{ fontSize: 70, color: COLORS.white }}>✓</span>
      </div>

      {/* Student info */}
      <div
        style={{
          marginTop: 40,
          textAlign: "center",
          opacity: textSpring,
          transform: `translateY(${interpolate(textSpring, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily,
            fontSize: 28,
            fontWeight: 700,
            color: COLORS.dark,
          }}
        >
          María García
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 18,
            color: "#978F8A",
            marginTop: 8,
          }}
        >
          3° Primaria - Grupo A
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 16,
            color: COLORS.grassDark,
            marginTop: 16,
            fontWeight: 500,
          }}
        >
          Entrada registrada: 8:02 AM
        </div>
      </div>
    </div>
  );
};

export const QRAttendance: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #1a1a2e 0%, ${COLORS.secondary} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Title */}
      <Sequence from={0} layout="none" premountFor={fps}>
        <TitleSection />
      </Sequence>

      {/* Phone with scanner */}
      <Sequence from={Math.round(0.5 * fps)} durationInFrames={Math.round(3.5 * fps)} premountFor={fps}>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>
          <PhoneFrame>
            <ScannerView />
          </PhoneFrame>
        </div>
      </Sequence>

      {/* Phone with success */}
      <Sequence from={Math.round(4 * fps)} premountFor={fps}>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>
          <PhoneFrame>
            <SuccessView />
          </PhoneFrame>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

const TitleSection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        position: "absolute",
        top: 140,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: 52,
          fontWeight: 700,
          color: COLORS.white,
        }}
      >
        Control de Accesos
      </div>
      <div
        style={{
          fontFamily,
          fontSize: 24,
          fontWeight: 300,
          color: COLORS.accent,
          marginTop: 12,
        }}
      >
        Escanea. Registra. Listo.
      </div>
    </div>
  );
};
