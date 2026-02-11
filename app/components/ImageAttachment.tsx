import React, { useEffect, useState, useRef, useCallback, memo } from 'react'
import {
  View,
  Image,
  Dimensions,
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { colors } from '../theme'

// Convert HEIC/HEIF images to JPEG for S3 compatibility
const convertHeicToJpeg = async (uri: string, mimeType: string): Promise<{ uri: string; mimeType: string }> => {
  const isHeic = mimeType?.toLowerCase().includes('heic') || mimeType?.toLowerCase().includes('heif')
  if (!isHeic) {
    return { uri, mimeType }
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  )
  return { uri: result.uri, mimeType: 'image/jpeg' }
}

const ATTACHMENT_WIDTH = Dimensions.get('window').width * 0.6

export interface MediaAsset {
  uri: string
  mimeType: string
  type: 'image' | 'video'
}

interface ImageAttachmentProps {
  mediaType: 'img' | 'vid'
  setAssetURL: (url: string) => void
  setMimeType: (type: string) => void
  // New props for multiple images
  allowMultiple?: boolean
  onMultipleImagesSelected?: (assets: MediaAsset[]) => void
}

const ImageAttachment = memo(function ImageAttachment({
  mediaType,
  setAssetURL,
  setMimeType,
  allowMultiple = false,
  onMultipleImagesSelected,
}: ImageAttachmentProps) {
  // Use new MediaType API instead of deprecated MediaTypeOptions
  const mediaTypeOption: ImagePicker.MediaType[] = mediaType === 'img'
    ? ['images']
    : ['videos']

  const [images, setImages] = useState<MediaAsset[]>([])
  const [video, setVideo] = useState<string | null>(null)
  const videoRef = useRef<Video>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (images.length === 0 && video === null) {
      pickMedia()
    }
  }, [])

  const pickMedia = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaTypeOption,
      allowsEditing: !allowMultiple && mediaType === 'img',
      allowsMultipleSelection: allowMultiple && mediaType === 'img',
      aspect: [4, 3],
      quality: 1,
      selectionLimit: allowMultiple ? 10 : 1,
    })

    if (!result.canceled && result.assets.length > 0) {
      if (mediaType === 'vid') {
        // Video handling (single only)
        const asset = result.assets[0]
        const mimeType = asset.mimeType ?? 'video/mp4'
        setMimeType(mimeType)
        setAssetURL(asset.uri)
        setVideo(asset.uri)
      } else if (allowMultiple && result.assets.length > 0) {
        // Multiple images - convert HEIC to JPEG
        const mediaAssets: MediaAsset[] = await Promise.all(
          result.assets.map(async (asset) => {
            const converted = await convertHeicToJpeg(asset.uri, asset.mimeType ?? 'image/jpeg')
            return {
              uri: converted.uri,
              mimeType: converted.mimeType,
              type: 'image' as const,
            }
          })
        )
        setImages(mediaAssets)
        onMultipleImagesSelected?.(mediaAssets)
        // Also set the first image for backward compatibility
        if (mediaAssets.length > 0) {
          setMimeType(mediaAssets[0].mimeType)
          setAssetURL(mediaAssets[0].uri)
        }
      } else {
        // Single image - convert HEIC to JPEG
        const asset = result.assets[0]
        const converted = await convertHeicToJpeg(asset.uri, asset.mimeType ?? 'image/jpeg')
        setMimeType(converted.mimeType)
        setAssetURL(converted.uri)
        setImages([{ uri: converted.uri, mimeType: converted.mimeType, type: 'image' }])
      }
    }
  }, [mediaType, mediaTypeOption, allowMultiple, setAssetURL, setMimeType, onMultipleImagesSelected])

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying)
    }
  }, [])

  const togglePlayback = useCallback(async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync()
      } else {
        await videoRef.current.playAsync()
      }
    }
  }, [isPlaying])

  const removeImage = useCallback((indexToRemove: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, index) => index !== indexToRemove)
      if (newImages.length > 0) {
        setAssetURL(newImages[0].uri)
        setMimeType(newImages[0].mimeType)
        onMultipleImagesSelected?.(newImages)
      } else {
        setAssetURL('')
        setMimeType('')
        onMultipleImagesSelected?.([])
      }
      return newImages
    })
  }, [setAssetURL, setMimeType, onMultipleImagesSelected])

  const addMoreImages = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: 10 - images.length,
    })

    if (!result.canceled && result.assets.length > 0) {
      // Convert HEIC to JPEG
      const newAssets: MediaAsset[] = await Promise.all(
        result.assets.map(async (asset) => {
          const converted = await convertHeicToJpeg(asset.uri, asset.mimeType ?? 'image/jpeg')
          return {
            uri: converted.uri,
            mimeType: converted.mimeType,
            type: 'image' as const,
          }
        })
      )

      setImages(prev => {
        const combined = [...prev, ...newAssets].slice(0, 10)
        onMultipleImagesSelected?.(combined)
        return combined
      })
    }
  }, [images.length, onMultipleImagesSelected])

  return (
    <View style={styles.container}>
      {images.length > 0 && (
        <View style={styles.imagesContainer}>
          {images.map((asset, index) => (
            <View key={`${asset.uri}-${index}`} style={styles.imageWrapper}>
              <Image
                source={{ uri: asset.uri }}
                style={styles.image}
              />
              <Pressable
                onPress={() => removeImage(index)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </Pressable>
            </View>
          ))}
          {allowMultiple && images.length < 10 && (
            <Pressable onPress={addMoreImages} style={styles.addMoreButton}>
              <Text style={styles.addMoreText}>+</Text>
              <Text style={styles.addMoreLabel}>Agregar</Text>
            </Pressable>
          )}
        </View>
      )}

      {video ? (
        <View>
          <Video
            ref={videoRef}
            source={{ uri: video }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
          <Pressable style={styles.playButton} onPress={togglePlayback}>
            <Text style={styles.playButtonText}>
              {isPlaying ? 'Pausar' : 'Reproducir'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: ATTACHMENT_WIDTH / 2 - 4,
    height: ATTACHMENT_WIDTH / 2 - 4,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addMoreButton: {
    width: ATTACHMENT_WIDTH / 2 - 4,
    height: ATTACHMENT_WIDTH / 2 - 4,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.palette.lavanderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.palette.neutral100,
  },
  addMoreText: {
    fontSize: 32,
    color: colors.palette.lavanderDark,
  },
  addMoreLabel: {
    fontSize: 12,
    color: colors.palette.lavanderDark,
    marginTop: 4,
  },
  video: {
    width: ATTACHMENT_WIDTH,
    height: ATTACHMENT_WIDTH,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  playButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  playButtonText: {
    color: colors.palette.actionBlue,
    fontWeight: '500',
  },
})

export default ImageAttachment
