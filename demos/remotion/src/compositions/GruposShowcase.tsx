import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  AbsoluteFill,
  staticFile,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

const COLORS = {
  secondary: "#41476E",
  accent: "#FFBB50",
  white: "#FFFFFF",
};

export const GruposShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Phase 1: Rotate left (0 to 2s)
  // Phase 2: Rotate right (2s to 4s)
  // Phase 3: Settle to center (4s to 5.5s)

  const phase1End = 2 * fps;
  const phase2End = 4 * fps;
  const phase3End = 5.5 * fps;

  // Entry scale
  const entryScale = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  // 3D rotation
  let rotateY: number;

  if (frame < phase1End) {
    // Rotate to the left (-30deg)
    rotateY = interpolate(frame, [0, phase1End], [0, -30], {
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    });
  } else if (frame < phase2End) {
    // Rotate from left to right (-30 to +30)
    rotateY = interpolate(frame, [phase1End, phase2End], [-30, 30], {
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    });
  } else {
    // Settle back to center (30 to 0)
    const settleSpring = spring({
      frame: frame - phase2End,
      fps,
      config: { damping: 12, stiffness: 80 },
    });
    rotateY = interpolate(settleSpring, [0, 1], [30, 0]);
  }

  // Subtle vertical float after settling
  const floatY =
    frame > phase3End
      ? Math.sin((frame - phase3End) * 0.05) * 8
      : 0;

  // Shadow follows rotation
  const shadowX = rotateY * 0.5;
  const shadowBlur = 40 + Math.abs(rotateY) * 0.5;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.secondary} 0%, #2a2d4a 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: 1200,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}25, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Phone frame with screenshot */}
      <div
        style={{
          transform: `scale(${entryScale}) rotateY(${rotateY}deg) translateY(${floatY}px)`,
          transformStyle: "preserve-3d",
          borderRadius: 50,
          boxShadow: `${shadowX}px 30px ${shadowBlur}px rgba(0,0,0,0.5)`,
        }}
      >
        <div
          style={{
            width: 580,
            height: 1180,
            borderRadius: 50,
            background: "#1a1a2e",
            padding: 12,
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
              width: 140,
              height: 30,
              background: "#1a1a2e",
              borderRadius: "0 0 18px 18px",
              zIndex: 10,
            }}
          />
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 40,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile("Grupos.png")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        </div>
      </div>

      {/* Label that fades in at the end */}
      {frame > phase3End && (
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: interpolate(
              frame,
              [phase3End, phase3End + fps],
              [0, 1],
              { extrapolateRight: "clamp" }
            ),
            transform: `translateY(${interpolate(
              frame,
              [phase3End, phase3End + fps],
              [20, 0],
              { extrapolateRight: "clamp" }
            )}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 64,
              fontWeight: 700,
              color: COLORS.white,
            }}
          >
            Grupos
          </div>
          <div
            style={{
              fontFamily,
              fontSize: 36,
              fontWeight: 400,
              color: COLORS.accent,
              marginTop: 12,
            }}
          >
            Gestiona tus clases
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
