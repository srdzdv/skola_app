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

type StatData = {
  value: number;
  suffix: string;
  label: string;
  icon: string;
  color: string;
};

const STATS: StatData[] = [
  { value: 500, suffix: "+", label: "Escuelas activas", icon: "🏫", color: "#5D9CEC" },
  { value: 15000, suffix: "+", label: "Familias conectadas", icon: "👨‍👩‍👧‍👦", color: "#AC92EC" },
  { value: 98, suffix: "%", label: "Satisfacción", icon: "⭐", color: "#FFCE54" },
  { value: 2, suffix: "M+", label: "Mensajes enviados", icon: "💬", color: "#48CFAD" },
];

const AnimatedNumber: React.FC<{ target: number; suffix: string; delay: number }> = ({
  target,
  suffix,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame - delay, [0, 2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const currentValue = Math.round(target * progress);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return num.toLocaleString();
    }
    return num.toString();
  };

  return (
    <span>
      {formatNumber(currentValue)}
      {suffix}
    </span>
  );
};

const StatCard: React.FC<{ stat: StatData; index: number }> = ({ stat, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = index * 12;
  const cardSpring = spring({ frame, fps, config: { damping: 12 }, delay });
  const scale = interpolate(cardSpring, [0, 1], [0.5, 1]);
  const y = interpolate(cardSpring, [0, 1], [100, 0]);

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 32,
        padding: "48px 40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        transform: `scale(${scale}) translateY(${y}px)`,
        opacity: cardSpring,
        boxShadow: `0 20px 40px ${stat.color}20, 0 0 0 1px ${stat.color}15`,
        position: "relative",
        overflow: "hidden",
        width: 420,
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, ${stat.color}, ${stat.color}80)`,
        }}
      />

      {/* Icon */}
      <div
        style={{
          fontSize: 52,
          marginBottom: 8,
        }}
      >
        {stat.icon}
      </div>

      {/* Number */}
      <div
        style={{
          fontFamily,
          fontSize: 64,
          fontWeight: 700,
          color: stat.color,
          lineHeight: 1,
        }}
      >
        <AnimatedNumber target={stat.value} suffix={stat.suffix} delay={delay} />
      </div>

      {/* Label */}
      <div
        style={{
          fontFamily,
          fontSize: 22,
          fontWeight: 400,
          color: "#564E4A",
          textAlign: "center",
        }}
      >
        {stat.label}
      </div>
    </div>
  );
};

const BackgroundParticles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const particles = Array.from({ length: 20 }).map((_, i) => ({
    x: ((i * 137.5) % 1080),
    startY: 1920 + (i * 100),
    speed: 0.5 + (i % 5) * 0.3,
    size: 4 + (i % 4) * 3,
    opacity: 0.1 + (i % 3) * 0.1,
    color: [COLORS.accent, COLORS.primary, "#5D9CEC", "#AC92EC", "#48CFAD"][i % 5],
  }));

  return (
    <>
      {particles.map((p, i) => {
        const y = p.startY - frame * p.speed * 3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: y % 2200 - 200,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              opacity: p.opacity,
            }}
          />
        );
      })}
    </>
  );
};

const TrustBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSpring = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 32px",
        background: `${COLORS.accent}20`,
        borderRadius: 80,
        opacity: badgeSpring,
        transform: `translateY(${interpolate(badgeSpring, [0, 1], [20, 0])}px)`,
      }}
    >
      <span style={{ fontSize: 24 }}>🏆</span>
      <span
        style={{
          fontFamily,
          fontSize: 20,
          fontWeight: 500,
          color: COLORS.secondary,
        }}
      >
        La app #1 para escuelas en México
      </span>
    </div>
  );
};

export const StatsCounter: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #F8F6FF 0%, #FFF8F0 50%, #F0F8FF 100%)`,
        overflow: "hidden",
      }}
    >
      <BackgroundParticles />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "120px 60px",
        }}
      >
        {/* Title */}
        <Sequence from={0} layout="none" premountFor={fps}>
          <StatsTitle />
        </Sequence>

        {/* Stats grid */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            marginTop: 80,
            alignItems: "center",
          }}
        >
          {STATS.map((stat, i) => (
            <Sequence key={stat.label} from={Math.round(0.5 * fps)} layout="none" premountFor={fps}>
              <StatCard stat={stat} index={i} />
            </Sequence>
          ))}
        </div>

        {/* Trust badge */}
        <Sequence from={Math.round(3.5 * fps)} layout="none" premountFor={fps}>
          <div style={{ marginTop: 60 }}>
            <TrustBadge />
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const StatsTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
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
          color: COLORS.secondary,
          lineHeight: 1.2,
        }}
      >
        Números que{"\n"}hablan por sí solos
      </div>
      <div
        style={{
          fontFamily,
          fontSize: 24,
          fontWeight: 300,
          color: COLORS.primary,
          marginTop: 16,
        }}
      >
        La confianza de miles de escuelas
      </div>
    </div>
  );
};
