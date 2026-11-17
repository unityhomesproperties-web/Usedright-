import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBuyerServiceCharge,
  calculateSellerServiceCharge,
  calculateSellerNetPayout,
  calculateOrderFinancials,
  formatNaira,
  scanMessageForDisallowedContent,
  filterListings,
  applyCatalogToolbarFilters,
  DEFAULT_CATALOG_TOOLBAR_FILTERS,
  isDealListing,
  validateDeviceListing,
  checkBlockingRestriction,
  generateOrderId,
  generateTransactionId,
  generatePickupOtp,
  generateDisputeId,
} from './marketplace';
import { toSimpleEnglish, sanitizeConditionText } from './simpleEnglish';
import { createInitialMarketplaceState, DEFAULT_CATEGORIES } from '../data/marketplaceCatalog';
import { RICH_NIGERIAN_CATALOG_ITEMS } from '../data/richNigerianCatalog';
import {
  advanceInspectionTimer,
  adminJoinDisputeAndUpdate,
  adminResolveDispute,
  configureAdminSettings,
  confirmPhysicalDeliveryOrReceipt,
  createOrderFromCheckout,
  getRoleSafeDisputeView,
  openDisputeInChat,
  simulateDispatch,
  updateListingSafely,
} from './transactionEngine';
import { DeviceListing } from '../types/marketplace';

import {
  calculateMultiVendorCheckoutQuote,
  calculateRefundFeeAdjustment,
  DEFAULT_FIXED_DELIVERY_FEE,
  MAX_CUSTOMER_FEE_RATE,
  MAX_VENDOR_FEE_RATE,
} from './marketplace';
import {
  adminUpdatePlatformFees,
  adminSavePolicyVersion,
  createMultiVendorOrdersFromCheckout,
  recordVendorAgreementAcceptance,
  vendorArrangeDispatch,
  verifyDeliveryCodeAndStartInspection,
} from './transactionEngine';
import {
  INITIAL_POLICIES,
  VENDOR_REGISTRATION_DECLARATIONS,
} from '../data/policiesCatalog';

test('Fee calculations: up to 0.7% customer service fee and up to 1.0% vendor service fee', () => {
  const itemPrice = 420000;
  // 0.7% of 420,000 = 2,940; 1.0% of 420,000 = 4,200
  assert.equal(calculateBuyerServiceCharge(itemPrice), 2940);
  assert.equal(calculateSellerServiceCharge(itemPrice), 4200);
  assert.equal(calculateSellerNetPayout(itemPrice), 415800);

  const order = calculateOrderFinancials(300000, 3000);
  assert.equal(order.itemPrice, 300000);
  assert.equal(order.serviceCharge, 2100);
  assert.equal(order.deliveryFee, 3000);
  assert.equal(order.total, 305100);

  const orderWithAddons = calculateOrderFinancials(420000, 3000, 6000, 1000);
  assert.equal(orderWithAddons.subtotal, 426000);
  // 0.7% of 426,000 = 2,982 (delivery excluded from fee base)
  assert.equal(orderWithAddons.serviceCharge, 2982);
  assert.equal(orderWithAddons.total, 430982);
});

test('formatNaira formats currency with standard ₦ prefix and commas', () => {
  assert.equal(formatNaira(308000), '₦308,000');
  assert.equal(formatNaira(1250000), '₦1,250,000');
});

test('Message safety scanner detects off-platform communication leaks', () => {
  const cleanResult = scanMessageForDisallowedContent(
    'Hello, is the battery health still at 88% and can it be delivered to Lekki?'
  );
  assert.equal(cleanResult.isSafe, true);
  assert.equal(cleanResult.warnings.length, 0);

  const phoneResult = scanMessageForDisallowedContent(
    'Please call me directly on 08034567890 to negotiate'
  );
  assert.equal(phoneResult.isSafe, false);
  assert.match(phoneResult.warnings[0], /Phone numbers detected/);

  const whatsappResult = scanMessageForDisallowedContent('DM me on whatsapp for a lower price');
  assert.equal(whatsappResult.isSafe, false);
  assert.match(whatsappResult.warnings[0], /WhatsApp/);

  const bankResult = scanMessageForDisallowedContent('Make bank transfer to 0123456789 GTB directly');
  assert.equal(bankResult.isSafe, false);
});

test('filterListings respects category, condition (Foreign-Used vs Brand-New), grade, and battery health', () => {
  const mockListings: DeviceListing[] = [
    {
      id: 'p-1',
      category: 'phones',
      condition: 'Foreign-Used',
      title: 'iPhone 13 Pro',
      brand: 'Apple',
      model: 'iPhone 13 Pro',
      storage: '256GB',
      color: 'Sierra Blue',
      price: 420000,
      cosmeticGrade: 'Grade A',
      batteryHealth: 88,
      images: ['/test.jpg'],
      sellerId: 'v-1',
      sellerName: 'Prime Mobile Store',
      sellerVerified: true,
      sellerRating: 4.9,
      sellerSalesCount: 142,
      foreignUsedStatus: 'Verified Foreign-Used',
      sourceCountry: 'United States',
      batchReference: 'AWB-883921',
      imeiOrSerial: '354892019283741',
      disclosedFaults: [],
      conditionReport: {} as any,
      repairHistory: [],
      warrantyDays: 30,
      warrantyPolicyNotes: '30-day warranty',
      deliveryFee: 5000,
      freeDeliveryEligible: false,
      status: 'Active',
      createdAt: '2026-10-01',
      views: 340,
    },
    {
      id: 'l-1',
      category: 'laptops',
      condition: 'Foreign-Used',
      title: 'MacBook Pro 14 M2 Pro',
      brand: 'Apple',
      model: 'MacBook Pro 14',
      storage: '512GB SSD',
      ram: '16GB',
      color: 'Space Gray',
      price: 950000,
      cosmeticGrade: 'Grade B',
      images: ['/test2.jpg'],
      sellerId: 'v-2',
      sellerName: 'Apex Tech Imports',
      sellerVerified: true,
      sellerRating: 4.8,
      sellerSalesCount: 88,
      foreignUsedStatus: 'Verified Foreign-Used',
      sourceCountry: 'United Kingdom',
      batchReference: 'AWB-449102',
      imeiOrSerial: 'C02G90PLMD6T',
      disclosedFaults: [],
      conditionReport: {} as any,
      repairHistory: [],
      warrantyDays: 60,
      warrantyPolicyNotes: '60-day hardware warranty',
      deliveryFee: 6000,
      freeDeliveryEligible: false,
      status: 'Active',
      createdAt: '2026-10-15',
      views: 512,
    },
    {
      id: 'bn-1',
      category: 'phones',
      condition: 'Brand-New',
      title: 'iPhone 15 Sealed',
      brand: 'Apple',
      model: 'iPhone 15',
      storage: '128GB',
      color: 'Black',
      price: 680000,
      cosmeticGrade: 'Grade A',
      batteryHealth: 100,
      images: ['/test3.jpg'],
      sellerId: 'v-1',
      sellerName: 'Prime Mobile Store',
      sellerVerified: true,
      sellerRating: 4.9,
      sellerSalesCount: 142,
      foreignUsedStatus: 'Verified Foreign-Used',
      sourceCountry: 'Direct Import Brand New',
      batchReference: 'BN-8812',
      imeiOrSerial: '352940192849102',
      disclosedFaults: [],
      conditionReport: {} as any,
      repairHistory: [],
      warrantyDays: 365,
      warrantyPolicyNotes: '1-Year Apple Warranty',
      deliveryFee: 5000,
      freeDeliveryEligible: true,
      status: 'Active',
      createdAt: '2026-11-01',
      views: 200,
    },
  ];

  assert.equal(filterListings(mockListings, { category: 'phones' }).length, 2);
  assert.equal(filterListings(mockListings, { condition: 'Brand-New' })[0].id, 'bn-1');
  assert.equal(filterListings(mockListings, { condition: 'Foreign-Used' }).length, 2);
  assert.equal(filterListings(mockListings, { category: 'phones', minBatteryHealth: 90 })[0].id, 'bn-1');
  assert.equal(filterListings(mockListings, { cosmeticGrades: ['Grade B'] })[0].id, 'l-1');
});

test('validateDeviceListing enforces batch reference, IMEI/Serial, and blocks Brand-New when disabled', () => {
  const incompleteDraft = {
    title: 'Samsung Galaxy S22 Ultra',
    brand: 'Samsung',
    model: 'S22 Ultra',
    category: 'phones' as const,
    price: 380000,
    cosmeticGrade: 'Grade A' as const,
  };

  const result = validateDeviceListing(incompleteDraft);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('Condition must be explicitly declared')));

  const state = createInitialMarketplaceState();
  const brandNewResult = validateDeviceListing(
    {
      ...incompleteDraft,
      condition: 'Brand-New',
      batchReference: 'AWB-NYC-77821',
      imeiOrSerial: '356789104839201',
    },
    state.platformConfig
  );
  assert.equal(brandNewResult.valid, false);
  assert.ok(brandNewResult.errors.some((e) => e.includes('disabled')));

  const completeResult = validateDeviceListing(
    {
      ...incompleteDraft,
      condition: 'Foreign-Used',
      batchReference: 'AWB-NYC-77821',
      imeiOrSerial: '356789104839201',
    },
    state.platformConfig
  );
  assert.equal(completeResult.valid, true);
});

test('Unique reference generators produce compliant format IDs', () => {
  assert.match(generateOrderId(), /^UR-ORD-2026-\d{6}$/);
  assert.match(generateTransactionId(), /^UR-TXN-2026-\d{6}$/);
  assert.match(generatePickupOtp(), /^UR-PICK-\d{4}$/);
  assert.match(generateDisputeId(), /^UR-DSP-2026-\d{6}$/);
});

test('checkBlockingRestriction blocks blocking while an active transaction is under payment hold', () => {
  const mockOrders: any[] = [
    {
      id: 'ord-1',
      orderNumber: 'UR-ORD-2026-000104',
      buyerId: 'buyer-ayodele',
      listing: { sellerId: 'seller-prime' },
      fulfillmentStatus: 'Delivered_In_Inspection',
    },
    {
      id: 'ord-2',
      orderNumber: 'UR-ORD-2026-000102',
      buyerId: 'buyer-ayodele',
      listing: { sellerId: 'seller-past' },
      fulfillmentStatus: 'Completed',
    },
  ];

  const primeCheck = checkBlockingRestriction('buyer-ayodele', 'seller-prime', mockOrders);
  assert.equal(primeCheck.isRestricted, true);

  const pastCheck = checkBlockingRestriction('buyer-ayodele', 'seller-past', mockOrders);
  assert.equal(pastCheck.isRestricted, false);
});

test('toSimpleEnglish & sanitizeConditionText translate jargon cleanly', () => {
  const wifiOnly = toSimpleEnglish('Wi-Fi Only');
  assert.equal(wifiOnly.label, 'Works with Wi-Fi only, no SIM');

  const faceId = toSimpleEnglish('Face ID Failure');
  assert.equal(faceId.label, 'Face ID not working');

  const sanitized = sanitizeConditionText('Factory OEM Display with Zero Board Soldering');
  assert.equal(sanitized, 'Original screen with No main board repairs');
});

test('Transaction engine enforces delivery-triggered >=24h timer, dispute pause, privacy, and order snapshot immutability', () => {
  let state = createInitialMarketplaceState();
  const targetListing = state.listings.find((l) => l.id === 'dev-phone-ip13-demo')!;
  const chosenVariation = targetListing.variations![0];

  // 1. Checkout creates order, hold, conversation
  const checkoutRes = createOrderFromCheckout(state, {
    buyerId: 'buyer-user-1',
    buyerName: 'Ayodele Olayinka',
    buyerEmail: 'customer@usedright.demo',
    buyerPhone: '+2348038924192',
    listing: targetListing,
    selectedVariation: chosenVariation,
    deliveryMethod: 'usedright_delivery',
    deliveryFee: 5000,
    deliveryAddress: {
      fullName: 'Ayodele Olayinka',
      phone: '+2348038924192',
      street: '14 Admiralty Way',
      city: 'Lagos',
      state: 'Lagos',
    },
  });
  state = checkoutRes.state;
  const orderId = checkoutRes.order.id;

  // 2. Dispatch must NOT activate timer
  state = simulateDispatch(state, orderId);
  const dispatchedOrder = state.orders.find((o) => o.id === orderId)!;
  assert.equal(dispatchedOrder.fulfillmentStatus, 'In transit');
  const timerDuringTransit = advanceInspectionTimer(state, orderId, 3600);
  assert.equal(
    timerDuringTransit.orders.find((o) => o.id === orderId)!.inspectionRemainingSeconds,
    86400
  );

  // 3. Listing price edit must NOT change confirmed order total
  state = updateListingSafely(state, targetListing.id, { price: 325000 });
  assert.equal(state.listings.find((l) => l.id === targetListing.id)!.price, 325000);
  assert.equal(state.orders.find((o) => o.id === orderId)!.itemPrice, chosenVariation.price);

  // 4. Physical delivery activates inspection timer; dispute pauses it and freezes hold
  state = confirmPhysicalDeliveryOrReceipt(state, orderId, 'courier');
  state = advanceInspectionTimer(state, orderId, 3600);
  assert.equal(state.orders.find((o) => o.id === orderId)!.inspectionRemainingSeconds, 82800);

  const dispRes = openDisputeInChat(state, {
    orderId,
    conversationId: checkoutRes.conversationId,
    reason: 'Device has an undisclosed issue',
    description: 'Speaker volume is very low on calls.',
    requestedResolution: 'Full Refund to Customer',
  });
  state = dispRes.state;
  const dispute = dispRes.dispute!;
  assert.equal(state.orders.find((o) => o.id === orderId)!.disputePaused, true);
  assert.equal(state.paymentHolds.find((h) => h.orderId === orderId)!.status, 'Dispute Opened');

  // Timer stays paused while disputed
  const pausedAttempt = advanceInspectionTimer(state, orderId, 36000);
  assert.equal(pausedAttempt.orders.find((o) => o.id === orderId)!.inspectionRemainingSeconds, 82800);

  // 5. Admin joins with private note -> hidden from buyer/vendor, visible to admin
  state = adminJoinDisputeAndUpdate(state, {
    disputeId: dispute.id,
    adminName: 'Adaobi Nwosu',
    newStatus: 'Under Review',
    publicMessage: 'We have frozen payout release while checking speaker evidence.',
    internalNote: 'CONFIDENTIAL: Verify vendor audio QC batch.',
  });
  const updatedDispute = state.disputes.find((d) => d.id === dispute.id)!;
  assert.equal(getRoleSafeDisputeView(updatedDispute, 'buyer').internalNotes.length, 0);
  assert.equal(getRoleSafeDisputeView(updatedDispute, 'seller_approved').internalNotes.length, 0);
  assert.equal(getRoleSafeDisputeView(updatedDispute, 'admin').internalNotes.length, 1);

  // 6. Admin resolves with refund -> closes hold cleanly
  state = adminResolveDispute(state, {
    disputeId: dispute.id,
    adminName: 'Adaobi Nwosu',
    decision: 'refund_buyer',
    outcomeSummary: 'Full refund approved to customer.',
  });
  assert.equal(state.paymentHolds.find((h) => h.orderId === orderId)!.status, 'Refunded');
  assert.equal(state.orders.find((o) => o.id === orderId)!.fulfillmentStatus, 'Refunded');

  // 7. Admin settings enforce >=24h minimum floor
  state = configureAdminSettings(state, { inspectionHours: 12 });
  assert.equal(state.platformConfig.inspectionHours, 24);
});

import {
  buildFlagshipGradeOptions,
  calculateConfiguredTotal,
  getGradePrice,
} from './productConfig';
import {
  FLAGSHIP_SETUP_ACCESSORIES,
  IPHONE_15_PRO_MODELS,
} from '../data/flagshipIphone15Data';

test('PDP configurator computes Grade C / B / A prices, sold-out states, and accessory totals accurately', () => {
  const proMax = IPHONE_15_PRO_MODELS.find((m) => m.id === 'iphone-15-pro-max-256')!;
  assert.equal(getGradePrice(proMax.baseGradeCPrice, 'Grade C'), 850000);
  assert.equal(getGradePrice(proMax.baseGradeCPrice, 'Grade B'), 895000);
  assert.equal(getGradePrice(proMax.baseGradeCPrice, 'Grade A'), 940000);

  const whiteTitanium = proMax.colors.find((c) => c.name === 'White Titanium')!;
  const gradeOptions = buildFlagshipGradeOptions(proMax, whiteTitanium);
  const gradeA = gradeOptions.find((g) => g.grade === 'Grade A')!;
  const gradeC = gradeOptions.find((g) => g.grade === 'Grade C')!;

  assert.equal(gradeA.stock, 0);
  assert.equal(gradeC.batteryHealth, 82);
  assert.ok(gradeC.disclosedIssues.some((i) => i.label.includes('Face ID not working')));

  // Paid charger adds ₦18,000; Free Gift adds ₦0
  const totalWithBundle = calculateConfiguredTotal(895000, [
    FLAGSHIP_SETUP_ACCESSORIES.charger,
    FLAGSHIP_SETUP_ACCESSORIES.screenProtectorGift,
  ]);
  assert.equal(totalWithBundle, 913000);
});

test('Categories exclude Other Tech and rename Computer Accessories to Laptop Accessories', () => {
  assert.equal(
    DEFAULT_CATEGORIES.some((c) => (c.id as string) === 'other_tech' || c.label === 'Other Tech'),
    false
  );
  const laptopAcc = DEFAULT_CATEGORIES.find((c) => c.id === 'computer_accessories');
  assert.ok(laptopAcc);
  assert.equal(laptopAcc?.label, 'Laptop Accessories');
});

test('Catalog toolbar sorting, Naira price buckets, swatches, and Latest Deals filtering work accurately', () => {
  const state = createInitialMarketplaceState();
  assert.ok(RICH_NIGERIAN_CATALOG_ITEMS.length >= 10);

  // Under ₦300k bucket returns items strictly below ₦300,000
  const under300k = applyCatalogToolbarFilters(
    state.listings,
    { ...DEFAULT_CATALOG_TOOLBAR_FILTERS, priceBucket: 'under_300k', sortBy: 'price_asc' },
    state.platformConfig
  );
  assert.ok(under300k.length >= 4);
  assert.ok(under300k.every((item) => item.price < 300000));
  for (let i = 1; i < under300k.length; i += 1) {
    assert.ok(under300k[i].price >= under300k[i - 1].price);
  }

  // Deals first prioritizes DEAL OF THE WEEK / promo items
  const deals = applyCatalogToolbarFilters(
    state.listings,
    { ...DEFAULT_CATALOG_TOOLBAR_FILTERS, sortBy: 'deals_first' },
    state.platformConfig,
    { dealsOnly: true }
  );
  assert.ok(deals.length >= 4);
  assert.ok(deals.every((d) => isDealListing(d)));
  assert.equal(deals[0].promoBadge, 'DEAL OF THE WEEK');

  // Color + brand + storage filter matches iPhone 14 Pro Max Deep Purple 128GB
  const purple128 = applyCatalogToolbarFilters(
    state.listings,
    {
      ...DEFAULT_CATALOG_TOOLBAR_FILTERS,
      brand: 'Apple',
      color: 'Purple',
      storage: '128GB',
    },
    state.platformConfig
  );
  assert.ok(purple128.some((l) => l.id === 'ur-deal-ip14-promax-128'));
});

import { searchListingsWithQuickChip } from './marketplace';
import {
  buildGroupedListingFromBulkUnits,
  CENTRAL_PARENT_MODELS,
  createEmptyUnitDraft,
  reorderVendorListingSequence,
  validateBulkUnitMatrix,
} from './vendorBulk';
import { canRolePerformOrderAction } from './transactionEngine';

test('searchListingsWithQuickChip handles Deals ↗ quick search chip', () => {
  const state = createInitialMarketplaceState();
  const dealResults = searchListingsWithQuickChip(state.listings, 'Deals', state.platformConfig);
  assert.ok(dealResults.length >= 4);
  assert.ok(dealResults.every((d) => isDealListing(d)));
  assert.equal(dealResults[0].promoBadge, 'DEAL OF THE WEEK');
});

test('Vendor bulk matrix validates duplicate IMEIs, preserves per-unit pricing/faults, and supports storefront reordering', () => {
  const state = createInitialMarketplaceState();
  const vendor = state.vendors[0];
  const tpl = CENTRAL_PARENT_MODELS[0];

  const unit1 = {
    ...createEmptyUnitDraft(tpl, 0),
    storage: '128GB',
    color: 'Sierra Blue',
    grade: 'Grade A' as const,
    batteryHealth: 93,
    price: 455000,
    imeiOrSerial: '358811009911223',
  };
  const unit2 = {
    ...createEmptyUnitDraft(tpl, 1),
    storage: '256GB',
    color: 'Graphite',
    grade: 'Grade C' as const,
    batteryHealth: 81,
    price: 410000,
    disclosedFaults: ['Face ID not working'],
    imeiOrSerial: '358811009911224',
  };

  const parent = {
    category: tpl.category,
    brand: tpl.brand,
    model: tpl.model,
    modelYear: tpl.modelYear,
    yearMade: 2022,
    sourceCountry: 'United States',
    batchReference: 'US-BATCH-2026-041',
    overview: 'Two inspected units from clean US import manifest.',
    warrantyDays: 30,
  };

  // Duplicate IMEI should fail validation
  const dupCheck = validateBulkUnitMatrix(
    parent,
    [unit1, { ...unit2, imeiOrSerial: unit1.imeiOrSerial }],
    state.platformConfig
  );
  assert.equal(dupCheck.valid, false);
  assert.ok(dupCheck.errors.some((e) => e.includes('Duplicate IMEI')));

  // Clean units succeed and generate grouped listing with distinct variations
  const okCheck = validateBulkUnitMatrix(parent, [unit1, unit2], state.platformConfig);
  assert.equal(okCheck.valid, true);

  const grouped = buildGroupedListingFromBulkUnits(parent, [unit1, unit2], vendor, tpl);
  assert.equal(grouped.price, 410000);
  assert.equal(grouped.variations?.length, 2);
  assert.equal(grouped.totalStock, 2);
  assert.ok(grouped.disclosedFaults?.includes('Face ID not working'));

  // Storefront reordering persists displayOrder into public vendor catalog query
  const vendorItemsBefore = filterListings(
    state.listings,
    { vendorId: vendor.id },
    state.platformConfig
  );
  assert.ok(vendorItemsBefore.length >= 2);
  const firstId = vendorItemsBefore[0].id;
  const secondId = vendorItemsBefore[1].id;

  const reorderedAll = reorderVendorListingSequence(
    state.listings,
    vendor.id,
    secondId,
    firstId
  );
  const vendorItemsAfter = filterListings(
    reorderedAll,
    { vendorId: vendor.id },
    state.platformConfig
  );
  assert.equal(vendorItemsAfter[0].id, secondId);
});

test('Role-locked order guardrails prevent vendors from confirming customer receipt, starting inspection timer, or releasing escrow early', () => {
  assert.equal(canRolePerformOrderAction('vendor', 'accept_order', 'Order placed').allowed, true);
  assert.equal(
    canRolePerformOrderAction('vendor', 'confirm_customer_receipt', 'In transit').allowed,
    false
  );
  assert.equal(
    canRolePerformOrderAction('vendor', 'start_inspection_timer', 'In transit').allowed,
    false
  );
  assert.equal(
    canRolePerformOrderAction('vendor', 'release_escrow_early', 'Delivered_In_Inspection').allowed,
    false
  );

  // Buyer IS allowed to confirm receipt after dispatch or courier delivery scan
  assert.equal(
    canRolePerformOrderAction('buyer', 'confirm_customer_receipt', 'In transit').allowed,
    true
  );
  assert.equal(
    canRolePerformOrderAction('buyer', 'confirm_customer_receipt', 'Order placed').allowed,
    false
  );
});

import {
  buildComboBundleListing,
  DEMO_OTP_CODE,
  isValidNigerianPhone,
  NIGERIAN_BANKS,
  validateNigerianBankAccount,
  verifySimulatedOtp,
} from './marketplace';

test('Android brand filter isolates Samsung and Google Pixel phones cleanly without iPhones', () => {
  const state = createInitialMarketplaceState();
  const androidPhones = applyCatalogToolbarFilters(
    state.listings,
    { ...DEFAULT_CATALOG_TOOLBAR_FILTERS, brand: 'Android' },
    state.platformConfig,
    { category: 'phones' }
  );
  assert.ok(androidPhones.length >= 1);
  assert.ok(
    androidPhones.every(
      (item) =>
        item.brand !== 'Apple' &&
        ['Samsung', 'Google', 'Google Pixel', 'OnePlus', 'Xiaomi'].includes(item.brand)
    )
  );
});

test('searchListingsWithQuickChip resolves iPhone 16 and MacBook plus iPhone 16 exists in CENTRAL_PARENT_MODELS', () => {
  const state = createInitialMarketplaceState();
  const ip16Results = searchListingsWithQuickChip(state.listings, 'iPhone 16', state.platformConfig);
  assert.ok(ip16Results.some((l) => l.model.toLowerCase().includes('iphone 16')));
  const ip16Listing = ip16Results.find((l) => l.id === 'ur-deal-ip16-256');
  assert.ok(ip16Listing?.variations && ip16Listing.variations.length >= 2);
  assert.equal(ip16Listing?.variations?.[0].unitLabel, 'Unit #1');

  const macbookResults = searchListingsWithQuickChip(state.listings, 'MacBook', state.platformConfig);
  assert.ok(macbookResults.some((l) => l.title.toLowerCase().includes('macbook')));

  assert.ok(CENTRAL_PARENT_MODELS.some((m) => m.model.startsWith('iPhone 16')));

  // buildGroupedListingFromBulkUnits automatically tags Unit #1, Unit #2
  const tpl16 = CENTRAL_PARENT_MODELS.find((m) => m.model.startsWith('iPhone 16'))!;
  const grouped16 = buildGroupedListingFromBulkUnits(
    {
      category: tpl16.category,
      brand: tpl16.brand,
      model: tpl16.model,
      modelYear: tpl16.modelYear,
      yearMade: tpl16.modelYear,
      sourceCountry: 'United States',
      batchReference: 'US-BATCH-2026-099',
      overview: 'Clean US units',
      warrantyDays: 30,
    },
    [
      { ...createEmptyUnitDraft(tpl16, 0), price: 850000, imeiOrSerial: '351122334455661' },
      { ...createEmptyUnitDraft(tpl16, 1), price: 820000, imeiOrSerial: '351122334455662' },
    ],
    state.vendors[0],
    tpl16
  );
  assert.equal(grouped16.variations?.[0].unitLabel, 'Unit #1');
  assert.equal(grouped16.variations?.[1].unitLabel, 'Unit #2');
});

test('buildComboBundleListing validates bundle discount in Naira and generates bundleItems', () => {
  const state = createInitialMarketplaceState();
  const vendor = state.vendors[0];
  const primary = state.listings.find((l) => l.category === 'phones')!;
  const companion = state.listings.find((l) => l.id !== primary.id && l.category === 'audio')!;

  const tooHigh = buildComboBundleListing({
    vendor,
    primaryListing: primary,
    secondaryListings: [companion],
    bundlePrice: primary.price + companion.price + 10000,
    promoTag: 'COMBO DEAL',
  });
  assert.equal(tooHigh.valid, false);
  assert.ok(tooHigh.error?.includes('must be lower'));

  const validPrice = primary.price + companion.price - 30000;
  const ok = buildComboBundleListing({
    vendor,
    primaryListing: primary,
    secondaryListings: [companion],
    bundlePrice: validPrice,
    promoTag: 'GIFT PACK',
  });
  assert.equal(ok.valid, true);
  assert.equal(ok.savings, 30000);
  assert.equal(ok.listing?.promoBadge, 'GIFT PACK');
  assert.equal(ok.listing?.bundleItems?.length, 2);
});

test('validateNigerianBankAccount enforces 10-digit NUBAN and Quick Phone + 4-digit OTP checks work', () => {
  const badBank = validateNigerianBankAccount({
    bankName: NIGERIAN_BANKS[0],
    accountNumber: '12345',
    accountName: 'Prime Mobile Tech Ltd',
  });
  assert.equal(badBank.valid, false);
  assert.ok(badBank.errors.some((e) => e.includes('10 digits')));

  const goodBank = validateNigerianBankAccount({
    bankName: NIGERIAN_BANKS[1],
    accountNumber: '0123456789',
    accountName: 'Prime Mobile Tech Ltd',
  });
  assert.equal(goodBank.valid, true);

  assert.equal(isValidNigerianPhone('08031234567'), true);
  assert.equal(isValidNigerianPhone('+2348031234567'), true);
  assert.equal(isValidNigerianPhone('12345'), false);

  assert.equal(verifySimulatedOtp(DEMO_OTP_CODE), true);
  assert.equal(verifySimulatedOtp('0000'), false);
});

import {
  buildListingsFromBulkAccessories,
  buildUnifiedActivityHistory,
  computeVendorFinancialLedger,
  createEmptyAccessoryRow,
  validateBulkAccessoryRows,
} from './vendorOperations';

test('Vendor bulk accessory multi-upload validates rows, routes laptop sleeves to computer_accessories, and publishes New accessories visibly', () => {
  const state = createInitialMarketplaceState();
  const vendor = state.vendors[0];

  const badRow = { ...createEmptyAccessoryRow(0), title: 'ab', price: 200 };
  const badCheck = validateBulkAccessoryRows([badRow]);
  assert.equal(badCheck.valid, false);
  assert.ok(badCheck.errors.some((e) => e.includes('title')));
  assert.ok(badCheck.errors.some((e) => e.includes('₦500')));

  const chargerRow = {
    ...createEmptyAccessoryRow(0),
    accessoryType: 'Charger' as const,
    title: 'Anker 20W USB-C Fast Block',
    compatibleModels: 'iPhone 13–16, iPad',
    price: 18000,
    stockQuantity: 12,
    condition: 'New' as const,
  };
  const sleeveRow = {
    ...createEmptyAccessoryRow(1),
    accessoryType: 'Laptop Sleeve' as const,
    title: 'Tomtoc 14-inch MacBook Sleeve',
    compatibleModels: 'MacBook Pro 14, Dell XPS 13',
    price: 25000,
    stockQuantity: 4,
    condition: 'Foreign-Used' as const,
  };

  assert.equal(validateBulkAccessoryRows([chargerRow, sleeveRow]).valid, true);
  const created = buildListingsFromBulkAccessories([chargerRow, sleeveRow], vendor);
  assert.equal(created.length, 2);
  assert.equal(created[0].category, 'accessories');
  assert.equal(created[0].condition, 'Brand-New');
  assert.equal(created[0].stockQuantity, 12);
  assert.equal(created[1].category, 'computer_accessories');
  assert.equal(created[1].condition, 'Foreign-Used');

  // New accessory should remain visible on storefront even when brandNewEnabled is false for devices
  const visibleAccessories = filterListings(created, {}, state.platformConfig);
  assert.equal(visibleAccessories.length, 2);
});

test('computeVendorFinancialLedger separates Total Revenue, Active Escrow, Ready for Payout, and Settled ledger rows', () => {
  const holds: any[] = [
    {
      id: 'h-settled',
      orderId: 'o-1',
      orderNumber: 'UR-ORD-2026-000101',
      transactionNumber: 'UR-TXN-2026-000101',
      vendorId: 'v-1',
      vendorNumber: 'UR-VND-1',
      vendorName: 'Prime Mobile',
      buyerId: 'b-1',
      buyerName: 'Ayodele',
      deviceTitle: 'iPhone 14 Pro',
      deviceImage: '',
      grossAmount: 500000,
      platformFeeBuyer: 5000,
      platformFeeVendor: 5000,
      netVendorPayout: 495000,
      paymentReceivedAt: '10:00 AM',
      inspectionHours: 24,
      remainingSeconds: 0,
      status: 'Settled',
      isDisputed: false,
    },
    {
      id: 'h-inspection',
      orderId: 'o-2',
      orderNumber: 'UR-ORD-2026-000102',
      transactionNumber: 'UR-TXN-2026-000102',
      vendorId: 'v-1',
      vendorNumber: 'UR-VND-1',
      vendorName: 'Prime Mobile',
      buyerId: 'b-1',
      buyerName: 'Ayodele',
      deviceTitle: 'iPhone 15',
      deviceImage: '',
      grossAmount: 600000,
      platformFeeBuyer: 6000,
      platformFeeVendor: 6000,
      netVendorPayout: 594000,
      paymentReceivedAt: '11:00 AM',
      deliveredAt: '12:00 PM',
      inspectionHours: 24,
      remainingSeconds: 43200,
      status: 'Inspection Period Active',
      isDisputed: false,
    },
    {
      id: 'h-ready',
      orderId: 'o-3',
      orderNumber: 'UR-ORD-2026-000103',
      transactionNumber: 'UR-TXN-2026-000103',
      vendorId: 'v-1',
      vendorNumber: 'UR-VND-1',
      vendorName: 'Prime Mobile',
      buyerId: 'b-1',
      buyerName: 'Ayodele',
      deviceTitle: 'AirPods Pro 2',
      deviceImage: '',
      grossAmount: 100000,
      platformFeeBuyer: 1000,
      platformFeeVendor: 1000,
      netVendorPayout: 99000,
      paymentReceivedAt: '09:00 AM',
      deliveredAt: '10:00 AM',
      inspectionHours: 24,
      remainingSeconds: 0,
      status: 'Payment Approved for Release',
      isDisputed: false,
    },
    {
      id: 'h-refund',
      orderId: 'o-4',
      orderNumber: 'UR-ORD-2026-000104',
      transactionNumber: 'UR-TXN-2026-000104',
      vendorId: 'v-1',
      vendorNumber: 'UR-VND-1',
      vendorName: 'Prime Mobile',
      buyerId: 'b-1',
      buyerName: 'Ayodele',
      deviceTitle: 'Galaxy S23',
      deviceImage: '',
      grossAmount: 300000,
      platformFeeBuyer: 3000,
      platformFeeVendor: 3000,
      netVendorPayout: 297000,
      paymentReceivedAt: '08:00 AM',
      inspectionHours: 24,
      remainingSeconds: 0,
      status: 'Refunded',
      isDisputed: false,
    },
  ];

  const ledger = computeVendorFinancialLedger(holds);
  assert.equal(ledger.totalRevenue, 1200000);
  assert.equal(ledger.activeEscrowAmount, 594000);
  assert.equal(ledger.readyForPayoutAmount, 99000);
  assert.equal(ledger.settledAmount, 495000);
  assert.equal(ledger.rows.length, 4);
  assert.equal(ledger.rows[2].disbursementStatus, 'Ready for Payout');
  assert.equal(ledger.rows[3].disbursementStatus, 'Refunded to Customer');
});

test('buildUnifiedActivityHistory aggregates orders, price edits, chat logs, and dispute resolutions', () => {
  let state = createInitialMarketplaceState();
  const target = state.listings[0];
  state = updateListingSafely(state, target.id, { price: target.price - 10000 }, 'Weekend drop');

  const activity = buildUnifiedActivityHistory({
    role: 'seller_approved',
    orders: state.orders,
    listings: state.listings,
    conversations: state.conversations,
    disputes: state.disputes,
    auditLog: state.auditLog,
  });

  assert.ok(activity.some((a) => a.category === 'orders'));
  assert.ok(activity.some((a) => a.category === 'price_edits'));
  assert.ok(activity.some((a) => a.category === 'chats'));
  assert.ok(activity.some((a) => a.category === 'disputes'));
});

import {
  enrichListingsWithVendorState,
  getListingVendorState,
  getShortStateLabel,
  NIGERIAN_COMMERCIAL_HUBS,
  normalizeNigerianState,
} from './nigerianStates';

test('Nigerian commercial hubs cover all 10 major states and normalize cleanly', () => {
  assert.equal(NIGERIAN_COMMERCIAL_HUBS.length, 10);
  assert.equal(normalizeNigerianState('Lagos State (Computer Village / Ikeja / Lekki)'), 'Lagos State');
  assert.equal(normalizeNigerianState('abuja'), 'Abuja (FCT)');
  assert.equal(normalizeNigerianState('Rivers State (Port Harcourt)'), 'Rivers State');
  assert.equal(getShortStateLabel('Abuja (FCT)'), 'Abuja');
  assert.equal(getShortStateLabel('Lagos State'), 'Lagos');
  assert.equal(getShortStateLabel('all'), 'All Nigeria');
});

test('Vendor listings dynamically inherit vendor.state and filterListings filters by Nigerian state', () => {
  const state = createInitialMarketplaceState();
  const abujaListings = filterListings(
    state.listings,
    { locationState: 'Abuja (FCT)' },
    state.platformConfig,
    state.vendors
  );
  assert.ok(abujaListings.length > 0);
  assert.ok(
    abujaListings.every(
      (item) => getListingVendorState(item, state.vendors) === 'Abuja (FCT)'
    )
  );

  // Updating vendor-1 from Lagos State to Rivers State immediately updates its listings
  const updatedVendors = state.vendors.map((v) =>
    v.id === 'vendor-1' ? { ...v, state: 'Rivers State' } : v
  );
  const enriched = enrichListingsWithVendorState(state.listings, updatedVendors);
  const riversListings = applyCatalogToolbarFilters(
    enriched,
    { ...DEFAULT_CATALOG_TOOLBAR_FILTERS, locationState: 'Rivers State' },
    state.platformConfig,
    undefined,
    updatedVendors
  );
  assert.ok(riversListings.some((l) => l.sellerId === 'vendor-1'));
  assert.ok(riversListings.some((l) => l.sellerId === 'vendor-swiftphones'));
});

test('Multi-vendor checkout applies fixed ₦3,000 per distinct vendor, excludes delivery from fee %, and sets pickup to ₦0', () => {
  const state = createInitialMarketplaceState();
  const vendor1Items = state.listings.filter((l) => l.sellerId === 'vendor-1');
  const vendor2Items = state.listings.filter((l) => l.sellerId !== 'vendor-1');
  assert.ok(vendor1Items.length >= 2);
  assert.ok(vendor2Items.length >= 1);

  const twoSameVendorOneOther: any[] = [
    { id: 'c-1', listing: vendor1Items[0], quantity: 1 },
    { id: 'c-2', listing: vendor1Items[1], quantity: 1 },
    { id: 'c-3', listing: vendor2Items[0], quantity: 1 },
  ];

  const deliveryQuote = calculateMultiVendorCheckoutQuote({
    cartItems: twoSameVendorOneOther,
    deliveryMethod: 'usedright_delivery',
    listings: state.listings,
    vendors: state.vendors,
    feeConfig: state.feeConfig,
    deliveryConfig: state.deliveryConfig,
  });

  // 2 distinct vendors -> 2 * ₦3,000 = ₦6,000 fixed delivery fee even with 3 items
  assert.equal(deliveryQuote.vendorCount, 2);
  assert.equal(deliveryQuote.totalItemsCount, 3);
  assert.equal(deliveryQuote.deliveryFeeTotal, DEFAULT_FIXED_DELIVERY_FEE * 2);
  assert.equal(deliveryQuote.customerFeeRate, MAX_CUSTOMER_FEE_RATE);
  assert.equal(
    deliveryQuote.customer_platform_service_fee,
    Math.round(deliveryQuote.subtotal * MAX_CUSTOMER_FEE_RATE)
  );
  assert.equal(
    deliveryQuote.totalAmount,
    deliveryQuote.subtotal +
      deliveryQuote.customer_platform_service_fee +
      deliveryQuote.deliveryFeeTotal
  );

  // In-Store Pickup sets delivery fee to ₦0
  const pickupQuote = calculateMultiVendorCheckoutQuote({
    cartItems: twoSameVendorOneOther,
    deliveryMethod: 'physical_pickup',
    listings: state.listings,
    vendors: state.vendors,
    feeConfig: state.feeConfig,
    deliveryConfig: state.deliveryConfig,
  });
  assert.equal(pickupQuote.deliveryFeeTotal, 0);
  assert.equal(
    pickupQuote.customer_platform_service_fee,
    deliveryQuote.customer_platform_service_fee
  );
});

test('Multi-vendor order creation splits 1 parent into N independent sub-orders, respects idempotency, and secures OTP handover', () => {
  let state = createInitialMarketplaceState();
  const v1 = state.listings.find((l) => l.sellerId === 'vendor-1')!;
  const v2 = state.listings.find((l) => l.sellerId !== 'vendor-1')!;
  const idempKey = 'idemp-test-001';

  const result = createMultiVendorOrdersFromCheckout(state, {
    buyerId: 'buyer-user-1',
    buyerName: 'Ayodele Olayinka',
    buyerEmail: 'customer@usedright.demo',
    buyerPhone: '08038924192',
    cartItems: [
      { id: 'c-v1', listing: v1, quantity: 1 },
      { id: 'c-v2', listing: v2, quantity: 1 },
    ],
    deliveryMethod: 'usedright_delivery',
    idempotencyKey: idempKey,
    deliveryAddress: {
      fullName: 'Ayodele Olayinka',
      phone: '08038924192',
      street: '14 Admiralty Way',
      city: 'Lekki',
      state: 'Lagos State',
    },
  });

  state = result.state;
  assert.equal(result.parentOrder.vendorCount, 2);
  assert.equal(result.childOrders.length, 2);
  assert.equal(
    result.childOrders.reduce((s, o) => s + o.totalAmount, 0),
    result.parentOrder.totalPaid
  );

  // Idempotent retry must not create duplicate orders
  const retry = createMultiVendorOrdersFromCheckout(state, {
    buyerId: 'buyer-user-1',
    buyerName: 'Ayodele Olayinka',
    buyerEmail: 'customer@usedright.demo',
    buyerPhone: '08038924192',
    cartItems: [
      { id: 'c-v1', listing: v1, quantity: 1 },
      { id: 'c-v2', listing: v2, quantity: 1 },
    ],
    deliveryMethod: 'usedright_delivery',
    idempotencyKey: idempKey,
    deliveryAddress: {
      fullName: 'Ayodele Olayinka',
      phone: '08038924192',
      street: '14 Admiralty Way',
      city: 'Lekki',
      state: 'Lagos State',
    },
  });
  assert.equal(retry.duplicateSkipped, true);
  assert.equal(retry.state.orders.length, state.orders.length);

  // Vendor arranges dispatch -> generates confidential OTP distinct from tracking/order ref
  const subOrder = result.childOrders[0];
  const dispatchRes = vendorArrangeDispatch(state, {
    orderId: subOrder.id,
    dispatcherOrCourierName: 'Gokada Express Rider (Kunle)',
    dispatcherPhone: '08091112233',
    dispatchReference: 'GKD-88912',
    expectedDeliveryWindow: 'Same day (4–6 PM)',
  });
  state = dispatchRes.state;
  const otp = dispatchRes.verificationCode!;
  assert.ok(otp && otp.length >= 6);
  assert.notEqual(otp, subOrder.orderNumber);
  assert.notEqual(otp, 'GKD-88912');

  // Wrong vendor cannot verify OTP
  const wrongVendorRes = verifyDeliveryCodeAndStartInspection(state, {
    orderId: subOrder.id,
    enteredCode: otp,
    actorVendorId: 'vendor-other-unauthorized',
  });
  assert.equal(wrongVendorRes.verified, false);
  assert.match(wrongVendorRes.error || '', /Unauthorized/i);

  // Wrong code triggers brute-force countdown
  const badCodeRes = verifyDeliveryCodeAndStartInspection(state, {
    orderId: subOrder.id,
    enteredCode: 'BAD000',
    actorVendorId: subOrder.vendorId,
  });
  state = badCodeRes.state;
  assert.equal(badCodeRes.verified, false);
  assert.equal(badCodeRes.remainingAttempts, 4);

  // Valid code transitions order to Delivered_In_Inspection and cannot be reused
  const okCodeRes = verifyDeliveryCodeAndStartInspection(state, {
    orderId: subOrder.id,
    enteredCode: otp,
    actorVendorId: subOrder.vendorId,
  });
  state = okCodeRes.state;
  assert.equal(okCodeRes.verified, true);
  assert.equal(
    state.orders.find((o) => o.id === subOrder.id)?.fulfillmentStatus,
    'Delivered_In_Inspection'
  );

  const reuseRes = verifyDeliveryCodeAndStartInspection(state, {
    orderId: subOrder.id,
    enteredCode: otp,
    actorVendorId: subOrder.vendorId,
  });
  assert.equal(reuseRes.verified, false);
  assert.match(reuseRes.error || '', /already been redeemed/i);
});

test('Platform fee configuration enforces 0.7% customer and 1.0% vendor caps and calculates refund reversals accurately', () => {
  let state = createInitialMarketplaceState();

  // Attempt exceeding customer cap (0.8% > 0.7%)
  const overCustomer = adminUpdatePlatformFees(state, {
    customerFeeRate: 0.008,
    vendorFeeRate: 0.01,
    reason: 'Invalid increase test',
    adminName: 'Adaobi Nwosu',
  });
  assert.ok(overCustomer.errors.length > 0);
  assert.ok(overCustomer.errors.some((e) => e.includes('0.7%')));

  // Attempt exceeding vendor cap (1.2% > 1.0%)
  const overVendor = adminUpdatePlatformFees(state, {
    customerFeeRate: 0.005,
    vendorFeeRate: 0.012,
    reason: 'Invalid vendor cap test',
    adminName: 'Adaobi Nwosu',
  });
  assert.ok(overVendor.errors.length > 0);
  assert.ok(overVendor.errors.some((e) => e.includes('1.0%')));

  // Valid reduction to promo rate 0.5% customer / 0.8% vendor
  const validUpdate = adminUpdatePlatformFees(state, {
    customerFeeRate: 0.005,
    vendorFeeRate: 0.008,
    promotionalLabel: 'Lagos Tech Week Promo',
    reason: 'Promo week',
    adminName: 'Adaobi Nwosu',
  });
  assert.equal(validUpdate.errors.length, 0);
  assert.equal(validUpdate.state.feeConfig?.customerFeeRate, 0.005);
  assert.equal(validUpdate.state.feeConfig?.vendorFeeRate, 0.008);
  assert.equal(MAX_CUSTOMER_FEE_RATE, 0.007);
  assert.equal(MAX_VENDOR_FEE_RATE, 0.01);

  const fullRefund = calculateRefundFeeAdjustment({
    originalEligibleSubtotal: 200000,
    refundProductAmount: 200000,
    customerFeeAmount: 1400,
    vendorFeeAmount: 2000,
  });
  assert.equal(fullRefund.ratio, 1);
  assert.equal(fullRefund.customerFeeRefund, 1400);
  assert.equal(fullRefund.vendorFeeCredit, 2000);

  const partialRefund = calculateRefundFeeAdjustment({
    originalEligibleSubtotal: 200000,
    refundProductAmount: 100000,
    customerFeeAmount: 1400,
    vendorFeeAmount: 2000,
  });
  assert.equal(partialRefund.ratio, 0.5);
  assert.equal(partialRefund.customerFeeRefund, 700);
  assert.equal(partialRefund.vendorFeeCredit, 1000);
});

test('Policy Centre seeds 22 policies, 15+1 vendor declarations, and supports versioned publishing', () => {
  assert.equal(INITIAL_POLICIES.length, 22);
  assert.equal(VENDOR_REGISTRATION_DECLARATIONS.length, 15);

  let state = createInitialMarketplaceState();
  assert.equal(state.policies?.length, 22);

  const vendorTerms = state.policies!.find((p) => p.slug === 'vendor-agreement')!;
  state = adminSavePolicyVersion(state, {
    policyId: vendorTerms.id,
    title: vendorTerms.title,
    summary: vendorTerms.summary,
    version: '2.0',
    status: 'Published',
    effectiveDate: '2026-12-01',
    changeSummary: 'Updated OTP handover clause',
    requiresVendorReacceptance: true,
    sections: vendorTerms.sections,
    adminName: 'Adaobi Nwosu',
  });

  const updatedPolicy = state.policies!.find((p) => p.slug === 'vendor-agreement')!;
  assert.equal(updatedPolicy.currentVersion, '2.0');
  assert.equal(updatedPolicy.requiresVendorReacceptance, true);
  assert.ok(updatedPolicy.versions.length >= 2);

  state = recordVendorAgreementAcceptance(state, {
    vendorId: 'vendor-1',
    vendorName: 'Prime Mobile Tech Ltd',
    agreementVersion: '2.0',
    policyVersion: '2.0',
    declarationsAccepted: VENDOR_REGISTRATION_DECLARATIONS.map(() => true),
    finalConsentAccepted: true,
  });
  assert.equal(
    state.vendors.find((v) => v.id === 'vendor-1')?.agreementAcceptedVersion,
    '2.0'
  );
  assert.ok((state.vendorAcceptances || []).some((r) => r.agreementVersion === '2.0'));
});

import {
  generateDeliveryVerificationCode,
  normalizeSocialUrl,
  searchVendorsAndStores,
} from './marketplace';
import {
  adminModerateFlag,
  adminReviewVendorVerification,
  adminUpdateWarrantyClaim,
  adminUpdateWarrantyConfig,
  completeOrderSettlement,
  flagOffPlatformAttempt,
  markDeliveryAttemptFailed,
  resendDeliveryVerificationCode,
  setOrderAlternativeRecipient,
  submitWarrantyClaim,
  toggleFollowVendor,
  vendorRespondWarrantyClaim,
} from './transactionEngine';
import {
  APPROVED_DISPUTE_REASONS,
  calculateThreeMonthWarrantyDates,
  isWarrantyActive,
  MAX_CHAT_IMAGE_BYTES,
  MAX_CHAT_VIDEO_BYTES,
  validateAttachmentUpload,
} from './warranty';

test('6-digit numeric Delivery PIN enforces resend, 5-attempt lockout, alternative recipient, and failed attempt logging', () => {
  const generatedPin = generateDeliveryVerificationCode();
  assert.match(generatedPin, /^\d{6}$/);

  let state = createInitialMarketplaceState();
  const targetListing = state.listings.find((l) => l.sellerId === 'vendor-1')!;
  const created = createMultiVendorOrdersFromCheckout(state, {
    buyerId: 'buyer-user-1',
    buyerName: 'Ayodele Olayinka',
    buyerEmail: 'customer@usedright.demo',
    buyerPhone: '08038924192',
    cartItems: [{ id: 'c-pin-1', listing: targetListing, quantity: 1 }],
    deliveryMethod: 'usedright_delivery',
    deliveryAddress: {
      fullName: 'Ayodele Olayinka',
      phone: '08038924192',
      street: '14 Admiralty Way',
      city: 'Lekki',
      state: 'Lagos State',
    },
  });
  state = created.state;
  const order = created.childOrders[0];

  const dispatchRes = vendorArrangeDispatch(state, {
    orderId: order.id,
    dispatcherOrCourierName: 'Kunle Express',
    dispatcherPhone: '08091112233',
    dispatchReference: 'GKD-77123',
    expectedDeliveryWindow: 'Today 3–6 PM',
  });
  state = dispatchRes.state;
  assert.match(dispatchRes.verificationCode || '', /^\d{6}$/);

  // Buyer authorizes alternative recipient
  const altRes = setOrderAlternativeRecipient(state, {
    orderId: order.id,
    buyerId: 'buyer-user-1',
    name: 'Tolu Olayinka',
    phone: '08023334455',
    relationship: 'Spouse',
    note: 'Leave at reception desk',
  });
  assert.equal(altRes.error, undefined);
  state = altRes.state;
  assert.equal(
    state.orders.find((o) => o.id === order.id)?.alternativeRecipient?.name,
    'Tolu Olayinka'
  );

  // Vendor logs failed delivery attempt
  const failedRes = markDeliveryAttemptFailed(state, {
    orderId: order.id,
    actorVendorId: 'vendor-1',
    reason: 'Gate closed, buyer requested next day delivery',
    rescheduledWindow: 'Tomorrow 10 AM – 2 PM',
  });
  assert.equal(failedRes.error, undefined);
  state = failedRes.state;
  assert.match(
    state.orders.find((o) => o.id === order.id)?.deliveryAttemptFailedReason || '',
    /Gate closed/
  );

  // 5 consecutive failed PIN attempts lock the PIN
  for (let i = 0; i < 5; i += 1) {
    const bad = verifyDeliveryCodeAndStartInspection(state, {
      orderId: order.id,
      enteredCode: '000000',
      actorVendorId: 'vendor-1',
    });
    state = bad.state;
    assert.equal(bad.verified, false);
  }
  const lockedAttempt = verifyDeliveryCodeAndStartInspection(state, {
    orderId: order.id,
    enteredCode: dispatchRes.verificationCode!,
    actorVendorId: 'vendor-1',
  });
  assert.equal(lockedAttempt.verified, false);
  assert.match(lockedAttempt.error || '', /locked|maximum failed/i);

  // Resending generates a new 6-digit PIN and resets lockout
  const resend = resendDeliveryVerificationCode(state, {
    orderId: order.id,
    buyerId: 'buyer-user-1',
  });
  assert.equal(resend.error, undefined);
  assert.match(resend.code || '', /^\d{6}$/);
  state = resend.state;

  const okVerify = verifyDeliveryCodeAndStartInspection(state, {
    orderId: order.id,
    enteredCode: resend.code!,
    actorVendorId: 'vendor-1',
  });
  assert.equal(okVerify.verified, true);
  state = okVerify.state;
  const verifiedOrder = state.orders.find((o) => o.id === order.id)!;
  assert.equal(verifiedOrder.fulfillmentStatus, 'Delivered_In_Inspection');
  assert.ok(verifiedOrder.warranty);
  assert.equal(verifiedOrder.warranty?.status, 'Active');
  assert.equal(verifiedOrder.warranty?.durationMonths, 3);
});

test('3-month calendar warranty clamping, post-settlement claims preserving settled escrow, and admin warranty policy updates', () => {
  // Month-end edge case: Nov 30 + 3 months clamps to Feb 28 (non-leap year)
  const clamped = calculateThreeMonthWarrantyDates('2026-11-30T10:00:00.000Z', 3);
  assert.equal(clamped.expiryDate.slice(0, 10), '2027-02-28');

  let state = createInitialMarketplaceState();
  const targetListing = state.listings.find((l) => l.sellerId === 'vendor-1')!;
  const created = createMultiVendorOrdersFromCheckout(state, {
    buyerId: 'buyer-user-1',
    buyerName: 'Ayodele Olayinka',
    buyerEmail: 'customer@usedright.demo',
    buyerPhone: '08038924192',
    cartItems: [{ id: 'c-war-1', listing: targetListing, quantity: 1 }],
    deliveryMethod: 'usedright_delivery',
    deliveryAddress: {
      fullName: 'Ayodele Olayinka',
      phone: '08038924192',
      street: '14 Admiralty Way',
      city: 'Lekki',
      state: 'Lagos State',
    },
  });
  state = created.state;
  const orderId = created.childOrders[0].id;
  const dRes = vendorArrangeDispatch(state, {
    orderId,
    dispatcherOrCourierName: 'Prime Rider',
    dispatchReference: 'PRM-991',
    expectedDeliveryWindow: 'Today',
  });
  state = dRes.state;
  state = verifyDeliveryCodeAndStartInspection(state, {
    orderId,
    enteredCode: dRes.verificationCode!,
    actorVendorId: 'vendor-1',
  }).state;

  // Settle escrow first
  state = completeOrderSettlement(state, orderId, 'Buyer satisfied at inspection');
  assert.equal(state.paymentHolds.find((h) => h.orderId === orderId)?.status, 'Settled');
  assert.equal(isWarrantyActive(state.orders.find((o) => o.id === orderId)!.warranty), true);

  // Submit 3-month warranty claim AFTER settlement -> hold stays Settled
  const claimRes = submitWarrantyClaim(state, {
    orderId,
    buyerId: 'buyer-user-1',
    buyerName: 'Ayodele Olayinka',
    issueCategory: 'Battery or charging failure',
    description: 'Battery drops from 50% to 0% abruptly during video playback.',
    attachmentNames: ['battery_drain.mp4'],
  });
  assert.equal(claimRes.error, undefined);
  assert.ok(claimRes.claim);
  state = claimRes.state;
  assert.equal(state.paymentHolds.find((h) => h.orderId === orderId)?.status, 'Settled');

  // Vendor proposes Repair
  const vResp = vendorRespondWarrantyClaim(state, {
    claimId: claimRes.claim!.id,
    vendorId: 'vendor-1',
    vendorName: 'Prime Mobile Store',
    proposedRemedy: 'Repair',
    vendorResponse: 'Drop off at Ikeja hub for OEM battery swap at no charge.',
    nextStatus: 'Repair / Remedy Proposed',
  });
  assert.equal(vResp.error, undefined);
  state = vResp.state;
  assert.equal(
    state.warrantyClaims?.find((c) => c.id === claimRes.claim!.id)?.proposedRemedy,
    'Repair'
  );

  // Admin resolves claim & updates global policy
  state = adminUpdateWarrantyClaim(state, {
    claimId: claimRes.claim!.id,
    adminName: 'Adaobi Nwosu',
    status: 'Resolved',
    resolutionSummary: 'Battery replaced cleanly.',
  });
  assert.equal(
    state.warrantyClaims?.find((c) => c.id === claimRes.claim!.id)?.status,
    'Resolved'
  );

  state = adminUpdateWarrantyConfig(state, {
    defaultDurationMonths: 6,
    claimResponseSlaHours: 24,
    adminName: 'Adaobi Nwosu',
  });
  assert.equal(state.warrantyConfig?.defaultDurationMonths, 6);
  assert.equal(state.warrantyConfig?.claimResponseSlaHours, 24);
});

test('3-tier off-platform scanner blocks HIGH risk payment bypass and moderation restricts offending accounts', () => {
  const safe = scanMessageForDisallowedContent('Can this MacBook run Xcode smoothly?');
  assert.equal(safe.isSafe, true);
  assert.equal(safe.riskLevel, 'LOW');
  assert.equal(safe.shouldBlock, false);

  const highRisk = scanMessageForDisallowedContent(
    'Transfer directly to 0123456789 OPay outside UsedRight to get discount'
  );
  assert.equal(highRisk.isSafe, false);
  assert.equal(highRisk.riskLevel, 'HIGH');
  assert.equal(highRisk.shouldBlock, true);
  assert.ok(APPROVED_DISPUTE_REASONS.includes('Device not working as advertised'));

  let state = createInitialMarketplaceState();
  const flagged = flagOffPlatformAttempt(state, {
    userId: 'buyer-user-1',
    userName: 'Ayodele Olayinka',
    userRole: 'buyer',
    orderId: state.orders[0]?.id,
    conversationId: state.conversations[0]?.id,
    contentType: 'chat_text',
    flaggedContent: 'Pay directly to 0123456789 OPay',
    triggers: highRisk.triggers,
    riskLevel: highRisk.riskLevel,
  });
  state = flagged.state;
  assert.equal(flagged.flag.riskLevel, 'HIGH');

  state = adminModerateFlag(state, {
    flagId: flagged.flag.id,
    action: 'restrict_messaging',
    adminName: 'Adaobi Nwosu',
    note: 'Blocked for off-platform bank solicitation.',
  });
  assert.ok((state.restrictedMessagingUserIds || []).includes('buyer-user-1'));
});

test('Store search, permanent Vendor ID (U-XXXX), Follow Store, social URL normalization, attachments, and admin vendor verification work accurately', () => {
  const state = createInitialMarketplaceState();

  // Permanent Vendor ID exact match
  const byId = searchVendorsAndStores(state.vendors, state.listings, 'U-0045', {
    platformConfig: state.platformConfig,
  });
  assert.ok(byId.length >= 1);
  assert.equal(byId[0].vendor.vendorNumber, 'U-0045');
  assert.equal(byId[0].matchType, 'id');

  // Partial store name fuzzy match
  const byName = searchVendorsAndStores(state.vendors, state.listings, 'Prime Mobile', {
    verifiedOnly: true,
    platformConfig: state.platformConfig,
  });
  assert.ok(byName.some((r) => r.vendor.id === 'vendor-1'));

  // Social URL normalization
  assert.equal(normalizeSocialUrl('Instagram', '@primemobile_ng'), 'https://instagram.com/primemobile_ng');
  assert.equal(normalizeSocialUrl('TikTok', 'swiftphones'), 'https://tiktok.com/@swiftphones');

  // Attachment validation enforces MIME & 8MB / 25MB bounds
  assert.equal(
    validateAttachmentUpload({
      fileName: 'unboxing.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: MAX_CHAT_IMAGE_BYTES + 10,
    }).valid,
    false
  );
  assert.equal(
    validateAttachmentUpload({
      fileName: 'packaging.mp4',
      mimeType: 'video/mp4',
      sizeBytes: MAX_CHAT_VIDEO_BYTES - 1000,
    }).valid,
    true
  );
  assert.equal(
    validateAttachmentUpload({
      fileName: 'malware.exe',
      mimeType: 'application/x-msdownload',
      sizeBytes: 1024,
    }).valid,
    false
  );

  // Follow / unfollow toggles persisted ID & followerCount
  const follow1 = toggleFollowVendor(state, 'vendor-2');
  assert.equal(follow1.isFollowing, true);
  assert.ok((follow1.state.followedVendorIds || []).includes('vendor-2'));
  const follow2 = toggleFollowVendor(follow1.state, 'vendor-2');
  assert.equal(follow2.isFollowing, false);
  assert.equal((follow2.state.followedVendorIds || []).includes('vendor-2'), false);

  // Admin splits Identity vs Social verification review cleanly
  const verifiedState = adminReviewVendorVerification(state, {
    vendorId: 'pending-seller',
    decision: 'Needs Info',
    identityStatus: 'Approved',
    socialStatus: 'Needs Info',
    notes: 'Second Instagram link appears private.',
    adminName: 'Adaobi Nwosu',
  });
  assert.equal(verifiedState.pendingSellerState.socialVerificationStatus, 'Needs Info');
});


