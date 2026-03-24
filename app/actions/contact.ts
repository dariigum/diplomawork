'use server'

import nodemailer from 'nodemailer';

export async function sendContactMessageAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const subject = formData.get('subject') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !subject || !message) {
    throw new Error('All fields are required');
  }

  console.log(`Sending email from ${name} (${email}) to alimzhan.gabit@gmail.com`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);

  // Configure transporter (using mock for now as we don't have real SMTP credentials)
  // To make it work in production, you'd add SMTP_HOST, SMTP_USER, SMTP_PASS to .env
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || 'mock_user',
        pass: process.env.SMTP_PASS || 'mock_pass',
      },
    });

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: 'alimzhan.gabit@gmail.com',
      subject: `JobFlow Contact: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    };

    // If we have real credentials, it will send. 
    // Otherwise it will log a warning but the structure is there.
    if (process.env.SMTP_USER && process.env.SMTP_USER !== 'mock_user') {
      await transporter.sendMail(mailOptions);
    } else {
      console.log('--- MOCK EMAIL SENT (No SMTP credentials provided) ---');
      console.log(mailOptions);
      console.log('------------------------------------------------------');
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Could not send message. Please try again later.');
  }
}
