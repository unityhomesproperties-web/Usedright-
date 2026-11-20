import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialMarketplaceState } from '../data/marketplaceCatalog';
import {
  FLAGSHIP_IPHONE_15_PRO_MAX_LISTING,
  IPHONE_15_PRO_MODELS,
} from '../data/flagshipIphone15Data';
import { buildFlagshipGradeOptions } from './productConfig';
import { filterListings, validateDeviceListing } from './marketplace';
import {
  buildConditionStatement,
  buildFunctionalityChecklistRows,
  buildGroupedHardwareChecks,
  buildVerificationLayers,
  getEffectiveFunctionalStatus,
  getPrimaryCardWarning,
  mapCosmeticGrade,
  qualifiesForWorksLikeNew,
  sanitizeVendorFreeText,
  validateVendorConditionClaims,
} from './deviceCondition';
import { DeviceListing } from '../types/marketplace';

test('Cosmetic grade mapping strictly maps to Excellent, Very Good, Good (never Great)', () => {
  const a = mapCosmeticGrade('Grade A');
  const b = mapCosmeticGrade('Grade B');
  const c = mapCosmeticGrade('Grade C');
  const legacyD = mapCosmeticGrade('Grade D');

  assert.equal(a.code, 'EXCELLENT');
  assert.equal(a.label, 'Excellent');
  assert.equal(b.code, 'VERY GOOD');
  assert.equal(b.label, 'Very Good');
  assert.equal(c.code, 'GOOD');
  assert.equal(c.label, 'Good');
  assert.equal(legacyD.code, 'GOOD');
});

test('Scenario 1-3: Excellent, Very Good, and Good grades qualify for "Works like new." ONLY when fully functional', () => {
  const state = createInitialMarketplaceState();
  const baseClean = state.listings.find((l) => l.id === 'ur-deal-ip14-promax-128')!;
  const gradeCGoodClean = state.listings.find((l) => l.id === 'ur-ipxr-black-64')!;

  // Scenario 1: Excellent + fully functional
  const excellentInput = { listing: { ...baseClean, cosmeticGrade: 'Grade A' as const } };
  assert.equal(qualifiesForWorksLikeNew(excellentInput), true);
  assert.equal(
    buildConditionStatement(excellentInput),
    'Nearly flawless appearance. Works like new.'
  );

  // Scenario 2: Very Good + fully functional
  const veryGoodInput = { listing: { ...baseClean, cosmeticGrade: 'Grade B' as const } };
  assert.equal(qualifiesForWorksLikeNew(veryGoodInput), true);
  assert.equal(
    buildConditionStatement(veryGoodInput),
    'Minor scratches or cosmetic marks. Works like new.'
  );

  // Scenario 3: Good (Grade C) + fully functional (iPhone XR Black 64GB)
  assert.equal(qualifiesForWorksLikeNew({ listing: gradeCGoodClean }), true);
  assert.equal(
    buildConditionStatement({ listing: gradeCGoodClean }),
    'Visible scratches, dents or signs of use. Works like new.'
  );
  assert.equal(getPrimaryCardWarning(gradeCGoodClean), null);
});

test('Scenario 4: Excellent grade + Face ID not working NEVER shows "Works like new."', () => {
  const state = createInitialMarketplaceState();
  const cleanPhone = state.listings.find((l) => l.id === 'ur-deal-ip14-promax-128')!;
  const faceIdFaultPhone: DeviceListing = {
    ...cleanPhone,
    cosmeticGrade: 'Grade A',
    faceIdStatus: 'Faulty',
    disclosedFaults: ['Face ID not working'],
    conditionReport: {
      ...(cleanPhone.conditionReport as any),
      faceIdOrFingerprint: 'Not working',
    },
  };

  assert.equal(qualifiesForWorksLikeNew({ listing: faceIdFaultPhone }), false);
  assert.equal(
    getEffectiveFunctionalStatus({ listing: faceIdFaultPhone }),
    'Functional With Disclosed Limitations'
  );
  const statement = buildConditionStatement({ listing: faceIdFaultPhone });
  assert.equal(/works like new/i.test(statement), false);
  assert.match(statement, /Face ID is not working/);
  assert.equal(getPrimaryCardWarning(faceIdFaultPhone)?.label, 'Face ID not working');
});

test('Scenario 5: Carrier SIM Locked device blocks "Works like new." and shows SIM Locked warning', () => {
  const state = createInitialMarketplaceState();
  const simLocked = state.listings.find((l) => l.id === 'dev-phone-4')!;

  assert.equal(qualifiesForWorksLikeNew({ listing: simLocked }), false);
  const statement = buildConditionStatement({ listing: simLocked });
  assert.equal(/works like new/i.test(statement), false);
  assert.match(statement, /Network locked/i);
  assert.match(getPrimaryCardWarning(simLocked)?.label || '', /SIM Locked/i);
});

test('Scenario 6: Screen-replaced device blocks "Works like new." and surfaces Screen replaced', () => {
  const state = createInitialMarketplaceState();
  const screenReplaced = state.listings.find((l) => l.id === 'dev-phone-8')!;

  assert.equal(qualifiesForWorksLikeNew({ listing: screenReplaced }), false);
  const statement = buildConditionStatement({ listing: screenReplaced });
  assert.equal(/works like new/i.test(statement), false);
  assert.match(statement, /Screen has been replaced/i);
  assert.equal(getPrimaryCardWarning(screenReplaced)?.label, 'Screen replaced');
});

test('Scenario 7: Battery-replaced device blocks "Works like new." and surfaces Battery replaced', () => {
  const state = createInitialMarketplaceState();
  const battReplaced = state.listings.find((l) => l.id === 'ur-ip13pro-batt-replaced')!;

  assert.ok(battReplaced, 'ur-ip13pro-batt-replaced must exist in seeded catalog');
  assert.equal(qualifiesForWorksLikeNew({ listing: battReplaced }), false);
  const statement = buildConditionStatement({ listing: battReplaced });
  assert.equal(/works like new/i.test(statement), false);
  assert.match(statement, /Battery has been replaced/i);
  assert.equal(getPrimaryCardWarning(battReplaced)?.label, 'Battery replaced');
});

test('Scenario 8: Wi-Fi only device blocks "Works like new." and warns prominently', () => {
  const state = createInitialMarketplaceState();
  const wifiOnly = state.listings.find((l) => l.id === 'dev-phone-3')!;

  assert.equal(qualifiesForWorksLikeNew({ listing: wifiOnly }), false);
  const statement = buildConditionStatement({ listing: wifiOnly });
  assert.equal(/works like new/i.test(statement), false);
  assert.match(statement, /Wi-Fi only/i);
  assert.equal(getPrimaryCardWarning(wifiOnly)?.label, 'Wi-Fi Only · No SIM');
});

test('Scenario 9: Partially untested device blocks "Works like new." and NEVER fabricates "Working"', () => {
  const state = createInitialMarketplaceState();
  const untested = state.listings.find((l) => l.id === 'ur-samsung-s23-untested')!;

  assert.ok(untested, 'ur-samsung-s23-untested must exist in seeded catalog');
  assert.equal(qualifiesForWorksLikeNew({ listing: untested }), false);
  assert.equal(getEffectiveFunctionalStatus({ listing: untested }), 'Not Tested');
  assert.equal(/works like new/i.test(buildConditionStatement({ listing: untested })), false);

  const rows = buildFunctionalityChecklistRows({ listing: untested });
  const touchRow = rows.find((r) => r.label === 'Touchscreen')!;
  const frontCamRow = rows.find((r) => r.label === 'Front Camera')!;
  const simRow = rows.find((r) => r.label === 'Network / SIM')!;

  assert.equal(touchRow.value, 'Not tested');
  assert.equal(touchRow.state, 'not_tested');
  assert.equal(frontCamRow.value, 'Not tested');
  assert.equal(simRow.value, 'Not tested');

  // Also test missing phone conditionReport object entirely: must NOT default to "Working properly"
  const missingReportListing: DeviceListing = {
    ...untested,
    functionalTestStatus: undefined,
    conditionReport: undefined as any,
  };
  const missingRows = buildFunctionalityChecklistRows({ listing: missingReportListing });
  assert.equal(
    missingRows.find((r) => r.label === 'Front Camera')?.value,
    'Not tested'
  );
  assert.equal(
    missingRows.find((r) => r.label === 'Charging Port')?.value,
    'Not tested'
  );
});

test('Scenario 10-12: Three Verification Layers stay strictly separate and never imply one another', () => {
  const state = createInitialMarketplaceState();
  const inspectedListing = state.listings.find((l) => l.id === 'ur-deal-ip14-promax-128')!;
  const flagshipVendorOnly = FLAGSHIP_IPHONE_15_PRO_MAX_LISTING;
  const untestedUnreviewed = state.listings.find((l) => l.id === 'ur-samsung-s23-untested')!;

  const layersInspected = buildVerificationLayers(inspectedListing);
  assert.equal(layersInspected.vendorVerification.label, 'Verified Vendor');
  assert.equal(layersInspected.originEvidence.label, 'Origin Verified');
  assert.equal(layersInspected.physicalInspection.label, 'UsedRight Inspected');

  const layersVendorOnly = buildVerificationLayers(flagshipVendorOnly);
  assert.equal(layersVendorOnly.vendorVerification.label, 'Verified Vendor');
  assert.equal(layersVendorOnly.originEvidence.label, 'Origin Verified');
  assert.equal(
    layersVendorOnly.physicalInspection.label,
    'Not Physically Inspected by UsedRight'
  );

  const layersUnverifiedOrigin = buildVerificationLayers({
    ...untestedUnreviewed,
    sellerVerified: false,
  });
  assert.equal(layersUnverifiedOrigin.vendorVerification.label, 'Unverified Vendor');
  assert.equal(layersUnverifiedOrigin.originEvidence.label, 'Origin Not Verified');
  assert.equal(
    layersUnverifiedOrigin.physicalInspection.label,
    'Not Physically Inspected by UsedRight'
  );
});

test('Scenario 13: Technical filters isolate Cosmetic Grade, Functionality, SIM Lock, Battery, Screen, and Origin Reviewed', () => {
  const state = createInitialMarketplaceState();
  const simLocked = filterListings(state.listings, { simFilter: 'locked' }, state.platformConfig);
  assert.ok(simLocked.some((l) => l.id === 'dev-phone-4'));
  assert.ok(simLocked.every((l) => l.id !== 'ur-ip13-128-midnight'));

  const battReplaced = filterListings(
    state.listings,
    { batteryFilter: 'replaced' },
    state.platformConfig
  );
  assert.ok(battReplaced.some((l) => l.id === 'ur-ip13pro-batt-replaced'));

  const screenReplaced = filterListings(
    state.listings,
    { screenFilter: 'replaced' },
    state.platformConfig
  );
  assert.ok(screenReplaced.some((l) => l.id === 'dev-phone-8'));

  const untestedOnly = filterListings(
    state.listings,
    { functionalStatus: 'Not Tested' },
    state.platformConfig
  );
  assert.ok(untestedOnly.some((l) => l.id === 'ur-samsung-s23-untested'));
  assert.ok(untestedOnly.every((l) => l.id !== 'ur-ip13-128-midnight'));

  const originReviewedOnly = filterListings(
    state.listings,
    { originReviewedOnly: true },
    state.platformConfig
  );
  assert.ok(originReviewedOnly.every((l) => l.id !== 'ur-samsung-s23-untested'));
});

test('Scenario 14: Flagship variant switching separates Grade B Works like new from Grade C Face ID limitation', () => {
  const proMax = IPHONE_15_PRO_MODELS.find((m) => m.id === 'iphone-15-pro-max-256')!;
  const spaceBlack = proMax.colors.find((c) => c.name === 'Space Black')!;
  const options = buildFlagshipGradeOptions(proMax, spaceBlack);

  const gradeB = options.find((o) => o.grade === 'Grade B')!;
  const gradeC = options.find((o) => o.grade === 'Grade C')!;

  assert.match(gradeB.title, /Very Good/);
  assert.equal(gradeB.worksLikeNewEligible, true);
  assert.match(gradeB.description, /Works like new\./);

  assert.equal(gradeC.worksLikeNewEligible, false);
  assert.equal(gradeC.faceIdStatus, 'Not working');
  assert.equal(/works like new/i.test(gradeC.description), false);
});

test('Scenario 15: Vendor guardrails block misleading "Works like new", "Certified", "Refurbished", and "Renewed" claims', () => {
  const state = createInitialMarketplaceState();
  const simLocked = state.listings.find((l) => l.id === 'dev-phone-4')!;

  // Works like new blocked when SIM locked
  const invalidWorksLikeNew = validateVendorConditionClaims({
    listing: simLocked,
    descriptionText: 'Super clean phone, works like new with AT&T SIM.',
  });
  assert.equal(invalidWorksLikeNew.valid, false);
  assert.ok(invalidWorksLikeNew.errors.some((e) => e.includes('Works like new')));

  // Certified / Refurbished / Renewed blocked by validateDeviceListing
  const certifiedDraft: Partial<DeviceListing> = {
    title: 'iPhone 14 Certified by UsedRight Refurbished',
    brand: 'Apple',
    model: 'iPhone 14',
    category: 'phones',
    condition: 'Foreign-Used',
    price: 450000,
    cosmeticGrade: 'Grade A',
    batchReference: 'US-BATCH-2026-041',
    imeiOrSerial: '358911240981122',
  };
  const check = validateDeviceListing(certifiedDraft, state.platformConfig);
  assert.equal(check.valid, false);
  assert.ok(check.errors.some((e) => e.includes('Certified')));
  assert.ok(check.errors.some((e) => e.includes('Refurbished')));

  // Sanitizer strips prohibited phrasing automatically in display fallback
  const sanitized = sanitizeVendorFreeText(
    'Refurbished and Certified by UsedRight. Works like new.',
    false
  );
  assert.equal(/certified|refurbished|works like new/i.test(sanitized.cleaned), false);
});

test('Scenario 16: buildGroupedHardwareChecks organizes hardware into logical sections and preserves untested/fault states', () => {
  const state = createInitialMarketplaceState();
  const simLocked = state.listings.find((l) => l.id === 'dev-phone-4')!;
  const untested = state.listings.find((l) => l.id === 'ur-samsung-s23-untested')!;

  const simGroups = buildGroupedHardwareChecks({ listing: simLocked });
  assert.deepEqual(
    simGroups.map((g) => g.title),
    ['Display', 'Cameras', 'Biometrics', 'Connectivity', 'Battery', 'Other Features']
  );
  const connGroup = simGroups.find((g) => g.id === 'connectivity')!;
  assert.equal(connGroup.hasIssue, true);
  assert.ok(connGroup.rows.some((r) => r.label === 'Network / SIM' && r.state === 'issue'));

  const untestedGroups = buildGroupedHardwareChecks({ listing: untested });
  const cameraGroup = untestedGroups.find((g) => g.id === 'cameras')!;
  assert.equal(cameraGroup.hasUntested, true);
  assert.equal(
    cameraGroup.rows.every((r) => r.state === 'not_tested'),
    true
  );
});

