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
  white: "#FFFFFF",
  dark: "#191015",
};

const GradientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rotation = interpolate(frame, [0, 5 * fps], [0, 360], {
    extrapolateRight: "extend",
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.secondary,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          top: "-50%",
          left: "-50%",
          background: `conic-gradient(from ${rotation}deg, ${COLORS.secondary}, #626894, ${COLORS.primary}40, ${COLORS.secondary})`,
          opacity: 0.6,
        }}
      />
      {/* Floating orbs */}
      {[0, 1, 2, 3, 4].map((i) => {
        const delay = i * 8;
        const y = interpolate(
          frame - delay,
          [0, 5 * fps],
          [1920 + 200, -200],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const x = 200 + i * 180;
        const size = 100 + i * 60;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.accent}30, transparent)`,
              left: x,
              top: y,
              filter: "blur(20px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const rotation = interpolate(spring({ frame, fps, config: { damping: 15 } }), [0, 1], [-15, 0]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${scale}) rotate(${rotation}deg)`,
      }}
    >
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 20px 60px ${COLORS.primary}60`,
        }}
      >
        <span
          style={{
            fontFamily,
            fontSize: 90,
            fontWeight: 700,
            color: COLORS.white,
            textShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          S
        </span>
      </div>
    </div>
  );
};

const TitleReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(titleSpring, [0, 1], [80, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const subtitleSpring = spring({ frame, fps, config: { damping: 200 }, delay: 10 });
  const subtitleY = interpolate(subtitleSpring, [0, 1], [40, 0]);
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1]);

  return (
    <div style={{ textAlign: "center", marginTop: 60 }}>
      <div
        style={{
          fontFamily,
          fontSize: 96,
          fontWeight: 700,
          color: COLORS.white,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          letterSpacing: -2,
        }}
      >
        Skola
      </div>
      <div
        style={{
          fontFamily,
          fontSize: 32,
          fontWeight: 300,
          color: COLORS.accent,
          transform: `translateY(${subtitleY}px)`,
          opacity: subtitleOpacity,
          marginTop: 16,
          letterSpacing: 6,
          textTransform: "uppercase",
        }}
      >
        Tu escuela, conectada
      </div>
    </div>
  );
};

const FeaturePills: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = ["Grupos", "Mensajes", "Eventos", "Pagos", "Accesos"];
  const colors = ["#ED5565", "#FC6E51", "#FFCE54", "#48CFAD", "#A0D468"];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 16,
        padding: "0 60px",
        marginTop: 80,
      }}
    >
      {features.map((feature, i) => {
        const delay = i * 5;
        const pillSpring = spring({ frame, fps, config: { damping: 12 }, delay });
        const scale = interpolate(pillSpring, [0, 1], [0, 1]);
        const opacity = interpolate(pillSpring, [0, 1], [0, 1]);

        return (
          <div
            key={feature}
            style={{
              fontFamily,
              fontSize: 28,
              fontWeight: 500,
              color: COLORS.white,
              background: `${colors[i]}CC`,
              padding: "16px 32px",
              borderRadius: 80,
              transform: `scale(${scale})`,
              opacity,
              boxShadow: `0 8px 24px ${colors[i]}40`,
            }}
          >
            {feature}
          </div>
        );
      })}
    </div>
  );
};

const CTAButton: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const btnSpring = spring({ frame, fps, config: { damping: 12 } });
  const scale = interpolate(btnSpring, [0, 1], [0.5, 1]);
  const opacity = interpolate(btnSpring, [0, 1], [0, 1]);

  const pulse = interpolate(frame % (fps * 2), [0, fps], [1, 1.05], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: 100,
        transform: `scale(${scale * pulse})`,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: 36,
          fontWeight: 700,
          color: COLORS.dark,
          background: COLORS.accent,
          padding: "28px 64px",
          borderRadius: 80,
          boxShadow: `0 12px 40px ${COLORS.accent}60, 0 4px 0 ${COLORS.primary}`,
        }}
      >
        Comenzar Ahora
      </div>
    </div>
  );
};

export const HeroIntro: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <GradientBackground />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Sequence from={0} layout="none" premountFor={fps}>
          <LogoReveal />
        </Sequence>
        <Sequence from={Math.round(0.5 * fps)} layout="none" premountFor={fps}>
          <TitleReveal />
        </Sequence>
        <Sequence from={Math.round(1.5 * fps)} layout="none" premountFor={fps}>
          <FeaturePills />
        </Sequence>
        <Sequence from={Math.round(3 * fps)} layout="none" premountFor={fps}>
          <CTAButton />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
