import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialMarketplaceState } from '../data/marketplaceCatalog';
import {
  deriveOrderStatusSummary,
  isDeliveryPinAllowedForViewer,
  shouldHideFooterTrustStack,
} from './orderStatusUi';

const seed = createInitialMarketplaceState();
const sampleOrder = seed.orders[0];

test('isDeliveryPinAllowedForViewer exposes PIN only to authorised buyer during transit/pickup before code use', () => {
  const transitOrder = {
    ...sampleOrder,
    isGift: false,
    deliveryVerificationCode: '482910',
    deliveryCodeUsedAt: undefined,
    fulfillmentStatus: 'In transit' as const,
  };

  assert.equal(isDeliveryPinAllowedForViewer(transitOrder, 'buyer'), true);
  assert.equal(isDeliveryPinAllowedForViewer(transitOrder, 'vendor'), false);
  assert.equal(isDeliveryPinAllowedForViewer(transitOrder, 'admin'), false);

  assert.equal(
    isDeliveryPinAllowedForViewer(
      { ...transitOrder, fulfillmentStatus: 'Seller preparing device' },
      'buyer'
    ),
    false
  );

  assert.equal(
    isDeliveryPinAllowedForViewer({ ...transitOrder, isGift: true }, 'buyer'),
    false
  );

  assert.equal(
    isDeliveryPinAllowedForViewer(
      { ...transitOrder, deliveryCodeUsedAt: '2026-11-10T10:00:00Z' },
      'buyer'
    ),
    false
  );
});

test('deriveOrderStatusSummary keeps inspection locked before delivery verification and reveals timestamps once verified', () => {
  const preDelivery = deriveOrderStatusSummary({
    order: {
      ...sampleOrder,
      fulfillmentStatus: 'In transit',
      buyerConfirmedReceipt: false,
      deliveryCodeUsedAt: undefined,
      deliveredAt: undefined,
      inspectionExpiresAt: undefined,
      disputePaused: false,
    },
    viewerRole: 'buyer',
    remainingSeconds: 86400,
  });

  assert.equal(preDelivery.hasVerifiedReceipt, false);
  assert.equal(preDelivery.inspectionTone, 'not_started');
  assert.equal(preDelivery.inspectionStartedAt, null);
  assert.equal(preDelivery.inspectionDeadlineAt, null);
  assert.equal(preDelivery.deliveryStatusLabel, 'In transit');
  assert.equal(preDelivery.paymentStatusLabel, 'Payment protected');

  const postDelivery = deriveOrderStatusSummary({
    order: {
      ...sampleOrder,
      fulfillmentStatus: 'Delivered_In_Inspection',
      buyerConfirmedReceipt: true,
      deliveryCodeUsedAt: '2026-11-10T10:15:00Z',
      inspectionExpiresAt: '2026-11-11T10:15:00Z',
      disputePaused: false,
    },
    viewerRole: 'buyer',
    remainingSeconds: 43200,
  });

  assert.equal(postDelivery.hasVerifiedReceipt, true);
  assert.equal(postDelivery.inspectionTone, 'active');
  assert.equal(postDelivery.inspectionStartedAt, '2026-11-10T10:15:00Z');
  assert.equal(postDelivery.inspectionDeadlineAt, '2026-11-11T10:15:00Z');
  assert.equal(postDelivery.deliveryStatusLabel, 'Delivered & verified');
});

test('shouldHideFooterTrustStack suppresses repeated multi-card trust stack on home and inner operational views', () => {
  for (const view of ['home', 'messages', 'order_details', 'profile', 'seller_dashboard']) {
    assert.equal(shouldHideFooterTrustStack(view), true);
  }
  assert.equal(shouldHideFooterTrustStack('explore'), false);
  assert.equal(shouldHideFooterTrustStack('vendors'), false);
});
