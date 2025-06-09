'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'

interface ImageUploadProps {
    images: string[]
    onImagesChange: (images: string[]) => void
    maxImages?: number
}

export default function ImageUpload({ images, onImagesChange, maxImages = 10 }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

    const uploadToCloudinary = async (file: File): Promise<string> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'your_upload_preset')

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        )

        if (!response.ok) {
            throw new Error('Failed to upload image')
        }

        const data = await response.json()
        return data.secure_url
    }

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (images.length + acceptedFiles.length > maxImages) {
            alert(`You can only upload up to ${maxImages} images`)
            return
        }

        setUploading(true)
        const newUploadProgress: { [key: string]: number } = {}

        try {
            const uploadPromises = acceptedFiles.map(async (file) => {
                const fileId = `${file.name}-${Date.now()}`
                newUploadProgress[fileId] = 0
                setUploadProgress(prev => ({ ...prev, ...newUploadProgress }))

                try {
                    const url = await uploadToCloudinary(file)
                    newUploadProgress[fileId] = 100
                    setUploadProgress(prev => ({ ...prev, [fileId]: 100 }))
                    return url
                } catch (error) {
                    console.error(`Failed to upload ${file.name}:`, error)
                    delete newUploadProgress[fileId]
                    setUploadProgress(prev => {
                        const updated = { ...prev }
                        delete updated[fileId]
                        return updated
                    })
                    throw error
                }
            })

            const uploadedUrls = await Promise.all(uploadPromises)
            const validUrls = uploadedUrls.filter(url => url !== null)

            if (validUrls.length > 0) {
                onImagesChange([...images, ...validUrls])
            }
        } catch (error) {
            console.error('Upload error:', error)
            alert('Some images failed to upload. Please try again.')
        } finally {
            setUploading(false)
            setUploadProgress({})
        }
    }, [images, maxImages, onImagesChange])

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
                        <div key={index} className="relative group">
                            <Image
                                src={image}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-full object-cover"
                                fill
                                sizes="(max-width: 768px) 100vw, 33vw"
                                style={{ objectFit: 'cover' }}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
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
                                placeholder="Image URL"
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
