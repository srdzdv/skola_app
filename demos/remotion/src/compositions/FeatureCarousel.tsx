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
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
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

type FeatureData = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  darkColor: string;
  features: string[];
};

const FEATURES: FeatureData[] = [
  {
    title: "Grupos",
    subtitle: "Gestiona tus clases",
    icon: "👥",
    color: "#ED5565",
    darkColor: "#DA4453",
    features: ["Listas de alumnos", "Actividades", "Planeaciones"],
  },
  {
    title: "Comunicación",
    subtitle: "Conecta con familias",
    icon: "💬",
    color: "#5D9CEC",
    darkColor: "#4A89DC",
    features: ["Mensajes directos", "Adjuntos multimedia", "Confirmación de lectura"],
  },
  {
    title: "Eventos",
    subtitle: "Organiza actividades",
    icon: "📅",
    color: "#AC92EC",
    darkColor: "#967ADC",
    features: ["Calendario escolar", "Confirmaciones RSVP", "Invitaciones"],
  },
  {
    title: "Accesos",
    subtitle: "Control inteligente",
    icon: "📱",
    color: "#A0D468",
    darkColor: "#8CC152",
    features: ["Escaneo QR", "Monitor en vivo", "Reportes de asistencia"],
  },
  {
    title: "Pagos",
    subtitle: "Finanzas claras",
    icon: "💳",
    color: "#FC6E51",
    darkColor: "#E9573F",
    features: ["Estado de cuenta", "Historial de pagos", "Recordatorios"],
  },
];

const FeatureSlide: React.FC<{ data: FeatureData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 10 } });
  const titleSpring = spring({ frame, fps, config: { damping: 200 }, delay: 8 });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${data.darkColor} 0%, ${data.color} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          border: `2px solid ${COLORS.white}15`,
          top: -100,
          right: -200,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: `2px solid ${COLORS.white}10`,
          bottom: 200,
          left: -150,
        }}
      />

      {/* Icon */}
      <div
        style={{
          fontSize: 140,
          transform: `scale(${iconScale})`,
          marginBottom: 40,
          filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.3))",
        }}
      >
        {data.icon}
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily,
          fontSize: 80,
          fontWeight: 700,
          color: COLORS.white,
          transform: `translateY(${titleY}px)`,
          opacity: titleSpring,
          textShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {data.title}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily,
          fontSize: 32,
          fontWeight: 300,
          color: `${COLORS.white}CC`,
          marginTop: 12,
          opacity: titleSpring,
          transform: `translateY(${titleY * 0.5}px)`,
        }}
      >
        {data.subtitle}
      </div>

      {/* Feature list */}
      <div style={{ marginTop: 80 }}>
        {data.features.map((feature, i) => {
          const featureSpring = spring({
            frame,
            fps,
            config: { damping: 200 },
            delay: 15 + i * 8,
          });
          const featureX = interpolate(featureSpring, [0, 1], [100, 0]);

          return (
            <div
              key={feature}
              style={{
                fontFamily,
                fontSize: 30,
                fontWeight: 400,
                color: COLORS.white,
                padding: "20px 40px",
                marginBottom: 16,
                background: `${COLORS.white}15`,
                borderRadius: 20,
                backdropFilter: "blur(10px)",
                transform: `translateX(${featureX}px)`,
                opacity: featureSpring,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: COLORS.accent,
                }}
              />
              {feature}
            </div>
          );
        })}
      </div>

      {/* Page indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          display: "flex",
          gap: 12,
        }}
      >
        {FEATURES.map((_, i) => (
          <div
            key={i}
            style={{
              width: data === FEATURES[i] ? 32 : 10,
              height: 10,
              borderRadius: 5,
              background: data === FEATURES[i] ? COLORS.white : `${COLORS.white}40`,
              transition: "width 0.3s",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const FeatureCarousel: React.FC = () => {
  const { fps } = useVideoConfig();
  const sceneDuration = Math.round(2 * fps);
  const transitionDuration = Math.round(0.5 * fps);

  return (
    <TransitionSeries>
      {FEATURES.map((feature, i) => (
        <React.Fragment key={feature.title}>
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <FeatureSlide data={feature} />
          </TransitionSeries.Sequence>
          {i < FEATURES.length - 1 && (
            <TransitionSeries.Transition
              presentation={slide({ direction: "from-right" })}
              timing={linearTiming({ durationInFrames: transitionDuration })}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
