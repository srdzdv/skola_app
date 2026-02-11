import * as ImageManipulator from 'expo-image-manipulator'
import * as ParseAPI from "./parse/ParseAPI"
import { Platform } from "react-native"
import * as FileSystem from 'expo-file-system/legacy'
import * as Crypto from 'expo-crypto'

// Type definitions for standardized API responses
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

interface UploadResponseData {
    objectKey: string;
    size: number;
    contentType: string;
    uploadedAt: string;
    etag: string;
    bucket: string;
}

interface SignedUrlResponseData {
    signedUrl: string;
    expiresAt: string;
    expiresIn: number;
    objectKey: string;
}

// Error code to user-friendly message mapping
const ERROR_MESSAGES: Record<string, string> = {
    'INVALID_PARAMS': 'Faltan datos requeridos',
    'NOT_FOUND': 'No se encontró el archivo',
    'FILE_TOO_LARGE': 'El archivo es muy grande',
    'INVALID_FILE_TYPE': 'Formato de archivo no soportado',
    'UNAUTHORIZED': 'No tienes permiso para esta acción',
    'S3_ERROR': 'Error al subir archivo, intenta de nuevo',
}

function getErrorMessage(error: { code: string; message: string }): string {
    return ERROR_MESSAGES[error.code] || error.message || 'Error desconocido'
}

var contentTypeString = 'image/jpg';
const resizedPrefix = "resized-"


    export async function uploadImageDataToAWS(objectId: string, imageURI: string, contentType: string, resize: boolean = false) {
        if (contentType != contentTypeString) {
            contentTypeString = contentType
        }

        try {
            console.log("uploadImageDataToAWS - objectId:", objectId, "resize:", resize, "contentType:", contentType)

            // Upload original image first
            const originalUploadResult = await uploadSingleImage(objectId, imageURI, contentType);
            console.log("Original image uploaded successfully:", objectId)

            let resizedUploadResult = null;

            // Then upload resized thumbnail if requested
            if (resize && contentType !== 'application/pdf') {
                try {
                    console.log("Starting resize for:", objectId)
                    const resizedUri = await resizeImage(objectId, imageURI);
                    console.log("Resize completed, resized URI:", resizedUri)

                    // Check if resize actually created a different file
                    // (on Android failure, it might return the original URI)
                    if (resizedUri && resizedUri !== imageURI) {
                        const resizedObjId = resizedPrefix + objectId;
                        // ImageManipulator always outputs JPEG, so use image/jpeg for resized
                        console.log("Uploading resized image with key:", resizedObjId)
                        resizedUploadResult = await uploadSingleImage(resizedObjId, resizedUri, 'image/jpeg');
                        console.log("Resized image uploaded successfully:", resizedObjId)
                    } else {
                        // Resize returned same URI (failed silently on Android)
                        // Skip thumbnail upload
                        console.log("Resize failed (returned original URI), skipping thumbnail upload")
                    }
                } catch (resizeError) {
                    console.error("Resize/thumbnail upload failed:", resizeError)
                    // Don't fail the whole upload if just the thumbnail fails
                    console.log("Skipping thumbnail due to resize error")
                }
            }

            return {
                originalUpload: originalUploadResult,
                resizedUpload: resizedUploadResult,
                success: true
            };
        } catch (error) {
            console.error("Upload failed:", error);
            throw error; // Re-throw the error to let the caller handle it
        }
    }

    async function uploadSingleImage(objectId: string, imageURI: string, contentType: string) {
        // For PDF files, use FileSystem API for reliable cross-platform handling
        // This is especially important for Android but also works well on iOS
        if (contentType === 'application/pdf') {
            let localFilePath: string | null = null;

            try {
                // Check if the URI is valid
                if (!imageURI || imageURI.length === 0) {
                    throw new Error("No file URI provided for PDF upload");
                }

                console.log("PDF Upload - Starting with URI:", imageURI);

                // Determine if we need to copy the file first
                // - Android content:// URIs need to be copied
                // - file:// URIs from cache (copyToCacheDirectory: true) can be read directly
                const needsCopy = Platform.OS === 'android' && imageURI.startsWith('content://');

                if (needsCopy) {
                    // Create a unique file name in the cache directory for this PDF
                    const hashedName = await Crypto.digestStringAsync(
                        Crypto.CryptoDigestAlgorithm.SHA256,
                        objectId + Date.now().toString()
                    );
                    localFilePath = `${FileSystem.cacheDirectory}${hashedName}.pdf`;

                    console.log("PDF Upload - Copying content:// URI to:", localFilePath);

                    // First copy the file from content URI to local filesystem
                    await FileSystem.copyAsync({
                        from: imageURI,
                        to: localFilePath
                    });

                    // Verify the copy succeeded
                    const fileInfo = await FileSystem.getInfoAsync(localFilePath);
                    if (!fileInfo.exists) {
                        throw new Error("Failed to copy PDF file to cache directory");
                    }
                    if (fileInfo.size === 0) {
                        throw new Error("PDF file copy resulted in empty file");
                    }
                    console.log("PDF Upload - File copied successfully, size:", fileInfo.size);
                } else {
                    // For file:// URIs (from copyToCacheDirectory: true), use directly
                    localFilePath = imageURI;

                    // Verify the file exists
                    const fileInfo = await FileSystem.getInfoAsync(localFilePath);
                    if (!fileInfo.exists) {
                        throw new Error("PDF file not found at specified path");
                    }
                    console.log("PDF Upload - Using existing file, size:", fileInfo.size);
                }

                // Now read the file from the local filesystem
                console.log("PDF Upload - Reading file as base64...");
                const base64Data = await FileSystem.readAsStringAsync(localFilePath, {
                    encoding: FileSystem.EncodingType.Base64
                });

                if (!base64Data || base64Data.length === 0) {
                    throw new Error("Failed to read PDF file - empty base64 data");
                }

                console.log("PDF Upload - Base64 data length:", base64Data.length);

                // Create a data URL
                const dataUrl = `data:${contentType};base64,${base64Data}`;

                // Prepare the payload
                const payload = {
                    objectKey: objectId,
                    imageBase64: dataUrl,
                    contentType: contentType
                };

                const cloudFuncName = "uploadAWSS3Object";
                console.log("PDF Upload - Calling cloud function...");

                const cloudRes: ApiResponse<UploadResponseData> = await ParseAPI.runCloudCodeFunction(cloudFuncName, payload);

                // Handle new standardized response format
                if (!cloudRes || !cloudRes.success) {
                    const errorMsg = cloudRes?.error
                        ? getErrorMessage(cloudRes.error)
                        : 'No response from server';
                    throw new Error(`Failed to upload PDF to S3: ${errorMsg}`);
                }

                console.log("PDF Upload - Cloud function succeeded, objectKey:", cloudRes.data?.objectKey);

                // Clean up the temp file only if we created it (needsCopy was true)
                if (needsCopy && localFilePath) {
                    FileSystem.deleteAsync(localFilePath, { idempotent: true })
                        .catch(err => console.warn("Failed to delete temp PDF file:", err));
                }

                return cloudRes.data;

            } catch (error) {
                // Clean up the temp file on error if we created one
                if (localFilePath && localFilePath.startsWith(FileSystem.cacheDirectory || '')) {
                    FileSystem.deleteAsync(localFilePath, { idempotent: true })
                        .catch(err => console.warn("Failed to delete temp PDF file on error:", err));
                }

                console.error("PDF upload failed:", error);

                // Re-throw with a more descriptive message
                if (error instanceof Error) {
                    throw new Error(`PDF upload failed: ${error.message}`);
                }
                throw new Error("PDF upload failed: Unknown error");
            }
        } else {
            // For images, handle both file:// URIs and content:// URIs
            console.log("Image upload - URI:", imageURI, "contentType:", contentType)

            let base64data: string;

            // On Android, use FileSystem API for file:// URIs (more reliable)
            // This is especially important for resized images from ImageManipulator
            if (Platform.OS === 'android' && (imageURI.startsWith('file://') || imageURI.startsWith('content://'))) {
                try {
                    let localPath = imageURI;

                    // If it's a content:// URI, copy to cache first
                    if (imageURI.startsWith('content://')) {
                        const hashedName = await Crypto.digestStringAsync(
                            Crypto.CryptoDigestAlgorithm.SHA256,
                            objectId + "_img_" + Date.now().toString()
                        );
                        localPath = `${FileSystem.cacheDirectory}${hashedName}.jpg`;
                        await FileSystem.copyAsync({ from: imageURI, to: localPath });
                    }

                    // Read file as base64
                    const base64Content = await FileSystem.readAsStringAsync(localPath, {
                        encoding: FileSystem.EncodingType.Base64
                    });

                    // Create data URL
                    base64data = `data:${contentType};base64,${base64Content}`;

                    // Clean up temp file if we created one
                    if (imageURI.startsWith('content://')) {
                        FileSystem.deleteAsync(localPath, { idempotent: true })
                            .catch(err => console.warn("Failed to delete temp image file:", err));
                    }
                } catch (fsError) {
                    console.error("FileSystem read failed, falling back to fetch:", fsError);
                    // Fall back to fetch approach
                    const response = await fetch(imageURI);
                    const blob: Blob = await response.blob();
                    base64data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(blob);
                    });
                }
            } else {
                // For iOS or other cases, use fetch approach
                const response = await fetch(imageURI);
                const blob: Blob = await response.blob();
                base64data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(blob);
                });
            }

            // Upload to S3
            const payload = {
                objectKey: objectId,
                imageBase64: base64data,
                contentType: contentType
            };
            const cloudFuncName = "uploadAWSS3Object"
            const cloudRes: ApiResponse<UploadResponseData> = await ParseAPI.runCloudCodeFunction(cloudFuncName, payload)

            // Handle new standardized response format
            if (!cloudRes || !cloudRes.success) {
                const errorMsg = cloudRes?.error
                    ? getErrorMessage(cloudRes.error)
                    : 'No response from server';
                throw new Error(`Failed to upload image: ${errorMsg}`)
            }

            console.log("Image upload succeeded, objectKey:", cloudRes.data?.objectKey)
            return cloudRes.data;
        }
    }

    export async function getS3FileSignedURL(objectId: string): Promise<string> {
        const funcName = "getOLDAWSS3SignedUrl";
        const params = { objectKey: objectId };
        const response: ApiResponse<SignedUrlResponseData> = await ParseAPI.runCloudCodeFunction(funcName, params)

        // Handle new standardized response format
        if (!response || !response.success) {
            const errorMsg = response?.error
                ? getErrorMessage(response.error)
                : 'No response from server';
            throw new Error(`Failed to get signed URL: ${errorMsg}`)
        }

        return response.data!.signedUrl;
    }

    export async function getSignedObjectUrl(objectKey: string): Promise<string> {
        try {
            const cloudFuncName = "getAWSS3SignedUrl"
            const params = { objectKey: objectKey };
            const response: ApiResponse<SignedUrlResponseData> = await ParseAPI.runCloudCodeFunction(cloudFuncName, params)

            // Handle new standardized response format
            if (!response || !response.success) {
                const errorMsg = response?.error
                    ? getErrorMessage(response.error)
                    : 'No response from server';
                throw new Error(`Failed to get signed URL: ${errorMsg}`)
            }

            return response.data!.signedUrl;
        } catch (error) {
            console.error("Error getting signed URL:", error);
            throw error;
        }
    }

    async function resizeImage(eventoGaleriaObjId: string, uri: string): Promise<string> {
        console.log("**resizeImage: " + eventoGaleriaObjId)
        console.log("Original URI to resize:", uri);
        
        try {
            // For Android content:// URIs, we'll try a direct approach first
            if (Platform.OS === 'android' && uri.startsWith('content://')) {
                try {
                    // Try to resize the image directly without copying first
                    console.log("Attempting direct resize on Android content URI");
                    const resizedImage = await ImageManipulator.manipulateAsync(
                        uri,
                        [{ resize: { width: 200 } }],
                        { format: ImageManipulator.SaveFormat.JPEG }
                    );
                    console.log("Direct resize succeeded on Android");
                    return resizedImage.uri;
                } catch (directError) {
                    // Direct approach failed, log and continue to fallback
                    console.log("Direct resize failed, falling back to copy method:", directError);
                    
                    // We'll use the FileSystem to get file info if possible
                    let fileExtension = ".jpg";
                    try {
                        const fileInfo = await FileSystem.getInfoAsync(uri);
                        console.log("File info:", fileInfo);
                        
                        // Try to determine extension from URI
                        if (uri.includes(".")) {
                            const uriParts = uri.split(".");
                            const lastPart = uriParts[uriParts.length - 1];
                            if (lastPart && lastPart.length <= 4) {
                                fileExtension = "." + lastPart;
                                console.log("Detected extension from URI:", fileExtension);
                            }
                        }
                    } catch (infoError) {
                        console.log("Could not get file info:", infoError);
                        // Continue with default extension
                    }
                    
                    // Create a unique filename in the cache directory
                    const hashedName = await Crypto.digestStringAsync(
                        Crypto.CryptoDigestAlgorithm.SHA256,
                        eventoGaleriaObjId + "_temp"
                    );
                    const localFilePath = `${FileSystem.cacheDirectory}${hashedName}${fileExtension}`;
                    
                    console.log("Will copy to local path:", localFilePath);
                    
                    // Copy the file from content URI to local filesystem
                    await FileSystem.copyAsync({
                        from: uri,
                        to: localFilePath
                    });
                    
                    console.log("Image copied to local path for resizing:", localFilePath);
                    
                    // Verify the file exists and has content
                    const fileInfo = await FileSystem.getInfoAsync(localFilePath);
                    console.log("Copied file info:", fileInfo);
                    
                    if (!fileInfo.exists || fileInfo.size === 0) {
                        throw new Error("File copy failed or resulted in empty file");
                    }
                    
                    // Try different formats if JPEG doesn't work
                    try {
                        const resizedImage = await ImageManipulator.manipulateAsync(
                            localFilePath,
                            [{ resize: { width: 200 } }],
                            { format: ImageManipulator.SaveFormat.JPEG }
                        );
                        
                        // Clean up temp file
                        FileSystem.deleteAsync(localFilePath, { idempotent: true })
                            .catch(err => console.warn("Failed to delete temp image file:", err));
                            
                        return resizedImage.uri;
                    } catch (jpegError) {
                        console.log("JPEG resize failed, trying PNG format:", jpegError);
                        
                        // Try with PNG format
                        const resizedImage = await ImageManipulator.manipulateAsync(
                            localFilePath,
                            [{ resize: { width: 200 } }],
                            { format: ImageManipulator.SaveFormat.PNG }
                        );
                        
                        // Clean up temp file
                        FileSystem.deleteAsync(localFilePath, { idempotent: true })
                            .catch(err => console.warn("Failed to delete temp image file:", err));
                            
                        return resizedImage.uri;
                    }
                }
            } else {
                // For iOS or non-content URIs, use the original approach
                const resizedImage = await ImageManipulator.manipulateAsync(
                    uri,
                    [{ resize: { width: 200 } }],
                    { format: ImageManipulator.SaveFormat.JPEG }
                );
                return resizedImage.uri;
            }
        } catch (err) {
            console.error("ImageResizer_Error: ", err);
            
            // For debugging purposes, log more detailed error info
            if (err instanceof Error) {
                console.error("Error details:", {
                    message: err.message,
                    stack: err.stack,
                    name: err.name
                });
            }
            
            if (Platform.OS === 'android') {
                // On Android, if all else fails, just return the original URI
                console.log("Resize failed on Android, returning original URI");
                return uri;
            }
            
            throw err;
        }
    }