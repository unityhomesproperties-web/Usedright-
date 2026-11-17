import { PolicyDocument, PolicySection } from '../types/marketplace';

export const LEGAL_REVIEW_NOTICE =
  'Policy Draft & Legal Review Notice: These marketplace policies are structured operational documents for UsedRight and require formal review and approval by a qualified Nigerian legal practitioner prior to commercial production publication.';

export const PLATFORM_FEE_REVENUE_DISCLOSURE =
  'UsedRight’s Platform Service Fees contribute to the operation and continuous improvement of the marketplace. Revenue generated from these fees may be used at UsedRight’s reasonable business discretion to cover legitimate operating expenses, including employee salaries and operational personnel wages, customer and vendor support, marketplace moderation, software engineering, hosting, infrastructure and security, payment integration operations, device verification quality control, fraud prevention, marketing, legal and accounting services, and general administration. These fees are marketplace service revenue and are not funds held in trust for customers or vendors.';

export const VENDOR_REGISTRATION_DECLARATIONS: string[] = [
  'I understand that UsedRight is a marketplace for foreign-used devices and that I must not misrepresent locally used devices as foreign-used.',
  'I will provide accurate product information and genuine photographs of the actual device or clearly identify any representative image.',
  'I will disclose all known defects, limitations, repairs, replacements and missing features.',
  'I will not substitute a different device without the customer’s explicit approval.',
  'I will honour the listed price and the confirmed order details.',
  'I will follow UsedRight’s delivery and fulfilment rules.',
  'I understand that delivery is my responsibility when I choose to arrange my own dispatcher.',
  'I will provide valid delivery and tracking information where available.',
  'I will cooperate with customer complaints and dispute investigations.',
  'I will follow UsedRight’s returns, refunds, replacement and warranty policies.',
  'I understand the Vendor Platform Service Fee and the maximum applicable rate of 1%.',
  'I understand that UsedRight may use platform fee revenue to cover legitimate operating expenses, including necessary staff salaries, technology, support, administration and marketplace maintenance.',
  'I will not manipulate reviews, submit fake orders, engage in fraud or mislead customers.',
  'I will protect my account and keep my login credentials secure.',
  'I understand that policy updates may require renewed acceptance where appropriate.',
];

export const VENDOR_FINAL_CONSENT_LABEL =
  'I have read and agree to the UsedRight Vendor Agreement and applicable marketplace policies.';

const EFFECTIVE_DATE = '2026-11-16';
const LAST_UPDATED = '2026-11-16';
const DEFAULT_VERSION = '1.0.0';

function makeDoc(params: {
  number: number;
  slug: string;
  title: string;
  category: PolicyDocument['category'];
  summary: string;
  relatedSlugs: string[];
  requiresVendorReacceptance?: boolean;
  sections: PolicySection[];
}): PolicyDocument {
  return {
    id: `pol-${params.number}-${params.slug}`,
    slug: params.slug,
    number: params.number,
    title: params.title,
    category: params.category,
    summary: params.summary,
    currentVersion: DEFAULT_VERSION,
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    status: 'Published',
    requiresVendorReacceptance: Boolean(params.requiresVendorReacceptance),
    relatedSlugs: params.relatedSlugs,
    sections: params.sections,
    versions: [
      {
        version: DEFAULT_VERSION,
        status: 'Published',
        effectiveDate: EFFECTIVE_DATE,
        publishedAt: EFFECTIVE_DATE,
        updatedBy: 'Adaobi Nwosu (UsedRight Policy Admin)',
        changeSummary: 'Initial comprehensive v1.0.0 baseline aligned with vendor-managed delivery and approved 0.7% / 1.0% fee caps.',
        requiresVendorReacceptance: Boolean(params.requiresVendorReacceptance),
        sections: params.sections,
      },
    ],
  };
}

export const INITIAL_POLICIES: PolicyDocument[] = [
  makeDoc({
    number: 1,
    slug: 'about-usedright',
    title: 'About UsedRight',
    category: 'Core Terms',
    summary: 'Who UsedRight is, our brand promise ("Know Exactly What You’re Buying."), and how our Nigerian verified foreign-used electronics marketplace operates.',
    relatedSlugs: ['customer-terms-and-conditions', 'vendor-agreement', 'foreign-used-device-policy'],
    sections: [
      {
        heading: '1. Marketplace Mission & Brand Promise',
        paragraphs: [
          'UsedRight (shopusedright.com) is a Nigerian technology marketplace built to bring clarity, verifiable device histories, and honest pricing to foreign-used smartphones, laptops, tablets, audio gear, cameras, and accessories.',
          'Our core brand promise is "Know Exactly What You’re Buying." Every device listing must state exact specifications, cosmetic grade, functional status, known defects, battery condition, and origin before checkout.',
        ],
      },
      {
        heading: '2. Marketplace Role',
        paragraphs: [
          'UsedRight acts as an online marketplace platform connecting Nigerian buyers with identity-verified electronics merchants. UsedRight facilitates product discovery, transparent disclosures, order management, payment collection and reconciliation, Delivery Verification Code confirmation, and dispute review.',
          'UsedRight does not operate its own delivery fleet at this stage; independent vendors arrange dispatch through their own riders or third-party logistics partners.',
        ],
      },
      {
        heading: '3. Legal Review Notice',
        paragraphs: [LEGAL_REVIEW_NOTICE],
      },
    ],
  }),
  makeDoc({
    number: 2,
    slug: 'customer-terms-and-conditions',
    title: 'Customer Terms and Conditions',
    category: 'Core Terms',
    summary: 'Clear rules governing browsing, ordering, multi-vendor checkout, pricing, delivery verification, and post-purchase rights on UsedRight.',
    relatedSlugs: ['customer-platform-service-fee-policy', 'delivery-and-dispatch-policy', 'returns-and-refunds-policy'],
    sections: [
      {
        heading: '1. Eligibility & Account Accuracy',
        paragraphs: [
          'By placing an order on UsedRight, you confirm that you are legally permitted to enter transactions in Nigeria and that your full name, valid Nigerian phone number, email address, and delivery or pickup details are accurate.',
        ],
      },
      {
        heading: '2. Orders, Pricing & Multi-Vendor Fulfilment',
        paragraphs: [
          'When you purchase from multiple merchants in one cart, you make one consolidated payment covering a Parent Order and separate Vendor Sub-Orders. Each vendor fulfils their own items independently.',
          'All monetary prices are stated in Nigerian Naira (₦). Before payment, UsedRight shows the product subtotal, Customer Platform Service Fee (capped at 0.7%), itemized per-vendor delivery fees, and the exact payable total.',
        ],
      },
      {
        heading: '3. Delivery Verification & Inspection',
        paragraphs: [
          'For dispatched or pickup orders, you will receive a confidential one-time Delivery Verification Code. Never disclose this code to any dispatcher, courier, or vendor before physically receiving your package.',
          'Confirming delivery receipt initiates the 24-hour inspection period to inspect the item against listing disclosures without waiving your statutory rights under Nigerian law.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 3,
    slug: 'vendor-agreement',
    title: 'Vendor Agreement',
    category: 'Core Terms',
    summary: 'Commercial, listing, fulfilment, delivery, warranty, fee, and compliance obligations accepted by every UsedRight vendor.',
    relatedSlugs: ['vendor-platform-service-fee-policy', 'foreign-used-device-policy', 'vendor-rights-and-responsibilities'],
    requiresVendorReacceptance: true,
    sections: [
      {
        heading: '1. Mandatory Onboarding & Honest Representation',
        paragraphs: [
          'Before listing devices or selling on UsedRight, vendors must explicitly accept all 15 onboarding declarations and this Vendor Agreement, and remain distinct from administrative identity approval.',
          'Vendors must never list locally used (Nigeria-used) electronics as foreign-used, must not alter serials or IMEIs, and must disclose every known limitation, replacement part, SIM lock, or Wi-Fi-only status.',
        ],
      },
      {
        heading: '2. Vendor-Managed Fulfilment & Fixed Delivery Rules',
        paragraphs: [
          'Because UsedRight does not currently operate an internal logistics fleet, vendors are responsible for arranging safe dispatch through personal dispatchers or vetted third-party couriers after payment confirmation.',
          'Vendors cannot mark an order as Delivered directly; delivery is confirmed through verification of the customer’s one-time Delivery Verification Code or documented UsedRight Admin intervention.',
        ],
      },
      {
        heading: '3. Vendor Platform Service Fee & Revenue Allocation',
        paragraphs: [
          'Successful sales are subject to the Vendor Platform Service Fee (maximum 1.0% of eligible product value, excluding delivery charges), or a lower rate configured for your storefront.',
          PLATFORM_FEE_REVENUE_DISCLOSURE,
        ],
      },
    ],
  }),
  makeDoc({
    number: 4,
    slug: 'foreign-used-device-policy',
    title: 'Foreign-Used Device Policy',
    category: 'Devices & Warranty',
    summary: 'Strict eligibility standards requiring genuine foreign-used origin, airway bill / manifest traceability, and clear distinction of verification types.',
    relatedSlugs: ['product-listing-and-disclosure-policy', 'device-condition-and-verification-policy', 'prohibited-activities-policy'],
    sections: [
      {
        heading: '1. Origin Standards',
        paragraphs: [
          'UsedRight focuses on verified foreign-used smartphones, laptops, tablets, audio devices, gaming hardware, cameras, and accessories sourced outside Nigeria (such as US, UK, EU, Canada, or Japan off-lease and carrier consignments).',
          'Nigeria-used or privately traded local devices must never be disguised or submitted under foreign-used batches.',
        ],
      },
      {
        heading: '2. Distinct Verification Processes',
        paragraphs: [
          'UsedRight separates verification layers so customers are never misled:',
        ],
        bullets: [
          'Vendor identity verification (KYC/CAC business registration checks).',
          'Foreign-use import declaration and airway bill / consignment manifest review.',
          'Device condition inspection report submitted per unit or grade.',
          'IMEI, iCloud/Activation Lock, MDM, or SIM network-status checks where applicable.',
          'Repair and replacement-part history disclosures.',
        ],
      },
      {
        heading: '3. Honest Physical Inspection Labelling',
        paragraphs: [
          'An identity-verified vendor badge indicates merchant verification—not that UsedRight staff physically handled every unit unless explicitly logged as physically inspected with recorded evidence.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 5,
    slug: 'product-listing-and-disclosure-policy',
    title: 'Product Listing and Disclosure Policy',
    category: 'Devices & Warranty',
    summary: 'Mandatory specification fields, defect visibility, simple condition labels, actual-unit photos, and strict no-unapproved-substitution rules.',
    relatedSlugs: ['foreign-used-device-policy', 'device-condition-and-verification-policy', 'returns-and-refunds-policy'],
    sections: [
      {
        heading: '1. Mandatory Listing Fields & Prominent Defect Alerts',
        paragraphs: [
          'Every listing must state accurate model, storage/RAM, colour, cosmetic grade (Grade A/B/C/D), battery health percentage or explicit unavailability, screen/battery replacement history, Face ID/biometric state, SIM lock/carrier country, and included accessories.',
          'Critical limitations (e.g., SIM Locked, Wi-Fi Only, Non-Working Face ID, Battery Below 80%) must appear prominently in clear plain language—never buried inside prose.',
        ],
      },
      {
        heading: '2. Visual Evidence Distinction',
        paragraphs: [
          'Each image in a product gallery is clearly labelled as either an Actual Unit Photo taken of the specific item or a Representative Model Photo used for general reference.',
        ],
      },
      {
        heading: '3. Zero Unapproved Substitutions',
        paragraphs: [
          'Dispatching a different model, capacity, colour, or lower cosmetic grade without prior explicit written customer approval in Transaction Chat is an unapproved substitution and qualifies for cancellation/refund.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 6,
    slug: 'device-condition-and-verification-policy',
    title: 'Device Condition and Verification Policy',
    category: 'Devices & Warranty',
    summary: 'Definitions of Grade A, Grade B, Grade C, and Grade D plus standardized component statuses ("Working", "Not working", "Replaced").',
    relatedSlugs: ['product-listing-and-disclosure-policy', 'warranty-policy'],
    sections: [
      {
        heading: '1. Cosmetic Grading Standards',
        paragraphs: [
          'UsedRight classifies devices consistently across all listings, carts, checkouts, and order history snapshots:',
        ],
        bullets: [
          'Excellent (Grade A): Clean glass and body with near-invisible hairline wear from normal inspection distances; all core hardware tested.',
          'Great (Grade B): Light visible micro-scuffs or faint bezel wear balanced with substantial price savings and full functional disclosure.',
          'Good (Grade C): Visible exterior wear, lower battery capacity (<80%), or disclosed secondary component defects priced transparently for value.',
          'Fair / Value (Grade D): Heavy cosmetic marks or hardware faults itemized in red prior to checkout.',
        ],
      },
      {
        heading: '2. Immutable Order Condition Snapshots',
        paragraphs: [
          'At checkout, UsedRight records an immutable snapshot of the selected variant, price, and condition disclosures on the order record so later vendor listing edits never overwrite what you bought.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 7,
    slug: 'returns-and-refunds-policy',
    title: 'Returns and Refunds Policy',
    category: 'Devices & Warranty',
    summary: 'How wrong items, undisclosed defects, vendor cancellations, change-of-mind requests, return delivery responsibility, and prorated fee refunds work.',
    relatedSlugs: ['replacement-policy', 'complaints-and-dispute-resolution-policy', 'customer-platform-service-fee-policy'],
    sections: [
      {
        heading: '1. Qualifying Issues',
        paragraphs: [
          'Customers may submit evidence-backed return or refund claims for: wrong model/storage/colour/grade delivered, undisclosed hardware defects, unapproved substitutions, SIM locks not listed before purchase, missing advertised accessories, or non-delivery.',
          'Limitations clearly disclosed in writing prior to checkout do not automatically qualify as undisclosed defects unless statutory consumer protections apply.',
        ],
      },
      {
        heading: '2. Refund Accounting & Fee Proration',
        paragraphs: [
          'Cancelled or unfulfilled orders do not attract retained completed-sale platform fees. Full refunds adjust applicable Customer Platform Service Fees and Vendor Platform Service Fees proportionally; partial refunds adjust platform fees pro rata.',
          'Refunds are only recorded as Completed once confirmed by the payment processor or settlement reconciliation workflow.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 8,
    slug: 'replacement-policy',
    title: 'Replacement Policy',
    category: 'Devices & Warranty',
    summary: 'Conditions under which a vendor may offer an equal-or-better inspected unit swap instead of a refund.',
    relatedSlugs: ['returns-and-refunds-policy', 'warranty-policy'],
    sections: [
      {
        heading: '1. Consent-Based Replacement',
        paragraphs: [
          'If a confirmed issue occurs during the inspection period or active warranty window and the customer prefers a swap, the vendor may propose an exact matching replacement unit verified by serial/IMEI and photos before shipping.',
          'Customers are never forced to accept a lower grade, different colour, or substitute model when a full refund is requested for a verified vendor breach.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 9,
    slug: 'warranty-policy',
    title: 'Warranty Policy',
    category: 'Devices & Warranty',
    summary: 'Default vendor warranty terms, coverage scope, exclusions, claim steps, and protection of statutory consumer rights.',
    relatedSlugs: ['device-condition-and-verification-policy', 'returns-and-refunds-policy'],
    sections: [
      {
        heading: '1. Standard Vendor Warranty Terms',
        paragraphs: [
          'Eligible devices carry the vendor’s stated hardware warranty duration (proposed default minimum benchmark: 90 days / 3 months for eligible core hardware categories subject to legal review and listing configuration), beginning on the confirmed delivery date.',
        ],
      },
      {
        heading: '2. Coverage & Statutory Rights',
        paragraphs: [
          'Warranty covers unforeseen motherboard, logic board, or factory component faults outside customer-caused physical impact, liquid submergence, or unauthorized third-party tampering.',
          'No vendor warranty may reduce or waive a customer’s mandatory consumer protection rights under Nigerian law.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 10,
    slug: 'delivery-and-dispatch-policy',
    title: 'Delivery and Dispatch Policy',
    category: 'Delivery & Inspection',
    summary: 'Vendor-managed dispatch model, fixed delivery fees per distinct vendor, In-Store Pickup rules, and delivery verification safeguards.',
    relatedSlugs: ['inspection-and-delivery-verification-policy', 'payments-and-settlement-policy'],
    requiresVendorReacceptance: true,
    sections: [
      {
        heading: '1. Vendor-Managed Logistics Model',
        paragraphs: [
          'UsedRight does not operate its own delivery fleet at this stage. Vendors arrange delivery through their own dispatch riders or trusted external couriers and must provide the dispatcher/courier name, tracking reference, dispatch date, expected delivery window, and packaging notes.',
          'In multi-vendor carts, each vendor sub-order ships independently on its own schedule.',
        ],
      },
      {
        heading: '2. Fixed Delivery Fees & In-Store Pickup',
        paragraphs: [
          'UsedRight applies a transparent admin-configured Fixed Delivery Fee (default ₦3,000) per distinct vendor sub-order—even if multiple items are bought from the same vendor—and ₦0 when In-Store Pickup is selected.',
          'Delivery charges are always excluded from Customer Platform Service Fee and Vendor Platform Service Fee calculations.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 11,
    slug: 'payments-and-settlement-policy',
    title: 'Payments and Settlement Policy',
    category: 'Fees & Payments',
    summary: 'Consolidated multi-vendor payment collection, Paystack verification, idempotency, separate provider fee tracking, and transparent settlement status.',
    relatedSlugs: ['customer-platform-service-fee-policy', 'vendor-platform-service-fee-policy', 'inspection-and-delivery-verification-policy'],
    sections: [
      {
        heading: '1. Consolidated Payment & Independent Vendor Allocation',
        paragraphs: [
          'Customers pay once per checkout via Paystack (or Demo Mode simulator during testing), creating one Parent Order and separate Vendor Sub-Orders with immutable pricing and fee snapshots.',
          'Failed payments never create paid orders. Webhook and verify endpoints enforce idempotency keys so duplicate payment notifications cannot double-charge or duplicate orders.',
        ],
      },
      {
        heading: '2. Payment Provider Charges vs Platform Revenue',
        paragraphs: [
          'Third-party gateway processing charges (such as Paystack fees) are tracked separately from UsedRight’s Platform Service Fees and are never disguised as platform service revenue.',
          'While automated split-settlement holds require formal payment-provider onboarding in production, UsedRight transparently records approved net payouts, open-dispute holds, and settlement readiness states.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 12,
    slug: 'customer-platform-service-fee-policy',
    title: 'Customer Platform Service Fee Policy',
    category: 'Fees & Payments',
    summary: 'Plain-English explanation of the Customer Platform Service Fee (maximum 0.7% of eligible product value, delivery excluded).',
    relatedSlugs: ['vendor-platform-service-fee-policy', 'payments-and-settlement-policy', 'complaints-and-dispute-resolution-policy'],
    sections: [
      {
        heading: '1. Purpose & Plain-English Explanation',
        paragraphs: [
          'The Customer Platform Service Fee is a small charge for the marketplace services provided by UsedRight to support your purchase.',
          'These services contribute to the operation and maintenance of the marketplace, order processing, transaction records, customer support, administration and access to UsedRight’s complaint and dispute-resolution process.',
          'The fee is calculated as a percentage of the eligible product value and may be lower than the maximum published rate.',
        ],
      },
      {
        heading: '2. Maximum Rate Cap & Transparency Rules',
        paragraphs: [
          'The maximum Customer Platform Service Fee rate is 0.7% of eligible product subtotal (excluding delivery fees and separately disclosed third-party fees).',
          'For example, on a ₦250,000 product with ₦3,000 fixed delivery, at the maximum 0.7% rate the Customer Platform Service Fee is ₦1,750, making total payable ₦254,750.',
          'This fee is NOT an insurance premium, fiduciary escrow trust charge, or guaranteed refund guarantee.',
        ],
      },
      {
        heading: '3. Revenue Usage Disclosure',
        paragraphs: [PLATFORM_FEE_REVENUE_DISCLOSURE],
      },
    ],
  }),
  makeDoc({
    number: 13,
    slug: 'vendor-platform-service-fee-policy',
    title: 'Vendor Platform Service Fee Policy',
    category: 'Fees & Payments',
    summary: 'Plain-English explanation of the Vendor Platform Service Fee (maximum 1.0% of eligible product value, excluding delivery).',
    relatedSlugs: ['customer-platform-service-fee-policy', 'vendor-agreement', 'payments-and-settlement-policy'],
    requiresVendorReacceptance: true,
    sections: [
      {
        heading: '1. Purpose & Plain-English Explanation',
        paragraphs: [
          'The Vendor Platform Service Fee is a charge for the marketplace services provided by UsedRight to support your selling activities.',
          'These services contribute to marketplace access, product listing, customer reach, order management, transaction records, platform maintenance, vendor support and marketplace administration.',
          'The fee is calculated as a percentage of the eligible product value of a successful sale and may be lower than the maximum published rate.',
        ],
      },
      {
        heading: '2. Rate Limits, Negotiated Discounts & Snapshots',
        paragraphs: [
          'The maximum Vendor Platform Service Fee rate is 1.0% of eligible product value (combined maximum revenue across both customer 0.7% and vendor 1.0% rates never exceeds 1.7%). Delivery fees are always excluded.',
          'Admin may configure promotional or vendor-specific negotiated rates below 1.0%, and every order stores an immutable fee snapshot at creation so historical orders are never retroactively increased.',
        ],
      },
      {
        heading: '3. Use of Platform Service Revenue',
        paragraphs: [PLATFORM_FEE_REVENUE_DISCLOSURE],
      },
    ],
  }),
  makeDoc({
    number: 14,
    slug: 'inspection-and-delivery-verification-policy',
    title: 'Inspection and Delivery Verification Policy',
    category: 'Delivery & Inspection',
    summary: 'How the confidential one-time Delivery Verification Code and 24-hour inspection period protect both customer receipt and vendor accountability.',
    relatedSlugs: ['delivery-and-dispatch-policy', 'complaints-and-dispute-resolution-policy'],
    sections: [
      {
        heading: '1. Confidential Delivery Verification Code',
        paragraphs: [
          'When a vendor marks a sub-order Dispatched or Ready for Pickup, UsedRight generates a cryptographically random, single-use, expiring Delivery Verification Code distinct from your order reference, sub-order number, payment reference, and courier tracking number.',
          'Keep this code confidential until the package is physically in your hands. Only share it once you confirm your parcel has arrived. Giving the code confirms physical receipt—it does NOT waive your right to inspect the device or report a defect.',
        ],
      },
      {
        heading: '2. Brute-Force & Override Safeguards',
        paragraphs: [
          'Codes are hashed on the server, restricted to the assigned vendor shipment, invalidated immediately upon successful verification, and locked after 5 failed entry attempts. Authorised UsedRight Admins may override stalled deliveries only with a logged justification.',
        ],
      },
      {
        heading: '3. 24-Hour Post-Delivery Inspection Window',
        paragraphs: [
          'The 24-hour inspection timer starts strictly upon verified delivery/collection—never at payment, vendor acceptance, or dispatch. Customers may report problems at any time during the window (and statutory remedies remain intact beyond 24 hours).',
        ],
      },
    ],
  }),
  makeDoc({
    number: 15,
    slug: 'complaints-and-dispute-resolution-policy',
    title: 'Complaints and Dispute Resolution Policy',
    category: 'Delivery & Inspection',
    summary: 'Structured dispute intake, evidence preservation, vendor response, Admin moderation, and fair resolution outcomes.',
    relatedSlugs: ['returns-and-refunds-policy', 'inspection-and-delivery-verification-policy'],
    sections: [
      {
        heading: '1. Reporting Order & Delivery Problems',
        paragraphs: [
          'Customers can report wrong devices, undisclosed defects, missing accessories, non-delivery, damaged parcels, overdue dispatch, unapproved substitutions, or request delivery rescheduling.',
          'Opening a dispute immediately pauses inspection timers and flags vendor payout release for review.',
        ],
      },
      {
        heading: '2. Independent Review & Audit Trail',
        paragraphs: [
          'Vendors cannot delete or unilaterally close customer complaints. Both parties submit photo/video/courier evidence in Transaction Chat while UsedRight Administrators maintain timestamped investigation logs and internal review notes before issuing a decision.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 16,
    slug: 'customer-rights-and-responsibilities',
    title: 'Customer Rights and Responsibilities',
    category: 'Core Terms',
    summary: 'Clear summary of buyer entitlements and responsible marketplace conduct.',
    relatedSlugs: ['customer-terms-and-conditions', 'inspection-and-delivery-verification-policy'],
    sections: [
      {
        heading: '1. Customer Rights',
        paragraphs: [
          'Every buyer on UsedRight is entitled to truthful specifications, upfront defect alerts, transparent pricing with exact fee itemisation, verified delivery tracking, 24-hour physical inspection upon verified delivery, and fair complaint review.',
        ],
      },
      {
        heading: '2. Customer Responsibilities',
        paragraphs: [
          'Customers must provide accurate Nigerian delivery contact details, keep their Delivery Verification Code secret until physical handover, avoid abusive or fraudulent claims, and keep payments and transaction chats on-platform.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 17,
    slug: 'vendor-rights-and-responsibilities',
    title: 'Vendor Rights and Responsibilities',
    category: 'Core Terms',
    summary: 'Merchant protections, settlement visibility, and strict obligations for inventory honesty and dispatch.',
    relatedSlugs: ['vendor-agreement', 'vendor-platform-service-fee-policy', 'prohibited-activities-policy'],
    sections: [
      {
        heading: '1. Vendor Rights',
        paragraphs: [
          'Approved vendors have the right to list qualifying foreign-used hardware, see clear fee calculations before accepting orders, respond to disputes with courier or lab evidence, and access accurate settlement ledgers.',
        ],
      },
      {
        heading: '2. Vendor Responsibilities',
        paragraphs: [
          'Vendors must ship the exact item ordered within agreed timelines, protect customer phone/address privacy, honour warranties, and absorb return logistics where a listing discrepancy or unapproved substitution is confirmed.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 18,
    slug: 'reviews-and-ratings-policy',
    title: 'Reviews and Ratings Policy',
    category: 'Privacy & Safety',
    summary: 'Verified-purchase review integrity, anti-manipulation safeguards, and moderation rules.',
    relatedSlugs: ['prohibited-activities-policy', 'customer-rights-and-responsibilities'],
    sections: [
      {
        heading: '1. Verified Purchase Requirement',
        paragraphs: [
          'Only customers with qualifying orders may publish ratings across condition accuracy, delivery speed, communication, and packaging.',
          'UsedRight prohibits paid reviews, self-dealing orders, harassment, or removal of genuine negative reviews simply because a vendor disagrees with honest buyer feedback.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 19,
    slug: 'prohibited-activities-policy',
    title: 'Prohibited Activities Policy',
    category: 'Privacy & Safety',
    summary: 'Zero-tolerance prohibitions against stolen/counterfeit devices, mislabelled local units, off-platform payment evasion, and fraud.',
    relatedSlugs: ['foreign-used-device-policy', 'vendor-agreement', 'privacy-policy'],
    sections: [
      {
        heading: '1. Strictly Prohibited Conduct',
        paragraphs: [
          'Accounts will be suspended or referred for investigation if involved in: counterfeit goods, stolen or blacklisted IMEIs, local devices passed off as foreign-used, doctored photos or identity files, undisclosed major defects, unapproved substitutions, fake orders/reviews, off-platform bank transfer solicitation, or misuse of customer contact data.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 20,
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    category: 'Privacy & Safety',
    summary: 'How UsedRight collects, secures, limits, retains, and protects personal, KYC, and transaction data in alignment with Nigerian data-protection principles.',
    relatedSlugs: ['cookie-policy', 'usedright-rights-and-responsibilities'],
    sections: [
      {
        heading: '1. Data Collection & Minimisation',
        paragraphs: [
          'UsedRight collects only necessary identity, contact, delivery address, and payment reconciliation metadata needed to fulfil orders, prevent fraud, verify vendor authenticity, and resolve disputes.',
          'Vendor KYC documents (NIN/CAC) and buyer phone/address records are restricted by role-based access controls and are never publicly exposed on storefronts or unauthenticated APIs.',
        ],
      },
      {
        heading: '2. Rights & Retention',
        paragraphs: [
          'Users may request data review or correction through Profile / Support settings. Transaction and audit records are retained as needed for dispute resolution, accounting reconciliation, and Nigerian legal compliance.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 21,
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    category: 'Privacy & Safety',
    summary: 'Use of essential local storage and session cookies for cart state, authentication, saved addresses, and Nigerian state preferences.',
    relatedSlugs: ['privacy-policy', 'about-usedright'],
    sections: [
      {
        heading: '1. Essential Storage & Session Tokens',
        paragraphs: [
          'UsedRight uses essential browser storage and HTTP session state to remember your shopping cart, Nigerian state filter, saved delivery addresses, and signed-in role without third-party invasive ad-tracking networks.',
        ],
      },
    ],
  }),
  makeDoc({
    number: 22,
    slug: 'usedright-rights-and-responsibilities',
    title: 'UsedRight’s Rights and Responsibilities',
    category: 'Core Terms',
    summary: 'Platform governance powers, fee-administration bounds, dispute neutrality, security safeguards, and operational commitments.',
    relatedSlugs: ['about-usedright', 'vendor-agreement', 'complaints-and-dispute-resolution-policy'],
    sections: [
      {
        heading: '1. Platform Responsibilities',
        paragraphs: [
          'UsedRight commits to enforcing published Platform Service Fee caps (maximum 0.7% customer / 1.0% vendor), preserving immutable historical order and fee snapshots, maintaining transparent audit logs, and reviewing disputes impartially.',
        ],
      },
      {
        heading: '2. Governance & Enforcement Rights',
        paragraphs: [
          'UsedRight reserves the right to pause listings lacking mandatory disclosures, restrict violating accounts, override stalled deliveries with documented admin justification, and update platform policies with clear versioning and notice.',
        ],
      },
    ],
  }),
];
