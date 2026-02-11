import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  AbsoluteFill,
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
  blueJeans: "#5D9CEC",
  blueJeansDark: "#4A89DC",
  white: "#FFFFFF",
  dark: "#191015",
  lightGray: "#F4F2F1",
};

const SchoolIcon: React.FC<{ scale: number }> = ({ scale }) => (
  <div
    style={{
      width: 140,
      height: 140,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${COLORS.secondary}, #626894)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: `scale(${scale})`,
      boxShadow: `0 10px 30px ${COLORS.secondary}50`,
    }}
  >
    <span style={{ fontSize: 70 }}>🏫</span>
  </div>
);

const FamilyIcon: React.FC<{ scale: number; index: number }> = ({ scale, index }) => {
  const emojis = ["👨‍👩‍👧", "👨‍👩‍👦", "👩‍👧‍👦", "👨‍👧", "👩‍👦"];
  return (
    <div
      style={{
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${scale})`,
        boxShadow: `0 8px 24px ${COLORS.primary}40`,
      }}
    >
      <span style={{ fontSize: 52 }}>{emojis[index % emojis.length]}</span>
    </div>
  );
};

const MessageBubble: React.FC<{
  text: string;
  fromSchool: boolean;
  delay: number;
}> = ({ text, fromSchool, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bubbleSpring = spring({ frame, fps, config: { damping: 12 }, delay });
  const scale = interpolate(bubbleSpring, [0, 1], [0.3, 1]);
  const opacity = interpolate(bubbleSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        alignSelf: fromSchool ? "flex-start" : "flex-end",
        maxWidth: "88%",
        transform: `scale(${scale})`,
        opacity,
        transformOrigin: fromSchool ? "left center" : "right center",
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: 48,
          color: fromSchool ? COLORS.white : COLORS.dark,
          background: fromSchool
            ? `linear-gradient(135deg, ${COLORS.blueJeansDark}, ${COLORS.blueJeans})`
            : COLORS.lightGray,
          padding: "32px 40px",
          borderRadius: 20,
          borderTopLeftRadius: fromSchool ? 4 : 20,
          borderTopRightRadius: fromSchool ? 20 : 4,
          boxShadow: fromSchool
            ? `0 6px 20px ${COLORS.blueJeans}30`
            : "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const ConnectionLines: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame, [0, 2 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.3,
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const lineProgress = interpolate(
          progress,
          [i * 0.15, i * 0.15 + 0.3],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const startX = 540;
        const startY = 500;
        const endX = 200 + i * 170;
        const endY = 1300;

        return (
          <svg
            key={i}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          >
            <line
              x1={startX}
              y1={startY}
              x2={startX + (endX - startX) * lineProgress}
              y2={startY + (endY - startY) * lineProgress}
              stroke={COLORS.accent}
              strokeWidth={2}
              strokeDasharray="8 4"
              opacity={0.6}
            />
          </svg>
        );
      })}
    </div>
  );
};

const NetworkView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const schoolScale = spring({ frame, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 400,
      }}
    >
      <SchoolIcon scale={schoolScale} />

      <ConnectionLines />

      {/* Families */}
      <div
        style={{
          display: "flex",
          gap: 30,
          marginTop: 280,
          flexWrap: "wrap",
          justifyContent: "center",
          padding: "0 40px",
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const familyScale = spring({
            frame,
            fps,
            config: { damping: 12 },
            delay: 15 + i * 8,
          });
          return <FamilyIcon key={i} scale={familyScale} index={i} />;
        })}
      </div>
    </AbsoluteFill>
  );
};

const ChatView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const messages = [
    { text: "Recordatorio: Junta de padres mañana a las 5pm 📋", fromSchool: true, delay: 0 },
    { text: "¡Ahí estaremos! Gracias ✅", fromSchool: false, delay: 20 },
    { text: "Se adjunta la circular del mes 📎", fromSchool: true, delay: 40 },
    { text: "Recibido, muchas gracias 🙏", fromSchool: false, delay: 55 },
  ];

  const containerSpring = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "440px 60px",
        gap: 28,
        opacity: containerSpring,
      }}
    >
      {/* Chat header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 48,
          padding: "28px 32px",
          background: `${COLORS.blueJeans}15`,
          borderRadius: 20,
        }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.secondary}, #626894)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 46 }}>🏫</span>
        </div>
        <div>
          <div style={{ fontFamily, fontSize: 48, fontWeight: 700, color: COLORS.dark }}>
            Colegio Montessori
          </div>
          <div style={{ fontFamily, fontSize: 32, color: "#978F8A" }}>En línea</div>
        </div>
      </div>

      {/* Messages */}
      {messages.map((msg, i) => (
        <MessageBubble key={i} text={msg.text} fromSchool={msg.fromSchool} delay={msg.delay} />
      ))}

      {/* Seen indicator */}
      <Sequence from={Math.round(2.5 * fps)} layout="none" premountFor={fps}>
        <SeenIndicator />
      </Sequence>
    </AbsoluteFill>
  );
};

const SeenIndicator: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        alignSelf: "flex-start",
        fontFamily,
        fontSize: 36,
        color: COLORS.blueJeans,
        opacity,
        marginTop: 8,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span>✓✓</span>
      <span>Visto por 23 familias</span>
    </div>
  );
};

export const CommunicationFlow: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.white} 0%, #E8EDF5 100%)`,
      }}
    >
      {/* Title */}
      <Sequence from={0} layout="none" premountFor={fps}>
        <CommTitle />
      </Sequence>

      {/* Network visualization */}
      <Sequence from={0} durationInFrames={Math.round(3 * fps)} premountFor={fps}>
        <NetworkView />
      </Sequence>

      {/* Chat view */}
      <Sequence from={Math.round(3.5 * fps)} premountFor={fps}>
        <ChatView />
      </Sequence>
    </AbsoluteFill>
  );
};

const CommTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        position: "absolute",
        top: 120,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: titleSpring,
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: 96,
          fontWeight: 700,
          color: COLORS.secondary,
        }}
      >
        Comunicación
      </div>
      <div
        style={{
          fontFamily,
          fontSize: 48,
          fontWeight: 300,
          color: COLORS.primary,
          marginTop: 16,
        }}
      >
        Escuela y familias, siempre conectadas
      </div>
    </div>
  );
};
