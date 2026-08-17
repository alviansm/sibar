import crypto from 'crypto';

const SECRET_KEY = process.env.SESSION_SECRET || 'sibar-captcha-hmac-secret-key-2026';
const CAPTCHA_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

export interface CaptchaChallenge {
  question: string;
  token: string;
  timestamp: number;
  nonce: string;
}

export function generateCaptchaChallenge(): CaptchaChallenge {
  const types = ['add', 'subtract', 'multiply', 'power', 'sqrt'];
  const chosenType = types[Math.floor(Math.random() * types.length)];

  let question = '';
  let answer = 0;

  switch (chosenType) {
    case 'add': {
      const a = Math.floor(Math.random() * 20) + 5;
      const b = Math.floor(Math.random() * 20) + 5;
      question = `${a} + ${b}`;
      answer = a + b;
      break;
    }
    case 'subtract': {
      const a = Math.floor(Math.random() * 30) + 15;
      const b = Math.floor(Math.random() * 14) + 1;
      question = `${a} - ${b}`;
      answer = a - b;
      break;
    }
    case 'multiply': {
      const a = Math.floor(Math.random() * 9) + 2;
      const b = Math.floor(Math.random() * 9) + 2;
      question = `${a} \\times ${b}`;
      answer = a * b;
      break;
    }
    case 'power': {
      const base = Math.floor(Math.random() * 6) + 2; // 2..7
      question = `${base}^2 + 3`;
      answer = base * base + 3;
      break;
    }
    case 'sqrt': {
      const squares = [4, 9, 16, 25, 36, 49, 64, 81];
      const sq = squares[Math.floor(Math.random() * squares.length)];
      const root = Math.sqrt(sq);
      const add = Math.floor(Math.random() * 5) + 1;
      question = `\\sqrt{${sq}} + ${add}`;
      answer = root + add;
      break;
    }
    default: {
      question = '7 + 5';
      answer = 12;
    }
  }

  const timestamp = Date.now();
  const nonce = crypto.randomBytes(6).toString('hex');
  const payload = `${answer}:${timestamp}:${nonce}`;
  
  const token = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex');

  return {
    question,
    token,
    timestamp,
    nonce,
  };
}

export function verifyCaptchaChallenge(
  userAnswer: string,
  token: string,
  timestamp: number,
  nonce: string
): boolean {
  if (!userAnswer || !token || !timestamp || !nonce) {
    return false;
  }

  // Check expiration
  const now = Date.now();
  if (now - timestamp > CAPTCHA_EXPIRATION_MS || timestamp > now + 60000) {
    return false;
  }

  const sanitizedAnswer = userAnswer.trim();
  const payload = `${sanitizedAnswer}:${timestamp}:${nonce}`;

  const expectedToken = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    );
  } catch (err) {
    return false;
  }
}
