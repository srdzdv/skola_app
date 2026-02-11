import { Composition, Folder } from "remotion";
import { HeroIntro } from "./compositions/HeroIntro";
import { FeatureCarousel } from "./compositions/FeatureCarousel";
import { QRAttendance } from "./compositions/QRAttendance";
import { CommunicationFlow } from "./compositions/CommunicationFlow";
import { StatsCounter } from "./compositions/StatsCounter";
import { GruposShowcase } from "./compositions/GruposShowcase";

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="SkolaApp-Demos">
      <Composition
        id="HeroIntro"
        component={HeroIntro}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FeatureCarousel"
        component={FeatureCarousel}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="QRAttendance"
        component={QRAttendance}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CommunicationFlow"
        component={CommunicationFlow}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="StatsCounter"
        component={StatsCounter}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="GruposShowcase"
        component={GruposShowcase}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
    </Folder>
  );
};
