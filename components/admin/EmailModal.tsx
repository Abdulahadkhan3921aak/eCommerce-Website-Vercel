'use client'

import { useState } from 'react'

interface Order {
    _id: string
    orderNumber: string
    customerEmail: string
}

interface EmailModalProps {
    isOpen: boolean
    onClose: () => void
    order: Order | null
    onSendEmail: (orderId: string, subject: string, content: string) => Promise<void>
}

export default function EmailModal({
    isOpen,
    onClose,
    order,
    onSendEmail
}: EmailModalProps) {
    const [emailSubject, setEmailSubject] = useState('')
    const [emailContent, setEmailContent] = useState('')
    const [sending, setSending] = useState(false)

    const handleSendEmail = async () => {
        if (!order || !emailSubject || !emailContent) return

        setSending(true)
        try {
            await onSendEmail(order._id, emailSubject, emailContent)
            handleClose()
        } catch (error) {
            console.error('Error sending email:', error)
        } finally {
            setSending(false)
        }
    }

    const handleClose = () => {
        setEmailSubject('')
        setEmailContent('')
        onClose()
    }

    if (!isOpen || !order) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Send Email to {order.customerEmail}
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject
                        </label>
                        <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Email subject..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Message
                        </label>
                        <textarea
                            value={emailContent}
                            onChange={(e) => setEmailContent(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Email message..."
                        />
                    </div>
                    <div className="flex space-x-3 pt-4">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            disabled={sending}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendEmail}
                            disabled={sending || !emailSubject || !emailContent}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                        >
                            {sending ? 'Sending...' : 'Send Email'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
