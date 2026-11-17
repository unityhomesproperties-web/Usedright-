import { YearMadePrecision } from '../types/marketplace';

/**
 * UsedRight Simple English Utility
 * Translates technical jargon into plain, neutral, customer-friendly explanations
 * without concealing actual hardware conditions or limitations.
 */

export interface SimpleEnglishExplanation {
  label: string;
  explanation: string;
  isIssue: boolean;
}

export const TECHNICAL_TERM_MAP: Record<string, { label: string; explanation: string }> = {
  'Faulty': {
    label: 'Not working',
    explanation: 'This specific feature is currently not working.',
  },
  'Face ID Failure': {
    label: 'Face ID not working',
    explanation: 'You can still unlock and use the phone with its passcode. Face ID is not available.',
  },
  'Face ID Not Working': {
    label: 'Face ID not working',
    explanation: 'You can still unlock and use the phone with its passcode. Face ID is not available.',
  },
  'SIM Locked': {
    label: 'SIM locked to a network',
    explanation: 'This device only works on its original foreign carrier unless unlocked.',
  },
  'Wi-Fi Only': {
    label: 'Works with Wi-Fi only, no SIM',
    explanation: 'This device connects to the internet through Wi-Fi. It cannot use a SIM card for calls or mobile data.',
  },
  'Battery Degradation': {
    label: 'Battery does not last as long',
    explanation: 'The battery holds less charge than when new. You may need to charge the device more often.',
  },
  'Aftermarket Display': {
    label: 'Screen replaced',
    explanation: 'The original screen was replaced with a tested working screen.',
  },
  'Factory OEM Display': {
    label: 'Original screen, verified',
    explanation: 'The original screen fitted by the manufacturer is intact and tested.',
  },
  'Board Soldering / Rework': {
    label: 'Main board repaired',
    explanation: 'The internal main board was professionally repaired and tested to work properly.',
  },
  'Component Replacement': {
    label: 'Part replaced',
    explanation: 'One or more internal parts were replaced with tested compatible parts.',
  },
  'Cosmetic Defects': {
    label: 'Visible wear or scratches',
    explanation: 'The body or glass shows light marks or scratches from previous use.',
  },
  'Activation Lock': {
    label: "Device is linked to another owner's account",
    explanation: 'Important notice: this device is still linked to an owner account.',
  },
  'Not Tested': {
    label: 'Not tested',
    explanation: 'This specific feature has not been tested.',
  },
};

/**
 * Preset disclosed issue options using clear everyday English.
 */
export const PLAIN_ENGLISH_ISSUE_PRESETS: { label: string; description: string }[] = [
  {
    label: 'Screen replaced',
    description: 'Screen replaced. Touch, brightness, and display quality work properly.',
  },
  {
    label: 'Main board repaired',
    description: 'Main board repaired by a technician and tested for normal daily operation.',
  },
  {
    label: 'Battery does not last as long',
    description: 'Battery does not last as long as new and may need more frequent charging.',
  },
  {
    label: 'Face ID not working',
    description: 'Face ID not working. Phone still unlocks normally with passcode.',
  },
  {
    label: 'Wi-Fi works, but SIM does not',
    description: 'Wi-Fi works, but SIM does not accept mobile network cards for calls or data.',
  },
  {
    label: 'SIM locked to a network',
    description: 'SIM locked to a network outside Nigeria. Wi-Fi works normally.',
  },
  {
    label: 'Visible scratches or dents',
    description: 'Visible scratches or light dents on the frame or back cover from normal use.',
  },
  {
    label: 'Speaker or microphone sound reduced',
    description: 'Speaker or microphone volume is softer than normal and works best with earphones.',
  },
];

/**
 * Translates a technical term or status into simple everyday English.
 */
export function toSimpleEnglish(term: string): { label: string; explanation: string } {
  if (!term) {
    return { label: '', explanation: '' };
  }

  if (TECHNICAL_TERM_MAP[term]) {
    return TECHNICAL_TERM_MAP[term];
  }

  const normalized = term.toLowerCase();

  if (normalized.includes('wi-fi only') || normalized.includes('wifi only')) {
    return TECHNICAL_TERM_MAP['Wi-Fi Only'];
  }
  if (normalized.includes('wi-fi works') && normalized.includes('sim does not')) {
    return {
      label: 'Wi-Fi works, but SIM does not',
      explanation: 'Connects normally to Wi-Fi networks, but cannot make SIM calls or use cellular data.',
    };
  }
  if (normalized.includes('sim locked') || normalized.includes('carrier locked')) {
    return {
      label: 'SIM locked to a network',
      explanation: 'Locked to a specific foreign network. Wi-Fi works normally.',
    };
  }
  if (normalized.includes('face id') && (normalized.includes('not working') || normalized.includes('faulty') || normalized.includes('fail'))) {
    return TECHNICAL_TERM_MAP['Face ID Failure'];
  }
  if (normalized.includes('screen replaced') || normalized.includes('replaced screen') || normalized.includes('aftermarket')) {
    return {
      label: 'Screen replaced',
      explanation: 'The display has been replaced and tested to respond cleanly to touch.',
    };
  }
  if (normalized.includes('board') && (normalized.includes('rework') || normalized.includes('solder') || normalized.includes('repaired'))) {
    return {
      label: 'Main board repaired',
      explanation: 'The internal main board has been repaired and tested for everyday stability.',
    };
  }
  if (normalized.includes('battery') && (normalized.includes('service') || normalized.includes('degrad') || normalized.includes('replace') || normalized.includes('last'))) {
    return TECHNICAL_TERM_MAP['Battery Degradation'];
  }
  if (normalized.includes('original') && normalized.includes('verified')) {
    return TECHNICAL_TERM_MAP['Factory OEM Display'];
  }
  if (normalized.includes('not tested')) {
    return TECHNICAL_TERM_MAP['Not Tested'];
  }
  if (normalized.includes('working')) {
    return {
      label: 'Working properly',
      explanation: 'Tested and working normally.',
    };
  }
  if (normalized.includes('faulty') || normalized.includes('not working')) {
    return {
      label: 'Not working',
      explanation: 'This specific feature is not working.',
    };
  }

  return {
    label: sanitizeConditionText(term),
    explanation: 'Condition shared clearly by the vendor.',
  };
}

/**
 * Replaces intimidating hardware jargon in free-text descriptions with clear plain English.
 */
export function sanitizeConditionText(text: string): string {
  if (!text) return '';
  return text
    .replace(/Factory OEM Display/gi, 'Original screen')
    .replace(/Factory OEM/gi, 'Original manufacturer')
    .replace(/Zero Board Soldering/gi, 'No main board repairs')
    .replace(/Board Soldering \/ Rework/gi, 'Main board repaired')
    .replace(/Board Rework/gi, 'Main board repaired')
    .replace(/Battery Degradation/gi, 'Battery does not last as long')
    .replace(/Aftermarket Components/gi, 'Replacement parts')
    .replace(/Aftermarket Display/gi, 'Screen replaced')
    .replace(/Aftermarket/gi, 'Replacement part')
    .replace(/\bESD\b/g, 'static protection')
    .replace(/Hardware Faulty/gi, 'Part not working');
}

/**
 * Formats Model Year and Year Made separately without confusing them.
 */
export function formatYearMadeDisplay(
  modelYear?: number,
  yearMade?: number,
  precision: YearMadePrecision = 'unknown',
  yearPurchased?: number
): {
  modelYearText: string;
  yearMadeText: string;
  yearPurchasedText?: string;
} {
  const modelYearText = modelYear ? `${modelYear} (Model year)` : 'Not specified';
  let yearMadeText = 'Not sure';
  if (precision === 'known' && yearMade) {
    yearMadeText = `${yearMade} (Confirmed)`;
  } else if (precision === 'approximate' && yearMade) {
    yearMadeText = `Approx. ${yearMade}`;
  } else if (yearMade && precision !== 'unknown') {
    yearMadeText = String(yearMade);
  }

  return {
    modelYearText,
    yearMadeText,
    yearPurchasedText: yearPurchased ? String(yearPurchased) : undefined,
  };
}
