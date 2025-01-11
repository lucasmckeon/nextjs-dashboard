// lib/mailer.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SENDGRID_HOST,
  port: Number(process.env.SENDGRID_PORT),
  auth: {
    user: process.env.SENDGRID_USER, // 'apikey' for SendGrid
    pass: process.env.SENDGRID_PASS, // Your SendGrid API key
  },
});

export default transporter;
