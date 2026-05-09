import { Worker } from 'bullmq';
import { redis } from '../app/lib/redis';
import { prisma } from '../app/lib/prisma';

// Email templates
const emailTemplates = {
  bookingConfirmation: (data: any) => ({
    subject: `Booking Confirmed - ${data.destinationName}`,
    html: `
      <h1>Your Booking is Confirmed!</h1>
      <p>Hi ${data.userName},</p>
      <p>Your booking for <strong>${data.destinationName}</strong> has been confirmed.</p>
      <p>Booking Details:</p>
      <ul>
        <li>Booking ID: ${data.bookingId}</li>
        <li>Date: ${data.date}</li>
        <li>Amount: $${data.amount}</li>
      </ul>
      <p>Thank you for choosing AI Travel Planner!</p>
    `,
  }),
  
  welcomeEmail: (data: any) => ({
    subject: 'Welcome to AI Travel Planner!',
    html: `
      <h1>Welcome to AI Travel Planner!</h1>
      <p>Hi ${data.userName},</p>
      <p>We're excited to have you on board. Start exploring amazing destinations and planning your perfect trips with AI assistance.</p>
      <p><a href="${data.dashboardUrl}">Get Started</a></p>
    `,
  }),
  
  tripReminder: (data: any) => ({
    subject: `Trip Reminder: ${data.destinationName}`,
    html: `
      <h1>Your Trip is Coming Up!</h1>
      <p>Hi ${data.userName},</p>
      <p>Your trip to <strong>${data.destinationName}</strong> starts in ${data.daysUntil} days.</p>
      <p>Don't forget to check your itinerary and pack accordingly!</p>
    `,
  }),
  
  passwordReset: (data: any) => ({
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>Hi ${data.userName},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${data.resetUrl}">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  }),
};

// Mock email sender (replace with actual email service like SendGrid, AWS SES, etc.)
const sendEmail = async (to: string, template: { subject: string; html: string }) => {
  console.log(`[EMAIL] Sending email to: ${to}`);
  console.log(`[EMAIL] Subject: ${template.subject}`);
  console.log(`[EMAIL] HTML: ${template.html.substring(0, 200)}...`);
  
  // TODO: Integrate with actual email service
  // Example with SendGrid:
  // await sgMail.send({ to, from: 'noreply@travelplanner.ai', subject: template.subject, html: template.html });
  
  return { messageId: `mock-${Date.now()}` };
};

// Create email worker
export const emailWorker = new Worker(
  'email',
  async (job) => {
    const { type, userId, email, data } = job.data;
    
    console.log(`[EMAIL WORKER] Processing job ${job.id} - Type: ${type}`);
    
    try {
      let template;
      
      switch (type) {
        case 'booking-confirmation':
          template = emailTemplates.bookingConfirmation(data);
          break;
        case 'welcome':
          template = emailTemplates.welcomeEmail(data);
          break;
        case 'trip-reminder':
          template = emailTemplates.tripReminder(data);
          break;
        case 'password-reset':
          template = emailTemplates.passwordReset(data);
          break;
        default:
          throw new Error(`Unknown email type: ${type}`);
      }
      
      await sendEmail(email, template);
      
      // Log email in database (optional)
      await prisma.notification.create({
        data: {
          userId,
          title: template.subject,
          message: `Email sent: ${type}`,
          type: 'SYSTEM',
          isRead: true,
        },
      });
      
      console.log(`[EMAIL WORKER] Email sent successfully to ${email}`);
      return { success: true };
    } catch (error) {
      console.error(`[EMAIL WORKER] Failed to send email:`, error);
      throw error;
    }
  },
  { 
    connection: redis,
    concurrency: 5,
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[EMAIL WORKER] Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[EMAIL WORKER] Job ${job?.id} failed:`, err);
});

console.log('[EMAIL WORKER] Email worker started');
