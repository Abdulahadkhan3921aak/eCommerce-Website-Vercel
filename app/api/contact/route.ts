import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
    try {
        const { name, email, subject, message } = await request.json();

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Create transporter
        const transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        // Email to business
        const businessEmailOptions = {
            from: process.env.SMTP_FROM_EMAIL,
            to: process.env.CONTACT_EMAIL,
            subject: `New Contact Form Submission: ${subject}`,
            html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><em>This message was sent from the Butterflies Beading contact form.</em></p>
      `,
        };

        // Auto-reply to customer
        const customerEmailOptions = {
            from: process.env.SMTP_FROM_EMAIL,
            to: email,
            subject: 'Thank you for contacting Butterflies Beading',
            html: `
        <h2>Thank you for reaching out!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for contacting Butterflies Beading. We have received your message and will get back to you within 24-48 hours.</p>
        <p><strong>Your message:</strong></p>
        <p><em>"${message}"</em></p>
        <br>
        <p>Best regards,<br>
        The Butterflies Beading Team</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          Butterflies Beading<br>
          123 Artisan Way, Craftsville, NY 10001<br>
          Phone: +1 (555) 123-4567<br>
          Email: info@butterfliesbeading.com
        </p>
      `,
        };

        // Send emails
        await transporter.sendMail(businessEmailOptions);
        await transporter.sendMail(customerEmailOptions);

        return NextResponse.json(
            { message: 'Email sent successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            { error: 'Failed to send email' },
            { status: 500 }
        );
    }
}
