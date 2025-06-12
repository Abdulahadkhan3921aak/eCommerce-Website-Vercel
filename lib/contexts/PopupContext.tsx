'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface PopupAction {
    label: string
    action: () => void
    variant?: 'primary' | 'secondary' | 'danger'
    loading?: boolean
}

interface PopupData {
    id: string
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm'
    actions?: PopupAction[]
    autoClose?: number // Auto close after N milliseconds
    component?: ReactNode // Custom component content
}

interface PopupContextType {
    popups: PopupData[]
    showPopup: (popup: Omit<PopupData, 'id'>) => string
    hidePopup: (id: string) => void
    showAlert: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
    showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void, title?: string) => void
    hideAllPopups: () => void
}

const PopupContext = createContext<PopupContextType | undefined>(undefined)

export function PopupProvider({ children }: { children: ReactNode }) {
    const [popups, setPopups] = useState<PopupData[]>([])

    const showPopup = (popup: Omit<PopupData, 'id'>): string => {
        const id = Math.random().toString(36).substr(2, 9)
        const newPopup: PopupData = { ...popup, id }

        setPopups(prev => [...prev, newPopup])

        // Auto close if specified
        if (popup.autoClose) {
            setTimeout(() => {
                hidePopup(id)
            }, popup.autoClose)
        }

        return id
    }

    const hidePopup = (id: string) => {
        setPopups(prev => prev.filter(popup => popup.id !== id))
    }

    const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        showPopup({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            message,
            type,
            actions: [
                {
                    label: 'OK',
                    action: () => { },
                    variant: 'primary'
                }
            ],
            autoClose: type === 'success' ? 3000 : undefined
        })
    }

    const showConfirm = (
        message: string,
        onConfirm: () => void,
        onCancel?: () => void,
        title: string = 'Confirm Action'
    ) => {
        showPopup({
            title,
            message,
            type: 'confirm',
            actions: [
                {
                    label: 'Cancel',
                    action: onCancel || (() => { }),
                    variant: 'secondary'
                },
                {
                    label: 'Confirm',
                    action: onConfirm,
                    variant: 'danger'
                }
            ]
        })
    }

    const hideAllPopups = () => {
        setPopups([])
    }

    return (
        <PopupContext.Provider value={{
            popups,
            showPopup,
            hidePopup,
            showAlert,
            showConfirm,
            hideAllPopups
        }}>
            {children}
            <PopupRenderer />
        </PopupContext.Provider>
    )
}

function PopupRenderer() {
    const { popups, hidePopup } = usePopup()

    if (popups.length === 0) return null

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {popups.map((popup, index) => (
                <PopupModal
                    key={popup.id}
                    popup={popup}
                    onClose={() => hidePopup(popup.id)}
                    zIndex={50 + index}
                />
            ))}
        </div>
    )
}

interface PopupModalProps {
    popup: PopupData
    onClose: () => void
    zIndex: number
}

function PopupModal({ popup, onClose, zIndex }: PopupModalProps) {
    const getIcon = () => {
        switch (popup.type) {
            case 'success':
                return (
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )
            case 'error':
                return (
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                )
            case 'warning':
                return (
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                        <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                )
            case 'info':
            case 'confirm':
                return (
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                )
        }
    }

    const getButtonVariant = (variant: string = 'primary') => {
        switch (variant) {
            case 'primary':
                return 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
            case 'secondary':
                return 'bg-gray-300 text-gray-700 hover:bg-gray-400 focus:ring-gray-500'
            case 'danger':
                return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
            default:
                return 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 pointer-events-auto"
            style={{ zIndex }}
        >
            <div className="bg-white rounded-lg max-w-md w-full shadow-xl transform transition-all">
                <div className="p-6">
                    {/* Icon */}
                    <div className="mb-4">
                        {getIcon()}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                        {popup.title}
                    </h3>

                    {/* Message or Custom Component */}
                    <div className="text-center mb-6">
                        {popup.component ? (
                            popup.component
                        ) : (
                            <p className="text-sm text-gray-600">
                                {popup.message}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                        {popup.actions && popup.actions.length > 0 ? (
                            popup.actions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        action.action()
                                        onClose()
                                    }}
                                    disabled={action.loading}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonVariant(action.variant)}`}
                                >
                                    {action.loading ? (
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                            Loading...
                                        </div>
                                    ) : (
                                        action.label
                                    )}
                                </button>
                            ))
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full py-2 px-4 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                            >
                                OK
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export function usePopup() {
    const context = useContext(PopupContext)
    if (context === undefined) {
        throw new Error('usePopup must be used within a PopupProvider')
    }
    return context
}
