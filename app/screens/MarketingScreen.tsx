import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, Button, LoadingIndicator } from "app/components"
import { Entypo } from '@expo/vector-icons';
import { colors, spacing } from "../theme"
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { showLoadingIndicator, hideLoadingIndicator, loadingIndicatorManager } from "../services/utils/LoadingIndicator";

interface MarketingScreenProps extends AppStackScreenProps<"Marketing"> {}

export const MarketingScreen: FC<MarketingScreenProps> = observer(function MarketingScreen({ navigation }) {
  const [loadingState, setLoadingState] = useState({ visible: false, message: "Cargando..." })

  useEffect(() => { 
    setupComponents()
    
    // Listen to loading indicator events
    const handleShow = (state: { visible: boolean; message: string }) => {
      setLoadingState(state)
    }
    
    const handleHide = (state: { visible: boolean; message: string }) => {
      setLoadingState(state)
    }
    
    loadingIndicatorManager.on('show', handleShow)
    loadingIndicatorManager.on('hide', handleHide)
    
    // Cleanup listeners
    return () => {
      loadingIndicatorManager.removeListener('show', handleShow)
      loadingIndicatorManager.removeListener('hide', handleHide)
    }
  }, [])

  function setupComponents() {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.marketingPurple
      },
      headerRight: () => (
        <Entypo name="plus" size={23} style={{marginTop: -2}} color={colors.palette.actionColor}  onPress={plusButtonTapped} /> 
      ),
    });
  }

  function plusButtonTapped() {
    console.log("plusButtonTapped")
  }

  function handleConnectFb() {
    console.log("handleConnectFb")
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Show loading indicator
    showLoadingIndicator("Conectando Facebook...")
    // connectFacebook()
  }
  
  // const connectFacebook = async () => {

  //   console.log('🚀 [Facebook Auth] Starting Facebook connection...');
    
  //   // Create connection document at the start of the process
  //   let connectionId: string | null = null;
  //   try {
  //     connectionId = await connectionService.createConnection(user.uid, 'facebook', 'pending');
  //     console.log('✅ FIRESTORE: Connection document created with ID:', connectionId);
  //   } catch (error) {
  //     console.error('❌ FIRESTORE: Failed to create connection document:', error);
  //     // Don't return here - still attempt the connection even if document creation fails
  //   }
    
  //   try {
  //     // Include user ID as state parameter (Facebook allows this)
  //     const state = user.uid;
  //     const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&scope=pages_show_list,pages_read_engagement,business_management,public_profile,pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish&response_type=code&state=${state}`;
      
  //     console.log('🔗 [Facebook Auth] OAuth URL:', authUrl);
      
  //     // Use WebBrowser to open the OAuth URL
  //     const result = await WebBrowser.openAuthSessionAsync(authUrl, FACEBOOK_REDIRECT_URI);
  //     console.log('📱 [Facebook Auth] Auth session result:', result);
      
  //     // Handle the response
  //     if (result.type === 'success' && result.url) {
  //       const url = new URL(result.url);
  //       const code = url.searchParams.get('code');
  //       const returnedState = url.searchParams.get('state');
  //       console.log("****************************************")
  //       console.log("***FB_AUTH_RESULT:", result);
  //       console.log("***FB_AUTH_CODE:", code);
  //       console.log("****************************************")
        
  //       // Verify the state matches the current user
  //       if (returnedState !== user.uid) {
  //         console.error('❌ [Facebook Auth] State mismatch - possible CSRF attack');
  //         return;
  //       }
        
  //       if (code) {
  //         console.log('✅ [Facebook Auth] OAuth Success - Code received:', code);
  //         await exchangeCodeForToken(code, FACEBOOK_REDIRECT_URI);
  //         // Update connection status to connected on success
  //         if (connectionId) {
  //           try {
  //             await connectionService.updateConnectionStatus(connectionId, 'connected');
  //             console.log('✅ [Facebook Auth] Connection status updated to connected');
  //           } catch (error) {
  //             console.error('❌ [Facebook Auth] Failed to update connection status to connected:', error);
  //           }
  //         }
  //         hideLoadingIndicator();
  //       } else {
  //         console.error('❌ [Facebook Auth] No code found in response URL');
  //         // Update connection status to failed
  //         if (connectionId) {
  //           try {
  //             await connectionService.updateConnectionStatus(connectionId, 'failed');
  //             console.log('⚠️ [Facebook Auth] Connection status updated to failed - no code');
  //           } catch (error) {
  //             console.error('❌ [Facebook Auth] Failed to update connection status to failed:', error);
  //           }
  //         }
  //         hideLoadingIndicator();
  //       }


  //     } 
  //     /*
  //     else if (result.type === 'cancel') {
  //       console.log('⚠️ [Facebook Auth] OAuth Cancelled by user');
  //       // Update connection status to failed when cancelled
  //       if (connectionId) {
  //         try {
  //           await connectionService.updateConnectionStatus(connectionId, 'failed');
  //           console.log('⚠️ [Facebook Auth] Connection status updated to failed - cancelled by user');
  //         } catch (error) {
  //           console.error('❌ [Facebook Auth] Failed to update connection status to failed:', error);
  //         }
  //       }
  //       hideLoadingIndicator();
  //     } else {
  //       console.log('⚠️ [Facebook Auth] OAuth result:', result);
  //       // Update connection status to failed for other result types
  //       if (connectionId) {
  //         try {
  //           await connectionService.updateConnectionStatus(connectionId, 'failed');
  //           console.log('⚠️ [Facebook Auth] Connection status updated to failed - unexpected result');
  //         } catch (error) {
  //           console.error('❌ [Facebook Auth] Failed to update connection status to failed:', error);
  //         }
  //       }
  //       hideLoadingIndicator();
  //     }
  //     */
  //   } catch (error) {
  //     console.error('❌ [Facebook Auth] Error conectando con Facebook:', error);
  //     // Update connection status to failed on exception
  //     if (connectionId) {
  //       try {
  //         await connectionService.updateConnectionStatus(connectionId, 'failed');
  //         console.log('⚠️ [Facebook Auth] Connection status updated to failed - exception occurred');
  //       } catch (updateError) {
  //         console.error('❌ [Facebook Auth] Failed to update connection status to failed:', updateError);
  //       }
  //     }
  //     hideLoadingIndicator();
  //   }
  // };

  /*
  const disconnectFacebook = async () => {
    console.log('🔄 [Facebook Auth] Disconnecting Facebook...');
    
    if (user && userData) {
      // Create connection document for disconnection
      let connectionId: string | null = null;
      try {
        connectionId = await connectionService.createConnection(user.uid, 'facebook', 'disconnected');
        console.log('✅ [Facebook Auth] Disconnection document created with ID:', connectionId);
      } catch (error) {
        console.error('❌ [Facebook Auth] Failed to create disconnection document:', error);
      }
      
      try {
        console.log('👤 [Facebook Auth] Current user data:', userData);
        
        await userService.disconnectFacebook(user.uid);
        
        const updatedUserData = { ...userData };
        delete updatedUserData.facebookAccessToken;
        delete updatedUserData.facebookId;
        delete updatedUserData.facebookUser;
        delete (updatedUserData as any).facebookAuth;
        
        setUserData(updatedUserData);
        setFacebookUser(null);
        
        console.log('✅ [Facebook Auth] Facebook disconnected successfully');
        console.log('🔄 [Facebook Auth] Local state updated - UI should reflect disconnection');
      } catch (error) {
        console.error('❌ [Facebook Auth] Error desconectando Facebook:', error);
        // If disconnection failed, update the connection status to failed
        if (connectionId) {
          try {
            await connectionService.updateConnectionStatus(connectionId, 'failed');
            console.log('⚠️ [Facebook Auth] Disconnection status updated to failed');
          } catch (updateError) {
            console.error('❌ [Facebook Auth] Failed to update disconnection status:', updateError);
          }
        }
      }
    } else {
      console.warn('⚠️ [Facebook Auth] No user or userData found for disconnection');
    }
  };
  */

  return (
    <Screen style={$root} preset="scroll">
      <Text weight="bold" style={$titleText}>🚀 Centro de Marketing</Text>
      
      <Text style={$descriptionText}>
        ¡Bienvenido a tu centro de marketing! Aquí encontrarás todas las herramientas necesarias para hacer crecer tu escuela y atraer más familias cada mes.
      </Text>
      
      <Text style={$subtitleText}>¿Por qué es importante?</Text>
      <Text style={$bodyText}>
        • Aumenta la visibilidad de tu escuela en redes sociales{'\n'}
        • Atrae más padres de familia interesados en tus servicios{'\n'}
        • Comunica los valores únicos que hacen especial a tu escuela{'\n'}
        • Genera confianza y credibilidad en tu comunidad
      </Text>

      <Text style={$subtitleText}>📱 Conecta tus Redes Sociales</Text>
      <Text style={$bodyText}>
        Conecta tus cuentas de redes sociales para gestionar todo desde un solo lugar. Comenzaremos con Facebook, la plataforma más efectiva para escuelas.
      </Text>
      
      <Text weight="semiBold" style={$stepText}>Paso 1: Conecta tu cuenta de Facebook</Text>
      <Button
          testID="connectFb-button"
          tx="marketingScreen.connectFbBttn"
          style={$connectFbButton}
          textStyle={{ color: colors.palette.neutral100, fontWeight: "bold", fontSize: 20, marginTop: spacing.tiny }}
          preset="default"
          onPress={handleConnectFb}
        />

      <Text style={$subtitleText}>📋 Próximas Plataformas</Text>
      <Text style={$bodyText}>
        Una vez conectado Facebook, podrás agregar estas plataformas adicionales:
      </Text>
      
      <Text style={$categoryText}>🎯 Redes Sociales Principales</Text>
      <Text style={$platformText}>• Instagram - Ideal para fotos y videos de actividades escolares</Text>
      <Text style={$platformText}>• YouTube - Perfecto para videos informativos y eventos</Text>
      <Text style={$platformText}>• TikTok - Conecta con padres jóvenes con contenido dinámico</Text>
      
      <Text style={$categoryText}>💼 Plataformas Profesionales</Text>
      <Text style={$platformText}>• LinkedIn - Networking con otros educadores y profesionales</Text>
      <Text style={$platformText}>• Twitter - Noticias y actualizaciones rápidas</Text>
      
      <Text style={$categoryText}>📱 Comunicación Directa</Text>
      <Text style={$platformText}>• WhatsApp - Comunicación directa con padres</Text>
      <Text style={$platformText}>• Telegram - Canales de noticias y actualizaciones</Text>
      <Text style={$platformText}>• Email - Boletines y comunicaciones formales</Text>
      <Text style={$platformText}>• SMS - Alertas y recordatorios importantes</Text>
      
      <Text style={$categoryText}>🎨 Plataformas Creativas</Text>
      <Text style={$platformText}>• Pinterest - Inspiración educativa y actividades</Text>
      <Text style={$platformText}>• Snapchat - Contenido casual y momentos especiales</Text>
      
      <Text style={$subtitleText}>💡 Consejos para Empezar</Text>
      <Text style={$bodyText}>
        1. Comienza con Facebook - es donde están la mayoría de los padres{'\n'}
        2. Publica contenido regularmente (2-3 veces por semana){'\n'}
        3. Comparte fotos de actividades, logros estudiantiles y eventos{'\n'}
        4. Responde rápidamente a comentarios y mensajes{'\n'}
        5. Usa hashtags locales para llegar a más familias de tu área
      </Text>
      
      <LoadingIndicator 
        visible={loadingState.visible} 
        message={loadingState.message} 
      />
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingTop: spacing.stdPadding,
  paddingHorizontal: spacing.stdPadding,
}

const $connectFbButton: ViewStyle = {
  marginTop: spacing.tiny,
  marginBottom: spacing.medium,
  backgroundColor: colors.palette.bluejeansLight,
  borderRadius: 80,
  borderColor: colors.palette.bluejeansDark,
  borderBottomWidth: 4
}

const $titleText = {
  fontSize: 24,
  color: colors.palette.neutral700,
  marginBottom: spacing.medium,
  textAlign: 'center' as const
}

const $descriptionText = {
  fontSize: 16,
  color: colors.palette.neutral600,
  marginBottom: spacing.large,
  lineHeight: 24
}

const $subtitleText = {
  fontSize: 18,
  fontWeight: 'bold' as const,
  color: colors.palette.neutral700,
  marginTop: spacing.large,
  marginBottom: spacing.small
}

const $bodyText = {
  fontSize: 14,
  color: colors.palette.neutral600,
  marginBottom: spacing.medium,
  lineHeight: 20
}

const $stepText = {
  fontSize: 16,
  fontWeight: 'bold' as const,
  color: colors.palette.neutral800,
  marginTop: spacing.medium,
  marginBottom: spacing.tiny
}

const $categoryText = {
  fontSize: 16,
  fontWeight: 'bold' as const,
  color: colors.palette.neutral700,
  marginTop: spacing.medium,
  marginBottom: spacing.tiny
}

const $platformText = {
  fontSize: 14,
  color: colors.palette.neutral600,
  marginBottom: spacing.tiny,
  marginLeft: spacing.small,
  lineHeight: 18
}
