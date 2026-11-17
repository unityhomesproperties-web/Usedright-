export type DefaultCategoryId =
  | 'phones'
  | 'laptops'
  | 'tablets'
  | 'smartwatches'
  | 'audio'
  | 'gaming'
  | 'cameras'
  | 'computer_accessories'
  | 'accessories';

export type Category = DefaultCategoryId | (string & {});

export interface CategoryConfig {
  id: Category;
  label: string;
  shortLabel: string;
  description: string;
  brands: string[];
  enabled: boolean;
  sortOrder: number;
}

export type DeviceCondition = 'Foreign-Used' | 'Brand-New';

export type CosmeticGrade = 'Grade A' | 'Grade B' | 'Grade C' | 'Grade D';

export type YearMadePrecision = 'known' | 'approximate' | 'unknown';

export type FunctionalStatus =
  | 'Working'
  | 'Not working'
  | 'Replaced'
  | 'Original, verified'
  | 'Replacement part'
  | 'Unknown'
  | 'Not tested'
  | 'Not applicable';

export interface ProductVariation {
  id: string;
  color: string;
  colour?: string;
  storage?: string;
  ram?: string;
  processor?: string;
  screenSize?: string;
  grade: CosmeticGrade;
  cosmeticGrade?: CosmeticGrade;
  price: number;
  originalPrice?: number;
  stockQuantity: number;
  isAvailable: boolean;
  conditionSummary?: string;
  images?: string[];
  batteryHealth?: number;
  disclosedFaults?: string[];
  disclosedFaultsList?: DisclosedFault[];
  simStatus?: string;
  unitLabel?: string;
}

export interface PriceChangeRecord {
  id: string;
  listingId: string;
  oldPrice: number;
  newPrice: number;
  changedAt?: string;
  reason?: string;
  changedBy?: string;
  timestamp?: string;
}

export interface DisclosedFault {
  id?: string;
  label: string;
  description: string;
  isCritical?: boolean;
}

export interface SimLockDetails {
  status: 'Unlocked' | 'Locked' | 'Wi-Fi Only';
  country?: string;
  carrier?: string;
  unlockConfirmed?: boolean;
  notes?: string;
}

export interface AccessoryItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category:
    | 'case'
    | 'screen_protector'
    | 'charger'
    | 'sleeve'
    | 'cable'
    | 'band'
    | 'adapter'
    | 'power_bank'
    | 'stand'
    | 'chargers'
    | 'pouches'
    | 'bags'
    | 'screen_guards'
    | 'cables'
    | 'power_banks';
  compatibleWith?: string[];
  compatibleDevices?: string[];
  stockQuantity?: number;
  inStock?: boolean;
  quantity?: number;
  condition?: string;
  vendorId?: string;
  vendorName?: string;
}

export interface FreeGiftPromotion {
  title: string;
  description: string;
  value: number;
  eligible: boolean;
}

export interface StructuredDescription {
  overview: string;
  specsSummary?: string;
  includedItems?: string;
  productCondition?: string;
  previousRepairs?: string;
  knownLimitations?: string;
  thingsToKnow?: string;
  recommendedUse?: string;
  compatibilityInfo?: string;
}

export interface PhoneConditionReport {
  batteryHealth: number;
  batteryReplaced: 'Original' | 'Replaced' | 'Unknown';
  screenOriginality: string;
  screenReplacementHistory: string;
  faceIdOrFingerprint: 'Working' | 'Faulty' | 'Not working' | 'Not applicable';
  frontCamera: 'Working' | 'Faulty' | 'Not working' | 'Not tested' | 'Not applicable';
  rearCamera: 'Working' | 'Faulty' | 'Not working' | 'Not tested' | 'Not applicable';
  speakers: 'Working' | 'Faulty' | 'Not working' | 'Not tested' | 'Not applicable';
  microphone: 'Working' | 'Faulty' | 'Not working' | 'Not tested' | 'Not applicable';
  chargingPort: 'Working' | 'Faulty' | 'Not working' | 'Not tested' | 'Not applicable';
  wifi: 'Working' | 'Faulty' | 'Not working' | 'Not tested' | 'Not applicable';
  bluetooth: 'Working' | 'Faulty' | 'Not working' | 'Not tested' | 'Not applicable';
  simFunctionality: 'Working' | 'Faulty' | 'Not working' | 'Not tested' | 'Not applicable';
  networkLockStatus: 'Unlocked' | 'Carrier Locked';
  icloudOrGoogleLock: 'Clean & Removed' | 'Locked' | 'Pending Verification';
  mdmStatus: 'No MDM / Clean' | 'MDM Enrolled';
  imeiVerificationStatus: 'Verified Clean' | 'Under Review' | 'Flagged';
  otherRepairsNotes: string;
  knownFaults?: DisclosedFault[];
}

export interface LaptopConditionReport {
  batteryCondition: 'Normal / Healthy' | 'Service Recommended' | 'Replace Soon' | 'Not tested';
  batteryCycleCount: number;
  batteryHealth?: number;
  screenCondition: 'Flawless' | 'Minor Scratches' | 'Dead Pixels' | 'Delamination' | 'Replaced';
  keyboard: 'All Keys Working' | 'Sticky/Faulty Keys' | 'Backlight Defective' | string;
  trackpad: 'Working' | 'Faulty' | 'Not working' | 'Not tested';
  speakers: 'Working' | 'Faulty' | 'Not working' | 'Not tested';
  microphone: 'Working' | 'Faulty' | 'Not working' | 'Not tested';
  webcam: 'Working' | 'Faulty' | 'Not working' | 'Not tested';
  wifi: 'Working' | 'Faulty' | 'Not working' | 'Not tested';
  bluetooth: 'Working' | 'Faulty' | 'Not working' | 'Not tested';
  usbPorts: 'All Working' | 'Partial Working' | 'Faulty';
  hdmiOrThunderbolt: 'Working' | 'Faulty' | 'Not applicable';
  charging: 'Working' | 'Faulty' | 'Not working' | 'Not tested';
  ssdOrHddCondition: 'Healthy (100% SMART)' | 'Good' | 'Degraded' | string;
  ramSpecification: string;
  processorSpecification: string;
  operatingSystem: string;
  biosOrFirmwareLock: 'Unlocked / Clean' | 'Locked';
  activationOrManagementLock: 'Clean / None' | 'Enrolled';
  otherRepairsNotes: string;
  knownFaults?: DisclosedFault[];
  graphics?: string;
  keyboardLayout?: string;
  touchscreen?: string;
}

export interface RepairItem {
  component: string;
  status: 'Original' | 'Replaced OEM' | 'Replaced Aftermarket' | 'Replaced' | 'Repaired' | 'Unknown';
  notes?: string;
}

export interface ProductColorSwatch {
  name: string;
  hex: string;
  image?: string;
}

export type PromoBadgeType =
  | 'DEAL OF THE WEEK'
  | 'BUNDLE DEAL'
  | 'COMBO DEAL'
  | 'GIFT PACK'
  | 'FREE CHARGER'
  | 'STARTER PACK';

export interface BundleItemSummary {
  listingId: string;
  title: string;
  image: string;
  price: number;
}


export interface DeviceListing {
  id: string;
  category: Category;
  condition: DeviceCondition;
  title: string;
  brand: string;
  model: string;
  modelNumber?: string;
  modelYear?: number;
  yearMade?: number;
  yearMadePrecision?: YearMadePrecision;
  yearPurchased?: number;
  operatingSystem?: string;
  storage?: string;
  storageCapacity?: string;
  ram?: string;
  color: string;
  price: number;
  originalPrice?: number;
  originalEstimatedPrice?: number;
  cosmeticGrade: CosmeticGrade;
  cosmeticDescription?: string;
  batteryHealth?: number;
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerState?: string;
  sellerVerified: boolean;
  sellerRating: number;
  sellerSalesCount: number;
  foreignUsedStatus: 'Verified Foreign-Used' | 'Under Review' | 'Evidence Required';
  sourceCountry: string;
  batchReference: string;
  simStatus?: string;
  simLockDetails?: SimLockDetails;
  isWifiOnly?: boolean;
  faceIdStatus?: string;
  processor?: string;
  screenSize?: string;
  imeiOrSerial: string;
  disclosedFaults: string[];
  disclosedFaultsList?: DisclosedFault[];
  thingsToKnow?: string[];
  vendorDosAndDonts?: string[];
  structuredDescription?: StructuredDescription;
  categorySpecs?: Record<string, string>;
  conditionReport: PhoneConditionReport | LaptopConditionReport;
  repairHistory: RepairItem[];
  warrantyDays: number;
  warrantyPolicyNotes: string;
  deliveryFee: number;
  freeDeliveryEligible: boolean;
  status: 'Active' | 'Paused' | 'Pending Review' | 'Draft' | 'Sold' | 'Archived';
  displayOrder?: number;
  rejectionReason?: string;
  createdAt: string;
  views: number;
  variations?: ProductVariation[];
  priceChangeHistory?: PriceChangeRecord[];
  compatibleAccessoryIds?: string[];
  isSold?: boolean;
  soldAt?: string;
  totalStock?: number;
  stockQuantity?: number;
  image?: string;
  soldPrice?: number;
  soldDate?: string;
  buyerCity?: string;
  batteryAssessmentType?: 'Tested runtime' | 'Vendor-estimated runtime' | 'Not tested';
  batteryEstimatedHours?: string;
  batteryUsageConditions?: string;
  availableAccessories?: AccessoryItem[];
  freeGift?: FreeGiftPromotion;
  promoBadge?: PromoBadgeType | string;
  priceHasStartingPrefix?: boolean;
  modelRating?: number;
  modelReviewCount?: number;
  colorSwatches?: ProductColorSwatch[];
  bundleItems?: BundleItemSummary[];
}

export interface VendorPromotion {
  id: string;
  name: string;
  description: string;
  code?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  active: boolean;
  eligibleCategories: Category[];
  minPurchaseAmount?: number;
  usageCount?: number;
  freeGiftItem?: string;
  isFreeDelivery?: boolean;
  fundingSource?: 'vendor' | 'usedright' | 'joint';
}

export interface VendorAnnouncement {
  id: string;
  title: string;
  content: string;
  date: string;
  active: boolean;
}

export interface CustomerReview {
  id: string;
  orderId: string;
  listingId: string;
  vendorId: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number;
  criteriaRatings: {
    conditionAccuracy: number;
    deliverySpeed: number;
    communication: number;
    packaging: number;
  };
  comment: string;
  photos?: string[];
  verifiedPurchase: boolean;
  date: string;
  vendorReply?: {
    text: string;
    date: string;
  };
}

export interface PayoutBankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  verified?: boolean;
  updatedAt?: string;
}

export interface VendorSocialLink {
  id: string;
  platform: 'Instagram' | 'Facebook' | 'TikTok' | 'X (Twitter)' | 'Website' | 'LinkedIn';
  handleOrUrl: string;
  normalizedUrl: string;
  verified?: boolean;
}

export interface AlternativeRecipient {
  name: string;
  phone: string;
  relationship: string;
  note?: string;
  authorizedAt: string;
  authorizedByBuyerId: string;
}

export interface DeliveryVerificationAttemptLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorVendorId?: string;
  result: 'success' | 'failed' | 'locked' | 'expired' | 'resent' | 'failed_attempt';
  note?: string;
}

export interface WarrantyPolicyConfig {
  defaultDurationMonths: number; // Default 3 months
  applicableCategories: Category[];
  coveredSummary: string[];
  excludedSummary: string[];
  claimResponseSlaHours: number;
  updatedAt: string;
  updatedBy: string;
}

export interface OrderWarrantyRecord {
  warrantyId: string;
  orderId: string;
  orderNumber: string;
  listingId: string;
  deviceTitle: string;
  serialOrImei?: string;
  vendorId: string;
  vendorNumber: string;
  vendorName: string;
  buyerId: string;
  durationMonths: number;
  startDate?: string;
  expiryDate?: string;
  status: 'Pending Delivery' | 'Active' | 'Expired' | 'Claim Open' | 'Voided';
  coveredTerms: string[];
  excludedTerms: string[];
  disclosedFaultsExcluded: string[];
  policyVersion: string;
  isImmutableSnapshot: true;
}

export type WarrantyClaimCategory =
  | 'Battery or charging failure'
  | 'Display or touch malfunction'
  | 'Motherboard / unexpected shutdown'
  | 'Speaker, mic or connectivity defect'
  | 'Camera or Face ID / biometric fault'
  | 'Other covered hardware defect';

export type WarrantyClaimStatus =
  | 'Submitted'
  | 'Vendor Reviewing'
  | 'Repair / Remedy Proposed'
  | 'Resolved'
  | 'Rejected'
  | 'Escalated to Admin';

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  warrantyId: string;
  orderId: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  vendorId: string;
  vendorNumber: string;
  vendorName: string;
  deviceTitle: string;
  issueCategory: WarrantyClaimCategory;
  description: string;
  attachmentNames?: string[];
  attachmentPreviews?: string[];
  status: WarrantyClaimStatus;
  createdAt: string;
  updatedAt: string;
  vendorResponse?: string;
  proposedRemedy?: 'Repair' | 'Replacement' | 'Diagnostic Check' | 'Declined (Excluded Damage)';
  adminNotes?: string;
  resolutionSummary?: string;
  activity: {
    id: string;
    actorRole: 'buyer' | 'vendor' | 'admin' | 'system';
    actorName: string;
    action: string;
    timestamp: string;
  }[];
}

export type ChatEvidenceTag =
  | 'general'
  | 'pre_dispatch_packaging'
  | 'delivery_handover'
  | 'unboxing_evidence'
  | 'defect_proof'
  | 'warranty_proof';

export interface ChatAttachmentRecord {
  id: string;
  conversationId: string;
  orderId?: string;
  senderRole: 'buyer' | 'vendor' | 'admin';
  senderId: string;
  mediaType: 'image' | 'video';
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  url: string;
  evidenceTag: ChatEvidenceTag;
  uploadedAt: string;
  immutableLocked?: boolean;
  reportedByUserId?: string;
  reportReason?: string;
}

export type ModerationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ModerationFlag {
  id: string;
  createdAt: string;
  userId: string;
  userName: string;
  userRole: 'buyer' | 'vendor';
  orderId?: string;
  orderNumber?: string;
  conversationId?: string;
  messageId?: string;
  contentType: 'chat_text' | 'chat_image' | 'checkout_note';
  flaggedContent: string;
  attachmentPreviewUrl?: string;
  triggers: string[];
  riskLevel: ModerationRiskLevel;
  priorWarningsCount: number;
  status: 'Pending Review' | 'Warned' | 'Messaging Restricted' | 'Account Suspended' | 'Dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionNote?: string;
}

export interface ThirdPartyPayerDeclaration {
  relationship:
    | 'Self'
    | 'Parent'
    | 'Spouse'
    | 'Authorised Business'
    | 'Joint Account'
    | 'Approved Third-Party Payer';
  payerFullName: string;
  note?: string;
  acknowledgedNameGuidance: boolean;
  requiresVerificationFlag: boolean;
}

export interface VendorStorefront {
  id: string;
  vendorNumber: string;
  name: string;
  legalName: string;
  businessType: 'individual' | 'registered_business';
  cacNumber?: string;
  logo: string;
  banner: string;
  description: string;
  location: string;
  state?: string;
  rating: number;
  completedOrders: number;
  followerCount?: number;
  verificationStatus: 'Approved' | 'Under Review' | 'Not Started' | 'Rejected' | 'Needs Info';
  verificationBadge: boolean;
  identityVerificationStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info';
  socialVerificationStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info' | 'Not Submitted';
  socialLinks?: VendorSocialLink[];
  alternativeManualVerification?: boolean;
  alternativeManualReason?: string;
  verificationReview?: {
    reviewedBy?: string;
    reviewedAt?: string;
    notes?: string;
    decision?: 'Approved' | 'Rejected' | 'Needs Info';
  };
  isSuspended?: boolean;
  warrantyPolicy: string;
  deliveryPolicy: string;
  offersPickup?: boolean;
  pickupLocation?: string;
  pickupInstructions?: string;
  pickupHours?: string;
  soldListingsCount?: number;
  announcements: VendorAnnouncement[];
  promotions: VendorPromotion[];
  freeDeliveryThreshold?: number;
  reviews?: CustomerReview[];
  payoutBankAccount?: PayoutBankAccount;
  negotiatedVendorFeeRate?: number;
  agreementAcceptedVersion?: string;
  agreementAcceptedAt?: string;
}

export interface CustomerAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface CartItem {
  id?: string;
  listing: DeviceListing;
  selectedVariation?: ProductVariation;
  quantity: number;
  selectedAccessories?: AccessoryItem[];
  includedFreeGift?: FreeGiftPromotion;
}

export type DeliveryMethod = 'usedright_delivery' | 'physical_pickup';

export type OrderStatus =
  | 'Order placed'
  | 'Vendor Accepted Order'
  | 'Seller preparing device'
  | 'Awaiting courier collection'
  | 'In transit'
  | 'Delivered'
  | 'Buyer inspection'
  | 'Completed'
  | 'Disputed'
  | 'Delivered_In_Inspection'
  | 'Dispute_Opened'
  | 'Ready for Pickup'
  | 'Refunded';

export interface OrderEvent {
  title: string;
  time: string;
  done: boolean;
}

export type DispatchStatus =
  | 'pending_dispatch'
  | 'dispatch_arranged'
  | 'dispatched'
  | 'ready_for_pickup'
  | 'delivered'
  | 'failed_attempt'
  | 'rescheduled'
  | 'issue_reported';

export interface VendorDispatchDetails {
  dispatchStatus: DispatchStatus;
  dispatcherOrCourierName: string;
  dispatcherPhone?: string;
  dispatchReference: string;
  dispatchDate?: string;
  expectedDeliveryWindow: string;
  deliveryNotes?: string;
  actualDeliveryConfirmedAt?: string;
  arrangedByVendorName?: string;
  arrangedAt?: string;
  failedAttemptCount?: number;
  lastFailedReason?: string;
  lastFailedAt?: string;
}

export type DeliveryProblemType =
  | 'non_delivery'
  | 'damaged'
  | 'wrong_item'
  | 'overdue_dispatch'
  | 'reschedule_requested';

export interface DeliveryProblemReport {
  id: string;
  type: DeliveryProblemType;
  details: string;
  reportedAt: string;
  requestedNewDate?: string;
  status: 'Open' | 'Under Review' | 'Resolved';
}

export type GiftSenderVisibility = 'show_name' | 'anonymous';

export interface GiftOrderDetails {
  isGift: true;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
  };
  deliveryInstructions?: string;
  giftMessage?: string;
  senderVisibility: GiftSenderVisibility;
  senderDisplayName?: string;
  occasion?: string;
  hidePriceFromPackage: true;
  specialPackagingGuaranteed: false;
  recipientAccessTokenHash?: string;
  recipientPortalToken?: string;
}

export interface PayerInfoRecord {
  payerId?: string;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  relationship?: string;
  isAuthenticatedCustomer: boolean;
  paidAt?: string;
  paymentProviderRef?: string;
}

export type PaymentRequestStatus =
  | 'Draft'
  | 'Pending payment'
  | 'Payment processing'
  | 'Paid'
  | 'Expired'
  | 'Cancelled'
  | 'Failed'
  | 'Invalidated';

export interface PaymentRequestItemSnapshot {
  cartItemId: string;
  listingId: string;
  variationId?: string;
  title: string;
  brand: string;
  model: string;
  category: Category;
  condition: DeviceCondition;
  cosmeticGrade: CosmeticGrade;
  color: string;
  storage?: string;
  ram?: string;
  image: string;
  vendorId: string;
  vendorName: string;
  vendorState: string;
  vendorNumber: string;
  quantity: number;
  unitPrice: number;
  accessoriesTotal: number;
  lineSubtotal: number;
  disclosedFaults: string[];
  selectedAccessories: AccessoryItem[];
  includedFreeGift?: FreeGiftPromotion;
}

export interface PaymentRequestAuditEvent {
  id: string;
  timestamp: string;
  actorRole: 'buyer' | 'payer' | 'admin' | 'system';
  actorName: string;
  action: string;
  note?: string;
}

export interface PaymentRequestRecord {
  id: string;
  requestReference: string;
  tokenHash: string;
  shareTokenDemo?: string;
  orderOwnerId: string;
  orderOwnerName: string;
  orderOwnerEmail: string;
  orderOwnerPhone: string;
  status: PaymentRequestStatus;
  createdAt: string;
  expiresAt: string;
  validityHours: number;
  paidAt?: string;
  cancelledAt?: string;
  invalidatedReason?: string;
  lastFailureReason?: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
  };
  isGift: boolean;
  giftDetails?: GiftOrderDetails;
  cartItemsSnapshot: CartItem[];
  itemsSnapshot: PaymentRequestItemSnapshot[];
  vendorGroupsSummary: {
    vendorId: string;
    vendorName: string;
    vendorState: string;
    subtotal: number;
    deliveryFee: number;
    vendorFee: number;
    customerFeeShare: number;
  }[];
  subtotalAmount: number;
  customerFeeRate: number;
  customer_platform_service_fee: number;
  deliveryFeeTotal: number;
  totalPayableAmount: number;
  currency: 'NGN';
  payerInfo?: PayerInfoRecord;
  paymentProviderRef?: string;
  parentOrderId?: string;
  parentOrderNumber?: string;
  childOrderIds?: string[];
  suspiciousAttemptsCount?: number;
  auditEvents: PaymentRequestAuditEvent[];
}

export type RecipientComplaintCategory =
  | 'Wrong product'
  | 'Undisclosed defect'
  | 'Missing accessories'
  | 'Incorrect product condition'
  | 'Delivery damage'
  | 'Other';

export interface RecipientComplaintRecord {
  id: string;
  complaintNumber: string;
  orderId: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  buyerId: string;
  recipientName: string;
  category: RecipientComplaintCategory;
  description: string;
  createdAt: string;
  status: 'Open' | 'Under Review' | 'Resolved';
  disputeId?: string;
}

export interface ParentOrderRecord {
  id: string;
  parentOrderNumber: string;
  transactionNumber: string;
  paymentProviderRef?: string;
  paymentStatus: 'Paid (Demo Verified)' | 'Paid (Paystack Verified)' | 'Pending' | 'Failed' | 'Refunded';
  isDemoTransaction: boolean;
  buyerId: string;
  orderOwnerId?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  payerInfo?: PayerInfoRecord;
  thirdPartyPayer?: ThirdPartyPayerDeclaration;
  paymentRequestId?: string;
  paymentRequestReference?: string;
  isGift?: boolean;
  giftDetails?: GiftOrderDetails;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
  };
  childOrderIds: string[];
  vendorCount: number;
  totalItemsCount: number;
  subtotalAmount: number;
  customerFeeRate: number;
  customer_platform_service_fee: number;
  deliveryFeeTotal: number;
  referralDiscountApplied: number;
  totalPaid: number;
  createdAt: string;
  idempotencyKey?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  parentOrderId?: string;
  parentOrderNumber?: string;
  subOrderNumber?: string;
  transactionNumber?: string;
  vendorId?: string;
  vendorName?: string;
  vendorNumber?: string;
  isDemoTransaction?: boolean;
  listing: DeviceListing;
  selectedVariation?: ProductVariation;
  variation?: ProductVariation;
  items?: {
    listing: DeviceListing;
    selectedVariation?: ProductVariation;
    quantity?: number;
    selectedAccessories?: AccessoryItem[];
    includedFreeGift?: FreeGiftPromotion;
    unitPriceSnapshot?: number;
    conditionSummarySnapshot?: string;
  }[];
  buyerId: string;
  orderOwnerId?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  payerInfo?: PayerInfoRecord;
  thirdPartyPayer?: ThirdPartyPayerDeclaration;
  paymentRequestId?: string;
  paymentRequestReference?: string;
  isGift?: boolean;
  giftDetails?: GiftOrderDetails;
  deliveryMethod?: DeliveryMethod;
  pickupOtp?: string;
  pickupLocation?: string;
  pickupInstructions?: string;
  pickupHours?: string;
  deliveryAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
  };
  alternativeRecipient?: AlternativeRecipient;
  dispatchDetails?: VendorDispatchDetails;
  deliveryVerificationCode?: string;
  deliveryVerificationCodeHash?: string;
  deliveryCodeGeneratedAt?: string;
  deliveryCodeExpiresAt?: string;
  deliveryCodeUsedAt?: string;
  deliveryCodeAttempts?: number;
  deliveryCodeLockedUntil?: string;
  deliveryCodeOverrideReason?: string;
  deliveryCodeOverriddenBy?: string;
  deliveryVerificationAttempts?: DeliveryVerificationAttemptLog[];
  deliveryProblemReport?: DeliveryProblemReport;
  deliveryAttemptFailedReason?: string;
  deliveryRescheduledWindow?: string;
  arrivalMessageSentAt?: string;
  warranty?: OrderWarrantyRecord;
  itemPrice: number;
  accessoriesPrice?: number;
  feeBaseAmount?: number;
  customerFeeRate?: number;
  customer_platform_service_fee?: number;
  vendorFeeRate?: number;
  vendor_platform_service_fee?: number;
  paymentProviderFeeRecorded?: number;
  buyerServiceCharge: number;
  deliveryFee: number;
  fixedDeliveryFeeApplied?: number;
  totalAmount: number;
  paymentStatus: 'Paid (Escrow Secured)' | 'Paid (Demo Verified)' | 'Pending' | 'Failed' | 'Refunded';
  fulfillmentStatus: OrderStatus;
  trackingNumber: string;
  courierName: string;
  estimatedDelivery: string;
  createdAt: string;
  events: OrderEvent[];
  disputeId?: string;
  disputeReason?: string;
  accessories?: AccessoryItem[];
  freeGift?: FreeGiftPromotion;
  referralDiscountApplied?: number;
  inspectionWindowHours?: number;
  inspectionRemainingSeconds?: number;
  inspectionSecondsRemaining?: number;
  inspectionExpiresAt?: string;
  deliveredAt?: string;
  disputePaused?: boolean;
  disputeStatus?: 'None' | 'Pending Review' | 'Funds Frozen' | 'Resolved';
  buyerConfirmedReceipt?: boolean;
  recipientConfirmedReceipt?: boolean;
  refundTargetSummary?: string;
  isReviewed?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'buyer' | 'vendor' | 'system' | 'admin';
  senderLabel?: string;
  text: string;
  timestamp: string;
  dateLabel?: string;
  flaggedWarning?: string;
  moderationRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  moderationTriggers?: string[];
  imageAttachment?: string;
  mediaAttachments?: ChatAttachmentRecord[];
  disputeId?: string;
  warrantyClaimId?: string;
  orderNumber?: string;
  isOfficialUpdate?: boolean;
  isArrivalWelcomeCard?: boolean;
  productRef?: {
    id: string;
    title: string;
    price: number;
    image: string;
    condition: string;
  };
}

export interface MessageConversation {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorNumber?: string;
  vendorAvatar: string;
  buyerId: string;
  buyerName: string;
  listingId?: string;
  listingTitle?: string;
  listingPrice?: number;
  listingImage?: string;
  orderId?: string;
  orderNumber?: string;
  stage?: 'pre_purchase' | 'post_purchase';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  unreadCountVendor?: number;
  unreadCountBuyer?: number;
  messages: ChatMessage[];
}

export interface ForeignUseEvidenceBatch {
  id: string;
  batchNumber: string;
  sourceCountry: string;
  supplierName: string;
  purchaseDate: string;
  shipmentReference: string;
  shippingDate: string;
  deviceCount: number;
  documentTypes: string[];
  imeiList: string[];
  status:
    | 'Verified'
    | 'Under Review'
    | 'Evidence Submitted'
    | 'Evidence Not Submitted'
    | 'Rejected'
    | 'Additional Evidence Required';
  fileNames: string[];
  submittedAt?: string;
  reviewNotes?: string;
}

export interface SellerVerificationState {
  status: 'Approved' | 'Under Review' | 'Not Started' | 'Additional Information Required' | 'Rejected';
  vendorNumber?: string;
  businessType?: 'individual' | 'registered_business';
  businessName?: string;
  cacNumber?: string;
  state?: string;
  submittedAt?: string;
  socialLinks?: VendorSocialLink[];
  alternativeManualVerification?: boolean;
  alternativeManualReason?: string;
  socialVerificationStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info' | 'Not Submitted';
  documents?: {
    type: string;
    name: string;
    status: 'Verified' | 'Pending Review' | 'Rejected';
    uploadDate: string;
  }[];
  individual?: {
    legalName: string;
    dob: string;
    idType: string;
    idNumber: string;
    address: string;
    phone: string;
    email: string;
    idDocumentName?: string;
    facialVerified: boolean;
  };
  business?: {
    registeredName: string;
    cacNumber: string;
    businessAddress: string;
    cacDocumentName?: string;
    representativeName: string;
    representativeIdType: string;
    representativeIdNumber: string;
    representativeDocName?: string;
    representativeFacialVerified: boolean;
  };
  submittedDocuments?: {
    type: string;
    name: string;
    status: 'Verified' | 'Pending Review' | 'Rejected';
    uploadDate: string;
  }[];
}

export interface ReferralState {
  code: string;
  link: string;
  referrerReward: number;
  welcomeDiscount: number;
  totalReferrals: number;
  completedOrdersCount: number;
  walletBalance: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'order' | 'inspection' | 'reward' | 'message' | 'dispute' | 'admin' | 'warranty' | 'safety';
  recipientRole?: 'buyer' | 'vendor' | 'admin' | 'recipient' | 'payer';
  orderId?: string;
  conversationId?: string;
  paymentRequestId?: string;
  isRecipientSafe?: boolean;
}

export type DemoRole = 'visitor' | 'buyer' | 'seller_approved' | 'seller_pending' | 'admin';

export interface ListingFilters {
  category?: Category | 'all';
  condition?: 'all' | 'Foreign-Used' | 'Brand-New';
  searchQuery?: string;
  brands?: string[];
  priceRange?: [number, number];
  cosmeticGrades?: CosmeticGrade[];
  minBatteryHealth?: number;
  storage?: string[];
  ram?: string[];
  simStatus?: string[];
  faceIdOnly?: boolean;
  vendorId?: string;
  hasDisclosedFaultsOnly?: boolean;
  batteryAssessmentType?: string[];
  hasFreeGiftOnly?: boolean;
  colors?: string[];
  dealsOnly?: boolean;
  locationState?: string;
  sortBy?:
    | 'recommended'
    | 'price_asc'
    | 'price_desc'
    | 'top_rated'
    | 'deals_first'
    | 'newest'
    | 'condition';
}

export interface PaymentHold {
  id: string;
  orderId: string;
  orderNumber: string;
  transactionNumber: string;
  vendorId: string;
  vendorNumber: string;
  vendorName: string;
  buyerId: string;
  buyerName: string;
  deviceTitle: string;
  itemTitle?: string;
  deviceImage: string;
  variationInfo?: string;
  grossAmount: number;
  amount?: number;
  platformFeeBuyer: number;
  platformFeeVendor: number;
  customer_platform_service_fee?: number;
  vendor_platform_service_fee?: number;
  customerFeeRate?: number;
  vendorFeeRate?: number;
  deliveryFeeAllocated?: number;
  paymentProviderFeeRecorded?: number;
  refundedAmount?: number;
  feeAdjustmentAmount?: number;
  serviceFee?: number;
  netVendorPayout: number;
  netPayout?: number;
  paymentReceivedAt: string;
  createdAt?: string;
  deliveredAt?: string;
  inspectionHours: number;
  inspectionExpiresAt?: string;
  remainingSeconds: number;
  remainingInspectionSeconds?: number;
  status:
    | 'Payment Received'
    | 'Preparing Order'
    | 'Dispatched'
    | 'Delivered'
    | 'Inspection Period Active'
    | 'Dispute Opened'
    | 'Payment Approved for Release'
    | 'Settled'
    | 'Refunded';
  disputeId?: string;
  isDisputed: boolean;
  disputeReason?: string;
}

export type DisputeStatus =
  | 'Problem Reported'
  | 'Under Review'
  | 'Waiting for Customer'
  | 'Waiting for Vendor'
  | 'Resolution Proposed'
  | 'Resolved'
  | 'Closed';

export type DisputeReason =
  | 'Physical damage'
  | 'Wrong item received'
  | 'Missing accessory'
  | 'Technical issue'
  | 'Device not working as advertised'
  | 'Package not received'
  | 'Product not as described'
  | 'Device has an undisclosed issue'
  | 'Wrong product received'
  | 'Product damaged'
  | 'Product not received'
  | 'Other';

export type DisputeResolutionType =
  | 'Full Refund to Customer'
  | 'Partial Refund + Keep Device'
  | 'Replacement / Return Shipped'
  | 'Release Payout to Vendor'
  | 'Escalated';

export interface DisputeEvidence {
  id: string;
  uploadedBy: 'buyer' | 'vendor' | 'admin';
  uploaderName: string;
  type: 'image' | 'video' | 'document';
  fileName: string;
  caption?: string;
  previewUrl?: string;
  evidenceTag?: ChatEvidenceTag;
  uploadedAt: string;
}

export interface DisputeActivity {
  id: string;
  actorRole: 'buyer' | 'vendor' | 'admin' | 'system';
  actorName: string;
  action: string;
  timestamp: string;
}

export interface InternalAdminNote {
  id: string;
  adminName: string;
  note: string;
  createdAt: string;
}

export interface DisputeRecord {
  id: string;
  disputeNumber: string;
  orderId: string;
  orderNumber: string;
  transactionNumber: string;
  conversationId: string;
  buyerId: string;
  buyerName: string;
  vendorId: string;
  vendorName: string;
  listingTitle: string;
  reason: DisputeReason;
  description: string;
  requestedResolution: DisputeResolutionType;
  status: DisputeStatus;
  createdAt: string;
  updatedAt: string;
  evidence: DisputeEvidence[];
  activityHistory: DisputeActivity[];
  internalNotes: InternalAdminNote[];
  adminAssigned?: string;
  resolutionOutcome?: string;
  resolvedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorRole: DemoRole | 'system';
  actorName: string;
  actionType:
    | 'order_created'
    | 'payment_received'
    | 'dispatch_confirmed'
    | 'delivery_confirmed'
    | 'delivery_otp_verified'
    | 'delivery_otp_resend'
    | 'delivery_otp_override'
    | 'delivery_attempt_failed'
    | 'alternative_recipient_set'
    | 'delivery_problem_reported'
    | 'inspection_completed'
    | 'settlement_released'
    | 'dispute_opened'
    | 'dispute_updated'
    | 'dispute_resolved'
    | 'refund_issued'
    | 'warranty_claim_opened'
    | 'warranty_claim_updated'
    | 'moderation_flag_created'
    | 'moderation_action_taken'
    | 'vendor_verification_reviewed'
    | 'listing_updated'
    | 'admin_config_changed'
    | 'fee_config_changed'
    | 'policy_published'
    | 'vendor_agreement_accepted'
    | 'report_submitted'
    | 'payment_request_created'
    | 'payment_request_paid'
    | 'payment_request_cancelled'
    | 'payment_request_expired'
    | 'payment_request_invalidated'
    | 'payment_request_failed'
    | 'payment_request_suspicious'
    | 'gift_recipient_complaint';
  entityRef: string;
  details: string;
}

export interface PlatformFeeConfig {
  customerFeeRate: number; // Max 0.007 (0.7%)
  vendorFeeRate: number; // Max 0.01 (1.0%)
  maxCustomerFeeRate: number; // Hard ceiling 0.007
  maxVendorFeeRate: number; // Hard ceiling 0.01
  promotionalLabel?: string;
  effectiveDate: string;
  expiryDate?: string;
  eligibilityRules: string;
  vendorSpecificRates: Record<string, number>;
  updatedAt: string;
  updatedBy: string;
}

export interface FeeChangeAuditRecord {
  id: string;
  timestamp: string;
  adminName: string;
  targetType: 'customer_default' | 'vendor_default' | 'vendor_negotiated';
  vendorId?: string;
  vendorName?: string;
  previousRate: number;
  newRate: number;
  effectiveDate: string;
  reason: string;
}

export interface DeliveryConfig {
  fixedDeliveryFee: number; // Default ₦3,000 per vendor
  freePickupEnabled: boolean;
  supportedDeliveryStates: string[];
  estimatedDeliveryWindow: string;
  deliveryNotes: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PolicySection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PolicyVersion {
  version: string;
  status: 'Draft' | 'Published' | 'Scheduled' | 'Archived';
  effectiveDate: string;
  publishedAt: string;
  updatedBy: string;
  changeSummary: string;
  requiresVendorReacceptance?: boolean;
  sections: PolicySection[];
}

export interface PolicyDocument {
  id: string;
  slug: string;
  number: number;
  title: string;
  category: 'Core Terms' | 'Devices & Warranty' | 'Fees & Payments' | 'Delivery & Inspection' | 'Privacy & Safety';
  summary: string;
  currentVersion: string;
  effectiveDate: string;
  lastUpdated: string;
  status: 'Draft' | 'Published' | 'Scheduled' | 'Archived';
  requiresVendorReacceptance: boolean;
  relatedSlugs: string[];
  sections: PolicySection[];
  versions: PolicyVersion[];
}

export interface VendorAgreementAcceptance {
  id: string;
  vendorId: string;
  vendorName: string;
  verifiedIdentityRef?: string;
  agreementVersion: string;
  policyVersion: string;
  acceptedAt: string;
  status: 'Accepted' | 'Superseded';
  declarationsAccepted: boolean[];
  finalConsentAccepted: boolean;
  userAgentSummary?: string;
}

export interface PlatformConfig {
  brandNewEnabled: boolean;
  inspectionHours: number;
  paymentRequestValidityHours?: number;
  categories: CategoryConfig[];
}

export interface CollaborationCampaign {
  id: string;
  vendorId: string;
  vendorNumber: string;
  vendorName: string;
  listingId: string;
  listingTitle: string;
  title?: string;
  campaignType:
    | 'Featured Deals'
    | 'Vendor of the Week'
    | 'Weekend Shopping'
    | 'Free Accessory'
    | 'Discount Blitz'
    | 'Limited Stock'
    | 'featured_deals'
    | 'vendor_of_the_week'
    | 'weekend_shopping';
  objective: string;
  proposedDiscount?: number;
  discountPercentage?: number;
  proposedFreeGift?: string;
  promotionalStock: number;
  committedUnits?: number;
  durationDays: number;
  targetAudience: string;
  targetDevices?: string[];
  budget?: number;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Active' | 'Completed' | 'Rejected';
  submittedAt: string;
  submittedDate?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  targetId: string;
  targetName: string;
  targetType: 'vendor' | 'buyer' | 'listing';
  orderReference?: string;
  reasonCategory:
    | 'Suspicious behaviour'
    | 'Harassment'
    | 'Fraud attempts'
    | 'Misleading listings'
    | 'Off-platform payment requests'
    | 'Other policy violations';
  details: string;
  createdAt: string;
  status: 'Pending Review' | 'Investigating' | 'Resolved';
}

export interface BlockRecord {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
  reason?: string;
}

export interface MarketplaceState {
  platformConfig: PlatformConfig;
  feeConfig?: PlatformFeeConfig;
  feeAuditLog?: FeeChangeAuditRecord[];
  deliveryConfig?: DeliveryConfig;
  warrantyConfig?: WarrantyPolicyConfig;
  policies?: PolicyDocument[];
  vendorAcceptances?: VendorAgreementAcceptance[];
  parentOrders?: ParentOrderRecord[];
  paymentRequests?: PaymentRequestRecord[];
  recipientComplaints?: RecipientComplaintRecord[];
  listings: DeviceListing[];
  vendors: VendorStorefront[];
  nextVendorSeq?: number;
  orders: Order[];
  paymentHolds: PaymentHold[];
  conversations: MessageConversation[];
  disputes: DisputeRecord[];
  warrantyClaims?: WarrantyClaim[];
  moderationFlags?: ModerationFlag[];
  followedVendorIds?: string[];
  restrictedMessagingUserIds?: string[];
  evidenceBatches: ForeignUseEvidenceBatch[];
  pendingSellerState: SellerVerificationState;
  notifications: AppNotification[];
  reports: UserReport[];
  blocks: BlockRecord[];
  auditLog: AuditLogEntry[];
}
