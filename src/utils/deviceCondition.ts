import {
  CosmeticGrade,
  DeviceListing,
  FunctionalTestStatus,
  LaptopConditionReport,
  PhoneConditionReport,
  ProductVariation,
  StandardCosmeticGrade,
  VendorStorefront,
} from '../types/marketplace';

export interface MappedCosmeticGrade {
  internalKey: 'Grade A' | 'Grade B' | 'Grade C';
  code: StandardCosmeticGrade;
  label: 'Excellent' | 'Very Good' | 'Good';
  badgeText: 'EXCELLENT CONDITION' | 'VERY GOOD CONDITION' | 'GOOD CONDITION';
  shortBadge: 'EXCELLENT' | 'VERY GOOD' | 'GOOD';
  appearanceLead: string;
  wearExplanation: string;
}

export interface ConditionQualificationInput {
  listing: DeviceListing;
  variation?: ProductVariation | null;
  faceIdOverride?: 'Working' | 'Not working';
  batteryHealthOverride?: number;
  screenOriginalityOverride?: string;
  gradeOverride?: CosmeticGrade;
  disclosedLabelsOverride?: string[];
}

export interface ChecklistRow {
  label: string;
  value: string;
  state: 'working' | 'issue' | 'not_tested' | 'info';
}

export interface GroupedHardwareCheckSection {
  id: string;
  title: string;
  rows: ChecklistRow[];
  hasIssue: boolean;
  hasUntested: boolean;
}

export interface VerificationLayersResult {
  vendorVerification: {
    verified: boolean;
    label: 'Verified Vendor' | 'Unverified Vendor';
    detail: string;
  };
  originEvidence: {
    reviewed: boolean;
    label: 'Origin Verified' | 'Origin Not Verified';
    detail: string;
  };
  physicalInspection: {
    inspected: boolean;
    label: 'UsedRight Inspected' | 'Not Physically Inspected by UsedRight';
    detail: string;
  };
}

const COSMETIC_GRADE_META: Record<'Grade A' | 'Grade B' | 'Grade C', MappedCosmeticGrade> = {
  'Grade A': {
    internalKey: 'Grade A',
    code: 'EXCELLENT',
    label: 'Excellent',
    badgeText: 'EXCELLENT CONDITION',
    shortBadge: 'EXCELLENT',
    appearanceLead: 'Nearly flawless appearance',
    wearExplanation: 'Very little visible cosmetic wear.',
  },
  'Grade B': {
    internalKey: 'Grade B',
    code: 'VERY GOOD',
    label: 'Very Good',
    badgeText: 'VERY GOOD CONDITION',
    shortBadge: 'VERY GOOD',
    appearanceLead: 'Minor scratches or cosmetic marks',
    wearExplanation: 'May have small signs of previous use while maintaining a clean appearance.',
  },
  'Grade C': {
    internalKey: 'Grade C',
    code: 'GOOD',
    label: 'Good',
    badgeText: 'GOOD CONDITION',
    shortBadge: 'GOOD',
    appearanceLead: 'Visible scratches, dents or signs of use',
    wearExplanation:
      'May have more noticeable cosmetic marks, scratches or dents while still passing required functionality checks.',
  },
};

export function normalizeCosmeticGradeKey(
  grade?: CosmeticGrade | string
): 'Grade A' | 'Grade B' | 'Grade C' {
  const g = (grade || '').trim().toLowerCase();
  if (g === 'grade a' || g === 'excellent') return 'Grade A';
  if (g === 'grade b' || g === 'very good' || g === 'great') return 'Grade B';
  return 'Grade C';
}

export function mapCosmeticGrade(grade?: CosmeticGrade | string): MappedCosmeticGrade {
  return COSMETIC_GRADE_META[normalizeCosmeticGradeKey(grade)];
}

function isPhoneReport(
  report: DeviceListing['conditionReport'] | undefined
): report is PhoneConditionReport {
  return Boolean(report && 'simFunctionality' in report);
}

function isLaptopReport(
  report: DeviceListing['conditionReport'] | undefined
): report is LaptopConditionReport {
  return Boolean(report && 'trackpad' in report);
}

function collectDisclosedStrings(
  listing: DeviceListing,
  variation?: ProductVariation | null,
  disclosedLabelsOverride?: string[]
): string[] {
  const items: string[] = [];
  if (disclosedLabelsOverride) {
    items.push(...disclosedLabelsOverride);
  } else if (variation?.disclosedFaults?.length) {
    items.push(...variation.disclosedFaults);
  } else {
    if (listing.disclosedFaults?.length) items.push(...listing.disclosedFaults);
    if (listing.disclosedFaultsList?.length) {
      items.push(...listing.disclosedFaultsList.map((f) => `${f.label} ${f.description}`));
    }
  }
  return items.filter(Boolean);
}

function isPurelyCosmeticFaultText(text: string): boolean {
  const lower = text.toLowerCase();
  const cosmeticKeywords = [
    'cosmetic',
    'scratch',
    'scratches',
    'scuff',
    'scuffs',
    'dent',
    'dents',
    'frame mark',
    'bezel wear',
    'hairline',
    'surface wear',
    'titanium rail',
    'micro-mark',
    'aluminum frame',
  ];
  const explicitFaultKeywords = [
    'wi-fi only',
    'wifi only',
    'no sim',
    'sim does not',
    'network lock',
    'carrier lock',
    'sim locked',
    'screen replaced',
    'replaced screen',
    'aftermarket',
    'battery replaced',
    'replaced battery',
    'service recommended',
    'replace soon',
    'degrad',
    'not working',
    'faulty',
    'failure',
    'dead pixel',
    'delamination',
    'sticky',
    'board repair',
    'mdm',
    'icloud',
    'activation lock',
    'not tested',
    'disabled',
    'broken',
    'cracked',
  ];
  const hasCosmetic = cosmeticKeywords.some((k) => lower.includes(k));
  const hasExplicitFault = explicitFaultKeywords.some((k) => lower.includes(k));
  return hasCosmetic && !hasExplicitFault;
}

export function hasReplacedBattery(
  listing: DeviceListing,
  variation?: ProductVariation | null,
  disclosedLabelsOverride?: string[]
): boolean {
  if (variation?.batteryReplaced === 'Replaced') return true;
  if (isPhoneReport(listing.conditionReport) && listing.conditionReport.batteryReplaced === 'Replaced') {
    return true;
  }
  if (
    listing.repairHistory?.some(
      (r) =>
        r.component.toLowerCase().includes('battery') &&
        r.status.toLowerCase().includes('replac')
    )
  ) {
    return true;
  }
  const faults = collectDisclosedStrings(listing, variation, disclosedLabelsOverride);
  return faults.some((f) => {
    const l = f.toLowerCase();
    return l.includes('battery replaced') || l.includes('replaced battery');
  });
}

export function hasReplacedScreen(
  listing: DeviceListing,
  variation?: ProductVariation | null,
  screenOriginalityOverride?: string,
  disclosedLabelsOverride?: string[]
): boolean {
  if (variation?.screenReplaced) return true;
  const screenOrig = (
    screenOriginalityOverride ||
    (isPhoneReport(listing.conditionReport) ? listing.conditionReport.screenOriginality : '') ||
    (isLaptopReport(listing.conditionReport) ? listing.conditionReport.screenCondition : '')
  ).toLowerCase();
  if (
    screenOrig.includes('replac') ||
    screenOrig.includes('aftermarket') ||
    screenOrig.includes('oem replacement')
  ) {
    return true;
  }
  if (
    listing.repairHistory?.some(
      (r) =>
        (r.component.toLowerCase().includes('screen') || r.component.toLowerCase().includes('display')) &&
        r.status.toLowerCase().includes('replac')
    )
  ) {
    return true;
  }
  const faults = collectDisclosedStrings(listing, variation, disclosedLabelsOverride);
  return faults.some((f) => {
    const l = f.toLowerCase();
    return (
      l.includes('screen replaced') ||
      l.includes('replaced screen') ||
      l.includes('aftermarket display') ||
      l.includes('display replaced')
    );
  });
}

export function getSimRestrictionDetails(
  listing: DeviceListing,
  variation?: ProductVariation | null,
  disclosedLabelsOverride?: string[]
): { type: 'unlocked' | 'carrier_locked' | 'wifi_only'; carrier?: string; label: string } {
  const simText = (variation?.simStatus || listing.simStatus || '').toLowerCase();
  const faults = collectDisclosedStrings(listing, variation, disclosedLabelsOverride).join(' ').toLowerCase();

  if (
    listing.isWifiOnly ||
    listing.simLockDetails?.status === 'Wi-Fi Only' ||
    simText.includes('wi-fi only') ||
    simText.includes('wifi only') ||
    faults.includes('wi-fi only') ||
    faults.includes('wifi works, but sim does not')
  ) {
    return {
      type: 'wifi_only',
      label: 'Wi-Fi Only (No SIM)',
    };
  }

  const phoneReport = isPhoneReport(listing.conditionReport) ? listing.conditionReport : null;
  if (
    phoneReport?.networkLockStatus === 'Carrier Locked' ||
    listing.simLockDetails?.status === 'Locked' ||
    /\bcarrier\s*locked\b|\bsim\s*locked\b|\blocked\b/.test(simText) ||
    faults.includes('sim locked') ||
    faults.includes('carrier locked')
  ) {
    const carrier = listing.simLockDetails?.carrier;
    return {
      type: 'carrier_locked',
      carrier,
      label: carrier ? `SIM Locked (${carrier})` : 'SIM Locked to Foreign Carrier',
    };
  }

  return {
    type: 'unlocked',
    label: listing.simStatus || 'SIM Unlocked',
  };
}

export function hasFaceIdOrBiometricFault(
  listing: DeviceListing,
  variation?: ProductVariation | null,
  faceIdOverride?: 'Working' | 'Not working',
  disclosedLabelsOverride?: string[]
): boolean {
  if (faceIdOverride === 'Not working') return true;
  if (faceIdOverride === 'Working') return false;
  if (variation?.faceIdStatus === 'Not working') return true;
  if (variation?.faceIdStatus === 'Working') return false;

  const phoneReport = isPhoneReport(listing.conditionReport) ? listing.conditionReport : null;
  if (
    phoneReport &&
    (phoneReport.faceIdOrFingerprint === 'Not working' || phoneReport.faceIdOrFingerprint === 'Faulty')
  ) {
    return true;
  }
  if (listing.faceIdStatus && listing.faceIdStatus.toLowerCase().includes('not working')) {
    return true;
  }
  const faults = collectDisclosedStrings(listing, variation, disclosedLabelsOverride);
  return faults.some((f) => {
    const l = f.toLowerCase();
    return (l.includes('face id') || l.includes('touch id') || l.includes('fingerprint')) &&
      (l.includes('not working') || l.includes('fault') || l.includes('disabled'));
  });
}

function hasUntestedCoreHardware(
  listing: DeviceListing,
  variation?: ProductVariation | null
): boolean {
  if (variation?.functionalTestStatus === 'Not Tested' || listing.functionalTestStatus === 'Not Tested') {
    return true;
  }
  if (listing.category === 'phones' && isPhoneReport(listing.conditionReport)) {
    const r = listing.conditionReport;
    const checks = [
      r.frontCamera,
      r.rearCamera,
      r.speakers,
      r.microphone,
      r.chargingPort,
      r.wifi,
      r.simFunctionality,
      r.faceIdOrFingerprint,
    ];
    if (checks.some((c) => c === 'Not tested')) return true;
    if (r.touchscreen === 'Not tested') return true;
    if (r.networkLockStatus === 'Not tested' || r.icloudOrGoogleLock === 'Not tested' || r.mdmStatus === 'Not tested') {
      return true;
    }
    if (r.batteryReplaced === 'Unknown' && (!r.batteryHealth || r.batteryHealth <= 0)) return true;
  }
  if (listing.category === 'laptops' && isLaptopReport(listing.conditionReport)) {
    const r = listing.conditionReport;
    const checks = [r.batteryCondition, r.trackpad, r.speakers, r.microphone, r.webcam, r.wifi, r.charging];
    if (checks.some((c) => c === 'Not tested')) return true;
  }
  return false;
}

function hasOtherHardwareFault(
  listing: DeviceListing,
  variation?: ProductVariation | null,
  disclosedLabelsOverride?: string[]
): boolean {
  if (listing.category === 'phones' && isPhoneReport(listing.conditionReport)) {
    const r = listing.conditionReport;
    const componentChecks = [
      r.touchscreen,
      r.frontCamera,
      r.rearCamera,
      r.speakers,
      r.microphone,
      r.chargingPort,
      r.wifi,
      r.bluetooth,
      r.simFunctionality,
    ];
    if (componentChecks.some((c) => c === 'Faulty' || c === 'Not working')) return true;
    if (r.icloudOrGoogleLock === 'Locked' || r.mdmStatus === 'MDM Enrolled') return true;
    if (r.imeiVerificationStatus === 'Flagged') return true;
  }

  if (listing.category === 'laptops' && isLaptopReport(listing.conditionReport)) {
    const r = listing.conditionReport;
    if (
      r.screenCondition === 'Dead Pixels' ||
      r.screenCondition === 'Delamination' ||
      r.screenCondition === 'Replaced'
    ) {
      return true;
    }
    if (
      r.batteryCondition === 'Replace Soon' ||
      r.batteryCondition === 'Service Recommended'
    ) {
      return true;
    }
    if (
      r.trackpad === 'Faulty' ||
      r.trackpad === 'Not working' ||
      r.speakers === 'Faulty' ||
      r.speakers === 'Not working' ||
      r.microphone === 'Faulty' ||
      r.microphone === 'Not working' ||
      r.webcam === 'Faulty' ||
      r.webcam === 'Not working' ||
      r.charging === 'Faulty' ||
      r.charging === 'Not working' ||
      r.usbPorts === 'Partial Working' ||
      r.usbPorts === 'Faulty' ||
      r.hdmiOrThunderbolt === 'Faulty' ||
      r.biosOrFirmwareLock === 'Locked' ||
      r.activationOrManagementLock === 'Enrolled' ||
      r.keyboard.toLowerCase().includes('faulty') ||
      r.keyboard.toLowerCase().includes('sticky') ||
      r.keyboard.toLowerCase().includes('defective')
    ) {
      return true;
    }
  }

  const faults = collectDisclosedStrings(listing, variation, disclosedLabelsOverride);
  return faults.some((f) => !isPurelyCosmeticFaultText(f));
}

export function getEffectiveFunctionalStatus(
  input: ConditionQualificationInput
): FunctionalTestStatus {
  const { listing, variation, faceIdOverride, screenOriginalityOverride, disclosedLabelsOverride } = input;

  const explicitStatus = variation?.functionalTestStatus || listing.functionalTestStatus;
  if (explicitStatus === 'Not Working') return 'Not Working';
  if (explicitStatus === 'Not Applicable') return 'Not Applicable';

  const untested = hasUntestedCoreHardware(listing, variation);
  const faceIdFault = hasFaceIdOrBiometricFault(listing, variation, faceIdOverride, disclosedLabelsOverride);
  const simDetails = getSimRestrictionDetails(listing, variation, disclosedLabelsOverride);
  const batteryReplaced = hasReplacedBattery(listing, variation, disclosedLabelsOverride);
  const screenReplaced = hasReplacedScreen(
    listing,
    variation,
    screenOriginalityOverride,
    disclosedLabelsOverride
  );
  const otherFault = hasOtherHardwareFault(listing, variation, disclosedLabelsOverride);

  if (untested && !faceIdFault && simDetails.type === 'unlocked' && !batteryReplaced && !screenReplaced && !otherFault) {
    return 'Not Tested';
  }
  if (explicitStatus === 'Not Tested') {
    return 'Not Tested';
  }

  if (
    faceIdFault ||
    simDetails.type !== 'unlocked' ||
    batteryReplaced ||
    screenReplaced ||
    otherFault
  ) {
    return 'Functional With Disclosed Limitations';
  }

  if (explicitStatus === 'Functional With Disclosed Limitations') {
    return 'Functional With Disclosed Limitations';
  }

  return 'Fully Functional';
}

export function qualifiesForWorksLikeNew(input: ConditionQualificationInput): boolean {
  const status = getEffectiveFunctionalStatus(input);
  if (status !== 'Fully Functional') return false;

  const {
    listing,
    variation,
    faceIdOverride,
    screenOriginalityOverride,
    disclosedLabelsOverride,
  } = input;

  if (hasUntestedCoreHardware(listing, variation)) return false;
  if (hasFaceIdOrBiometricFault(listing, variation, faceIdOverride, disclosedLabelsOverride)) {
    return false;
  }
  if (getSimRestrictionDetails(listing, variation, disclosedLabelsOverride).type !== 'unlocked') {
    return false;
  }
  if (hasReplacedBattery(listing, variation, disclosedLabelsOverride)) return false;
  if (hasReplacedScreen(listing, variation, screenOriginalityOverride, disclosedLabelsOverride)) {
    return false;
  }
  if (hasOtherHardwareFault(listing, variation, disclosedLabelsOverride)) return false;

  return true;
}

export function buildConditionStatement(input: ConditionQualificationInput): string {
  const grade = mapCosmeticGrade(
    input.gradeOverride || input.variation?.grade || input.listing.cosmeticGrade
  );
  const functionalStatus = getEffectiveFunctionalStatus(input);

  if (qualifiesForWorksLikeNew(input)) {
    return `${grade.appearanceLead}. Works like new.`;
  }

  if (functionalStatus === 'Not Tested') {
    return `${grade.appearanceLead}. Partial check only — some hardware features are not tested yet.`;
  }

  if (functionalStatus === 'Not Working') {
    return `${grade.appearanceLead}. Sold with critical functional fault(s); see disclosed issues.`;
  }

  if (functionalStatus === 'Not Applicable') {
    return `${grade.appearanceLead}. Standard pre-owned accessory inspection.`;
  }

  const reasons: string[] = [];
  if (
    hasFaceIdOrBiometricFault(
      input.listing,
      input.variation,
      input.faceIdOverride,
      input.disclosedLabelsOverride
    )
  ) {
    reasons.push('Face ID is not working');
  }

  const sim = getSimRestrictionDetails(
    input.listing,
    input.variation,
    input.disclosedLabelsOverride
  );
  if (sim.type === 'carrier_locked') {
    reasons.push(
      sim.carrier
        ? `Network locked to ${sim.carrier}`
        : 'Network locked to a foreign carrier'
    );
  } else if (sim.type === 'wifi_only') {
    reasons.push('Works with Wi-Fi only, no SIM');
  }

  if (
    hasReplacedScreen(
      input.listing,
      input.variation,
      input.screenOriginalityOverride,
      input.disclosedLabelsOverride
    )
  ) {
    reasons.push('Screen has been replaced');
  }

  if (
    hasReplacedBattery(
      input.listing,
      input.variation,
      input.disclosedLabelsOverride
    )
  ) {
    reasons.push('Battery has been replaced');
  }

  if (reasons.length > 0) {
    return `${grade.appearanceLead}. Other tested functions work as expected. ${reasons.join('. ')}.`;
  }

  return `${grade.appearanceLead}. Tested with disclosed limitation(s); review technical details.`;
}

export function getPrimaryCardWarning(
  listing: DeviceListing,
  variation?: ProductVariation | null
): { label: string; tone: 'danger' | 'warning' } | null {
  const status = getEffectiveFunctionalStatus({ listing, variation });

  if (status === 'Not Working') {
    return { label: 'Hardware fault disclosed', tone: 'danger' };
  }
  if (status === 'Not Tested') {
    return { label: 'Not tested · Partial check', tone: 'warning' };
  }

  const sim = getSimRestrictionDetails(listing, variation);
  if (sim.type === 'carrier_locked') {
    return { label: sim.carrier ? `SIM Locked (${sim.carrier})` : 'SIM Locked', tone: 'danger' };
  }
  if (sim.type === 'wifi_only') {
    return { label: 'Wi-Fi Only · No SIM', tone: 'danger' };
  }

  if (hasFaceIdOrBiometricFault(listing, variation)) {
    return { label: 'Face ID not working', tone: 'danger' };
  }

  if (hasReplacedScreen(listing, variation)) {
    return { label: 'Screen replaced', tone: 'warning' };
  }

  if (hasReplacedBattery(listing, variation)) {
    return { label: 'Battery replaced', tone: 'warning' };
  }

  const faults = collectDisclosedStrings(listing, variation);
  const nonCosmetic = faults.find((f) => !isPurelyCosmeticFaultText(f));
  if (nonCosmetic) {
    return { label: nonCosmetic, tone: 'danger' };
  }

  return null;
}

function mapRawComponentStatus(
  raw: string | undefined,
  workingText: string = 'Working'
): { value: string; state: ChecklistRow['state'] } {
  if (!raw || raw.trim() === '' || raw.toLowerCase() === 'unknown') {
    return { value: 'Not disclosed', state: 'not_tested' };
  }
  const lower = raw.toLowerCase();
  if (lower.includes('not tested')) {
    return { value: 'Not tested', state: 'not_tested' };
  }
  if (lower.includes('not applicable')) {
    return { value: 'Not applicable', state: 'info' };
  }
  if (lower.includes('working') || lower.includes('clean') || lower.includes('unlocked') || lower.includes('healthy')) {
    return { value: workingText === 'Working' ? raw : workingText, state: 'working' };
  }
  if (lower.includes('not working') || lower.includes('faulty') || /\blocked\b/.test(lower) || lower.includes('enrolled')) {
    return { value: raw === 'Faulty' ? 'Not working' : raw, state: 'issue' };
  }
  if (lower.includes('replac')) {
    return { value: raw, state: 'issue' };
  }
  return { value: raw, state: 'info' };
}

export function buildFunctionalityChecklistRows(
  input: ConditionQualificationInput
): ChecklistRow[] {
  const { listing, variation, faceIdOverride, batteryHealthOverride, screenOriginalityOverride } = input;

  if (listing.category === 'phones') {
    const r = isPhoneReport(listing.conditionReport) ? listing.conditionReport : null;
    const isUntestedListing = listing.functionalTestStatus === 'Not Tested';

    const touchscreenMapped = r?.touchscreen
      ? mapRawComponentStatus(r.touchscreen)
      : isUntestedListing
      ? { value: 'Not tested', state: 'not_tested' as const }
      : { value: 'Not disclosed', state: 'not_tested' as const };

    const frontCamMapped = r
      ? mapRawComponentStatus(r.frontCamera)
      : { value: 'Not tested', state: 'not_tested' as const };
    const rearCamMapped = r
      ? mapRawComponentStatus(r.rearCamera)
      : { value: 'Not tested', state: 'not_tested' as const };

    const rawFaceId =
      faceIdOverride ||
      variation?.faceIdStatus ||
      (r ? r.faceIdOrFingerprint : undefined);
    const faceIdMapped = rawFaceId
      ? mapRawComponentStatus(
          rawFaceId === 'Not working' ? 'Not working (passcode only)' : rawFaceId
        )
      : { value: 'Not tested', state: 'not_tested' as const };

    const speakersMapped = r
      ? mapRawComponentStatus(r.speakers)
      : { value: 'Not tested', state: 'not_tested' as const };
    const micMapped = r
      ? mapRawComponentStatus(r.microphone)
      : { value: 'Not tested', state: 'not_tested' as const };
    const chargingMapped = r
      ? mapRawComponentStatus(r.chargingPort)
      : { value: 'Not tested', state: 'not_tested' as const };

    const simDetails = getSimRestrictionDetails(listing, variation);
    let simRow: { value: string; state: ChecklistRow['state'] };
    if (simDetails.type === 'wifi_only') {
      simRow = { value: 'Wi-Fi only (No SIM)', state: 'issue' };
    } else if (simDetails.type === 'carrier_locked') {
      simRow = { value: simDetails.label, state: 'issue' };
    } else if (!r) {
      simRow = { value: 'Not tested', state: 'not_tested' };
    } else if (r.simFunctionality === 'Not tested' || r.networkLockStatus === 'Not tested') {
      simRow = { value: 'Not tested', state: 'not_tested' };
    } else if (r.simFunctionality === 'Not working' || r.networkLockStatus === 'Carrier Locked') {
      simRow = {
        value: r.networkLockStatus === 'Carrier Locked' ? 'Carrier Locked' : 'SIM Not working',
        state: 'issue',
      };
    } else {
      simRow = { value: 'Working · SIM Unlocked', state: 'working' };
    }

    const effectiveHealth =
      batteryHealthOverride ??
      variation?.batteryHealth ??
      r?.batteryHealth ??
      listing.batteryHealth;
    const batteryReplaced = hasReplacedBattery(listing, variation);
    let batteryRow: { value: string; state: ChecklistRow['state'] };
    if (!effectiveHealth || effectiveHealth <= 0 || isUntestedListing) {
      batteryRow = {
        value: effectiveHealth && effectiveHealth > 0 ? `${effectiveHealth}% (Not runtime-tested)` : 'Not tested',
        state: 'not_tested',
      };
    } else if (batteryReplaced) {
      batteryRow = {
        value: `${effectiveHealth}% (Battery replaced)`,
        state: 'issue',
      };
    } else {
      batteryRow = {
        value: `${effectiveHealth}% (${r?.batteryReplaced === 'Unknown' ? 'Status not disclosed' : 'Original battery'})`,
        state: effectiveHealth >= 80 ? 'working' : 'issue',
      };
    }

    const screenReplaced = hasReplacedScreen(listing, variation, screenOriginalityOverride);
    const lockMapped = r
      ? r.icloudOrGoogleLock === 'Not tested' || r.mdmStatus === 'Not tested'
        ? { value: 'Not tested', state: 'not_tested' as const }
        : {
            value: `${r.icloudOrGoogleLock} · ${r.mdmStatus}`,
            state:
              r.icloudOrGoogleLock === 'Clean & Removed' && r.mdmStatus === 'No MDM / Clean'
                ? ('working' as const)
                : ('issue' as const),
          }
      : { value: 'Not tested', state: 'not_tested' as const };

    return [
      { label: 'Touchscreen', ...touchscreenMapped },
      { label: 'Front Camera', ...frontCamMapped },
      { label: 'Rear Camera', ...rearCamMapped },
      { label: 'Face ID / Biometrics', ...faceIdMapped },
      { label: 'Speakers', ...speakersMapped },
      { label: 'Microphone', ...micMapped },
      { label: 'Charging Port', ...chargingMapped },
      { label: 'Network / SIM', ...simRow },
      { label: 'Battery', ...batteryRow },
      {
        label: 'Display Panel',
        value: screenReplaced
          ? 'Screen replaced (tested)'
          : screenOriginalityOverride || r?.screenOriginality || 'Not disclosed',
        state: screenReplaced ? 'issue' : r?.screenOriginality ? 'working' : 'not_tested',
      },
      { label: 'Account / MDM Lock', ...lockMapped },
    ];
  }

  if (listing.category === 'laptops' && isLaptopReport(listing.conditionReport)) {
    const r = listing.conditionReport;
    const screenRep = hasReplacedScreen(listing, variation, screenOriginalityOverride);
    return [
      {
        label: 'Display Panel',
        value: screenRep ? 'Screen replaced' : r.screenCondition,
        state:
          r.screenCondition === 'Dead Pixels' || r.screenCondition === 'Delamination' || screenRep
            ? 'issue'
            : 'working',
      },
      {
        label: 'Keyboard & Trackpad',
        value: `${r.keyboard} · ${mapRawComponentStatus(r.trackpad).value}`,
        state:
          r.trackpad === 'Not tested'
            ? 'not_tested'
            : r.keyboard.toLowerCase().includes('faulty') ||
              r.keyboard.toLowerCase().includes('sticky') ||
              r.trackpad === 'Faulty' ||
              r.trackpad === 'Not working'
            ? 'issue'
            : 'working',
      },
      {
        label: 'Ports & Charging',
        value: `${r.usbPorts} · ${mapRawComponentStatus(r.charging).value}`,
        state:
          r.charging === 'Not tested'
            ? 'not_tested'
            : r.usbPorts !== 'All Working' || r.charging !== 'Working'
            ? 'issue'
            : 'working',
      },
      {
        label: 'Speakers & Mic',
        value: `${mapRawComponentStatus(r.speakers).value} / ${mapRawComponentStatus(r.microphone).value}`,
        state:
          r.speakers === 'Not tested' || r.microphone === 'Not tested'
            ? 'not_tested'
            : r.speakers !== 'Working' || r.microphone !== 'Working'
            ? 'issue'
            : 'working',
      },
      {
        label: 'Battery Condition',
        value: `${r.batteryCondition} (${r.batteryCycleCount} cycles)`,
        state:
          r.batteryCondition === 'Not tested'
            ? 'not_tested'
            : r.batteryCondition === 'Normal / Healthy'
            ? 'working'
            : 'issue',
      },
      {
        label: 'Firmware / MDM Lock',
        value: `${r.biosOrFirmwareLock} · ${r.activationOrManagementLock}`,
        state:
          r.biosOrFirmwareLock === 'Unlocked / Clean' && r.activationOrManagementLock === 'Clean / None'
            ? 'working'
            : 'issue',
      },
    ];
  }

  const funcStatus = getEffectiveFunctionalStatus(input);
  return [
    {
      label: 'Core Functionality',
      value: funcStatus,
      state:
        funcStatus === 'Fully Functional'
          ? 'working'
          : funcStatus === 'Not Tested'
          ? 'not_tested'
          : funcStatus === 'Not Applicable'
          ? 'info'
          : 'issue',
    },
    {
      label: 'Battery Runtime',
      value: listing.batteryEstimatedHours
        ? `${listing.batteryEstimatedHours} (${listing.batteryAssessmentType || 'Vendor note'})`
        : listing.batteryAssessmentType || 'Not tested',
      state: listing.batteryAssessmentType === 'Not tested' ? 'not_tested' : 'info',
    },
  ];
}

export function buildGroupedHardwareChecks(
  input: ConditionQualificationInput
): GroupedHardwareCheckSection[] {
  const flatRows = buildFunctionalityChecklistRows(input);
  const byLabel = new Map<string, ChecklistRow>(flatRows.map((r) => [r.label, r]));
  const pick = (label: string): ChecklistRow | null => byLabel.get(label) || null;
  const makeGroup = (id: string, title: string, rows: (ChecklistRow | null)[]): GroupedHardwareCheckSection | null => {
    const cleanRows = rows.filter((r): r is ChecklistRow => Boolean(r));
    if (cleanRows.length === 0) return null;
    return {
      id,
      title,
      rows: cleanRows,
      hasIssue: cleanRows.some((r) => r.state === 'issue'),
      hasUntested: cleanRows.some((r) => r.state === 'not_tested'),
    };
  };

  const { listing } = input;
  if (listing.category === 'phones') {
    const r = isPhoneReport(listing.conditionReport) ? listing.conditionReport : null;
    const wifiRow: ChecklistRow = {
      label: 'Wi-Fi',
      ...(r ? mapRawComponentStatus(r.wifi) : { value: 'Not tested', state: 'not_tested' as const }),
    };
    const btRow: ChecklistRow = {
      label: 'Bluetooth',
      ...(r ? mapRawComponentStatus(r.bluetooth) : { value: 'Not tested', state: 'not_tested' as const }),
    };

    return [
      makeGroup('display', 'Display', [pick('Touchscreen'), pick('Display Panel')]),
      makeGroup('cameras', 'Cameras', [pick('Front Camera'), pick('Rear Camera')]),
      makeGroup('biometrics', 'Biometrics', [pick('Face ID / Biometrics')]),
      makeGroup('connectivity', 'Connectivity', [pick('Network / SIM'), wifiRow, btRow]),
      makeGroup('battery', 'Battery', [pick('Battery')]),
      makeGroup('other', 'Other Features', [
        pick('Speakers'),
        pick('Microphone'),
        pick('Charging Port'),
        pick('Account / MDM Lock'),
      ]),
    ].filter((g): g is GroupedHardwareCheckSection => Boolean(g));
  }

  if (listing.category === 'laptops' && isLaptopReport(listing.conditionReport)) {
    const r = listing.conditionReport;
    const webcamRow: ChecklistRow = {
      label: 'Webcam',
      ...mapRawComponentStatus(r.webcam),
    };
    const wifiRow: ChecklistRow = {
      label: 'Wi-Fi',
      ...mapRawComponentStatus(r.wifi),
    };
    return [
      makeGroup('display', 'Display', [pick('Display Panel')]),
      makeGroup('input', 'Input & Trackpad', [pick('Keyboard & Trackpad')]),
      makeGroup('ports', 'Ports & Power', [pick('Ports & Charging')]),
      makeGroup('audio_cam', 'Audio, Camera & Wi-Fi', [pick('Speakers & Mic'), webcamRow, wifiRow]),
      makeGroup('battery', 'Battery', [pick('Battery Condition')]),
      makeGroup('security', 'Security & Locks', [pick('Firmware / MDM Lock')]),
    ].filter((g): g is GroupedHardwareCheckSection => Boolean(g));
  }

  return [
    makeGroup('core', 'Core Checks', [pick('Core Functionality')]),
    makeGroup('battery', 'Battery', [pick('Battery Runtime')]),
  ].filter((g): g is GroupedHardwareCheckSection => Boolean(g));
}

export function buildVerificationLayers(
  listing: DeviceListing,
  vendor?: VendorStorefront | null
): VerificationLayersResult {
  const vendorVerified = vendor ? vendor.verificationBadge : Boolean(listing.sellerVerified);
  const originReviewed =
    listing.originEvidenceReviewed !== undefined
      ? listing.originEvidenceReviewed
      : listing.foreignUsedStatus === 'Verified Foreign-Used';
  const usedRightInspected = Boolean(listing.usedRightInspected);

  return {
    vendorVerification: {
      verified: vendorVerified,
      label: vendorVerified ? 'Verified Vendor' : 'Unverified Vendor',
      detail: vendorVerified
        ? 'Vendor identity and business registration documents are approved on UsedRight.'
        : 'Vendor identity verification is still pending or unverified.',
    },
    originEvidence: {
      reviewed: originReviewed,
      label: originReviewed ? 'Origin Verified' : 'Origin Not Verified',
      detail: originReviewed
        ? `Origin and batch records (${listing.batchReference || 'Import batch'}) were checked.`
        : 'Origin or import batch records have not been verified for this listing.',
    },
    physicalInspection: {
      inspected: usedRightInspected,
      label: usedRightInspected ? 'UsedRight Inspected' : 'Not Physically Inspected by UsedRight',
      detail: usedRightInspected
        ? 'Physically inspected on a UsedRight diagnostic bench prior to listing.'
        : 'Condition details are vendor-declared and covered by your 24-hour post-delivery inspection window.',
    },
  };
}

export function sanitizeVendorFreeText(
  text: string,
  allowsWorksLikeNew: boolean
): { cleaned: string; blockedPhrases: string[] } {
  const blockedPhrases: string[] = [];
  let cleaned = (text || '').trim();
  if (!cleaned) return { cleaned: '', blockedPhrases };

  if (/\bcertified(\s+by\s+usedright)?\b/i.test(cleaned)) {
    blockedPhrases.push('Certified');
    cleaned = cleaned.replace(/\bcertified(\s+by\s+usedright)?\b/gi, 'checked');
  }
  if (/\brefurbished\b/i.test(cleaned)) {
    blockedPhrases.push('Refurbished');
    cleaned = cleaned.replace(/\brefurbished\b/gi, 'pre-owned');
  }
  if (/\brenewed\b/i.test(cleaned)) {
    blockedPhrases.push('Renewed');
    cleaned = cleaned.replace(/\brenewed\b/gi, 'pre-owned');
  }
  if (/\blike\s+new\b/i.test(cleaned) && !/\bworks\s+like\s+new\b/i.test(cleaned)) {
    blockedPhrases.push('Like New');
    cleaned = cleaned.replace(/\blike\s+new\b/gi, 'clean pre-owned');
  }
  if (!allowsWorksLikeNew && /\bworks\s+like\s+new\b/i.test(cleaned)) {
    blockedPhrases.push('Works like new');
    cleaned = cleaned.replace(/\bworks\s+like\s+new\b\.?/gi, 'see disclosed condition details');
  }

  return { cleaned: cleaned.replace(/\s{2,}/g, ' ').trim(), blockedPhrases };
}

export function validateVendorConditionClaims(
  input: ConditionQualificationInput & { descriptionText?: string }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const text = (input.descriptionText || '').trim();
  if (!text) return { valid: true, errors };

  if (/\bcertified(\s+by\s+usedright)?\b/i.test(text)) {
    errors.push('Do not use "Certified" or "Certified by UsedRight" unless officially inspected.');
  }
  if (/\b(refurbished|renewed)\b/i.test(text)) {
    errors.push('Do not classify listings as "Refurbished" or "Renewed". Use Pre-Owned and disclose any replaced parts.');
  }
  if (/\bworks\s+like\s+new\b/i.test(text) && !qualifiesForWorksLikeNew(input)) {
    errors.push(
      'Cannot claim "Works like new" unless the device is Fully Functional with zero limitations, unlocked SIM, original screen, original battery, and all required checks tested.'
    );
  }

  return { valid: errors.length === 0, errors };
}
