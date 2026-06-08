'use server'

import { sendAppMail } from '@/lib/mail'

export async function sendContactMessageAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const subject = formData.get('subject') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !subject || !message) {
    throw new Error('All fields are required');
  }

  try {
    await sendAppMail({
      from: `"${name}" <${email}>`,
      replyTo: email,
      subject: `JobFlow Contact: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Could not send message. Please try again later.');
  }
}
