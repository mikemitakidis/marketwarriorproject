// Promo Code Validation API
// Route: /api/promo/validate

import type {
  VercelRequest,
  VercelResponse,
  PromoCodeData,
  PromoCodesMap,
  PromoValidateRequestBody,
  PromoValidSuccessResponse,
  PromoValidFailResponse,
} from '../../types';

const promoCodes: PromoCodesMap = {
  'WARRIOR10': { discount: 10, description: '10% off' },
  'LAUNCH20': { discount: 20, description: '20% off - Launch Special' },
  'EARLY25': { discount: 25, description: '25% off - Early Bird' },
  'VIP30': { discount: 30, description: '30% off - VIP Access' },
  'FRIEND15': { discount: 15, description: '15% off - Friend Referral' },
};

const ORIGINAL_PRICE = 39.99;
const CURRENCY = 'USD';
const CURRENCY_SYMBOL = '$';

function isValidRequestBody(body: unknown): body is PromoValidateRequestBody {
  return typeof body === 'object' && body !== null;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function createSuccessResponse(
  code: string,
  promoData: PromoCodeData
): PromoValidSuccessResponse {
  const discountAmount = ORIGINAL_PRICE * (promoData.discount / 100);
  const finalPrice = ORIGINAL_PRICE - discountAmount;

  return {
    valid: true,
    code,
    discount: promoData.discount,
    description: promoData.description,
    originalPrice: ORIGINAL_PRICE,
    discountAmount: roundToTwoDecimals(discountAmount),
    finalPrice: roundToTwoDecimals(finalPrice),
    currency: CURRENCY,
    symbol: CURRENCY_SYMBOL,
  };
}

function createInvalidResponse(error: string): PromoValidFailResponse {
  return {
    valid: false,
    error,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    if (!isValidRequestBody(req.body)) {
      res.status(400).json(createInvalidResponse('Invalid request body'));
      return;
    }

    const { code } = req.body as PromoValidateRequestBody;

    if (!code) {
      res.status(400).json(createInvalidResponse('No code provided'));
      return;
    }

    const upperCode = code.toUpperCase().trim();
    const promoData: PromoCodeData | undefined = promoCodes[upperCode];

    if (promoData) {
      res.status(200).json(createSuccessResponse(upperCode, promoData));
      return;
    }

    res.status(200).json(createInvalidResponse('Invalid promo code'));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Promo validation error:', errorMessage);
    res.status(500).json(createInvalidResponse('Server error'));
  }
}

module.exports = handler;
