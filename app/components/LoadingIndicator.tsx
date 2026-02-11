import React from "react"
import { View, ActivityIndicator, Modal, ViewStyle, TextStyle } from "react-native"
import { Text } from "./Text"
import { colors, spacing } from "../theme"

export interface LoadingIndicatorProps {
  /**
   * Whether the loading indicator is visible
   */
  visible: boolean
  /**
   * Optional loading message to display
   */
  message?: string
  /**
   * Optional overlay background color
   */
  overlayColor?: string
}

/**
 * A full-screen loading indicator with spinner and optional message
 */
export function LoadingIndicator(props: LoadingIndicatorProps) {
  const { visible, message = "Cargando...", overlayColor = colors.palette.overlay50 } = props

  if (!visible) return null

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={[$overlay, { backgroundColor: overlayColor }]}>
        <View style={$container}>
          <ActivityIndicator 
            size="large" 
            color={colors.palette.bluejeansLight}
          />
          {message && (
            <Text style={$message}>{message}</Text>
          )}
        </View>
      </View>
    </Modal>
  )
}

const $overlay: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $container: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.large,
  alignItems: "center",
  shadowColor: colors.palette.neutral900,
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
  minWidth: 120,
}

const $message: TextStyle = {
  marginTop: spacing.medium,
  fontSize: 16,
  color: colors.palette.neutral700,
  textAlign: "center",
}
