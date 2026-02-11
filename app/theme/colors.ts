// TODO: write documentation for colors and palette in own markdown file and add links from here

const palette = {
  grapefruitLight: '#ED5565',
  grapefruitDark: '#DA4453',
  bittersweetLight: '#FC6E51',
  bittersweetDark: '#E9573F',
  sunflowerClear: '#ffe4a1',
  sunflowerLight: '#FFCE54',
  sunflowerDark: '#F6BB42',
  grassClear: '#C3EA9A',
  grassLight: '#A0D468',
  grassDark: '#8CC152',
  mintLight: '#48CFAD',
  mintDark: '#37BC9B',
  aquaLight: '#4FC1E9',
  aquaDark: '#3BAFDA',
  bluejeansClear: '#deebfb',
  bluejeansLight: '#5D9CEC',
  bluejeansDark: '#4A89DC',
  lavanderClear: '#BAA8E5',
  lavanderLight: '#AC92EC',
  lavanderDark: '#967ADC',
  lavanderDarker: '#69559a',
  pinkroseLight: '#EC87C0',
  pinkroseDark: '#D770AD',
  mediumGrayLight: '#CCD1D9',
  mediumGrayDark: '#AAB2BD',
  darkGrayLight: '#656D78',
  darkGrayDark: '#434A54',
  actionColor: '#F2FF66',
  actionBlue: '#007AFF',
  actionYellow: '#FFE043',
  credBckgrnBlue: '#e6f1f4',
  marketingPurple: '#8A2BE2',
  
  neutral100: "#FFFFFF",
  neutral200: "#F4F2F1",
  neutral300: "#D7CEC9",
  neutral400: "#B6ACA6",
  neutral500: "#978F8A",
  neutral600: "#564E4A",
  neutral700: "#3C3836",
  neutral800: "#191015",
  neutral900: "#000000",

  primary100: "#F4E0D9",
  primary200: "#E8C1B4",
  primary300: "#DDA28E",
  primary400: "#D28468",
  primary500: "#C76542",
  primary600: "#A54F31",

  secondary100: "#DCDDE9",
  secondary200: "#BCC0D6",
  secondary300: "#9196B9",
  secondary400: "#626894",
  secondary500: "#41476E",

  accent100: "#FFEED4",
  accent200: "#FFE1B2",
  accent300: "#FDD495",
  accent400: "#FBC878",
  accent500: "#FFBB50",

  angry100: "#F2D6CD",
  angry500: "#C03403",

  overlay20: "rgba(25, 16, 21, 0.2)",
  overlay50: "rgba(25, 16, 21, 0.5)",
} as const

export const colors = {
  /**
   * The palette is available to use, but prefer using the name.
   * This is only included for rare, one-off cases. Try to use
   * semantic names as much as possible.
   */
  palette,
  /**
   * A helper for making something see-thru.
   */
  transparent: "rgba(0, 0, 0, 0)",
  /**
   * The default text color in many components.
   */
  text: palette.neutral800,
  /**
   * Secondary text information.
   */
  textDim: palette.neutral600,
  /**
   * The default color of the screen background.
   */
  background: palette.neutral200,
  /**
   * The default border color.
   */
  border: palette.neutral400,
  /**
   * The main tinting color.
   */
  tint: palette.primary500,
  /**
   * A subtle color used for lines.
   */
  separator: palette.neutral300,
  /**
   * Error messages.
   */
  error: palette.angry500,
  /**
   * Error Background.
   *
   */
  errorBackground: palette.angry100,
}
