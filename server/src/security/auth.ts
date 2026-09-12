import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface ValidatedInitData {
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
}

/**
 * Validates Telegram Mini App initData string with the bot token.
 * In DEMO_MODE or when test header is present, returns demo user.
 */
export function validateTelegramInitData(
  initData: string | undefined,
  botToken: string,
  demoMode: boolean = true
): { valid: boolean; user?: TelegramUser; error?: string } {
  // If demo mode is active and no real initData or mock token is provided
  if (demoMode && (!initData || botToken === 'mock_token' || initData === 'demo')) {
    return {
      valid: true,
      user: {
        id: 1001,
        first_name: 'Alex',
        last_name: 'Motologa',
        username: 'alexmotologa',
      },
    };
  }

  if (!initData) {
    return { valid: false, error: 'Missing initData' };
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) {
      return { valid: false, error: 'Missing hash in initData' };
    }

    urlParams.delete('hash');

    // Sort parameters alphabetically
    const dataCheckArr: string[] = [];
    Array.from(urlParams.keys())
      .sort()
      .forEach((key) => {
        dataCheckArr.push(`${key}=${urlParams.get(key)}`);
      });
    const dataCheckString = dataCheckArr.join('\n');

    // HMAC-SHA256 with "WebAppData" secret key
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      // In demo mode or local dev, fallback gracefully if enabled
      if (demoMode) {
        return {
          valid: true,
          user: {
            id: 1001,
            first_name: 'Alex',
            last_name: 'Motologa',
            username: 'alexmotologa',
          },
        };
      }
      return { valid: false, error: 'Invalid HMAC signature' };
    }

    const userParam = urlParams.get('user');
    const user: TelegramUser | undefined = userParam ? JSON.parse(userParam) : undefined;

    return { valid: true, user };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Signature verification failed' };
  }
}
