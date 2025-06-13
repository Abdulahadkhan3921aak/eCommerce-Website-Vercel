'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { usePopup } from '@/lib/contexts/PopupContext'

interface ImageUploadProps {
    images: string[]
    onImagesChange: (images: string[]) => void
    maxImages?: number
}

export default function ImageUpload({ images, onImagesChange, maxImages = 10 }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
    const { showAlert } = usePopup()

    const uploadToCloudinary = async (file: File): Promise<string> => {
        // Validate environment variables
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

        console.log('Cloudinary Config:', {
            cloudName: cloudName ? 'Set' : 'Missing',
            uploadPreset: uploadPreset ? 'Set' : 'Missing'
        })

        if (!cloudName) {
            throw new Error('Cloudinary cloud name is not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in your environment variables.')
        }

        if (!uploadPreset) {
            throw new Error('Cloudinary upload preset is not configured. Please set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your environment variables.')
        }

        // Validate cloud name format - should not contain @ symbol
        if (cloudName.includes('@')) {
            throw new Error('Cloudinary cloud name should not contain @ symbol. Please check your NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable.')
        }

        // Validate file
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 10MB`)
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`File type ${file.type} is not supported. Please use JPG, PNG, GIF, or WebP.`)
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', uploadPreset)

        // Add additional parameters for better handling
        formData.append('folder', 'ecommerce') // Optional: organize uploads in folders
        formData.append('resource_type', 'image')

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

        console.log('Uploading to:', uploadUrl)
        console.log('File details:', {
            name: file.name,
            size: file.size,
            type: file.type
        })

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
            })

            console.log('Upload response status:', response.status)

            if (!response.ok) {
                const errorText = await response.text()
                console.error('Upload error response:', errorText)

                let errorMessage = 'Failed to upload image'
                try {
                    const errorData = JSON.parse(errorText)
                    if (errorData.error && errorData.error.message) {
                        errorMessage = errorData.error.message
                    }
                } catch (e) {
                    // If JSON parsing fails, use the raw error text
                    errorMessage = errorText || 'Unknown upload error'
                }

                throw new Error(errorMessage)
            }

            const data = await response.json()
            console.log('Upload successful:', data.secure_url)

            if (!data.secure_url) {
                throw new Error('Upload succeeded but no URL was returned')
            }

            return data.secure_url
        } catch (error) {
            console.error('Upload error:', error)
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Network error during upload')
        }
    }

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (images.length + acceptedFiles.length > maxImages) {
            showAlert(`You can only upload up to ${maxImages} images`, 'warning')
            return
        }

        setUploading(true)
        const newUploadProgress: { [key: string]: number } = {}
        const uploadedUrls: string[] = []
        const failedFiles: string[] = []

        try {
            // Process files one by one for better error handling
            for (const file of acceptedFiles) {
                const fileId = `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                newUploadProgress[fileId] = 0
                setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

                try {
                    // Simulate progress for better UX
                    const progressInterval = setInterval(() => {
                        setUploadProgress(prev => {
                            const current = prev[fileId] || 0
                            if (current < 90) {
                                return { ...prev, [fileId]: current + 10 }
                            }
                            return prev
                        })
                    }, 200)

                    const url = await uploadToCloudinary(file)

                    clearInterval(progressInterval)
                    setUploadProgress(prev => ({ ...prev, [fileId]: 100 }))
                    uploadedUrls.push(url)

                } catch (error) {
                    console.error(`Failed to upload ${file.name}:`, error)
                    failedFiles.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)

                    // Remove progress for failed file
                    setUploadProgress(prev => {
                        const updated = { ...prev }
                        delete updated[fileId]
                        return updated
                    })
                }
            }

            // Update images with successfully uploaded URLs
            if (uploadedUrls.length > 0) {
                onImagesChange([...images, ...uploadedUrls])
                showAlert(`Successfully uploaded ${uploadedUrls.length} image(s)`, 'success')
            }

            // Show errors for failed uploads
            if (failedFiles.length > 0) {
                const errorMessage = `Failed to upload ${failedFiles.length} file(s):\n${failedFiles.join('\n')}`
                showAlert(errorMessage, 'error')
                console.error('Failed uploads:', failedFiles)
            }

        } catch (error) {
            console.error('Upload process error:', error)
            showAlert('Upload process failed. Please check your internet connection and try again.', 'error')
        } finally {
            setUploading(false)
            setUploadProgress({})
        }
    }, [images, maxImages, onImagesChange, showAlert])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
        },
        multiple: true,
        disabled: uploading || images.length >= maxImages
    })

    const removeImage = (indexToRemove: number) => {
        const newImages = images.filter((_, index) => index !== indexToRemove)
        onImagesChange(newImages)
    }

    const handleImageChange = (index: number, value: string) => {
        const newImages = [...images]
        newImages[index] = value
        onImagesChange(newImages)
    }

    const addImageField = () => {
        if (images.length < maxImages) {
            onImagesChange([...images, ''])
        }
    }

    const removeImageField = (index: number) => {
        if (images.length > 1) {
            const newImages = images.filter((_, i) => i !== index)
            onImagesChange(newImages)
        }
    }

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault()
        if (draggedIndex === null) return

        const newImages = [...images]
        const draggedImage = newImages[draggedIndex]
        newImages.splice(draggedIndex, 1)
        newImages.splice(dropIndex, 0, draggedImage)

        onImagesChange(newImages)
        setDraggedIndex(null)
    }

    // Ensure at least one image field
    const displayImages = images.length > 0 ? images : ['']

    return (
        <div className="space-y-4">
            {/* Environment Variables Check */}
            {(!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <h3 className="text-sm font-medium text-red-800">Cloudinary Configuration Missing</h3>
                            <p className="text-sm text-red-700 mt-1">
                                Please configure your Cloudinary environment variables:
                                <br />• NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
                                <br />• NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Area */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                    ? 'border-purple-400 bg-purple-50'
                    : uploading || images.length >= maxImages
                        ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                    }`}
            >
                <input {...getInputProps()} />
                <div className="space-y-2">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                    >
                        <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    {uploading ? (
                        <div>
                            <p className="text-sm text-gray-600">Uploading images...</p>
                            {Object.entries(uploadProgress).map(([fileId, progress]) => (
                                <div key={fileId} className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            ))}
                        </div>
                    ) : images.length >= maxImages ? (
                        <p className="text-sm text-gray-500">Maximum images reached ({maxImages})</p>
                    ) : isDragActive ? (
                        <p className="text-sm text-purple-600">Drop the images here...</p>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-600">
                                Drag & drop images here, or <span className="text-purple-600">browse</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                PNG, JPG, GIF, WebP up to 10MB ({images.length}/{maxImages})
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Image Preview Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                        <div key={index} className="relative group aspect-square">
                            <Image
                                src={image}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg"
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                style={{ objectFit: 'cover' }}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* URL Input Fields */}
            <div className="space-y-3">
                {displayImages.map((image, index) => (
                    <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg transition-colors ${draggedIndex === index ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'
                            }`}
                    >
                        <div className="flex items-center space-x-2 flex-1">
                            <div className="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={image}
                                onChange={e => handleImageChange(index, e.target.value)}
                                placeholder="Image URL or upload files above"
                                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                            {image && (
                                <Image
                                    src={image}
                                    alt={`Preview ${index + 1}`}
                                    className="w-12 h-12 object-cover rounded border"
                                    width={48}
                                    height={48}
                                    style={{ objectFit: 'cover' }}
                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                    }}
                                />
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 font-medium">#{index + 1}</span>
                            {images.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeImageField(index)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {images.length < maxImages && (
                    <button
                        type="button"
                        onClick={addImageField}
                        className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                    >
                        + Add Image URL
                    </button>
                )}

                <p className="text-xs text-gray-500">
                    You can reorder images by dragging them. Maximum {maxImages} images allowed.
                </p>
            </div>
        </div>
    )
}
