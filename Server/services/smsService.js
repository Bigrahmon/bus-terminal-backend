import dotenv from 'dotenv';

dotenv.config();

const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'BusGo'; // Or Riderr, let's keep what it was or use BusGo

const sendTermiiSMS = async (phone, message) => {
  if (!TERMII_API_KEY || TERMII_API_KEY === 'your_termii_api_key') {
    console.log('\n======================================');
    console.log('📱 SIMULATED SMS NOTIFICATION');
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log('======================================\n');
    return true; // Fallback to console during development
  }

  try {
    const data = {
      to: phone,
      from: TERMII_SENDER_ID,
      sms: message,
      type: 'plain',
      api_key: TERMII_API_KEY,
      channel: 'generic'
    };

    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send SMS');
    }

    console.log(`SMS sent successfully to ${phone}:`, result);
    return true;
  } catch (error) {
    console.error(`Failed to send SMS to ${phone}:`, error.message);
    return false;
  }
};

export const sendRegistrationSMS = async (phone) => {
  const message = "Welcome to BusGo.";
  return sendTermiiSMS(phone, message);
};

export const sendBookingSMS = async (phone, busName, seatLabel, departureTime) => {
  const message = `Your booking is confirmed. Bus: ${busName}, Seat: ${seatLabel}, Departure: ${departureTime}.`;
  return sendTermiiSMS(phone, message);
};

export const sendReminderSMS = async (phone) => {
  const message = "Your trip starts in 1 hour.";
  return sendTermiiSMS(phone, message);
};
