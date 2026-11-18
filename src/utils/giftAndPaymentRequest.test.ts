import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialMarketplaceState,
  DEMO_BUYER,
} from '../data/marketplaceCatalog';
import {
  buildPayerSafeRequestView,
  buildRecipientSafeOrderView,
  sanitizeGiftMessage,
  validateGiftOrderDetails,
  MAX_GIFT_MESSAGE_LENGTH,
  sha256Hex,
} from './marketplace';
import {
  adminResolveDispute,
  adminUpdatePaymentRequestConfig,
  attemptPaymentRequestCheckout,
  cancelPaymentRequestRecord,
  createMultiVendorOrdersFromCheckout,
  createPaymentRequestRecord,
  refreshPaymentRequestState,
  submitRecipientProblemReport,
  vendorArrangeDispatch,
} from './transactionEngine';

test('Gift message sanitizer removes scripts/HTML and caps at 240 chars', () => {
  const dirty = '<script>alert(1)</script><b>Happy Birthday!</b>   Enjoy your phone.';
  const cleaned = sanitizeGiftMessage(dirty);
  assert.equal(cleaned.includes('<script>'), false);
  assert.equal(cleaned.includes('<b>'), false);
  assert.equal(cleaned, 'Happy Birthday! Enjoy your phone.');

  const long = 'A'.repeat(400);
  const truncated = sanitizeGiftMessage(long);
  assert.equal(truncated.length, MAX_GIFT_MESSAGE_LENGTH);
});

test('validateGiftOrderDetails enforces recipient phone, address, instructions, and gift flags', () => {
  const invalid = validateGiftOrderDetails(
    {
      recipientName: 'T',
      recipientPhone: '123',
      street: '',
      city: '',
      state: 'Lagos State',
      deliveryInstructions: 'Call',
    },
    'usedright_delivery'
  );
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 3);

  const valid = validateGiftOrderDetails(
    {
      recipientName: 'Toluwase Adeyemi',
      recipientPhone: '08031234567',
      street: '18 Awolowo Road, Ikoyi',
      city: 'Ikoyi',
      state: 'Lagos State',
      deliveryInstructions: 'Call recipient at gatehouse 20 mins before arrival.',
      giftMessage: 'Congrats on the promotion!',
      senderVisibility: 'anonymous',
      occasion: 'Promotion / Career Milestone',
    },
    'usedright_delivery'
  );
  assert.equal(valid.valid, true);
  assert.ok(valid.giftDetails);
  assert.equal(valid.giftDetails.hidePriceFromPackage, true);
  assert.equal(valid.giftDetails.specialPackagingGuaranteed, false);
  assert.equal(valid.giftDetails.senderVisibility, 'anonymous');
  assert.ok(valid.giftDetails.recipientPortalToken);
  assert.equal(
    valid.giftDetails.recipientAccessTokenHash,
    sha256Hex(valid.giftDetails.recipientPortalToken!)
  );

  // Also ensure GiftOrderDetails objects with nested recipientAddress validate cleanly
  const nestedRes = validateGiftOrderDetails(valid.giftDetails, 'usedright_delivery');
  assert.equal(nestedRes.valid, true);
  assert.equal(nestedRes.giftDetails?.recipientAddress.street, '18 Awolowo Road, Ikoyi');
});

test('Gift order routes confidential 6-digit PIN to recipient portal and strips all prices/anonymous sender', () => {
  const seed = createInitialMarketplaceState();
  const listing = seed.listings[0];
  const validGift = validateGiftOrderDetails(
    {
      recipientName: 'Chidi Okafor',
      recipientPhone: '08098765432',
      street: '22 Ademola Adetokunbo Crescent, Wuse 2',
      city: 'Wuse 2',
      state: 'Abuja (FCT)',
      deliveryInstructions: 'Ask security for Chidi in Suite 4B.',
      giftMessage: 'Happy Birthday Chidi!',
      senderVisibility: 'anonymous',
      senderDisplayName: DEMO_BUYER.name,
      occasion: 'Birthday',
    },
    'usedright_delivery'
  );
  assert.ok(validGift.giftDetails);

  const checkoutRes = createMultiVendorOrdersFromCheckout(seed, {
    buyerId: DEMO_BUYER.id,
    buyerName: DEMO_BUYER.name,
    buyerEmail: DEMO_BUYER.email,
    buyerPhone: DEMO_BUYER.phone,
    cartItems: [
      {
        id: 'cart-gift-1',
        listing,
        selectedVariation: listing.variations?.[0],
        quantity: 1,
      },
    ],
    deliveryMethod: 'usedright_delivery',
    isGift: true,
    giftDetails: validGift.giftDetails,
    deliveryAddress: validGift.giftDetails.recipientAddress,
  });

  const giftOrder = checkoutRes.childOrders[0];
  assert.equal(giftOrder.isGift, true);

  // Dispatch sets confidential PIN and routes recipient notification instead of purchaser PIN exposure
  const dispatchRes = vendorArrangeDispatch(checkoutRes.state, {
    orderId: giftOrder.id,
    dispatcherOrCourierName: 'GIG Logistics Rider',
    dispatcherPhone: '08055551122',
    dispatchReference: 'GIG-GIFT-901',
    expectedDeliveryWindow: 'Today 2pm - 5pm',
  });
  assert.equal(dispatchRes.error, undefined);
  const dispatchedOrder = dispatchRes.state.orders.find((o) => o.id === giftOrder.id)!;
  assert.match(dispatchedOrder.deliveryVerificationCode || '', /^\d{6}$/);

  const recipientView = buildRecipientSafeOrderView(dispatchedOrder);
  assert.equal(recipientView.senderDisplayMode, 'anonymous');
  assert.equal(recipientView.senderDisplayLabel, 'Anonymous Sender');
  assert.equal(
    recipientView.deliveryVerificationCode,
    dispatchedOrder.deliveryVerificationCode
  );

  // Verify NO price leakage anywhere in serialized recipient view
  const serialized = JSON.stringify(recipientView);
  assert.equal(serialized.includes(String(dispatchedOrder.totalAmount)), false);
  assert.equal(serialized.includes(String(dispatchedOrder.itemPrice)), false);
  assert.equal(serialized.includes('customer_platform_service_fee'), false);
  assert.equal(serialized.includes(DEMO_BUYER.name), false);
});

test('Payment Request creation locks quote with single fee and creates ZERO orders/vendor alerts pre-payment', () => {
  const seed = createInitialMarketplaceState();
  const listing = seed.listings[0];
  const initialOrdersCount = seed.orders.length;
  const initialVendorNotifs = seed.notifications.filter(
    (n) => n.recipientRole === 'vendor'
  ).length;

  const createRes = createPaymentRequestRecord(seed, {
    orderOwnerId: DEMO_BUYER.id,
    orderOwnerName: DEMO_BUYER.name,
    orderOwnerEmail: DEMO_BUYER.email,
    orderOwnerPhone: DEMO_BUYER.phone,
    cartItems: [
      {
        id: 'cart-req-1',
        listing,
        selectedVariation: listing.variations?.[0],
        quantity: 1,
      },
    ],
    deliveryMethod: 'usedright_delivery',
    deliveryAddress: {
      fullName: DEMO_BUYER.name,
      phone: DEMO_BUYER.phone,
      street: '14 Admiralty Way, Lekki Phase 1',
      city: 'Lagos Island',
      state: 'Lagos State',
    },
    isGift: false,
  });

  assert.equal(createRes.error, undefined);
  assert.ok(createRes.request);
  assert.ok(createRes.rawToken);
  assert.equal(createRes.state.orders.length, initialOrdersCount);
  assert.equal(
    createRes.state.notifications.filter((n) => n.recipientRole === 'vendor').length,
    initialVendorNotifs
  );

  const safePayerView = buildPayerSafeRequestView(createRes.request);
  assert.equal(safePayerView.status, 'Pending payment');
  assert.equal(safePayerView.totalPayableAmount, createRes.request.totalPayableAmount);
  assert.equal(
    safePayerView.totalPayableAmount,
    safePayerView.subtotalAmount +
      safePayerView.customer_platform_service_fee +
      safePayerView.deliveryFeeTotal
  );
  // Token hash must NEVER leak in public payer view
  assert.equal('tokenHash' in safePayerView, false);
});

test('Payment Request enforces expiry, live stock/price integrity, owner-only cancel, replay & tamper protection', () => {
  const seed = createInitialMarketplaceState();
  const listing = seed.listings[0];

  const created = createPaymentRequestRecord(seed, {
    orderOwnerId: DEMO_BUYER.id,
    orderOwnerName: DEMO_BUYER.name,
    orderOwnerEmail: DEMO_BUYER.email,
    orderOwnerPhone: DEMO_BUYER.phone,
    cartItems: [
      {
        id: 'cart-sec-1',
        listing,
        selectedVariation: listing.variations?.[0],
        quantity: 1,
      },
    ],
    deliveryMethod: 'usedright_delivery',
    deliveryAddress: {
      fullName: DEMO_BUYER.name,
      phone: DEMO_BUYER.phone,
      street: '14 Admiralty Way',
      city: 'Lagos Island',
      state: 'Lagos State',
    },
    validityHours: 12,
  });
  const reqId = created.request!.id;

  // 1. Price change invalidates unpaid request
  const mutatedPriceState = {
    ...created.state,
    listings: created.state.listings.map((l) =>
      l.id === listing.id ? { ...l, price: l.price + 25000 } : l
    ),
  };
  const refreshedPrice = refreshPaymentRequestState(mutatedPriceState, reqId);
  assert.equal(refreshedPrice.availability.valid, false);
  assert.equal(refreshedPrice.request?.status, 'Invalidated');

  // 2. Expiry past validity window marks Expired
  const futureMs = Date.now() + 25 * 3600 * 1000;
  const refreshedExp = refreshPaymentRequestState(created.state, reqId, futureMs);
  assert.equal(refreshedExp.availability.valid, false);
  assert.equal(refreshedExp.request?.status, 'Expired');

  // 3. Tampered expectedAmount is blocked & increments suspiciousAttemptsCount
  const tamperRes = attemptPaymentRequestCheckout(created.state, {
    paymentRequestId: reqId,
    payerName: 'Amaka Sponsor',
    payerEmail: 'amaka@example.ng',
    payerPhone: '08022223344',
    expectedAmount: 1000,
    outcome: 'success',
  });
  assert.ok(tamperRes.error);
  assert.equal(
    tamperRes.state.paymentRequests?.find((r) => r.id === reqId)?.suspiciousAttemptsCount,
    1
  );

  // 4. Failed payment creates ZERO orders
  const failedRes = attemptPaymentRequestCheckout(created.state, {
    paymentRequestId: reqId,
    payerName: 'Amaka Sponsor',
    payerEmail: 'amaka@example.ng',
    payerPhone: '08022223344',
    expectedAmount: created.request!.totalPayableAmount,
    outcome: 'failed',
  });
  assert.equal(failedRes.status, 'Failed');
  assert.equal(failedRes.state.orders.length, created.state.orders.length);

  // 5. Valid payment succeeds, creates Order with single fee and Paid status
  const paidRes = attemptPaymentRequestCheckout(created.state, {
    paymentRequestId: reqId,
    payerName: 'Amaka Sponsor',
    payerEmail: 'amaka@example.ng',
    payerPhone: '08022223344',
    expectedAmount: created.request!.totalPayableAmount,
    outcome: 'success',
  });
  assert.equal(paidRes.status, 'Paid');
  assert.ok(paidRes.parentOrder);
  assert.equal(
    paidRes.parentOrder.totalPaid,
    created.request!.totalPayableAmount
  );
  assert.equal(
    paidRes.parentOrder.customer_platform_service_fee,
    created.request!.customer_platform_service_fee
  );
  assert.equal(paidRes.childOrders?.[0]?.payerInfo?.payerName, 'Amaka Sponsor');
  assert.equal(paidRes.childOrders?.[0]?.orderOwnerId, DEMO_BUYER.id);

  // 6. Replay attempt on already Paid link is blocked and cannot create duplicate order
  const replayRes = attemptPaymentRequestCheckout(paidRes.state, {
    paymentRequestId: reqId,
    payerName: 'Amaka Sponsor',
    payerEmail: 'amaka@example.ng',
    payerPhone: '08022223344',
    expectedAmount: created.request!.totalPayableAmount,
    outcome: 'success',
  });
  assert.ok(replayRes.error);
  assert.equal(replayRes.state.orders.length, paidRes.state.orders.length);

  // 7. Non-owner cancel is forbidden, owner cancel on unpaid works
  const nonOwnerCancel = cancelPaymentRequestRecord(created.state, {
    paymentRequestId: reqId,
    actorBuyerId: 'someone-else',
  });
  assert.ok(nonOwnerCancel.error?.includes('Forbidden'));
  const ownerCancel = cancelPaymentRequestRecord(created.state, {
    paymentRequestId: reqId,
    actorBuyerId: DEMO_BUYER.id,
  });
  assert.equal(ownerCancel.error, undefined);
  assert.equal(
    ownerCancel.state.paymentRequests?.find((r) => r.id === reqId)?.status,
    'Cancelled'
  );
});

test('Gift Recipient complaint opens dispute, notifies purchaser, and refund traces back to third-party payer ref', () => {
  const seed = createInitialMarketplaceState();
  const activeGiftPreq = (seed.paymentRequests || []).find((r) => r.id === 'preq-demo-active');
  assert.ok(activeGiftPreq && activeGiftPreq.isGift, 'Seeded preq-demo-active gift request should exist');

  const paidThirdPartyRes = attemptPaymentRequestCheckout(seed, {
    paymentRequestId: activeGiftPreq.id,
    payerName: 'Dapo Sponsor',
    payerEmail: 'dapo@sponsor.ng',
    payerPhone: '08077778888',
    expectedAmount: activeGiftPreq.totalPayableAmount,
    outcome: 'success',
  });
  assert.equal(paidThirdPartyRes.status, 'Paid');
  const paidThirdPartyGiftOrder = paidThirdPartyRes.childOrders?.[0];
  assert.ok(paidThirdPartyGiftOrder);
  assert.equal(paidThirdPartyGiftOrder.isGift, true);
  assert.ok(paidThirdPartyGiftOrder.payerInfo?.paymentProviderRef);

  const complaintRes = submitRecipientProblemReport(paidThirdPartyRes.state, {
    orderId: paidThirdPartyGiftOrder.id,
    category: 'Undisclosed defect',
    description: 'Speaker crackles loudly when testing audio above 60% volume.',
    reporterName: paidThirdPartyGiftOrder.giftDetails?.recipientName,
  });
  assert.equal(complaintRes.error, undefined);
  assert.ok(complaintRes.complaint);
  assert.ok(complaintRes.complaint.disputeId);

  const resolvedState = adminResolveDispute(complaintRes.state, {
    disputeId: complaintRes.complaint.disputeId!,
    adminName: 'UsedRight Admin',
    decision: 'refund_buyer',
    outcomeSummary: 'Full refund approved back to original payment method.',
  });

  const payerNotifs = resolvedState.notifications.filter(
    (n) => n.recipientRole === 'payer' && n.orderId === paidThirdPartyGiftOrder.id
  );
  assert.ok(payerNotifs.length >= 1);
  assert.ok(
    payerNotifs[0].message.includes(
      paidThirdPartyGiftOrder.payerInfo!.paymentProviderRef!
    )
  );
});

test('Admin can update Payment Request validity window strictly clamped between 1 and 168 hours', () => {
  const seed = createInitialMarketplaceState();
  const s1 = adminUpdatePaymentRequestConfig(seed, {
    validityHours: 72,
    adminName: 'UsedRight Admin',
  });
  assert.equal(s1.platformConfig.paymentRequestValidityHours, 72);

  const sLow = adminUpdatePaymentRequestConfig(s1, {
    validityHours: 0,
    adminName: 'UsedRight Admin',
  });
  assert.equal(sLow.platformConfig.paymentRequestValidityHours, 1);

  const sHigh = adminUpdatePaymentRequestConfig(s1, {
    validityHours: 999,
    adminName: 'UsedRight Admin',
  });
  assert.equal(sHigh.platformConfig.paymentRequestValidityHours, 168);
});
