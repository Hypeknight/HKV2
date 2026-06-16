'use server';

import nodemailer from 'nodemailer';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function submitContactForm(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const subject = String(formData.get('subject') || 'HypeKnight Contact Form').trim();
  const message = String(formData.get('message') || '').trim();

  if (!email || !message) {
    throw new Error('Email and message are required.');
  }

  const supabase = await createClient();

  await supabase.from('contact_messages').insert({
    name: name || null,
    email,
    phone: phone || null,
    subject,
    message,
    status: 'submitted',
  });

  const transporter = nodemailer.createTransport({
    host: process.env.CONTACT_SMTP_HOST,
    port: Number(process.env.CONTACT_SMTP_PORT || 465),
    secure: Number(process.env.CONTACT_SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.CONTACT_SMTP_USER,
      pass: process.env.CONTACT_SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"HypeKnight Contact Form" <${process.env.CONTACT_SMTP_USER}>`,
    to: process.env.CONTACT_TO_EMAIL || 'contact@hypeknight.fun',
    replyTo: email,
    subject: `HypeKnight Contact: ${subject}`,
    text: `
Name: ${name || 'Not provided'}
Email: ${email}
Phone: ${phone || 'Not provided'}
Subject: ${subject}

Message:
${message}
    `,
  });

  redirect('/contact?sent=1');
}