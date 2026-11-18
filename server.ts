import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { createInitialMarketplaceState } from './src/data/marketplaceCatalog.ts';
import type {
  ChatAttachmentRecord,
  ChatEvidenceTag,
  GiftOrderDetails,
  MarketplaceState,
  Order,
  ParentOrderRecord,
  PayerInfoRecord,
  RecipientComplaintCategory,
  ThirdPartyPayerDeclaration,
} from './src/types/marketplace.ts';
import {
  buildPayerSafeRequestView,
  buildRecipientSafeOrderView,
  calculateMultiVendorCheckoutQuote,
  isValidNigerianPhone,
  scanMessageForDisallowedContent,
  searchVendorsAndStores,
  sha256Hex,
  validateGiftOrderDetails,
} from './src/utils/marketplace.ts';
import {
  adminModerateFlag,
  adminOverrideDeliveryConfirmation,
  adminReviewVendorVerification,
  adminSavePolicyVersion,
  adminUpdateDeliveryConfig,
  adminUpdatePaymentRequestConfig,
  adminUpdatePlatformFees,
  adminUpdateWarrantyClaim,
  adminUpdateWarrantyConfig,
  attemptPaymentRequestCheckout,
  cancelPaymentRequestRecord,
  createMultiVendorOrdersFromCheckout,
  createPaymentRequestRecord,
  flagOffPlatformAttempt,
  markDeliveryAttemptFailed,
  recordVendorAgreementAcceptance,
  refreshPaymentRequestState,
  resendDeliveryVerificationCode,
  setOrderAlternativeRecipient,
  submitRecipientProblemReport,
  submitWarrantyClaim,
  toggleFollowVendor,
  vendorArrangeDispatch,
  vendorRespondWarrantyClaim,
  verifyDeliveryCodeAndStartInspection,
} from './src/utils/transactionEngine.ts';
import {
  ALLOWED_CHAT_IMAGE_MIME_TYPES,
  ALLOWED_CHAT_VIDEO_MIME_TYPES,
  validateAttachmentUpload,
} from './src/utils/warranty.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '.usedright-db.json');
const UPLOADS_DIR = path.join(__dirname, '.usedright-uploads');
const PORT = Number(process.env.PORT || 3000);
const OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'usedright-demo-otp-secret-2026';

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface StoredAttachmentMeta extends ChatAttachmentRecord {
  diskFileName: string;
}

interface PaymentSessionRecord {
  reference: string;
  idempotencyKey: string;
  amount: number;
  currency: 'NGN';
  buyerId: string;
  orderOwnerId?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  payerInfo?: PayerInfoRecord;
  thirdPartyPayer?: ThirdPartyPayerDeclaration;
  isGift?: boolean;
  giftDetails?: GiftOrderDetails;
  paymentRequestId?: string;
  paymentRequestReference?: string;
  deliveryMethod: 'usedright_delivery' | 'physical_pickup';
  deliveryAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
  };
  cartItems: unknown[];
  referralDiscount: number;
  status: 'initialized' | 'pending' | 'failed' | 'verified';
  isDemoTransaction: boolean;
  providerResponseMessage?: string;
  parentOrder?: ParentOrderRecord;
  childOrders?: Order[];
  createdAt: string;
  verifiedAt?: string;
}

interface ServerStore {
  marketplace: MarketplaceState;
  paymentSessions: Record<string, PaymentSessionRecord>;
  idempotencyIndex: Record<string, string>;
  attachments: Record<string, StoredAttachmentMeta>;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests = 45, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

function timingSafeHexMatch(aHex?: string, bHex?: string): boolean {
  if (!aHex || !bHex || aHex.length !== bHex.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(aHex, 'utf8'), Buffer.from(bHex, 'utf8'));
  } catch {
    return false;
  }
}

function hashDeliveryCode(orderId: string, code: string): string {
  return crypto
    .createHmac('sha256', OTP_HMAC_SECRET)
    .update(`${orderId}:${code.trim().toUpperCase()}`)
    .digest('hex');
}

function generateCryptoOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function sanitizeOrderForClient(
  order: Order,
  requesterRole?: string,
  requesterBuyerId?: string
): Order {
  const isOwnerBuyer =
    requesterRole === 'buyer' &&
    Boolean(requesterBuyerId) &&
    requesterBuyerId === (order.orderOwnerId || order.buyerId);
  const canSeePin = isOwnerBuyer && !order.isGift;
  return {
    ...order,
    deliveryVerificationCode: canSeePin ? order.deliveryVerificationCode : undefined,
    deliveryVerificationCodeHash: undefined,
    giftDetails: order.giftDetails
      ? {
          ...order.giftDetails,
          recipientAccessTokenHash: undefined,
          recipientPortalToken: isOwnerBuyer || requesterRole === 'admin'
            ? order.giftDetails.recipientPortalToken
            : undefined,
        }
      : undefined,
  };
}

function verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mimeType === 'video/mp4') {
    return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  if (mimeType === 'video/webm') {
    return (
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    );
  }
  return false;
}

function loadStore(): ServerStore {
  const seed = createInitialMarketplaceState();
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<ServerStore>;
      if (parsed.marketplace && Array.isArray(parsed.marketplace.listings)) {
        const mp = parsed.marketplace;
        const seedById = new Map(seed.listings.map((l) => [l.id, l]));
        const hydratedListings = (mp.listings || []).map((l) => {
          const seedMatch = seedById.get(l.id);
          const mergedReport =
            seedMatch &&
            l.conditionReport &&
            'simFunctionality' in l.conditionReport &&
            'simFunctionality' in seedMatch.conditionReport &&
            !(l.conditionReport as any).touchscreen
              ? {
                  ...l.conditionReport,
                  touchscreen: (seedMatch.conditionReport as any).touchscreen,
                }
              : l.conditionReport;
          return {
            ...l,
            title: seedMatch ? seedMatch.title : l.title,
            cosmeticDescription: seedMatch?.cosmeticDescription ?? l.cosmeticDescription,
            conditionReport: mergedReport,
            originEvidenceReviewed:
              l.originEvidenceReviewed ??
              seedMatch?.originEvidenceReviewed ??
              (l.foreignUsedStatus === 'Verified Foreign-Used'),
            usedRightInspected: l.usedRightInspected ?? seedMatch?.usedRightInspected ?? false,
            functionalTestStatus: l.functionalTestStatus ?? seedMatch?.functionalTestStatus,
          };
        });
        const existingListingIds = new Set(hydratedListings.map((l) => l.id));
        const missingListings = seed.listings.filter((l) => !existingListingIds.has(l.id));
        const existingOrderIds = new Set((mp.orders || []).map((o) => o.id));
        const missingOrders = seed.orders.filter((o) => !existingOrderIds.has(o.id));
        const existingPreqIds = new Set((mp.paymentRequests || []).map((r) => r.id));
        const missingPreqs = (seed.paymentRequests || []).filter((r) => !existingPreqIds.has(r.id));
        const existingCompIds = new Set((mp.recipientComplaints || []).map((c) => c.id));
        const missingComps = (seed.recipientComplaints || []).filter((c) => !existingCompIds.has(c.id));
        const existingNotifIds = new Set((mp.notifications || []).map((n) => n.id));
        const missingNotifs = (seed.notifications || []).filter((n) => !existingNotifIds.has(n.id));
        return {
          marketplace: {
            ...mp,
            listings: [...missingListings, ...hydratedListings],
            platformConfig: {
              ...mp.platformConfig,
              paymentRequestValidityHours:
                mp.platformConfig?.paymentRequestValidityHours ??
                seed.platformConfig.paymentRequestValidityHours ??
                24,
            },
            orders: [...missingOrders, ...(mp.orders || [])],
            paymentRequests: [...(mp.paymentRequests || []), ...missingPreqs],
            recipientComplaints: [...(mp.recipientComplaints || []), ...missingComps],
            notifications: [...missingNotifs, ...(mp.notifications || [])],
          },
          paymentSessions: parsed.paymentSessions || {},
          idempotencyIndex: parsed.idempotencyIndex || {},
          attachments: parsed.attachments || {},
        };
      }
    }
  } catch (err) {
    console.warn('Could not read persisted store, re-seeding:', err);
  }
  return {
    marketplace: seed,
    paymentSessions: {},
    idempotencyIndex: {},
    attachments: {},
  };
}

function saveStore(store: ServerStore): void {
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

let store: ServerStore = loadStore();

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'usedright-marketplace-api',
    paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY),
    ordersCount: store.marketplace.orders.length,
    policiesCount: store.marketplace.policies?.length || 0,
    vendorsCount: store.marketplace.vendors.length,
  });
});

app.get('/api/state', (_req, res) => {
  // Never expose plaintext deliveryVerificationCode, HMAC hashes, or raw payment/gift token hashes globally
  const sanitizedOrders = store.marketplace.orders.map((o) => sanitizeOrderForClient(o));
  const sanitizedPaymentRequests = (store.marketplace.paymentRequests || []).map((r) => ({
    ...r,
    tokenHash: '',
  }));
  res.json({
    ...store.marketplace,
    orders: sanitizedOrders,
    paymentRequests: sanitizedPaymentRequests,
  });
});

app.post('/api/state/sync', (req, res) => {
  const incoming = req.body as Partial<MarketplaceState>;
  if (!incoming || !Array.isArray(incoming.listings)) {
    res.status(400).json({ error: 'Invalid marketplace snapshot payload.' });
    return;
  }
  store.marketplace = {
    ...store.marketplace,
    ...incoming,
    feeConfig: store.marketplace.feeConfig,
    deliveryConfig: store.marketplace.deliveryConfig,
    warrantyConfig: store.marketplace.warrantyConfig || incoming.warrantyConfig,
  };
  saveStore(store);
  res.json({ ok: true });
});

app.post('/api/state/reset', (_req, res) => {
  store = {
    marketplace: createInitialMarketplaceState(),
    paymentSessions: {},
    idempotencyIndex: {},
    attachments: {},
  };
  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      for (const entry of fs.readdirSync(UPLOADS_DIR)) {
        fs.rmSync(path.join(UPLOADS_DIR, entry), { force: true });
      }
    }
  } catch {
    // Non-blocking cleanup
  }
  saveStore(store);
  res.json({ ok: true });
});

app.post('/api/checkout/quote', (req, res) => {
  try {
    const body = req.body || {};
    const cartItems = Array.isArray(body.cartItems) ? body.cartItems : [];
    const deliveryMethod =
      body.deliveryMethod === 'physical_pickup' ? 'physical_pickup' : 'usedright_delivery';
    const referralDiscount = Number(body.referralDiscount || 0);

    const quote = calculateMultiVendorCheckoutQuote({
      cartItems,
      deliveryMethod,
      listings: store.marketplace.listings,
      vendors: store.marketplace.vendors,
      feeConfig: store.marketplace.feeConfig,
      deliveryConfig: store.marketplace.deliveryConfig,
      referralDiscount: Number.isFinite(referralDiscount) ? referralDiscount : 0,
    });

    res.json({
      quote,
      currency: 'NGN',
      authoritative: true,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/api/payments/initialize', async (req, res) => {
  try {
    const body = req.body || {};
    const cartItems = Array.isArray(body.cartItems) ? body.cartItems : [];
    const deliveryMethod =
      body.deliveryMethod === 'physical_pickup' ? 'physical_pickup' : 'usedright_delivery';
    const buyerPhone = String(body.buyerPhone || '');
    const buyerEmail = String(body.buyerEmail || 'customer@usedright.demo');
    const buyerName = String(body.buyerName || 'Customer');
    const buyerId = String(body.buyerId || 'buyer-user-1');
    const thirdPartyPayer = body.thirdPartyPayer as ThirdPartyPayerDeclaration | undefined;
    const idempotencyKey =
      String(body.idempotencyKey || '') || `idem-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
    const demoOutcome = (body.demoOutcome || 'success') as 'success' | 'pending' | 'failed';
    const referralDiscount = Number(body.referralDiscount || 0);

    if (cartItems.length === 0) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    if (!isValidNigerianPhone(buyerPhone)) {
      res.status(400).json({ error: 'Enter a valid Nigerian phone number.' });
      return;
    }

    // Check idempotency if previously verified
    const existingRef = store.idempotencyIndex[idempotencyKey];
    if (existingRef && store.paymentSessions[existingRef]) {
      const existingSession = store.paymentSessions[existingRef];
      res.json({
        duplicate: true,
        session: existingSession,
      });
      return;
    }

    const quote = calculateMultiVendorCheckoutQuote({
      cartItems,
      deliveryMethod,
      listings: store.marketplace.listings,
      vendors: store.marketplace.vendors,
      feeConfig: store.marketplace.feeConfig,
      deliveryConfig: store.marketplace.deliveryConfig,
      referralDiscount,
    });

    if (quote.unavailableItemIds.length > 0) {
      res.status(409).json({
        error: 'One or more items in your cart are out of stock or unavailable.',
        quote,
      });
      return;
    }

    if (quote.priceChangedItems.length > 0 && !body.acceptedPriceChanges) {
      res.status(409).json({
        error: 'Listing prices have updated since adding to cart. Review updated amounts before payment.',
        quote,
      });
      return;
    }

    const isGift = Boolean(body.isGift && body.giftDetails);
    const giftDetails = body.giftDetails as GiftOrderDetails | undefined;
    if (isGift && giftDetails) {
      const gVal = validateGiftOrderDetails(giftDetails, deliveryMethod);
      if (!gVal.valid) {
        res.status(400).json({ error: gVal.errors.join(' ') });
        return;
      }
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const reference = `UR-PSK-${Date.now()}-${crypto.randomInt(1000, 9999)}`;

    if (paystackSecret && !body.forceDemoMode) {
      const pskRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: body.payerInfo?.payerEmail || buyerEmail,
          amount: Math.round(quote.totalAmount * 100),
          currency: 'NGN',
          reference,
          metadata: {
            idempotencyKey,
            buyerId,
            vendorCount: quote.vendorCount,
            isGift,
            paymentRequestId: body.paymentRequestId,
          },
        }),
      });
      const pskData = (await pskRes.json()) as {
        status?: boolean;
        message?: string;
        data?: { authorization_url?: string; reference?: string };
      };
      if (!pskRes.ok || !pskData.status) {
        res.status(502).json({
          error: pskData.message || 'Paystack initialization failed.',
        });
        return;
      }

      const liveSession: PaymentSessionRecord = {
        reference,
        idempotencyKey,
        amount: quote.totalAmount,
        currency: 'NGN',
        buyerId,
        orderOwnerId: String(body.orderOwnerId || buyerId),
        buyerName,
        buyerEmail,
        buyerPhone,
        payerInfo: body.payerInfo,
        thirdPartyPayer,
        isGift,
        giftDetails,
        paymentRequestId: body.paymentRequestId ? String(body.paymentRequestId) : undefined,
        paymentRequestReference: body.paymentRequestReference
          ? String(body.paymentRequestReference)
          : undefined,
        deliveryMethod,
        deliveryAddress: body.deliveryAddress,
        cartItems,
        referralDiscount,
        status: 'initialized',
        isDemoTransaction: false,
        createdAt: new Date().toISOString(),
      };
      store.paymentSessions[reference] = liveSession;
      store.idempotencyIndex[idempotencyKey] = reference;
      saveStore(store);

      res.json({
        mode: 'paystack_live',
        reference,
        authorizationUrl: pskData.data?.authorization_url,
        amount: quote.totalAmount,
        currency: 'NGN',
        quote,
      });
      return;
    }

    // Isolated Demo Mode Simulation
    const session: PaymentSessionRecord = {
      reference,
      idempotencyKey,
      amount: quote.totalAmount,
      currency: 'NGN',
      buyerId,
      orderOwnerId: String(body.orderOwnerId || buyerId),
      buyerName,
      buyerEmail,
      buyerPhone,
      payerInfo: body.payerInfo,
      thirdPartyPayer,
      isGift,
      giftDetails,
      paymentRequestId: body.paymentRequestId ? String(body.paymentRequestId) : undefined,
      paymentRequestReference: body.paymentRequestReference
        ? String(body.paymentRequestReference)
        : undefined,
      deliveryMethod,
      deliveryAddress: body.deliveryAddress,
      cartItems,
      referralDiscount,
      status: demoOutcome === 'failed' ? 'failed' : demoOutcome === 'pending' ? 'pending' : 'initialized',
      isDemoTransaction: true,
      providerResponseMessage:
        demoOutcome === 'failed'
          ? 'Simulated card/bank decline. No paid order was created.'
          : demoOutcome === 'pending'
          ? 'Simulated bank transfer awaiting confirmation. Duplicate attempts blocked.'
          : 'Demo payment authorized ready for verification.',
      createdAt: new Date().toISOString(),
    };

    if (demoOutcome !== 'failed') {
      store.paymentSessions[reference] = session;
      store.idempotencyIndex[idempotencyKey] = reference;
      saveStore(store);
    }

    res.json({
      mode: 'demo_isolated',
      reference,
      amount: quote.totalAmount,
      currency: 'NGN',
      status: session.status,
      message: session.providerResponseMessage,
      quote,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/payments/verify', async (req, res) => {
  try {
    const body = req.body || {};
    const reference = String(body.reference || '');
    const session = store.paymentSessions[reference];

    if (!session) {
      res.status(404).json({ error: 'Payment session not found or declined before creation.' });
      return;
    }

    if (session.status === 'verified' && session.parentOrder) {
      res.json({
        verified: true,
        duplicate: true,
        parentOrder: session.parentOrder,
        childOrders: (session.childOrders || []).map((o) =>
          sanitizeOrderForClient(o, 'buyer', session.buyerId)
        ),
      });
      return;
    }

    if (session.status === 'failed') {
      res.status(402).json({
        verified: false,
        status: 'failed',
        error: 'Payment failed. No paid order was created.',
      });
      return;
    }

    if (session.status === 'pending' && !body.forceCompletePending) {
      res.status(202).json({
        verified: false,
        status: 'pending',
        message: 'Payment confirmation is pending. Do not pay twice for the same order reference.',
      });
      return;
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!session.isDemoTransaction && paystackSecret) {
      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${paystackSecret}` },
        }
      );
      const pskData = (await verifyRes.json()) as {
        status?: boolean;
        data?: { status?: string; amount?: number; currency?: string; fees?: number };
      };

      const paidKobo = Math.round(session.amount * 100);
      if (
        !verifyRes.ok ||
        !pskData.status ||
        pskData.data?.status !== 'success' ||
        pskData.data?.currency !== 'NGN' ||
        pskData.data?.amount !== paidKobo
      ) {
        res.status(402).json({
          verified: false,
          error: 'Paystack verification mismatch or incomplete payment.',
        });
        return;
      }
    }

    const result = createMultiVendorOrdersFromCheckout(store.marketplace, {
      buyerId: session.buyerId,
      orderOwnerId: session.orderOwnerId || session.buyerId,
      buyerName: session.buyerName,
      buyerEmail: session.buyerEmail,
      buyerPhone: session.buyerPhone,
      payerInfo: session.payerInfo
        ? { ...session.payerInfo, paymentProviderRef: reference }
        : undefined,
      thirdPartyPayer: session.thirdPartyPayer,
      isGift: session.isGift,
      giftDetails: session.giftDetails,
      paymentRequestId: session.paymentRequestId,
      paymentRequestReference: session.paymentRequestReference,
      cartItems: session.cartItems as MarketplaceState['orders'][number]['items'] & any,
      deliveryMethod: session.deliveryMethod,
      referralDiscount: session.referralDiscount,
      idempotencyKey: session.idempotencyKey,
      paymentProviderRef: reference,
      isDemoTransaction: session.isDemoTransaction,
      deliveryAddress: session.deliveryAddress,
    });

    let nextMarketplace = result.state;
    if (session.paymentRequestId) {
      nextMarketplace = {
        ...nextMarketplace,
        paymentRequests: (nextMarketplace.paymentRequests || []).map((r) =>
          r.id === session.paymentRequestId
            ? {
                ...r,
                status: 'Paid' as const,
                paidAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                paymentProviderRef: reference,
                parentOrderId: result.parentOrder.id,
                childOrderIds: result.childOrders.map((o) => o.id),
                payerInfo: session.payerInfo
                  ? { ...session.payerInfo, paymentProviderRef: reference }
                  : r.payerInfo,
              }
            : r
        ),
      };
    }

    store.marketplace = nextMarketplace;
    session.status = 'verified';
    session.verifiedAt = new Date().toISOString();
    session.parentOrder = result.parentOrder;
    session.childOrders = result.childOrders;
    saveStore(store);

    res.json({
      verified: true,
      duplicate: Boolean(result.duplicateSkipped),
      parentOrder: result.parentOrder,
      childOrders: result.childOrders.map((o) =>
        sanitizeOrderForClient(o, 'buyer', session.buyerId)
      ),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/payments/webhook', (req, res) => {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (paystackSecret) {
    const signature = req.header('x-paystack-signature') || '';
    const expected = crypto
      .createHmac('sha512', paystackSecret)
      .update(JSON.stringify(req.body || {}))
      .digest('hex');
    if (signature !== expected) {
      res.status(401).json({ error: 'Invalid Paystack webhook signature.' });
      return;
    }
  }

  const event = req.body || {};
  const reference = event?.data?.reference;
  if (!reference || !store.paymentSessions[reference]) {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  const session = store.paymentSessions[reference];
  if (session.status === 'verified') {
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  if (event?.event === 'charge.success') {
    const result = createMultiVendorOrdersFromCheckout(store.marketplace, {
      buyerId: session.buyerId,
      orderOwnerId: session.orderOwnerId || session.buyerId,
      buyerName: session.buyerName,
      buyerEmail: session.buyerEmail,
      buyerPhone: session.buyerPhone,
      payerInfo: session.payerInfo
        ? { ...session.payerInfo, paymentProviderRef: reference }
        : undefined,
      thirdPartyPayer: session.thirdPartyPayer,
      isGift: session.isGift,
      giftDetails: session.giftDetails,
      paymentRequestId: session.paymentRequestId,
      paymentRequestReference: session.paymentRequestReference,
      cartItems: session.cartItems as any,
      deliveryMethod: session.deliveryMethod,
      referralDiscount: session.referralDiscount,
      idempotencyKey: session.idempotencyKey,
      paymentProviderRef: reference,
      isDemoTransaction: session.isDemoTransaction,
      deliveryAddress: session.deliveryAddress,
    });

    let nextMarketplace = result.state;
    if (session.paymentRequestId) {
      nextMarketplace = {
        ...nextMarketplace,
        paymentRequests: (nextMarketplace.paymentRequests || []).map((r) =>
          r.id === session.paymentRequestId
            ? {
                ...r,
                status: 'Paid' as const,
                paidAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                paymentProviderRef: reference,
                parentOrderId: result.parentOrder.id,
                childOrderIds: result.childOrders.map((o) => o.id),
                payerInfo: session.payerInfo
                  ? { ...session.payerInfo, paymentProviderRef: reference }
                  : r.payerInfo,
              }
            : r
        ),
      };
    }

    store.marketplace = nextMarketplace;
    session.status = 'verified';
    session.verifiedAt = new Date().toISOString();
    session.parentOrder = result.parentOrder;
    session.childOrders = result.childOrders;
    saveStore(store);
  }

  res.status(200).json({ received: true });
});

app.post('/api/orders/:id/dispatch', (req, res) => {
  const orderId = req.params.id;
  const body = req.body || {};
  const code = generateCryptoOtp();

  const resDispatch = vendorArrangeDispatch(store.marketplace, {
    orderId,
    dispatcherOrCourierName: String(body.dispatcherOrCourierName || ''),
    dispatcherPhone: body.dispatcherPhone,
    dispatchReference: String(body.dispatchReference || ''),
    dispatchDate: body.dispatchDate,
    expectedDeliveryWindow: String(body.expectedDeliveryWindow || '1–3 business days'),
    deliveryNotes: body.deliveryNotes,
  });

  if (resDispatch.error) {
    res.status(400).json({ error: resDispatch.error });
    return;
  }

  const hashed = hashDeliveryCode(orderId, code);
  store.marketplace = {
    ...resDispatch.state,
    orders: resDispatch.state.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            deliveryVerificationCode: code,
            deliveryVerificationCodeHash: hashed,
          }
        : o
    ),
  };
  saveStore(store);

  const updatedOrder = store.marketplace.orders.find((o) => o.id === orderId);
  res.json({
    ok: true,
    order: updatedOrder ? sanitizeOrderForClient(updatedOrder) : undefined,
    message: 'Dispatch recorded and confidential 6-digit Delivery Verification PIN sent to customer.',
  });
});

app.get('/api/orders/:id/delivery-code', (req, res) => {
  const order = store.marketplace.orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const requesterRole = String(req.query.role || '');
  const requesterBuyerId = String(req.query.buyerId || '');

  if (requesterRole !== 'buyer' || requesterBuyerId !== order.buyerId) {
    res.status(403).json({
      error: 'Forbidden: Only the authenticated customer for this order may view the Delivery Verification PIN.',
    });
    return;
  }

  if (!order.deliveryVerificationCode) {
    res.status(404).json({ error: 'Delivery Verification PIN is not generated until dispatch.' });
    return;
  }

  res.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    deliveryVerificationCode: order.deliveryVerificationCode,
    expiresAt: order.deliveryCodeExpiresAt,
    usedAt: order.deliveryCodeUsedAt,
    warning: 'Only share this PIN when your package has arrived and you are ready to inspect it.',
  });
});

app.post('/api/orders/:id/delivery-code/resend', (req, res) => {
  const orderId = req.params.id;
  const body = req.body || {};
  const buyerId = String(body.buyerId || '');
  const nextPin = generateCryptoOtp();

  const resendRes = resendDeliveryVerificationCode(store.marketplace, {
    orderId,
    buyerId,
    customCode: nextPin,
  });

  if (resendRes.error) {
    const status = resendRes.error.includes('Unauthorized') ? 403 : 400;
    res.status(status).json({ error: resendRes.error });
    return;
  }

  const hashed = hashDeliveryCode(orderId, nextPin);
  store.marketplace = {
    ...resendRes.state,
    orders: resendRes.state.orders.map((o) =>
      o.id === orderId ? { ...o, deliveryVerificationCodeHash: hashed } : o
    ),
  };
  saveStore(store);

  const updated = store.marketplace.orders.find((o) => o.id === orderId);
  res.json({
    ok: true,
    code: nextPin,
    expiresAt: updated?.deliveryCodeExpiresAt,
    order: updated ? sanitizeOrderForClient(updated, 'buyer', buyerId) : undefined,
  });
});

app.post('/api/orders/:id/alternative-recipient', (req, res) => {
  const orderId = req.params.id;
  const body = req.body || {};
  const buyerId = String(body.buyerId || '');
  const phone = String(body.phone || '');

  if (!isValidNigerianPhone(phone)) {
    res.status(400).json({ error: 'Enter a valid Nigerian phone number for the alternative recipient.' });
    return;
  }

  const altRes = setOrderAlternativeRecipient(store.marketplace, {
    orderId,
    buyerId,
    name: String(body.name || ''),
    phone,
    relationship: String(body.relationship || 'Authorized Representative'),
    note: body.note ? String(body.note) : undefined,
  });

  if (altRes.error) {
    res.status(altRes.error.includes('Only the order customer') ? 403 : 400).json({ error: altRes.error });
    return;
  }

  store.marketplace = altRes.state;
  saveStore(store);

  const updated = store.marketplace.orders.find((o) => o.id === orderId);
  res.json({
    ok: true,
    order: updated ? sanitizeOrderForClient(updated, 'buyer', buyerId) : undefined,
  });
});

app.post('/api/orders/:id/delivery-failed', (req, res) => {
  const orderId = req.params.id;
  const body = req.body || {};
  const failRes = markDeliveryAttemptFailed(store.marketplace, {
    orderId,
    actorVendorId: body.vendorId ? String(body.vendorId) : undefined,
    reason: String(body.reason || ''),
    rescheduledWindow: body.rescheduledWindow ? String(body.rescheduledWindow) : undefined,
  });

  if (failRes.error) {
    res.status(failRes.error.includes('Unauthorized') ? 403 : 400).json({ error: failRes.error });
    return;
  }

  store.marketplace = failRes.state;
  saveStore(store);
  const updated = store.marketplace.orders.find((o) => o.id === orderId);
  res.json({
    ok: true,
    order: updated ? sanitizeOrderForClient(updated) : undefined,
  });
});

app.post('/api/orders/:id/verify-delivery-code', (req, res) => {
  const orderId = req.params.id;
  const body = req.body || {};
  const existing = store.marketplace.orders.find((o) => o.id === orderId);
  if (!existing) {
    res.status(404).json({ verified: false, error: 'Order not found.' });
    return;
  }

  // Constant-time HMAC verification when hash exists
  let hashMatched = true;
  if (existing.deliveryVerificationCodeHash) {
    const incomingHash = hashDeliveryCode(orderId, String(body.code || ''));
    const a = Buffer.from(incomingHash, 'hex');
    const b = Buffer.from(existing.deliveryVerificationCodeHash, 'hex');
    hashMatched = a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  const verifyResult = verifyDeliveryCodeAndStartInspection(store.marketplace, {
    orderId,
    enteredCode: hashMatched ? String(body.code || '') : '__HASH_MISMATCH__',
    actorVendorId: body.vendorId,
    actorName: body.actorName,
  });

  store.marketplace = verifyResult.state;
  saveStore(store);

  if (!verifyResult.verified) {
    res.status(400).json({
      verified: false,
      error: verifyResult.error,
      remainingAttempts: verifyResult.remainingAttempts,
    });
    return;
  }

  const updated = store.marketplace.orders.find((o) => o.id === orderId);
  res.json({
    verified: true,
    order: updated ? sanitizeOrderForClient(updated) : undefined,
  });
});

app.post('/api/orders/:id/admin-override-delivery', (req, res) => {
  const body = req.body || {};
  if (body.role !== 'admin') {
    res.status(403).json({ error: 'Admin authorization required.' });
    return;
  }

  const overrideRes = adminOverrideDeliveryConfirmation(store.marketplace, {
    orderId: req.params.id,
    adminName: String(body.adminName || 'UsedRight Admin'),
    reason: String(body.reason || ''),
  });

  if (overrideRes.error) {
    res.status(400).json({ error: overrideRes.error });
    return;
  }

  store.marketplace = overrideRes.state;
  saveStore(store);
  const updated = store.marketplace.orders.find((o) => o.id === req.params.id);
  res.json({ ok: true, order: updated ? sanitizeOrderForClient(updated) : undefined });
});

app.post('/api/orders/:id/warranty-claim', (req, res) => {
  const body = req.body || {};
  const claimRes = submitWarrantyClaim(store.marketplace, {
    orderId: req.params.id,
    buyerId: String(body.buyerId || ''),
    buyerName: String(body.buyerName || 'Customer'),
    issueCategory: body.issueCategory,
    description: String(body.description || ''),
    attachmentNames: Array.isArray(body.attachmentNames) ? body.attachmentNames : undefined,
    attachmentPreviews: Array.isArray(body.attachmentPreviews) ? body.attachmentPreviews : undefined,
  });

  if (claimRes.error) {
    res.status(claimRes.error.includes('Only the verified') ? 403 : 400).json({ error: claimRes.error });
    return;
  }

  store.marketplace = claimRes.state;
  saveStore(store);
  const updated = store.marketplace.orders.find((o) => o.id === req.params.id);
  res.json({
    ok: true,
    claim: claimRes.claim,
    order: updated ? sanitizeOrderForClient(updated, 'buyer', String(body.buyerId || '')) : undefined,
  });
});

app.post('/api/orders/:id/warranty-claim/:claimId/respond', (req, res) => {
  const body = req.body || {};
  if (body.role === 'admin') {
    store.marketplace = adminUpdateWarrantyClaim(store.marketplace, {
      claimId: req.params.claimId,
      adminName: String(body.adminName || 'UsedRight Admin'),
      status: body.status,
      resolutionSummary: body.resolutionSummary ? String(body.resolutionSummary) : undefined,
      adminNotes: body.adminNotes ? String(body.adminNotes) : undefined,
    });
    saveStore(store);
    res.json({ ok: true, warrantyClaims: store.marketplace.warrantyClaims });
    return;
  }

  const rspRes = vendorRespondWarrantyClaim(store.marketplace, {
    claimId: req.params.claimId,
    vendorId: String(body.vendorId || ''),
    vendorName: String(body.vendorName || 'Vendor'),
    proposedRemedy: body.proposedRemedy,
    vendorResponse: String(body.vendorResponse || ''),
    nextStatus: body.nextStatus,
  });

  if (rspRes.error) {
    res.status(rspRes.error.includes('Unauthorized') ? 403 : 400).json({ error: rspRes.error });
    return;
  }

  store.marketplace = rspRes.state;
  saveStore(store);
  res.json({ ok: true, warrantyClaims: store.marketplace.warrantyClaims });
});

app.get('/api/vendors/search', (req, res) => {
  const q = String(req.query.q || '');
  const verifiedOnly = req.query.verifiedOnly === 'true';
  const state = req.query.state ? String(req.query.state) : undefined;
  const results = searchVendorsAndStores(store.marketplace.vendors, store.marketplace.listings, q, {
    verifiedOnly,
    state,
    platformConfig: store.marketplace.platformConfig,
  });
  res.json({ ok: true, results });
});

app.post('/api/vendors/:id/follow', (req, res) => {
  const toggleRes = toggleFollowVendor(store.marketplace, req.params.id);
  store.marketplace = toggleRes.state;
  saveStore(store);
  res.json({
    ok: true,
    isFollowing: toggleRes.isFollowing,
    followedVendorIds: store.marketplace.followedVendorIds,
    vendor: store.marketplace.vendors.find((v) => v.id === req.params.id),
  });
});

app.post('/api/admin/vendors/:id/verify', (req, res) => {
  const body = req.body || {};
  if (body.role && body.role !== 'admin') {
    res.status(403).json({ error: 'Only administrators may verify or update vendor review status.' });
    return;
  }
  store.marketplace = adminReviewVendorVerification(store.marketplace, {
    vendorId: req.params.id,
    decision: body.decision || 'Approved',
    identityStatus: body.identityStatus,
    socialStatus: body.socialStatus,
    notes: body.notes ? String(body.notes) : undefined,
    adminName: String(body.adminName || 'Adaobi Nwosu (Admin)'),
  });
  saveStore(store);
  res.json({
    ok: true,
    vendors: store.marketplace.vendors,
    pendingSellerState: store.marketplace.pendingSellerState,
  });
});

app.post('/api/admin/warranty-policy', (req, res) => {
  const body = req.body || {};
  if (body.role && body.role !== 'admin') {
    res.status(403).json({ error: 'Admin authorization required.' });
    return;
  }
  store.marketplace = adminUpdateWarrantyConfig(store.marketplace, {
    defaultDurationMonths:
      body.defaultDurationMonths !== undefined ? Number(body.defaultDurationMonths) : undefined,
    claimResponseSlaHours:
      body.claimResponseSlaHours !== undefined ? Number(body.claimResponseSlaHours) : undefined,
    coveredSummary: Array.isArray(body.coveredSummary) ? body.coveredSummary : undefined,
    excludedSummary: Array.isArray(body.excludedSummary) ? body.excludedSummary : undefined,
    adminName: String(body.adminName || 'UsedRight Admin'),
  });
  saveStore(store);
  res.json({ ok: true, warrantyConfig: store.marketplace.warrantyConfig });
});

app.get('/api/admin/moderation', (req, res) => {
  if (req.query.role !== 'admin') {
    res.status(403).json({ error: 'Admin authorization required to inspect moderation flags.' });
    return;
  }
  res.json({
    ok: true,
    moderationFlags: store.marketplace.moderationFlags || [],
    restrictedMessagingUserIds: store.marketplace.restrictedMessagingUserIds || [],
  });
});

app.post('/api/admin/moderation/:flagId/action', (req, res) => {
  const body = req.body || {};
  if (body.role && body.role !== 'admin') {
    res.status(403).json({ error: 'Admin authorization required.' });
    return;
  }
  store.marketplace = adminModerateFlag(store.marketplace, {
    flagId: req.params.flagId,
    action: body.action || 'warn',
    adminName: String(body.adminName || 'UsedRight Safety Team'),
    note: body.note ? String(body.note) : undefined,
  });
  saveStore(store);
  res.json({
    ok: true,
    moderationFlags: store.marketplace.moderationFlags,
    restrictedMessagingUserIds: store.marketplace.restrictedMessagingUserIds,
  });
});

app.post('/api/chat/attachments', express.json({ limit: '36mb' }), (req, res) => {
  try {
    const body = req.body || {};
    const conversationId = String(body.conversationId || '');
    const orderId = body.orderId ? String(body.orderId) : undefined;
    const senderId = String(body.senderId || '');
    const senderRole = (body.senderRole || 'buyer') as 'buyer' | 'vendor' | 'admin';
    const fileName = String(body.fileName || 'evidence-upload').replace(/[^a-zA-Z0-9._-]/g, '_');
    const mimeType = String(body.mimeType || '').toLowerCase().trim();
    const base64DataRaw = String(body.dataBase64 || '');
    const evidenceTag = (body.evidenceTag || 'general') as ChatEvidenceTag;
    const caption = body.caption ? String(body.caption) : '';

    const conv = store.marketplace.conversations.find((c) => c.id === conversationId);
    if (!conv && senderRole !== 'admin') {
      res.status(404).json({ error: 'Transaction conversation not found.' });
      return;
    }

    if (
      conv &&
      senderRole !== 'admin' &&
      ((senderRole === 'buyer' && senderId !== conv.buyerId) ||
        (senderRole === 'vendor' && senderId !== conv.vendorId))
    ) {
      res.status(403).json({ error: 'Forbidden: Only chat participants may upload evidence.' });
      return;
    }

    if (!ALLOWED_CHAT_IMAGE_MIME_TYPES.has(mimeType) && !ALLOWED_CHAT_VIDEO_MIME_TYPES.has(mimeType)) {
      res.status(400).json({ error: 'Unsupported file type. Upload JPEG, PNG, WebP, MP4, or WebM only.' });
      return;
    }

    const stripped = base64DataRaw.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(stripped, 'base64');

    const validation = validateAttachmentUpload({
      fileName,
      mimeType,
      sizeBytes: buffer.length,
    });
    if (!validation.valid || !validation.mediaType) {
      res.status(400).json({ error: validation.error || 'Invalid attachment size or format.' });
      return;
    }

    if (!verifyMagicBytes(buffer, mimeType)) {
      res.status(400).json({ error: 'File contents do not match declared JPEG/PNG/WebP/MP4/WebM signature.' });
      return;
    }

    // Run safety scan against attachment filename and caption
    const safetyScan = scanMessageForDisallowedContent(caption, { fileName });
    if (!safetyScan.isSafe && (senderRole === 'buyer' || senderRole === 'vendor')) {
      const flagged = flagOffPlatformAttempt(store.marketplace, {
        userId: senderId,
        userName: senderRole === 'buyer' ? conv?.buyerName || 'Buyer' : conv?.vendorName || 'Vendor',
        userRole: senderRole,
        orderId,
        orderNumber: conv?.orderNumber,
        conversationId,
        contentType: 'chat_image',
        flaggedContent: `[Attachment: ${fileName}] ${caption}`.trim(),
        triggers: safetyScan.triggers,
        riskLevel: safetyScan.riskLevel,
      });
      store.marketplace = flagged.state;
      if (safetyScan.shouldBlock) {
        saveStore(store);
        res.status(422).json({
          error:
            'Upload blocked by UsedRight Safety Filter: off-platform payment details detected in attachment metadata/caption.',
          triggers: safetyScan.triggers,
        });
        return;
      }
    }

    const attId = `att-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
    const diskFileName = `${attId}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, diskFileName), buffer);

    const hasOpenClaimOrDispute = Boolean(
      orderId &&
        (store.marketplace.disputes.some((d) => d.orderId === orderId) ||
          (store.marketplace.warrantyClaims || []).some((w) => w.orderId === orderId))
    );

    const publicUrl = `/api/chat/attachments/${attId}?viewerId=${encodeURIComponent(senderId)}&role=${encodeURIComponent(senderRole)}`;
    const record: StoredAttachmentMeta = {
      id: attId,
      conversationId,
      orderId,
      senderRole,
      senderId,
      mediaType: validation.mediaType,
      mimeType,
      fileName,
      sizeBytes: buffer.length,
      url: publicUrl,
      evidenceTag,
      uploadedAt: new Date().toISOString(),
      immutableLocked: hasOpenClaimOrDispute,
      diskFileName,
    };

    store.attachments[attId] = record;
    saveStore(store);

    const { diskFileName: _omit, ...clientRecord } = record;
    res.json({
      ok: true,
      attachment: clientRecord,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/chat/attachments/:id', (req, res) => {
  const att = store.attachments[req.params.id];
  if (!att) {
    res.status(404).json({ error: 'Attachment not found.' });
    return;
  }

  const viewerRole = String(req.query.role || '');
  const viewerId = String(req.query.viewerId || '');
  const conv = store.marketplace.conversations.find((c) => c.id === att.conversationId);

  const isAdmin = viewerRole === 'admin';
  const isParticipant =
    Boolean(conv) &&
    Boolean(viewerId) &&
    (viewerId === conv!.buyerId || viewerId === conv!.vendorId || viewerId === att.senderId);

  if (!isAdmin && !isParticipant) {
    res.status(403).json({
      error: 'Forbidden: Only transaction participants or UsedRight Support may view private chat evidence.',
    });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, att.diskFileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Stored evidence file not found on server.' });
    return;
  }

  res.setHeader('Content-Type', att.mimeType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(filePath);
});

app.post('/api/admin/fees', (req, res) => {
  const body = req.body || {};
  if (body.role && body.role !== 'admin') {
    res.status(403).json({ error: 'Only authorized administrators may update fee configuration.' });
    return;
  }

  const updateRes = adminUpdatePlatformFees(store.marketplace, {
    customerFeeRate: Number(body.customerFeeRate),
    vendorFeeRate: Number(body.vendorFeeRate),
    vendorSpecificRates: body.vendorSpecificRates,
    promotionalLabel: body.promotionalLabel,
    effectiveDate: body.effectiveDate,
    expiryDate: body.expiryDate,
    eligibilityRules: body.eligibilityRules,
    reason: String(body.reason || 'Admin configuration update'),
    adminName: String(body.adminName || 'UsedRight Admin'),
  });

  if (updateRes.errors.length > 0) {
    res.status(400).json({ error: updateRes.errors.join(' '), errors: updateRes.errors });
    return;
  }

  store.marketplace = updateRes.state;
  saveStore(store);
  res.json({ ok: true, feeConfig: store.marketplace.feeConfig, feeAuditLog: store.marketplace.feeAuditLog });
});

app.post('/api/admin/delivery-config', (req, res) => {
  const body = req.body || {};
  const result = adminUpdateDeliveryConfig(store.marketplace, {
    fixedDeliveryFee: body.fixedDeliveryFee !== undefined ? Number(body.fixedDeliveryFee) : undefined,
    freePickupEnabled: body.freePickupEnabled,
    supportedDeliveryStates: body.supportedDeliveryStates,
    estimatedDeliveryWindow: body.estimatedDeliveryWindow,
    deliveryNotes: body.deliveryNotes,
    adminName: String(body.adminName || 'UsedRight Admin'),
  });

  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  store.marketplace = result.state;
  saveStore(store);
  res.json({ ok: true, deliveryConfig: store.marketplace.deliveryConfig });
});

app.post('/api/admin/policies', (req, res) => {
  const body = req.body || {};
  store.marketplace = adminSavePolicyVersion(store.marketplace, {
    policyId: body.policyId,
    title: String(body.title || ''),
    slug: body.slug,
    category: body.category,
    summary: String(body.summary || ''),
    version: String(body.version || '1.0.1'),
    status: body.status || 'Published',
    effectiveDate: String(body.effectiveDate || new Date().toISOString().slice(0, 10)),
    changeSummary: String(body.changeSummary || 'Policy update'),
    requiresVendorReacceptance: Boolean(body.requiresVendorReacceptance),
    sections: Array.isArray(body.sections) ? body.sections : [],
    adminName: String(body.adminName || 'UsedRight Admin'),
  });
  saveStore(store);
  res.json({ ok: true, policies: store.marketplace.policies });
});

app.post('/api/vendor/agreement-accept', (req, res) => {
  const body = req.body || {};
  if (!Array.isArray(body.declarationsAccepted) || body.declarationsAccepted.length < 15 || body.declarationsAccepted.some((v: boolean) => !v) || !body.finalConsentAccepted) {
    res.status(400).json({ error: 'All 15 mandatory declarations and final agreement consent must be accepted.' });
    return;
  }
  store.marketplace = recordVendorAgreementAcceptance(store.marketplace, {
    vendorId: String(body.vendorId || 'vendor-new'),
    vendorName: String(body.vendorName || 'Registered Vendor'),
    agreementVersion: String(body.agreementVersion || '1.0.0'),
    policyVersion: String(body.policyVersion || '1.0.0'),
    declarationsAccepted: body.declarationsAccepted,
    finalConsentAccepted: true,
    verifiedIdentityRef: body.verifiedIdentityRef,
  });
  saveStore(store);
  res.json({ ok: true, vendorAcceptances: store.marketplace.vendorAcceptances });
});

// ========== PAYMENT REQUESTS ("REQUEST SOMEONE TO PAY") ==========

app.post('/api/payment-requests', (req, res) => {
  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(clientIp, 30)) {
    res.status(429).json({ error: 'Too many payment request operations. Please wait briefly.' });
    return;
  }

  const body = req.body || {};
  const giftSrc = body.giftInput || body.giftDetails;
  const createRes = createPaymentRequestRecord(store.marketplace, {
    orderOwnerId: String(body.orderOwnerId || 'buyer-user-1'),
    orderOwnerName: String(body.orderOwnerName || 'Customer'),
    orderOwnerEmail: String(body.orderOwnerEmail || 'customer@usedright.demo'),
    orderOwnerPhone: String(body.orderOwnerPhone || ''),
    cartItems: Array.isArray(body.cartItems) ? body.cartItems : [],
    deliveryMethod:
      body.deliveryMethod === 'physical_pickup' ? 'physical_pickup' : 'usedright_delivery',
    deliveryAddress: body.deliveryAddress,
    isGift: Boolean(body.isGift),
    giftInput: giftSrc
      ? {
          recipientName: giftSrc.recipientName,
          recipientPhone: giftSrc.recipientPhone,
          street: giftSrc.recipientAddress?.street ?? giftSrc.street,
          city: giftSrc.recipientAddress?.city ?? giftSrc.city,
          state: giftSrc.recipientAddress?.state ?? giftSrc.state,
          landmark: giftSrc.recipientAddress?.landmark ?? giftSrc.landmark,
          deliveryInstructions: giftSrc.deliveryInstructions,
          giftMessage: giftSrc.giftMessage,
          senderVisibility: giftSrc.senderVisibility,
          senderDisplayName: giftSrc.senderDisplayName,
          occasion: giftSrc.occasion,
        }
      : undefined,
    validityHours: body.validityHours !== undefined ? Number(body.validityHours) : undefined,
    customRawToken:
      typeof body.customRawToken === 'string' && body.customRawToken.trim().length >= 12
        ? body.customRawToken.trim()
        : undefined,
  });

  if (createRes.error || !createRes.request || !createRes.rawToken) {
    res.status(400).json({ error: createRes.error || 'Could not create payment request link.' });
    return;
  }

  store.marketplace = createRes.state;
  saveStore(store);

  res.json({
    ok: true,
    request: {
      ...createRes.request,
      tokenHash: '',
    },
    rawToken: createRes.rawToken,
    sharePath: `?pay_request=${encodeURIComponent(createRes.rawToken)}`,
  });
});

app.get('/api/payment-requests/:token', (req, res) => {
  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(`${clientIp}:preq-get`, 60)) {
    res.status(429).json({ error: 'Too many requests. Wait a moment before refreshing this payment link.' });
    return;
  }

  const rawToken = String(req.params.token || '').trim();
  const tokenHash = sha256Hex(rawToken);
  const found = (store.marketplace.paymentRequests || []).find((r) =>
    timingSafeHexMatch(r.tokenHash, tokenHash)
  );

  if (!found) {
    res.status(404).json({ error: 'Payment request link is invalid or does not exist.' });
    return;
  }

  const refreshed = refreshPaymentRequestState(store.marketplace, found.id);
  store.marketplace = refreshed.state;
  saveStore(store);

  const updatedReq = refreshed.request || found;
  const safeView = buildPayerSafeRequestView(updatedReq);

  res.json({
    ok: true,
    request: safeView,
    availability: refreshed.availability,
  });
});

app.post('/api/payment-requests/:token/cancel', (req, res) => {
  const rawToken = String(req.params.token || '').trim();
  const tokenHash = sha256Hex(rawToken);
  const body = req.body || {};
  const found =
    (store.marketplace.paymentRequests || []).find((r) =>
      timingSafeHexMatch(r.tokenHash, tokenHash)
    ) || (store.marketplace.paymentRequests || []).find((r) => r.id === rawToken);

  if (!found) {
    res.status(404).json({ error: 'Payment request not found.' });
    return;
  }

  const cancelRes = cancelPaymentRequestRecord(store.marketplace, {
    paymentRequestId: found.id,
    actorBuyerId: String(body.actorBuyerId || body.orderOwnerId || ''),
  });

  if (cancelRes.error) {
    res
      .status(cancelRes.error.includes('Forbidden') || cancelRes.error.includes('Unauthorized') ? 403 : 400)
      .json({ error: cancelRes.error });
    return;
  }

  store.marketplace = cancelRes.state;
  saveStore(store);

  const updated = (store.marketplace.paymentRequests || []).find((r) => r.id === found.id);
  res.json({
    ok: true,
    request: updated ? { ...updated, tokenHash: '' } : undefined,
  });
});

app.post('/api/payment-requests/:token/pay', async (req, res) => {
  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(`${clientIp}:preq-pay`, 20)) {
    res.status(429).json({ error: 'Too many payment attempts. Please wait a minute and retry safely.' });
    return;
  }

  const rawToken = String(req.params.token || '').trim();
  const tokenHash = sha256Hex(rawToken);
  const found = (store.marketplace.paymentRequests || []).find((r) =>
    timingSafeHexMatch(r.tokenHash, tokenHash)
  );

  if (!found) {
    res.status(404).json({ error: 'Payment request link is invalid or does not exist.' });
    return;
  }

  const body = req.body || {};
  const outcome = (body.outcome || 'success') as 'success' | 'pending' | 'failed';
  const expectedAmount = Number(body.expectedAmount ?? found.totalPayableAmount);

  // If live Paystack is configured and user hasn't forced isolated demo simulation, initialize via Paystack
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (paystackSecret && body.useLivePaystack) {
    const refreshed = refreshPaymentRequestState(store.marketplace, found.id);
    store.marketplace = refreshed.state;
    if (!refreshed.availability.valid || found.totalPayableAmount !== expectedAmount) {
      saveStore(store);
      res.status(409).json({
        error: refreshed.availability.reason || 'Payment request is no longer payable.',
        availability: refreshed.availability,
      });
      return;
    }

    const reference = `UR-PSK-REQ-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
    const payerEmail = String(body.payerEmail || '').trim();
    const pskRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: payerEmail,
        amount: Math.round(found.totalPayableAmount * 100),
        currency: 'NGN',
        reference,
        metadata: {
          paymentRequestId: found.id,
          paymentRequestReference: found.requestReference,
          orderOwnerId: found.orderOwnerId,
          isGift: found.isGift,
        },
      }),
    });
    const pskData = (await pskRes.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };
    if (!pskRes.ok || !pskData.status) {
      res.status(502).json({ error: pskData.message || 'Paystack initialization failed.' });
      return;
    }

    const liveSession: PaymentSessionRecord = {
      reference,
      idempotencyKey: `preq-${found.id}-${reference}`,
      amount: found.totalPayableAmount,
      currency: 'NGN',
      buyerId: found.orderOwnerId,
      orderOwnerId: found.orderOwnerId,
      buyerName: found.orderOwnerName,
      buyerEmail: found.orderOwnerEmail,
      buyerPhone: found.orderOwnerPhone,
      payerInfo: {
        payerId: body.payerId ? String(body.payerId) : undefined,
        payerName: String(body.payerName || '').trim(),
        payerEmail,
        payerPhone: String(body.payerPhone || '').trim(),
        relationship: 'Shared Payment Request Payer',
        isAuthenticatedCustomer: Boolean(body.isAuthenticatedCustomer),
        paymentProviderRef: reference,
      },
      isGift: found.isGift,
      giftDetails: found.giftDetails,
      paymentRequestId: found.id,
      paymentRequestReference: found.requestReference,
      deliveryMethod: found.deliveryMethod,
      deliveryAddress: found.deliveryAddress,
      cartItems: found.cartItemsSnapshot,
      referralDiscount: 0,
      status: 'initialized',
      isDemoTransaction: false,
      createdAt: new Date().toISOString(),
    };
    store.paymentSessions[reference] = liveSession;
    saveStore(store);

    res.json({
      ok: true,
      mode: 'paystack_live',
      reference,
      authorizationUrl: pskData.data?.authorization_url,
    });
    return;
  }

  const checkoutRes = attemptPaymentRequestCheckout(store.marketplace, {
    paymentRequestId: found.id,
    payerId: body.payerId ? String(body.payerId) : undefined,
    payerName: String(body.payerName || ''),
    payerEmail: String(body.payerEmail || ''),
    payerPhone: String(body.payerPhone || ''),
    isAuthenticatedCustomer: Boolean(body.isAuthenticatedCustomer),
    expectedAmount,
    outcome,
    paymentProviderRef: body.paymentProviderRef ? String(body.paymentProviderRef) : undefined,
  });

  store.marketplace = checkoutRes.state;
  saveStore(store);

  const updatedReq = (store.marketplace.paymentRequests || []).find((r) => r.id === found.id);
  const safeView = updatedReq ? buildPayerSafeRequestView(updatedReq) : undefined;

  if (checkoutRes.error && checkoutRes.status !== 'Payment processing') {
    res.status(checkoutRes.status === 'Failed' ? 402 : 409).json({
      ok: false,
      status: checkoutRes.status,
      error: checkoutRes.error,
      request: safeView,
    });
    return;
  }

  res.json({
    ok: checkoutRes.status === 'Paid' || checkoutRes.status === 'Payment processing',
    status: checkoutRes.status,
    request: safeView,
    parentOrder: checkoutRes.parentOrder,
    childOrders: (checkoutRes.childOrders || []).map((o) =>
      sanitizeOrderForClient(o, 'buyer', found.orderOwnerId)
    ),
    paymentReference: updatedReq?.paymentProviderRef,
  });
});

// ========== GIFT RECIPIENT PORTAL (PRIVACY-SAFE, UNAUTHENTICATED TOKEN ACCESS) ==========

app.get('/api/orders/:id/recipient-view', (req, res) => {
  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(`${clientIp}:gift-get`, 60)) {
    res.status(429).json({ error: 'Too many requests.' });
    return;
  }

  const order = store.marketplace.orders.find((o) => o.id === req.params.id);
  if (!order || !order.isGift || !order.giftDetails) {
    res.status(404).json({ error: 'Gift order not found.' });
    return;
  }

  const rtok = String(req.query.rtok || '').trim();
  const rtokHash = sha256Hex(rtok);
  const storedHash = order.giftDetails.recipientAccessTokenHash;
  if (storedHash && !timingSafeHexMatch(storedHash, rtokHash)) {
    res.status(403).json({ error: 'Forbidden: Invalid gift recipient portal token.' });
    return;
  }

  const view = buildRecipientSafeOrderView(order);
  const complaints = (store.marketplace.recipientComplaints || []).filter(
    (c) => c.orderId === order.id
  );

  res.json({
    ok: true,
    view,
    complaints,
  });
});

app.post('/api/orders/:id/recipient-complaint', (req, res) => {
  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(`${clientIp}:gift-complaint`, 20)) {
    res.status(429).json({ error: 'Too many complaint submissions. Please wait a moment.' });
    return;
  }

  const order = store.marketplace.orders.find((o) => o.id === req.params.id);
  if (!order || !order.isGift || !order.giftDetails) {
    res.status(404).json({ error: 'Gift order not found.' });
    return;
  }

  const body = req.body || {};
  const rtok = String(body.rtok || req.query.rtok || '').trim();
  const rtokHash = sha256Hex(rtok);
  const storedHash = order.giftDetails.recipientAccessTokenHash;
  if (storedHash && !timingSafeHexMatch(storedHash, rtokHash)) {
    res.status(403).json({ error: 'Forbidden: Invalid gift recipient portal token.' });
    return;
  }

  const subRes = submitRecipientProblemReport(store.marketplace, {
    orderId: order.id,
    category: (body.category || 'Other') as RecipientComplaintCategory,
    description: String(body.description || ''),
    reporterName: body.reporterName ? String(body.reporterName) : undefined,
  });

  if (subRes.error) {
    res.status(400).json({ error: subRes.error });
    return;
  }

  store.marketplace = subRes.state;
  saveStore(store);

  res.json({
    ok: true,
    complaint: subRes.complaint,
  });
});

app.post('/api/admin/payment-request-config', (req, res) => {
  const body = req.body || {};
  if (body.role !== 'admin') {
    res.status(403).json({ error: 'Admin authorization required.' });
    return;
  }
  const hours = Number(body.validityHours);
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
    res.status(400).json({ error: 'Payment request validity must be between 1 and 168 hours.' });
    return;
  }
  store.marketplace = adminUpdatePaymentRequestConfig(store.marketplace, {
    validityHours: hours,
    adminName: String(body.adminName || 'UsedRight Admin'),
  });
  saveStore(store);
  res.json({ ok: true, platformConfig: store.marketplace.platformConfig });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'));
  const httpServer = http.createServer(app);

  if (!isProd) {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`UsedRight full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
