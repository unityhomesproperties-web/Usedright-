import React, { useState, useMemo } from 'react';
import {
  Store,
  PlusCircle,
  Package,
  FileCheck,
  ShieldCheck,
  Tag,
  Truck,
  Settings,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Globe,
  Edit3,
  Megaphone,
  MessageSquare,
  Star,
  CreditCard,
  LayoutGrid,
  ClipboardList,
  LogOut,
  ExternalLink,
  X,
  Lock,
  Plus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  Layers,
  Landmark,
  Gift,
  Activity,
  MapPin,
  BookOpen,
  KeyRound,
} from 'lucide-react';
import { VendorToolGraphic, VendorToolGraphicKey } from '../common/TrustGraphics';
import {
  inferStateFromLocationText,
  NIGERIAN_COMMERCIAL_HUBS,
  normalizeNigerianState,
} from '../../utils/nigerianStates';
import {
  AuditLogEntry,
  Category,
  CosmeticGrade,
  DeviceCondition,
  DeviceListing,
  DisputeRecord,
  ForeignUseEvidenceBatch,
  MessageConversation,
  Order,
  OrderStatus,
  PaymentHold,
  PlatformConfig,
  PlatformFeeConfig,
  PolicyDocument,
  ProductVariation,
  UserReport,
  VendorPromotion,
  VendorStorefront,
  WarrantyClaim,
  WarrantyClaimStatus,
  YearMadePrecision,
} from '../../types/marketplace';
import {
  buildComboBundleListing,
  calculateSellerNetPayout,
  calculateSellerServiceCharge,
  formatCountdown,
  formatNaira,
  NIGERIAN_BANKS,
  SELLER_FEE_RATE,
  validateDeviceListing,
  validateNigerianBankAccount,
} from '../../utils/marketplace';
import { PLAIN_ENGLISH_ISSUE_PRESETS, toSimpleEnglish } from '../../utils/simpleEnglish';
import { VendorNavTab } from '../common/Navbar';
import { SmartImage } from '../common/SmartImage';
import { UnifiedTransactionChat } from '../chat/UnifiedTransactionChat';
import { VendorBulkListingWizard } from './VendorBulkListingWizard';
import { VendorBulkAccessoryWizard } from './VendorBulkAccessoryWizard';
import { ActivityHistoryView } from '../common/ActivityHistoryView';
import { reorderVendorListingSequence } from '../../utils/vendorBulk';
import { computeVendorFinancialLedger } from '../../utils/vendorOperations';
import { canRolePerformOrderAction } from '../../utils/transactionEngine';
import { SAMPLE_COLLABORATION_CAMPAIGNS } from '../../data/marketingData';

interface SellerDashboardProps {
  activeTab: VendorNavTab;
  onTabChange: (tab: VendorNavTab) => void;
  vendor: VendorStorefront;
  listings: DeviceListing[];
  orders: Order[];
  paymentHolds: PaymentHold[];
  conversations: MessageConversation[];
  disputes: DisputeRecord[];
  platformConfig: PlatformConfig;
  feeConfig?: PlatformFeeConfig;
  policies?: PolicyDocument[];
  evidenceBatches: ForeignUseEvidenceBatch[];
  auditLog?: AuditLogEntry[];
  onUpdateVendor: (updated: VendorStorefront) => void;
  onAddListing: (newListing: DeviceListing) => void;
  onAddMultipleListings?: (newListings: DeviceListing[]) => void;
  onUpdateListing: (id: string, updates: Partial<DeviceListing>, reason?: string) => void;
  onAddEvidenceBatch: (batch: ForeignUseEvidenceBatch) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onArrangeDispatch?: (
    orderId: string,
    details: {
      dispatcherOrCourierName: string;
      dispatcherPhone?: string;
      dispatchReference: string;
      dispatchDate?: string;
      expectedDeliveryWindow: string;
      deliveryNotes?: string;
    }
  ) => { error?: string };
  onVerifyDeliveryCode?: (
    orderId: string,
    code: string
  ) => { verified: boolean; error?: string; remainingAttempts?: number };
  onAcceptVendorAgreement?: (version: string) => void;
  onOpenPolicyCentre?: (slug?: string) => void;
  onOpenOrderDetail: (orderId: string) => void;
  onViewListingDetails?: (listing: DeviceListing) => void;
  onSendMessage: (
    conversationId: string,
    text: string,
    senderRole: 'buyer' | 'vendor' | 'admin',
    extra?: any
  ) => void;
  warrantyClaims?: WarrantyClaim[];
  restrictedUserIds?: string[];
  onMarkDeliveryFailed?: (
    orderId: string,
    reason: string,
    rescheduledWindow?: string
  ) => { error?: string };
  onRespondWarrantyClaim?: (payload: {
    orderId: string;
    claimId: string;
    proposedRemedy: WarrantyClaim['proposedRemedy'];
    vendorResponse: string;
    nextStatus: WarrantyClaimStatus;
  }) => { error?: string };
  onFlagOffPlatform?: (payload: any) => void;
  onViewPublicStorefront?: (vendorId: string) => void;
  onReorderListings?: (nextListings: DeviceListing[]) => void;
  onSubmitReport?: (report: UserReport) => void;
  onSignOut: () => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  activeTab,
  onTabChange,
  vendor,
  listings,
  orders,
  paymentHolds,
  conversations,
  disputes,
  platformConfig,
  feeConfig,
  policies = [],
  evidenceBatches,
  auditLog = [],
  onUpdateVendor,
  onAddListing,
  onAddMultipleListings,
  onUpdateListing,
  onAddEvidenceBatch,
  onUpdateOrderStatus,
  onArrangeDispatch,
  onVerifyDeliveryCode,
  onAcceptVendorAgreement,
  onOpenPolicyCentre,
  onOpenOrderDetail,
  onViewListingDetails,
  onSendMessage,
  warrantyClaims = [],
  restrictedUserIds = [],
  onMarkDeliveryFailed,
  onRespondWarrantyClaim,
  onFlagOffPlatform,
  onViewPublicStorefront,
  onReorderListings,
  onSubmitReport,
  onSignOut,
}) => {
  const vendorListings = useMemo(
    () =>
      listings
        .filter((l) => l.sellerId === vendor.id)
        .sort(
          (a, b) =>
            (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999) ||
            b.sellerRating * 100 - a.sellerRating * 100 ||
            (b.views || 0) - (a.views || 0)
        ),
    [listings, vendor.id]
  );
  const vendorOrders = useMemo(
    () => orders.filter((o) => o.listing.sellerId === vendor.id),
    [orders, vendor.id]
  );
  const vendorHolds = useMemo(
    () => paymentHolds.filter((h) => h.vendorId === vendor.id),
    [paymentHolds, vendor.id]
  );
  const vendorConversations = useMemo(
    () => conversations.filter((c) => c.vendorId === vendor.id),
    [conversations, vendor.id]
  );
  const vendorDisputes = useMemo(
    () => disputes.filter((d) => d.vendorId === vendor.id),
    [disputes, vendor.id]
  );

  // Products & Inventory sub-state
  const [productStatusFilter, setProductStatusFilter] = useState<
    'All' | 'Active' | 'Paused' | 'Pending Review' | 'Draft' | 'Sold' | 'Archived'
  >('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormMode, setAddFormMode] = useState<'grouped' | 'accessories' | 'single'>('grouped');
  const [draggedListingId, setDraggedListingId] = useState<string | null>(null);
  const [inlinePriceDrafts, setInlinePriceDrafts] = useState<Record<string, string>>({});
  const [inventoryToast, setInventoryToast] = useState<string | null>(null);

  // Immutable-snapshot-safe Price/Stock/Variation edit modal state
  const [editingListing, setEditingListing] = useState<DeviceListing | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(1);
  const [editReason, setEditReason] = useState<string>('Market price update');
  const [editVariations, setEditVariations] = useState<ProductVariation[]>([]);
  const [editSavedMsg, setEditSavedMsg] = useState<string | null>(null);

  // Add Product wizard state
  const activeCategories = useMemo(
    () => platformConfig.categories.filter((c) => c.enabled),
    [platformConfig.categories]
  );
  const [newCategory, setNewCategory] = useState<Category>(activeCategories[0]?.id || 'phones');
  const [newCondition, setNewCondition] = useState<DeviceCondition>('Foreign-Used');
  const [newTitle, setNewTitle] = useState('');
  const [newBrand, setNewBrand] = useState('Apple');
  const [newModel, setNewModel] = useState('');
  const [newModelYear, setNewModelYear] = useState<string>('2022');
  const [newYearMadePrecision, setNewYearMadePrecision] = useState<YearMadePrecision>('known');
  const [newYearMade, setNewYearMade] = useState<string>('2022');
  const [newYearPurchased, setNewYearPurchased] = useState<string>('');
  const [newColor, setNewColor] = useState('Midnight');
  const [newStorage, setNewStorage] = useState('128GB');
  const [newRam, setNewRam] = useState('8GB');
  const [newPrice, setNewPrice] = useState<string>('320000');
  const [newStock, setNewStock] = useState<string>('1');
  const [newGrade, setNewGrade] = useState<CosmeticGrade>('Grade A');
  const [newBatteryHealth, setNewBatteryHealth] = useState<string>('90');
  const [newSourceCountry, setNewSourceCountry] = useState('United States');
  const [newBatchRef, setNewBatchRef] = useState(evidenceBatches[0]?.batchNumber || 'US-BATCH-2026-041');
  const [newImeiOrSerial, setNewImeiOrSerial] = useState('');
  const [newOverview, setNewOverview] = useState('');
  const [newIncludedItems, setNewIncludedItems] = useState('Device only (tested and wiped clean)');
  const [newPreviousRepairs, setNewPreviousRepairs] = useState('No internal repairs recorded.');
  const [newKnownLimitations, setNewKnownLimitations] = useState('');
  const [newSelectedIssues, setNewSelectedIssues] = useState<string[]>([]);
  const [newCustomIssue, setNewCustomIssue] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [addFormErrors, setAddFormErrors] = useState<string[]>([]);
  const [addFormSuccess, setAddFormSuccess] = useState<string | null>(null);

  // Evidence inline form state (no window.prompt)
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evSourceCountry, setEvSourceCountry] = useState('United States');
  const [evSupplierName, setEvSupplierName] = useState('');
  const [evShipmentRef, setEvShipmentRef] = useState('');
  const [evDeviceCount, setEvDeviceCount] = useState('10');
  const [evImeis, setEvImeis] = useState('');
  const [evFileName, setEvFileName] = useState('');
  const [evFeedback, setEvFeedback] = useState<string | null>(null);

  // Storefront edit state
  const [storeDesc, setStoreDesc] = useState(vendor.description);
  const [storeLocation, setStoreLocation] = useState(vendor.location);
  const [storeState, setStoreState] = useState(
    vendor.state
      ? normalizeNigerianState(vendor.state)
      : inferStateFromLocationText(vendor.location)
  );
  const [storeWarranty, setStoreWarranty] = useState(vendor.warrantyPolicy);
  const [storeDelivery, setStoreDelivery] = useState(vendor.deliveryPolicy);
  const [storeOffersPickup, setStoreOffersPickup] = useState(Boolean(vendor.offersPickup));
  const [storePickupLoc, setStorePickupLoc] = useState(vendor.pickupLocation || '');
  const [storeSaved, setStoreSaved] = useState(false);
  const [settingsLocationSaved, setSettingsLocationSaved] = useState(false);

  // Promotions & Combo Deal state
  const [promoTitle, setPromoTitle] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('5');
  const [promoNotice, setPromoNotice] = useState<string | null>(null);
  const [comboPrimaryId, setComboPrimaryId] = useState<string>(vendorListings[0]?.id || '');
  const [comboSecondaryId, setComboSecondaryId] = useState<string>(vendorListings[1]?.id || '');
  const [comboBundlePrice, setComboBundlePrice] = useState<string>('');
  const [comboTag, setComboTag] = useState<'COMBO DEAL' | 'GIFT PACK'>('COMBO DEAL');
  const [comboTitle, setComboTitle] = useState<string>('');
  const [comboError, setComboError] = useState<string | null>(null);
  const [comboSuccess, setComboSuccess] = useState<string | null>(null);

  // Bank Payouts & Escrow state
  const [payoutBankName, setPayoutBankName] = useState<string>(
    vendor.payoutBankAccount?.bankName || NIGERIAN_BANKS[0]
  );
  const [payoutAccountNumber, setPayoutAccountNumber] = useState<string>(
    vendor.payoutBankAccount?.accountNumber || ''
  );
  const [payoutAccountName, setPayoutAccountName] = useState<string>(
    vendor.payoutBankAccount?.accountName || vendor.legalName || ''
  );
  const [payoutErrors, setPayoutErrors] = useState<string[]>([]);
  const [payoutSavedMsg, setPayoutSavedMsg] = useState<string | null>(null);

  // Marketing collaboration state
  const [collabFeedback, setCollabFeedback] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState(SAMPLE_COLLABORATION_CAMPAIGNS);

  // Order chat deep link & vendor-managed dispatch / delivery verification code state
  const [selectedOrderChatId, setSelectedOrderChatId] = useState<string | undefined>(undefined);
  const [dispatchFormOrderId, setDispatchFormOrderId] = useState<string | null>(null);
  const [dispatchCourierName, setDispatchCourierName] = useState('');
  const [dispatchPhone, setDispatchPhone] = useState('');
  const [dispatchReference, setDispatchReference] = useState('');
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dispatchWindow, setDispatchWindow] = useState('1–2 business days');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpFeedback, setOtpFeedback] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});
  const [failedAttemptOrderId, setFailedAttemptOrderId] = useState<string | null>(null);
  const [failedReasonDraft, setFailedReasonDraft] = useState('');
  const [failedWindowDraft, setFailedWindowDraft] = useState('Tomorrow 12:00 PM – 4:00 PM');

  // Vendor 3-Month Warranty Claims state
  const [claimRemedyDraft, setClaimRemedyDraft] = useState<
    Record<string, NonNullable<WarrantyClaim['proposedRemedy']>>
  >({});
  const [claimResponseDraft, setClaimResponseDraft] = useState<Record<string, string>>({});
  const [claimFeedback, setClaimFeedback] = useState<Record<string, string>>({});

  const effectiveVendorFeeRate =
    vendor.negotiatedVendorFeeRate ??
    feeConfig?.vendorSpecificRates?.[vendor.id] ??
    feeConfig?.vendorFeeRate ??
    SELLER_FEE_RATE;
  const vendorFeeRateDisplay = `${(effectiveVendorFeeRate * 100)
    .toFixed(1)
    .replace(/\.0$/, '')}%`;

  const policyNeedingReaccept = useMemo(() => {
    const agreementPol = policies.find((p) => p.slug === 'vendor-agreement');
    if (
      agreementPol &&
      agreementPol.status === 'Published' &&
      agreementPol.requiresVendorReacceptance &&
      vendor.agreementAcceptedVersion &&
      agreementPol.currentVersion !== vendor.agreementAcceptedVersion
    ) {
      return agreementPol;
    }
    return policies.find(
      (p) =>
        p.status === 'Published' &&
        p.requiresVendorReacceptance &&
        vendor.agreementAcceptedVersion &&
        p.currentVersion !== vendor.agreementAcceptedVersion
    );
  }, [policies, vendor.agreementAcceptedVersion]);

  // Financial & KPI metrics
  const activeListingsCount = vendorListings.filter((l) => l.status === 'Active').length;
  const openOrdersCount = vendorOrders.filter(
    (o) => !['Completed', 'Refunded'].includes(o.fulfillmentStatus)
  ).length;
  const inInspectionCount = vendorOrders.filter(
    (o) =>
      o.fulfillmentStatus === 'Delivered_In_Inspection' ||
      o.fulfillmentStatus === 'Delivered' ||
      o.fulfillmentStatus === 'Buyer inspection'
  ).length;
  const activeDisputesCount = vendorDisputes.filter(
    (d) => d.status !== 'Resolved' && d.status !== 'Closed'
  ).length;
  const unreadMessagesCount = vendorConversations.reduce(
    (sum, c) => sum + (c.unreadCountVendor || 0),
    0
  );

  // Hold vs Expected vs Settled separation + Financial Ledger
  const financialLedger = useMemo(
    () => computeVendorFinancialLedger(vendorHolds),
    [vendorHolds]
  );
  const heldUnavailableAmount =
    financialLedger.activeEscrowAmount + financialLedger.readyForPayoutAmount;
  const frozenDisputedAmount = financialLedger.frozenDisputeAmount;
  const expectedCleanPayout = Math.max(
    0,
    financialLedger.activeEscrowAmount - financialLedger.frozenDisputeAmount + financialLedger.readyForPayoutAmount
  );
  const settledTotal = financialLedger.settledAmount;

  const openEditModal = (listing: DeviceListing) => {
    setEditingListing(listing);
    setEditPrice(listing.price);
    setEditStock(listing.stockQuantity ?? listing.totalStock ?? 1);
    setEditReason('Market adjustment');
    setEditVariations(
      listing.variations ? listing.variations.map((v) => ({ ...v })) : []
    );
    setEditSavedMsg(null);
  };

  const handleSaveListingEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;
    const nextVariations =
      editVariations.length > 0
        ? editVariations.map((v) => ({
            ...v,
            isAvailable: v.stockQuantity > 0,
          }))
        : undefined;
    const totalStock = nextVariations
      ? nextVariations.reduce((sum, v) => sum + v.stockQuantity, 0)
      : Math.max(0, editStock);

    onUpdateListing(
      editingListing.id,
      {
        price: Math.max(1000, editPrice),
        stockQuantity: totalStock,
        totalStock,
        variations: nextVariations,
      },
      editReason
    );
    setEditSavedMsg('Saved. Confirmed order snapshots remain untouched.');
    setTimeout(() => {
      setEditingListing(null);
      setEditSavedMsg(null);
    }, 900);
  };

  const handleToggleIssuePreset = (label: string) => {
    setNewSelectedIssues((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormErrors([]);
    setAddFormSuccess(null);

    const issues = [
      ...newSelectedIssues,
      ...(newCustomIssue.trim() ? [newCustomIssue.trim()] : []),
    ];

    const candidate: Partial<DeviceListing> = {
      title: newTitle.trim() || `${newBrand} ${newModel} (${newCondition})`,
      category: newCategory,
      condition: newCondition,
      brand: newBrand.trim(),
      model: newModel.trim(),
      modelYear: newModelYear ? Number(newModelYear) : undefined,
      yearMade:
        newYearMadePrecision === 'unknown'
          ? undefined
          : newYearMade
          ? Number(newYearMade)
          : undefined,
      yearMadePrecision: newYearMadePrecision,
      yearPurchased: newYearPurchased ? Number(newYearPurchased) : undefined,
      color: newColor.trim() || 'Black',
      storage: newStorage.trim() || undefined,
      ram: newRam.trim() || undefined,
      price: Number(newPrice) || 0,
      cosmeticGrade: newGrade,
      batteryHealth: newCategory === 'phones' ? Number(newBatteryHealth) || 85 : undefined,
      batchReference: newBatchRef.trim(),
      imeiOrSerial: newImeiOrSerial.trim(),
    };

    const validation = validateDeviceListing(candidate, platformConfig);
    if (!validation.valid) {
      setAddFormErrors(validation.errors);
      return;
    }

    const newListing: DeviceListing = {
      id: `dev-${Date.now()}`,
      category: newCategory,
      condition: newCondition,
      title: candidate.title!,
      brand: candidate.brand!,
      model: candidate.model!,
      modelYear: candidate.modelYear,
      yearMade: candidate.yearMade,
      yearMadePrecision: newYearMadePrecision,
      yearPurchased: candidate.yearPurchased,
      color: candidate.color!,
      storage: candidate.storage,
      ram: candidate.ram,
      price: candidate.price!,
      cosmeticGrade: newGrade,
      cosmeticDescription:
        newOverview.trim() ||
        'Tested and honestly described for everyday use.',
      batteryHealth: candidate.batteryHealth,
      images: newImageUrl.trim() ? [newImageUrl.trim()] : [],
      sellerId: vendor.id,
      sellerName: vendor.name,
      sellerState: vendor.state || storeState || 'Lagos State',
      sellerVerified: vendor.verificationBadge,
      sellerRating: vendor.rating,
      sellerSalesCount: vendor.completedOrders,
      foreignUsedStatus: 'Verified Foreign-Used',
      sourceCountry: newSourceCountry,
      batchReference: newBatchRef.trim(),
      imeiOrSerial: newImeiOrSerial.trim(),
      disclosedFaults: issues,
      disclosedFaultsList: issues.map((label, idx) => ({
        id: `flt-${Date.now()}-${idx}`,
        label: toSimpleEnglish(label).label,
        description:
          PLAIN_ENGLISH_ISSUE_PRESETS.find((p) => p.label === label)?.description ||
          toSimpleEnglish(label).explanation,
        isCritical: true,
      })),
      structuredDescription: {
        overview:
          newOverview.trim() ||
          `Foreign-used ${newBrand} ${newModel} inspected and clearly described.`,
        includedItems: newIncludedItems.trim(),
        previousRepairs: newPreviousRepairs.trim(),
        knownLimitations:
          newKnownLimitations.trim() ||
          (issues.length > 0 ? issues.join('; ') : 'None disclosed.'),
      },
      conditionReport: {
        batteryHealth: Number(newBatteryHealth) || 88,
        batteryReplaced: 'Original',
        screenOriginality: 'Original, verified',
        screenReplacementHistory: 'No screen replacement recorded',
        faceIdOrFingerprint: issues.some((i) => i.toLowerCase().includes('face id'))
          ? 'Not working'
          : 'Working',
        frontCamera: 'Working',
        rearCamera: 'Working',
        speakers: 'Working',
        microphone: 'Working',
        chargingPort: 'Working',
        wifi: 'Working',
        bluetooth: 'Working',
        simFunctionality: issues.some((i) => i.toLowerCase().includes('sim'))
          ? 'Not working'
          : 'Working',
        networkLockStatus: issues.some((i) => i.toLowerCase().includes('locked'))
          ? 'Carrier Locked'
          : 'Unlocked',
        icloudOrGoogleLock: 'Clean & Removed',
        mdmStatus: 'No MDM / Clean',
        imeiVerificationStatus: 'Verified Clean',
        otherRepairsNotes: newPreviousRepairs.trim() || 'Tested clean.',
      },
      repairHistory: [],
      warrantyDays: 14,
      warrantyPolicyNotes: vendor.warrantyPolicy,
      deliveryFee: 5000,
      freeDeliveryEligible: candidate.price! >= 500000,
      status: 'Active',
      createdAt: new Date().toISOString().slice(0, 10),
      views: 1,
      stockQuantity: Math.max(1, Number(newStock) || 1),
      totalStock: Math.max(1, Number(newStock) || 1),
    };

    onAddListing(newListing);
    setAddFormSuccess(`Published "${newListing.title}" cleanly to the marketplace.`);
    setNewTitle('');
    setNewModel('');
    setNewImeiOrSerial('');
    setNewSelectedIssues([]);
    setNewCustomIssue('');
    setShowAddForm(false);
  };

  const handleSubmitEvidenceBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evSupplierName.trim() || !evShipmentRef.trim()) return;
    const newBatch: ForeignUseEvidenceBatch = {
      id: `batch-${Date.now()}`,
      batchNumber: `${evSourceCountry.slice(0, 2).toUpperCase()}-BATCH-2026-${Math.floor(100 + Math.random() * 899)}`,
      sourceCountry: evSourceCountry,
      supplierName: evSupplierName.trim(),
      purchaseDate: new Date().toISOString().slice(0, 10),
      shipmentReference: evShipmentRef.trim(),
      shippingDate: new Date().toISOString().slice(0, 10),
      deviceCount: Math.max(1, Number(evDeviceCount) || 1),
      documentTypes: ['Airway Bill', 'Overseas Supplier Invoice'],
      imeiList: evImeis
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      status: 'Evidence Submitted',
      fileNames: [evFileName.trim() || 'import_manifest_2026.pdf'],
      submittedAt: new Date().toLocaleDateString(),
    };
    onAddEvidenceBatch(newBatch);
    setEvSupplierName('');
    setEvShipmentRef('');
    setEvImeis('');
    setEvFileName('');
    setShowEvidenceForm(false);
    setEvFeedback(`Batch ${newBatch.batchNumber} submitted for verification.`);
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim()) return;
    const nextPromo: VendorPromotion = {
      id: `promo-${Date.now()}`,
      name: promoTitle.trim(),
      description: `Vendor discount of ${promoDiscount}% across selected foreign-used tech.`,
      code: promoCode.trim().toUpperCase() || undefined,
      discountType: 'percentage',
      discountValue: Math.max(1, Number(promoDiscount) || 5),
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '2026-12-31',
      active: true,
      eligibleCategories: ['phones', 'laptops'],
    };
    onUpdateVendor({
      ...vendor,
      promotions: [nextPromo, ...vendor.promotions],
    });
    setPromoTitle('');
    setPromoCode('');
    setPromoNotice(`Promotion "${nextPromo.name}" is now active on your storefront.`);
  };

  const comboPrimaryListing =
    vendorListings.find((l) => l.id === comboPrimaryId) || vendorListings[0];
  const comboSecondaryListing =
    vendorListings.find((l) => l.id === comboSecondaryId && l.id !== comboPrimaryListing?.id) ||
    vendorListings.find((l) => l.id !== comboPrimaryListing?.id);
  const comboCombinedSum =
    (comboPrimaryListing?.price || 0) + (comboSecondaryListing?.price || 0);
  const comboSuggestedPrice =
    comboCombinedSum > 0 ? Math.round((comboCombinedSum * 0.9) / 1000) * 1000 : 0;

  const handleCreateComboBundle = (e: React.FormEvent) => {
    e.preventDefault();
    setComboError(null);
    setComboSuccess(null);
    if (!comboPrimaryListing || !comboSecondaryListing) {
      setComboError('You need at least two separate products in your catalog to bundle.');
      return;
    }
    const targetPrice = Number(comboBundlePrice) || comboSuggestedPrice;
    const res = buildComboBundleListing({
      vendor,
      primaryListing: comboPrimaryListing,
      secondaryListings: [comboSecondaryListing],
      bundlePrice: targetPrice,
      promoTag: comboTag,
      customTitle: comboTitle,
    });
    if (!res.valid || !res.listing) {
      setComboError(res.error || 'Could not create combo bundle.');
      return;
    }
    onAddListing(res.listing);
    setComboBundlePrice('');
    setComboTitle('');
    setComboSuccess(
      `Published "${res.listing.title}" (${comboTag}) saving customers ${formatNaira(
        res.savings || 0
      )} (${res.discountPercent || 0}% off).`
    );
  };

  const handleSavePayoutBank = (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutErrors([]);
    setPayoutSavedMsg(null);
    const validation = validateNigerianBankAccount({
      bankName: payoutBankName,
      accountNumber: payoutAccountNumber,
      accountName: payoutAccountName,
    });
    if (!validation.valid) {
      setPayoutErrors(validation.errors);
      return;
    }
    const cleanAcct = payoutAccountNumber.replace(/\s+/g, '');
    onUpdateVendor({
      ...vendor,
      payoutBankAccount: {
        bankName: payoutBankName.trim(),
        accountNumber: cleanAcct,
        accountName: payoutAccountName.trim(),
        verified: true,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
    });
    setPayoutAccountNumber(cleanAcct);
    setPayoutSavedMsg(
      `Verified payout bank saved: ${payoutBankName} · ${cleanAcct} (${payoutAccountName.trim()}).`
    );
  };

  const renderBankPayoutPanel = () => (
    <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] flex items-center justify-center text-[#A981FF]">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#211B2B]">Bank Payouts & Escrow Settlement</h2>
            <p className="text-[11px] text-[#716B7B]">
              Verified Nigerian NUBAN settlement account (released after {platformConfig.inspectionHours}h inspection hold)
            </p>
          </div>
        </div>
        {vendor.payoutBankAccount?.verified && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E9F7EF] text-[#238653] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Payout Account
          </span>
        )}
      </div>

      {vendor.payoutBankAccount && (
        <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold text-[#211B2B]">
              {vendor.payoutBankAccount.bankName} ·{' '}
              <span className="font-mono">{vendor.payoutBankAccount.accountNumber}</span>
            </div>
            <div className="text-[11px] text-[#716B7B]">
              Account Name: {vendor.payoutBankAccount.accountName} · Last updated{' '}
              {vendor.payoutBankAccount.updatedAt}
            </div>
          </div>
          <span className="text-[11px] font-medium text-[#238653]">Active NUBAN</span>
        </div>
      )}

      {payoutErrors.length > 0 && (
        <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#D9534F] space-y-1">
          {payoutErrors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}

      {payoutSavedMsg && (
        <div className="p-3 rounded-xl bg-[#E9F7EF] border border-[#B7E4C7] text-[#238653] font-medium">
          {payoutSavedMsg}
        </div>
      )}

      <form onSubmit={handleSavePayoutBank} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-medium text-[#211B2B] mb-1">Nigerian Bank</label>
          <select
            value={payoutBankName}
            onChange={(e) => setPayoutBankName(e.target.value)}
            aria-label="Select Nigerian bank"
            className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
          >
            {NIGERIAN_BANKS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium text-[#211B2B] mb-1">10-Digit NUBAN Account</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={payoutAccountNumber}
            onChange={(e) => setPayoutAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0123456789"
            aria-label="NUBAN account number"
            className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] font-mono text-[#211B2B]"
          />
        </div>
        <div>
          <label className="block font-medium text-[#211B2B] mb-1">Account Holder Name</label>
          <input
            type="text"
            value={payoutAccountName}
            onChange={(e) => setPayoutAccountName(e.target.value)}
            placeholder="Registered business or personal name"
            aria-label="Bank account holder name"
            className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
          />
        </div>
        <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-[#716B7B]">
            Escrow payouts settle in ₦ after the Vendor Platform Service Fee (up to 1%, currently {vendorFeeRateDisplay}).
          </span>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-medium min-h-[40px]"
          >
            Save &amp; Verify Payout Bank
          </button>
        </div>
      </form>
    </div>
  );

  const vendorClaims = useMemo(
    () => warrantyClaims.filter((c) => c.vendorId === vendor.id),
    [warrantyClaims, vendor.id]
  );

  const desktopTabs: { id: VendorNavTab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'products', label: 'Products', icon: Package, badge: vendorListings.length },
    { id: 'orders', label: 'Orders', icon: ClipboardList, badge: openOrdersCount },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'holds', label: 'Payments on Hold', icon: CreditCard },
    { id: 'warranties', label: 'Warranties', icon: ShieldCheck, badge: vendorClaims.length },
    { id: 'activity', label: 'Activity & History', icon: Activity, badge: vendorOrders.length + vendorDisputes.length },
    { id: 'evidence', label: 'Foreign-Use Proof', icon: FileCheck },
    { id: 'promotions', label: 'Promotions & Bundles', icon: Tag },
    { id: 'storefront', label: 'Storefront', icon: Store },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const shortcuts: { label: string; desc: string; graphic: VendorToolGraphicKey; action: () => void }[] = [
    { label: 'Overview', desc: 'Store performance', graphic: 'overview', action: () => onTabChange('overview') },
    { label: 'Add Product', desc: 'List verified device', graphic: 'add_product', action: () => { onTabChange('products'); setAddFormMode('grouped'); setShowAddForm(true); } },
    { label: 'Bulk Accessories', desc: 'Chargers, pouches & gear', graphic: 'bulk_accessories', action: () => { onTabChange('products'); setAddFormMode('accessories'); setShowAddForm(true); } },
    { label: 'Manage Products', desc: 'Prices, stock & grades', graphic: 'manage_products', action: () => { onTabChange('products'); setShowAddForm(false); } },
    { label: 'View Orders', desc: 'Dispatch & tracking', graphic: 'orders', action: () => onTabChange('orders') },
    { label: 'Messages', desc: 'Buyer & support chat', graphic: 'messages', action: () => onTabChange('messages') },
    { label: 'Payments on Hold', desc: 'Financial ledger & NUBAN', graphic: 'holds', action: () => onTabChange('holds') },
    { label: '3-Month Warranties', desc: 'Active cover & claims', graphic: 'orders', action: () => onTabChange('warranties') },
    { label: 'Activity & History', desc: 'Orders, edits & logs', graphic: 'activity', action: () => onTabChange('activity') },
    { label: 'Foreign-Use Proof', desc: 'Import batch records', graphic: 'evidence', action: () => onTabChange('evidence') },
    { label: 'Promotions & Bundles', desc: 'Combo deals & codes', graphic: 'promotions', action: () => onTabChange('promotions') },
    { label: 'Storefront', desc: 'Policies & pickup desk', graphic: 'storefront', action: () => onTabChange('storefront') },
    { label: 'Customer Reviews', desc: 'Verified ratings', graphic: 'reviews', action: () => onTabChange('reviews') },
    { label: 'Marketing', desc: 'Featured deal campaigns', graphic: 'marketing', action: () => onTabChange('marketing') },
    { label: 'Settings', desc: 'Account & payouts', graphic: 'settings', action: () => onTabChange('settings') },
    {
      label: 'View Public Store',
      desc: 'Buyer view preview',
      graphic: 'public_store',
      action: () => onViewPublicStorefront && onViewPublicStorefront(vendor.id),
    },
  ];

  const filteredProducts = vendorListings.filter((item) =>
    productStatusFilter === 'All' ? true : item.status === productStatusFilter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 space-y-6">
      {/* Vendor Header */}
      <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <SmartImage
            src={vendor.logo}
            alt={vendor.name}
            category="phones"
            className="w-12 h-12 rounded-2xl object-cover border border-[#EAE6F0] shrink-0"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-[#211B2B] truncate">{vendor.name}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] font-medium text-[#211B2B]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#A981FF]" />
                Approved Vendor
              </span>
              {vendor.vendorNumber && (
                <span className="font-mono text-[11px] text-[#716B7B]">{vendor.vendorNumber}</span>
              )}
            </div>
            <p className="text-xs text-[#716B7B] flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[#211B2B] font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#A981FF]" />
                {vendor.state || inferStateFromLocationText(vendor.location)}
              </span>
              <span>·</span>
              <span className="truncate">{vendor.location}</span>
              <span>· {vendor.completedOrders} completed orders · {vendor.rating.toFixed(1)}★</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onViewPublicStorefront && (
            <button
              type="button"
              onClick={() => onViewPublicStorefront(vendor.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] text-xs font-medium text-[#211B2B] min-h-[40px]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#A981FF]" />
              Public Store
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onTabChange('products');
              setShowAddForm(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium min-h-[40px]"
          >
            <PlusCircle className="w-4 h-4" />
            Add Product
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#D9534F] text-xs font-medium min-h-[40px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Vendor Policy Re-acceptance Banner (when Admin publishes material update) */}
      {policyNeedingReaccept && onAcceptVendorAgreement && (
        <div
          data-testid="vendor-reaccept-banner"
          className="rounded-2xl bg-[#FFF5F5] border-2 border-[#D9534F] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="space-y-1">
            <div className="font-semibold text-[#C53030] flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" />
              Updated {policyNeedingReaccept.title} (v{policyNeedingReaccept.currentVersion}) Requires Re-acceptance
            </div>
            <p className="text-[#4A4356]">
              You previously accepted v{vendor.agreementAcceptedVersion}. Review the updated terms and confirm acceptance to keep publishing and fulfilling orders without interruption.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {onOpenPolicyCentre && (
              <button
                type="button"
                onClick={() => onOpenPolicyCentre(policyNeedingReaccept.slug)}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#EAE6F0] text-[#211B2B] font-medium"
              >
                Read Updated Policy
              </button>
            )}
            <button
              type="button"
              onClick={() => onAcceptVendorAgreement(policyNeedingReaccept.currentVersion)}
              className="px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
            >
              Confirm &amp; Accept v{policyNeedingReaccept.currentVersion}
            </button>
          </div>
        </div>
      )}

      {/* Desktop Tab Strip */}
      <div className="hidden md:flex flex-wrap items-center gap-1.5 pb-1">
        {desktopTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors min-h-[40px] border ${
                isActive
                  ? 'bg-[#A981FF] text-white border-[#A981FF]'
                  : 'bg-white text-[#4A4356] border-[#EAE6F0] hover:border-[#A981FF]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#F5F0FF] text-[#211B2B]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW: 9 KPIs + 13 Shortcuts */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3.5">
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-1">
              <span className="text-[11px] text-[#716B7B]">Active Products</span>
              <div className="text-xl font-semibold text-[#211B2B]">{activeListingsCount}</div>
              <span className="text-[11px] text-[#4A4356]">Live across storefront</span>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-1">
              <span className="text-[11px] text-[#716B7B]">Open Orders</span>
              <div className="text-xl font-semibold text-[#211B2B]">{openOrdersCount}</div>
              <span className="text-[11px] text-[#4A4356]">Preparing or in transit</span>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-1">
              <span className="text-[11px] text-[#716B7B]">Orders in Inspection</span>
              <div className="text-xl font-semibold text-[#A981FF]">{inInspectionCount}</div>
              <span className="text-[11px] text-[#4A4356]">Minimum {platformConfig.inspectionHours}h hold</span>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-1">
              <span className="text-[11px] text-[#716B7B]">Expected Payout (Clean Holds)</span>
              <div className="text-xl font-semibold text-[#211B2B]">{formatNaira(expectedCleanPayout)}</div>
              <span className="text-[11px] text-[#716B7B]">Releases after inspection</span>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-1">
              <span className="text-[11px] text-[#716B7B]">Amount Held (Not Available for Withdrawal)</span>
              <div className="text-xl font-semibold text-[#211B2B]">{formatNaira(heldUnavailableAmount)}</div>
              <span className="text-[11px] text-[#716B7B]">Protected until delivery + timer</span>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-1">
              <span className="text-[11px] text-[#716B7B]">Settled Payouts</span>
              <div className="text-xl font-semibold text-[#211B2B]">{formatNaira(settledTotal)}</div>
              <span className="text-[11px] text-[#716B7B]">
                After Vendor Platform Service Fee (Up to 1%)
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-1">
              <span className="text-[11px] text-[#716B7B]">Unread Messages</span>
              <div className="text-xl font-semibold text-[#A981FF]">{unreadMessagesCount}</div>
              <span className="text-[11px] text-[#716B7B]">Unified buyer & support threads</span>
            </div>
            <div
              className={`rounded-2xl border p-4 space-y-1 ${
                activeDisputesCount > 0 ? 'bg-[#FFF5F5] border-[#FED7D7]' : 'bg-white border-[#EAE6F0]'
              }`}
            >
              <span className="text-[11px] text-[#716B7B]">Active Disputes</span>
              <div
                className={`text-xl font-semibold ${
                  activeDisputesCount > 0 ? 'text-[#C53030]' : 'text-[#211B2B]'
                }`}
              >
                {activeDisputesCount}
              </div>
              <span className="text-[11px] text-[#716B7B]">
                {activeDisputesCount > 0 ? 'Payout frozen during review' : 'No open disputes'}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-1">
              <span className="text-[11px] text-[#716B7B]">Customer Rating</span>
              <div className="text-xl font-semibold text-[#211B2B]">{vendor.rating.toFixed(1)} / 5.0</div>
              <span className="text-[11px] text-[#716B7B]">Verified orders only</span>
            </div>
          </div>

          {/* 15 Quick Functional Shortcuts */}
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3.5">
            <h2 className="text-sm font-semibold text-[#211B2B]">Vendor Quick Shortcuts</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {shortcuts.map((sc) => (
                <button
                  key={sc.label}
                  type="button"
                  onClick={sc.action}
                  className="p-3.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] hover:bg-white hover:border-[#A981FF] hover:shadow-sm text-left transition-all duration-200 flex flex-col justify-between gap-3 min-h-[104px]"
                >
                  <VendorToolGraphic tool={sc.graphic} />
                  <div>
                    <div className="text-xs font-semibold text-[#211B2B]">{sc.label}</div>
                    <div className="text-[11px] text-[#716B7B] truncate mt-0.5">{sc.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS & INVENTORY MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">Products & Inventory Management</h2>
              <p className="text-xs text-[#716B7B]">
                Reorder your storefront display, edit prices or stock in place, pause/resume units, or bulk upload grouped models.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onViewPublicStorefront && (
                <button
                  type="button"
                  onClick={() => onViewPublicStorefront(vendor.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] text-xs font-medium text-[#211B2B] min-h-[40px]"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#A981FF]" />
                  Preview Store Order
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAddFormMode('grouped');
                  setShowAddForm((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium min-h-[40px]"
              >
                <Layers className="w-3.5 h-3.5" />
                {showAddForm ? 'Close Product Upload' : '+ Add New Product (Bulk / Grouped)'}
              </button>
            </div>
          </div>

          {/* Inventory Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-3.5">
              <div className="text-[11px] text-[#716B7B]">Total Listings</div>
              <div className="text-lg font-semibold text-[#211B2B]">{vendorListings.length}</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-3.5">
              <div className="text-[11px] text-[#716B7B]">Active Live</div>
              <div className="text-lg font-semibold text-[#238653]">
                {vendorListings.filter((l) => l.status === 'Active').length}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-3.5">
              <div className="text-[11px] text-[#716B7B]">Paused</div>
              <div className="text-lg font-semibold text-[#716B7B]">
                {vendorListings.filter((l) => l.status === 'Paused').length}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-3.5">
              <div className="text-[11px] text-[#716B7B]">Pending Review</div>
              <div className="text-lg font-semibold text-[#A981FF]">
                {vendorListings.filter((l) => l.status === 'Pending Review').length}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-3.5 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-[#716B7B]">Total Stock Units</div>
              <div className="text-lg font-semibold text-[#211B2B]">
                {vendorListings.reduce((sum, l) => sum + (l.stockQuantity ?? l.totalStock ?? 1), 0)}
              </div>
            </div>
          </div>

          {addFormSuccess && (
            <div className="p-3.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-xs text-[#211B2B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#A981FF]" />
              {addFormSuccess}
            </div>
          )}

          {inventoryToast && (
            <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-xs text-[#211B2B] flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#A981FF]" />
                {inventoryToast}
              </span>
              <button
                type="button"
                onClick={() => setInventoryToast(null)}
                className="text-[#716B7B] hover:text-[#211B2B]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {showAddForm && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddFormMode('grouped')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    addFormMode === 'grouped'
                      ? 'bg-[#A981FF] text-white border-[#A981FF]'
                      : 'bg-white text-[#4A4356] border-[#EAE6F0] hover:border-[#A981FF]'
                  }`}
                >
                  Grouped Model Bulk Upload (+ Add Another Device)
                </button>
                <button
                  type="button"
                  onClick={() => setAddFormMode('accessories')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    addFormMode === 'accessories'
                      ? 'bg-[#A981FF] text-white border-[#A981FF]'
                      : 'bg-white text-[#4A4356] border-[#EAE6F0] hover:border-[#A981FF]'
                  }`}
                >
                  Accessories &amp; Gadgets (Bulk Upload)
                </button>
                <button
                  type="button"
                  onClick={() => setAddFormMode('single')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    addFormMode === 'single'
                      ? 'bg-[#A981FF] text-white border-[#A981FF]'
                      : 'bg-white text-[#4A4356] border-[#EAE6F0] hover:border-[#A981FF]'
                  }`}
                >
                  Quick Single Unit Form
                </button>
              </div>

              {addFormMode === 'grouped' ? (
                <VendorBulkListingWizard
                  vendor={vendor}
                  platformConfig={platformConfig}
                  evidenceBatches={evidenceBatches}
                  onPublishGroupedListing={(groupedListing) => {
                    onAddListing(groupedListing);
                    setAddFormSuccess(
                      `Published "${groupedListing.title}" (${groupedListing.variations?.length || 1} unit(s), total stock ${groupedListing.totalStock}) cleanly to your storefront.`
                    );
                    setShowAddForm(false);
                  }}
                  onCancel={() => setShowAddForm(false)}
                />
              ) : addFormMode === 'accessories' ? (
                <VendorBulkAccessoryWizard
                  vendor={vendor}
                  evidenceBatches={evidenceBatches}
                  onPublishAccessories={(newAccessoryListings) => {
                    if (onAddMultipleListings) {
                      onAddMultipleListings(newAccessoryListings);
                    } else {
                      newAccessoryListings.forEach((item) => onAddListing(item));
                    }
                    setAddFormSuccess(
                      `Published ${newAccessoryListings.length} accessory & gadget item(s) directly to your storefront and live marketplace.`
                    );
                    setShowAddForm(false);
                  }}
                  onCancel={() => setShowAddForm(false)}
                />
              ) : (
            <form
              onSubmit={handleCreateListing}
              className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EAE6F0]">
                <div>
                  <h3 className="text-sm font-semibold text-[#211B2B]">List Foreign-Used Technology</h3>
                  <p className="text-[#716B7B]">
                    Use everyday English and keep Model Year separate from Year Made.
                  </p>
                </div>
                {!platformConfig.brandNewEnabled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] font-medium text-[#211B2B]">
                    <Lock className="w-3.5 h-3.5 text-[#A981FF]" />
                    Foreign-Used Only Mode
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Category)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  >
                    {activeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Condition</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as DeviceCondition)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  >
                    <option value="Foreign-Used">Foreign-Used</option>
                    <option value="Brand-New" disabled={!platformConfig.brandNewEnabled}>
                      Brand-New {!platformConfig.brandNewEnabled ? '(Disabled by Admin)' : ''}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="e.g. Apple, Dell, Sony"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Model Name</label>
                  <input
                    type="text"
                    required
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="e.g. iPhone 13, XPS 13"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#211B2B] mb-1">Listing Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Auto-filled if left blank (e.g. Apple iPhone 13 128GB Foreign Used)"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Model Year</label>
                  <input
                    type="number"
                    value={newModelYear}
                    onChange={(e) => setNewModelYear(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Year Made Certainty</label>
                  <select
                    value={newYearMadePrecision}
                    onChange={(e) => setNewYearMadePrecision(e.target.value as YearMadePrecision)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  >
                    <option value="known">Known exact year</option>
                    <option value="approximate">Approximate year</option>
                    <option value="unknown">Not sure</option>
                  </select>
                </div>

                {newYearMadePrecision !== 'unknown' && (
                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">Year Made</label>
                    <input
                      type="number"
                      value={newYearMade}
                      onChange={(e) => setNewYearMade(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Year Purchased (Optional)</label>
                  <input
                    type="number"
                    value={newYearPurchased}
                    onChange={(e) => setNewYearPurchased(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Price (NGN)</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Cosmetic Grade</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value as CosmeticGrade)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  >
                    <option value="Grade A">Grade A (Very Clean)</option>
                    <option value="Grade B">Grade B (Light Wear)</option>
                    <option value="Grade C">Grade C (Noticeable Signs)</option>
                    <option value="Grade D">Grade D (Heavy Marks)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Color</label>
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Storage / Capacity</label>
                  <input
                    type="text"
                    value={newStorage}
                    onChange={(e) => setNewStorage(e.target.value)}
                    placeholder="e.g. 128GB or N/A"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">RAM / Memory</label>
                  <input
                    type="text"
                    value={newRam}
                    onChange={(e) => setNewRam(e.target.value)}
                    placeholder="e.g. 8GB or 16GB"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                {newCategory === 'phones' && (
                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">Battery Health (%)</label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={newBatteryHealth}
                      onChange={(e) => setNewBatteryHealth(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Available Stock</label>
                  <input
                    type="number"
                    min={1}
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Source Country</label>
                  <input
                    type="text"
                    value={newSourceCountry}
                    onChange={(e) => setNewSourceCountry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Import Batch Reference *</label>
                  <input
                    type="text"
                    required
                    value={newBatchRef}
                    onChange={(e) => setNewBatchRef(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">IMEI or Serial Number *</label>
                  <input
                    type="text"
                    required
                    value={newImeiOrSerial}
                    onChange={(e) => setNewImeiOrSerial(e.target.value)}
                    placeholder="e.g. 358911240981122"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#211B2B] mb-1">Product Image URL (Optional)</label>
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Leave blank to use clean category graphic"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>
              </div>

              {/* Plain-English Disclosed Issues */}
              <div className="p-4 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] space-y-2.5">
                <div className="font-semibold text-[#C53030] flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" />
                  Disclosed Issues or Repairs (Highlighted Clearly in Red for Buyers)
                </div>
                <div className="flex flex-wrap gap-2">
                  {PLAIN_ENGLISH_ISSUE_PRESETS.map((preset) => {
                    const selected = newSelectedIssues.includes(preset.label);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleToggleIssuePreset(preset.label)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          selected
                            ? 'bg-[#D9534F] text-white border-[#D9534F]'
                            : 'bg-white text-[#211B2B] border-[#FED7D7]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={newCustomIssue}
                  onChange={(e) => setNewCustomIssue(e.target.value)}
                  placeholder="Optional extra disclosure in simple English (e.g. Charger port replaced)"
                  className="w-full px-3 py-2 rounded-xl border border-[#FED7D7] bg-white text-[#211B2B]"
                />
              </div>

              {/* Structured Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Overview (Simple English)</label>
                  <textarea
                    rows={2}
                    value={newOverview}
                    onChange={(e) => setNewOverview(e.target.value)}
                    placeholder="Describe overall performance and condition simply."
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Included in Box</label>
                  <textarea
                    rows={2}
                    value={newIncludedItems}
                    onChange={(e) => setNewIncludedItems(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Previous Repairs</label>
                  <input
                    type="text"
                    value={newPreviousRepairs}
                    onChange={(e) => setNewPreviousRepairs(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Known Limitations</label>
                  <input
                    type="text"
                    value={newKnownLimitations}
                    onChange={(e) => setNewKnownLimitations(e.target.value)}
                    placeholder="Leave blank if none"
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>
              </div>

              {addFormErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] space-y-1">
                  {addFormErrors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#EAE6F0] text-[#211B2B] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-medium"
                  >
                    Publish Foreign-Used Product
                  </button>
                </div>
              </form>
              )}
            </div>
          )}

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {(['All', 'Active', 'Paused', 'Pending Review', 'Draft', 'Sold', 'Archived'] as const).map(
              (st) => {
                const count =
                  st === 'All'
                    ? vendorListings.length
                    : vendorListings.filter((l) => l.status === st).length;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setProductStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                      productStatusFilter === st
                        ? 'bg-[#A981FF] text-white border-[#A981FF]'
                        : 'bg-white text-[#4A4356] border-[#EAE6F0]'
                    }`}
                  >
                    {st} ({count})
                  </button>
                );
              }
            )}
          </div>

          {/* Products & Inventory Management Table */}
          <div className="bg-white rounded-2xl border border-[#EAE6F0] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#EAE6F0] bg-[#FAF9FC] flex flex-wrap items-center justify-between gap-2 text-xs text-[#716B7B]">
              <span>Drag rows or use Move Up / Move Down to control public storefront display order.</span>
              <span className="font-medium text-[#211B2B]">{filteredProducts.length} shown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EAE6F0] text-[11px] text-[#716B7B] bg-white">
                    <th className="py-3 px-3 font-medium">Order</th>
                    <th className="py-3 px-3 font-medium">Device & Grade</th>
                    <th className="py-3 px-3 font-medium">Status</th>
                    <th className="py-3 px-3 font-medium">Price (₦)</th>
                    <th className="py-3 px-3 font-medium">Stock</th>
                    <th className="py-3 px-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6F0]">
                  {filteredProducts.map((item, idx) => {
                    const currentStock = item.stockQuantity ?? item.totalStock ?? 1;
                    const draftPriceStr =
                      inlinePriceDrafts[item.id] ?? String(item.price);
                    const isPaused = item.status === 'Paused';
                    const prevItem = filteredProducts[idx - 1];
                    const nextItem = filteredProducts[idx + 1];

                    const commitInlinePrice = (valStr: string) => {
                      const numeric = Number(valStr.replace(/[^\d]/g, ''));
                      if (numeric >= 1000 && numeric !== item.price) {
                        onUpdateListing(item.id, { price: numeric }, 'Inline inventory price edit');
                        setInventoryToast(`Updated price for ${item.title} to ${formatNaira(numeric)}.`);
                      }
                      setInlinePriceDrafts((prev) => {
                        const copy = { ...prev };
                        delete copy[item.id];
                        return copy;
                      });
                    };

                    const stepStock = (delta: number) => {
                      const nextStock = Math.max(0, currentStock + delta);
                      onUpdateListing(
                        item.id,
                        { stockQuantity: nextStock, totalStock: nextStock },
                        'Inline inventory stock adjustment'
                      );
                      setInventoryToast(`Updated stock for ${item.title} to ${nextStock} unit(s).`);
                    };

                    return (
                      <tr
                        key={item.id}
                        draggable={Boolean(onReorderListings)}
                        onDragStart={() => setDraggedListingId(item.id)}
                        onDragOver={(e) => {
                          if (draggedListingId) e.preventDefault();
                        }}
                        onDrop={() => {
                          if (draggedListingId && draggedListingId !== item.id && onReorderListings) {
                            const next = reorderVendorListingSequence(
                              listings,
                              vendor.id,
                              draggedListingId,
                              item.id
                            );
                            onReorderListings(next);
                            setInventoryToast('Updated public storefront display order.');
                          }
                          setDraggedListingId(null);
                        }}
                        className={`hover:bg-[#FAF9FC] transition-colors ${
                          draggedListingId === item.id ? 'opacity-50 bg-[#F5F0FF]' : ''
                        }`}
                      >
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <GripVertical
                              className="w-4 h-4 text-[#716B7B] cursor-grab"
                              aria-hidden="true"
                            />
                            <button
                              type="button"
                              disabled={!prevItem || !onReorderListings}
                              aria-label={`Move ${item.title} up`}
                              onClick={() => {
                                if (!prevItem || !onReorderListings) return;
                                onReorderListings(
                                  reorderVendorListingSequence(
                                    listings,
                                    vendor.id,
                                    item.id,
                                    prevItem.id
                                  )
                                );
                                setInventoryToast(`Moved "${item.title}" up in storefront order.`);
                              }}
                              className="p-1 rounded-lg border border-[#EAE6F0] bg-white text-[#211B2B] disabled:opacity-35 hover:border-[#A981FF]"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={!nextItem || !onReorderListings}
                              aria-label={`Move ${item.title} down`}
                              onClick={() => {
                                if (!nextItem || !onReorderListings) return;
                                onReorderListings(
                                  reorderVendorListingSequence(
                                    listings,
                                    vendor.id,
                                    item.id,
                                    nextItem.id
                                  )
                                );
                                setInventoryToast(`Moved "${item.title}" down in storefront order.`);
                              }}
                              className="p-1 rounded-lg border border-[#EAE6F0] bg-white text-[#211B2B] disabled:opacity-35 hover:border-[#A981FF]"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-center gap-2.5 min-w-[200px]">
                            <SmartImage
                              src={item.images[0]}
                              alt={item.title}
                              category={item.category}
                              className="w-11 h-11 rounded-xl object-cover border border-[#EAE6F0] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-[#211B2B] truncate max-w-[220px]">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-[#716B7B]">
                                {item.cosmeticGrade}
                                {item.variations && item.variations.length > 0
                                  ? ` · ${item.variations.length} variants`
                                  : ''}
                                {item.batchReference ? ` · ${item.batchReference}` : ''}
                              </div>
                              {item.disclosedFaults && item.disclosedFaults.length > 0 && (
                                <div className="text-[10px] text-[#C53030] truncate max-w-[220px]">
                                  Disclosed: {item.disclosedFaults.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                              item.status === 'Active'
                                ? 'bg-[#F0F9F4] text-[#238653] border-[#CBEAD8]'
                                : item.status === 'Paused'
                                ? 'bg-[#FAF9FC] text-[#716B7B] border-[#EAE6F0]'
                                : 'bg-[#F5F0FF] text-[#211B2B] border-[#D0BCFC]'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-[#716B7B] font-medium">₦</span>
                            <input
                              type="number"
                              min={1000}
                              aria-label={`Price for ${item.title}`}
                              value={draftPriceStr}
                              onChange={(e) =>
                                setInlinePriceDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              onBlur={(e) => commitInlinePrice(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitInlinePrice((e.target as HTMLInputElement).value);
                                }
                              }}
                              className="w-24 px-2 py-1 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC] font-medium text-[#211B2B] focus:outline-none focus:border-[#A981FF]"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <div className="inline-flex items-center rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]">
                            <button
                              type="button"
                              aria-label={`Decrease stock for ${item.title}`}
                              onClick={() => stepStock(-1)}
                              className="px-2 py-1 text-[#211B2B] hover:bg-white rounded-l-lg"
                            >
                              -
                            </button>
                            <span className="px-2.5 py-1 font-semibold text-[#211B2B] min-w-[28px] text-center">
                              {currentStock}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase stock for ${item.title}`}
                              onClick={() => stepStock(1)}
                              className="px-2 py-1 text-[#211B2B] hover:bg-white rounded-r-lg"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus = isPaused ? 'Active' : 'Paused';
                                onUpdateListing(
                                  item.id,
                                  { status: nextStatus },
                                  `Vendor toggled status to ${nextStatus}`
                                );
                                setInventoryToast(
                                  `${item.title} is now ${nextStatus === 'Paused' ? 'Paused (hidden from buyers)' : 'Active live on storefront'}.`
                                );
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-medium ${
                                isPaused
                                  ? 'bg-[#F5F0FF] border-[#D0BCFC] text-[#211B2B]'
                                  : 'bg-white border-[#EAE6F0] text-[#4A4356] hover:border-[#A981FF]'
                              }`}
                            >
                              {isPaused ? (
                                <>
                                  <Play className="w-3 h-3 text-[#A981FF]" />
                                  Resume
                                </>
                              ) : (
                                <>
                                  <Pause className="w-3 h-3 text-[#716B7B]" />
                                  Pause
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] hover:border-[#A981FF] font-medium text-[#211B2B]"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#A981FF]" />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ROLE-LOCKED VENDOR ORDERS ACTION CENTRE */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">
                Vendor Orders Action Centre ({vendorOrders.length})
              </h2>
              <p className="text-xs text-[#716B7B]">
                Accept new orders, prepare devices, arrange your own dispatchers, and confirm delivery using the customer&apos;s one-time Delivery Verification Code.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#211B2B]">
              <Lock className="w-3.5 h-3.5 text-[#A981FF] shrink-0" />
              <span>Vendors cannot manually mark Delivered; customer OTP or buyer confirmation starts 24h inspection</span>
            </div>
          </div>

          <div className="space-y-3">
            {vendorOrders.map((ord) => {
              const linkedConv = vendorConversations.find((c) => c.orderId === ord.id);
              const isPostDispatch = [
                'In transit',
                'Ready for Pickup',
                'Delivered',
                'Delivered_In_Inspection',
                'Buyer inspection',
                'Completed',
                'Disputed',
                'Dispute_Opened',
                'Refunded',
              ].includes(ord.fulfillmentStatus);
              const awaitingOtpVerification =
                (ord.fulfillmentStatus === 'In transit' ||
                  ord.fulfillmentStatus === 'Ready for Pickup') &&
                !ord.deliveryCodeUsedAt;
              const isDispatchOpen = dispatchFormOrderId === ord.id;
              const otpStatus = otpFeedback[ord.id];
              const isPickupOrder = ord.deliveryMethod === 'physical_pickup';

              return (
                <div
                  key={ord.id}
                  data-testid={`vendor-order-card-${ord.id}`}
                  className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-[#211B2B]">
                        {ord.subOrderNumber || ord.orderNumber}
                      </span>
                      {ord.parentOrderNumber && ord.parentOrderNumber !== ord.orderNumber && (
                        <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0] font-mono text-[10px] text-[#716B7B]">
                          Parent: {ord.parentOrderNumber}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded font-medium border ${
                          ord.disputePaused
                            ? 'bg-[#FFF5F5] border-[#FED7D7] text-[#C53030]'
                            : 'bg-white border-[#EAE6F0] text-[#4A4356]'
                        }`}
                      >
                        {ord.fulfillmentStatus.replace(/_/g, ' ')}
                      </span>
                      {ord.isGift && (
                        <span className="px-2 py-0.5 rounded bg-[#F5F0FF] border border-[#D0BCFC] text-[#7E4EF2] font-semibold">
                          GIFT ORDER · HIDE PRICES
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-[#211B2B] tabular-nums">
                      {formatNaira(ord.itemPrice + (ord.accessoriesPrice || 0))}
                    </span>
                  </div>

                  {ord.isGift && ord.giftDetails && (
                    <div
                      data-testid={`vendor-gift-packing-note-${ord.id}`}
                      className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F] space-y-1"
                    >
                      <div className="font-semibold">
                        Gift Packing Rules: Exclude prices, fees &amp; receipts from parcel
                      </div>
                      <div>
                        Recipient: <strong>{ord.giftDetails.recipientName}</strong> (
                        {ord.giftDetails.recipientAddress.city},{' '}
                        {ord.giftDetails.recipientAddress.state}) · Special gift wrapping is NOT guaranteed.
                      </div>
                      {ord.giftDetails.senderVisibility === 'anonymous' ? (
                        <div className="font-semibold text-[#C53030]">
                          ANONYMOUS SENDER: Do NOT write purchaser/sender name on box, invoice, or greeting note.
                        </div>
                      ) : (
                        <div>
                          Sender to show: <strong>{ord.giftDetails.senderDisplayName || ord.buyerName}</strong>
                        </div>
                      )}
                      {ord.giftDetails.giftMessage && (
                        <div className="italic">Note for recipient: &ldquo;{ord.giftDetails.giftMessage}&rdquo;</div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-[#211B2B]">{ord.listing.title}</div>
                      <div className="text-[#716B7B]">
                        {ord.isGift && ord.giftDetails?.senderVisibility === 'anonymous'
                          ? `Gift Recipient: ${ord.giftDetails.recipientName} (Anonymous Sender)`
                          : ord.isGift && ord.giftDetails
                          ? `Gift Recipient: ${ord.giftDetails.recipientName} (from ${ord.giftDetails.senderDisplayName || ord.buyerName})`
                          : `Customer: ${ord.buyerName}`}{' '}
                        ({ord.deliveryAddress.city}, {ord.deliveryAddress.state}) ·{' '}
                        {isPickupOrder ? 'In-Store Pickup' : 'Vendor-Managed Delivery'}
                      </div>
                      {ord.dispatchDetails?.dispatcherOrCourierName && (
                        <div className="text-[11px] text-[#4A4356] mt-0.5">
                          Dispatcher: <strong>{ord.dispatchDetails.dispatcherOrCourierName}</strong> · Ref:{' '}
                          <span className="font-mono">{ord.dispatchDetails.dispatchReference}</span> · ETA:{' '}
                          {ord.dispatchDetails.expectedDeliveryWindow}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ord.fulfillmentStatus === 'Order placed' && (
                        <button
                          type="button"
                          onClick={() => onUpdateOrderStatus(ord.id, 'Vendor Accepted Order')}
                          className="px-3.5 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
                        >
                          Accept Order
                        </button>
                      )}
                      {ord.fulfillmentStatus === 'Vendor Accepted Order' && (
                        <button
                          type="button"
                          onClick={() => onUpdateOrderStatus(ord.id, 'Seller preparing device')}
                          className="px-3.5 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
                        >
                          Start Preparation
                        </button>
                      )}
                      {(ord.fulfillmentStatus === 'Seller preparing device' ||
                        ord.fulfillmentStatus === 'Vendor Accepted Order') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isDispatchOpen) {
                              setDispatchFormOrderId(null);
                            } else {
                              setDispatchFormOrderId(ord.id);
                              setDispatchCourierName(
                                isPickupOrder
                                  ? `${vendor.name} Pickup Desk`
                                  : 'Vendor Personal Rider'
                              );
                              setDispatchPhone('+234 803 555 0199');
                              setDispatchReference(
                                isPickupOrder
                                  ? `PKP-${ord.orderNumber.slice(-4)}`
                                  : `DSP-${ord.orderNumber.slice(-4)}`
                              );
                              setDispatchWindow(
                                isPickupOrder
                                  ? 'Ready today (9 AM – 6 PM)'
                                  : 'Same-day / Next business day'
                              );
                              setDispatchNotes('');
                              setDispatchError(null);
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#211B2B] hover:bg-[#4A4356] text-white font-semibold"
                        >
                          {isPickupOrder ? 'Mark Ready for Pickup' : 'Arrange Delivery'}
                        </button>
                      )}
                      {isPostDispatch && (
                        <button
                          type="button"
                          onClick={() => onTabChange('holds')}
                          className="px-3 py-1.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] font-medium text-[#211B2B]"
                        >
                          View Settlement
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenOrderDetail(ord.id)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#EAE6F0] font-medium text-[#211B2B]"
                      >
                        Order Details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderChatId(linkedConv?.id);
                          onTabChange('messages');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#EAE6F0] hover:border-[#A981FF] font-medium text-[#211B2B]"
                      >
                        Open Chat
                      </button>
                    </div>
                  </div>

                  {/* Vendor-Managed Dispatch Form */}
                  {isDispatchOpen && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!dispatchCourierName.trim()) {
                          setDispatchError('Enter your dispatcher or logistics partner name.');
                          return;
                        }
                        if (onArrangeDispatch) {
                          const res = onArrangeDispatch(ord.id, {
                            dispatcherOrCourierName: dispatchCourierName.trim(),
                            dispatcherPhone: dispatchPhone.trim() || undefined,
                            dispatchReference:
                              dispatchReference.trim() ||
                              `DSP-${Math.floor(100000 + Math.random() * 899999)}`,
                            dispatchDate,
                            expectedDeliveryWindow: dispatchWindow.trim() || '1–2 business days',
                            deliveryNotes: dispatchNotes.trim() || undefined,
                          });
                          if (res?.error) {
                            setDispatchError(res.error);
                            return;
                          }
                        } else {
                          onUpdateOrderStatus(
                            ord.id,
                            isPickupOrder ? 'Ready for Pickup' : 'In transit'
                          );
                        }
                        setDispatchFormOrderId(null);
                      }}
                      className="p-3.5 rounded-xl bg-white border border-[#D0BCFC] space-y-2.5"
                    >
                      <div className="font-semibold text-[#211B2B] flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-[#A981FF]" />
                        {isPickupOrder
                          ? 'Confirm Store Pickup Readiness'
                          : 'Enter Vendor-Managed Dispatch Details'}
                      </div>
                      {dispatchError && (
                        <div className="p-2 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030]">
                          {dispatchError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-[#211B2B] mb-1">
                            Dispatcher / Courier Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={dispatchCourierName}
                            onChange={(e) => setDispatchCourierName(e.target.value)}
                            placeholder="e.g. GIG Logistics / Chinedu Rider"
                            className="w-full px-2.5 py-2 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#211B2B] mb-1">
                            Dispatcher Phone
                          </label>
                          <input
                            type="tel"
                            value={dispatchPhone}
                            onChange={(e) => setDispatchPhone(e.target.value)}
                            placeholder="+234 803 ..."
                            className="w-full px-2.5 py-2 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#211B2B] mb-1">
                            Dispatch / Waybill Ref
                          </label>
                          <input
                            type="text"
                            value={dispatchReference}
                            onChange={(e) => setDispatchReference(e.target.value)}
                            placeholder="e.g. GIG-88291"
                            className="w-full px-2.5 py-2 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#211B2B] mb-1">
                            Dispatch Date
                          </label>
                          <input
                            type="date"
                            value={dispatchDate}
                            onChange={(e) => setDispatchDate(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#211B2B] mb-1">
                            Expected Delivery Window
                          </label>
                          <input
                            type="text"
                            value={dispatchWindow}
                            onChange={(e) => setDispatchWindow(e.target.value)}
                            placeholder="e.g. 1–2 business days"
                            className="w-full px-2.5 py-2 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#211B2B] mb-1">
                            Notes for Customer
                          </label>
                          <input
                            type="text"
                            value={dispatchNotes}
                            onChange={(e) => setDispatchNotes(e.target.value)}
                            placeholder="Rider will call on arrival"
                            className="w-full px-2.5 py-2 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDispatchFormOrderId(null)}
                          className="px-3 py-1.5 rounded-lg border border-[#EAE6F0] text-[#4A4356]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
                        >
                          Confirm Dispatch &amp; Send Delivery Code to Customer
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Confidential Customer Delivery Verification Code Entry */}
                  {awaitingOtpVerification && (
                    <div className="p-3.5 rounded-xl bg-white border border-[#D0BCFC] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-[#211B2B] flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4 text-[#A981FF]" />
                          Confirm Handover with Customer&apos;s 6-Digit Delivery PIN
                        </div>
                        <span className="text-[11px] text-[#716B7B] tabular-nums">
                          Attempts: {ord.deliveryCodeAttempts || 0}/5 · PIN never shown to vendor
                        </span>
                      </div>

                      {ord.alternativeRecipient && (
                        <div className="p-2.5 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F]">
                          <strong>Authorised Alternative Recipient:</strong>{' '}
                          {ord.alternativeRecipient.name} ({ord.alternativeRecipient.relationship}) ·{' '}
                          {ord.alternativeRecipient.phone}
                          {ord.alternativeRecipient.note ? ` · ${ord.alternativeRecipient.note}` : ''}
                        </div>
                      )}

                      {ord.deliveryAttemptFailedReason && (
                        <div className="p-2 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[11px] text-[#C53030]">
                          Last attempt logged failed: {ord.deliveryAttemptFailedReason}
                        </div>
                      )}

                      {onVerifyDeliveryCode && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const code = (otpInputs[ord.id] || '').trim();
                            if (!code) return;
                            const res = onVerifyDeliveryCode(ord.id, code);
                            setOtpFeedback((prev) => ({
                              ...prev,
                              [ord.id]: {
                                ok: res.verified,
                                message: res.verified
                                  ? 'Delivery verified! 24-hour customer inspection window & 3-month warranty are now active.'
                                  : res.error || 'Verification failed.',
                              },
                            }));
                          }}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            type="text"
                            maxLength={6}
                            inputMode="numeric"
                            value={otpInputs[ord.id] || ''}
                            onChange={(e) =>
                              setOtpInputs((prev) => ({
                                ...prev,
                                [ord.id]: e.target.value.replace(/\D/g, '').slice(0, 6),
                              }))
                            }
                            placeholder="Enter 6-digit numeric PIN"
                            aria-label={`Delivery verification code for ${ord.orderNumber}`}
                            className="px-3 py-2 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC] font-mono text-xs w-52 tabular-nums"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
                          >
                            Verify Delivery PIN
                          </button>
                          {onMarkDeliveryFailed && (
                            <button
                              type="button"
                              onClick={() => {
                                setFailedAttemptOrderId(
                                  failedAttemptOrderId === ord.id ? null : ord.id
                                );
                                setFailedReasonDraft('');
                              }}
                              className="px-3 py-2 rounded-lg border border-[#FED7D7] bg-[#FFF5F5] text-[#C53030] font-medium"
                            >
                              Mark Attempt Failed
                            </button>
                          )}
                        </form>
                      )}

                      {failedAttemptOrderId === ord.id && onMarkDeliveryFailed && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!failedReasonDraft.trim()) return;
                            const res = onMarkDeliveryFailed(
                              ord.id,
                              failedReasonDraft.trim(),
                              failedWindowDraft.trim() || undefined
                            );
                            if (res.error) {
                              setOtpFeedback((prev) => ({
                                ...prev,
                                [ord.id]: { ok: false, message: res.error! },
                              }));
                            } else {
                              setOtpFeedback((prev) => ({
                                ...prev,
                                [ord.id]: {
                                  ok: true,
                                  message: 'Failed attempt logged & buyer notified to reschedule.',
                                },
                              }));
                              setFailedAttemptOrderId(null);
                            }
                          }}
                          className="p-3 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] space-y-2 text-[11px]"
                        >
                          <div className="font-semibold text-[#211B2B]">
                            Log Failed Delivery Attempt &amp; Reschedule
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              value={failedReasonDraft}
                              onChange={(e) => setFailedReasonDraft(e.target.value)}
                              placeholder="Reason (e.g. Buyer phone unreachable at Lekki gate)"
                              className="px-2.5 py-1.5 rounded border border-[#EAE6F0] bg-white"
                            />
                            <input
                              type="text"
                              value={failedWindowDraft}
                              onChange={(e) => setFailedWindowDraft(e.target.value)}
                              placeholder="Proposed new delivery window"
                              className="px-2.5 py-1.5 rounded border border-[#EAE6F0] bg-white"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setFailedAttemptOrderId(null)}
                              className="px-2.5 py-1 rounded border border-[#EAE6F0]"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 rounded bg-[#C53030] text-white font-semibold"
                            >
                              Notify Buyer &amp; Reschedule
                            </button>
                          </div>
                        </form>
                      )}

                      {otpStatus && (
                        <div
                          className={`p-2 rounded-lg text-[11px] font-medium ${
                            otpStatus.ok
                              ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#238653]'
                              : 'bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030]'
                          }`}
                        >
                          {otpStatus.message}
                        </div>
                      )}
                    </div>
                  )}

                  {ord.fulfillmentStatus === 'Delivered_In_Inspection' && (
                    <div className="p-2.5 rounded-xl bg-white border border-[#EAE6F0] text-[11px] text-[#716B7B] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#A981FF] shrink-0" />
                      <span>
                        24-hour inspection timer active: {formatCountdown(ord.inspectionRemainingSeconds ?? ord.inspectionSecondsRemaining ?? 0)} remaining before automatic settlement.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EMBEDDED UNIFIED CHAT */}
      {activeTab === 'messages' && (
        <UnifiedTransactionChat
          viewerRole="vendor"
          viewerId={vendor.id}
          conversations={vendorConversations}
          orders={vendorOrders}
          paymentHolds={vendorHolds}
          disputes={vendorDisputes}
          warrantyClaims={vendorClaims}
          restrictedUserIds={restrictedUserIds}
          initialConversationId={selectedOrderChatId}
          onSendMessage={onSendMessage}
          onFlagOffPlatform={onFlagOffPlatform}
          onViewOrder={onOpenOrderDetail}
          onUpdateOrderStatus={onUpdateOrderStatus}
          onOpenDispute={() => {}}
          onSubmitReport={onSubmitReport}
        />
      )}

      {/* 3-MONTH VENDOR WARRANTIES & CLAIMS */}
      {activeTab === 'warranties' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">
                3-Month Vendor Hardware Warranties &amp; Claims
              </h2>
              <p className="text-[#716B7B] mt-0.5">
                Every verified foreign-used device carries an immutable 3-month vendor hardware warranty starting at delivery. Respond to buyer warranty claims within 48 hours with Repair, Diagnostic Check, Replacement, or Excluded-Damage reasoning.
              </p>
            </div>

            {vendorClaims.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[#716B7B]">
                No buyer warranty claims submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {vendorClaims.map((claim) => {
                  const selectedRemedy = claimRemedyDraft[claim.id] || claim.proposedRemedy || 'Diagnostic Check';
                  const draftMsg = claimResponseDraft[claim.id] || claim.vendorResponse || '';
                  return (
                    <div
                      key={claim.id}
                      className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-semibold text-[#211B2B]">
                            {claim.claimNumber}
                          </span>{' '}
                          · {claim.deviceTitle} ({claim.buyerName})
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#F5F0FF] border border-[#D0BCFC] font-medium text-[#30102F]">
                          {claim.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#716B7B]">
                        Category: <strong className="text-[#211B2B]">{claim.issueCategory}</strong> · Order:{' '}
                        <span className="font-mono">{claim.orderNumber}</span>
                      </div>
                      <p className="text-[#4A4356]">{claim.description}</p>

                      {onRespondWarrantyClaim && claim.status !== 'Resolved' && claim.status !== 'Rejected' && (
                        <div className="p-3 rounded-xl bg-white border border-[#EAE6F0] space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              value={selectedRemedy}
                              onChange={(e) =>
                                setClaimRemedyDraft((prev) => ({
                                  ...prev,
                                  [claim.id]: e.target.value as NonNullable<
                                    WarrantyClaim['proposedRemedy']
                                  >,
                                }))
                              }
                              className="px-2.5 py-2 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                            >
                              <option value="Diagnostic Check">Diagnostic Check</option>
                              <option value="Repair">Vendor Hardware Repair</option>
                              <option value="Replacement">Unit Replacement</option>
                              <option value="Declined (Excluded Damage)">
                                Declined (Excluded Physical / Liquid Damage)
                              </option>
                            </select>
                            <input
                              type="text"
                              value={draftMsg}
                              onChange={(e) =>
                                setClaimResponseDraft((prev) => ({
                                  ...prev,
                                  [claim.id]: e.target.value,
                                }))
                              }
                              placeholder="Write clear drop-off/pickup diagnostic instructions for buyer..."
                              className="sm:col-span-2 px-3 py-2 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenOrderDetail(claim.orderId)}
                              className="text-[11px] font-medium text-[#7E4EF2] hover:underline"
                            >
                              View Order &amp; Warranty Snapshot →
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!draftMsg.trim()) return;
                                const res = onRespondWarrantyClaim({
                                  orderId: claim.orderId,
                                  claimId: claim.id,
                                  proposedRemedy: selectedRemedy,
                                  vendorResponse: draftMsg.trim(),
                                  nextStatus:
                                    selectedRemedy === 'Declined (Excluded Damage)'
                                      ? 'Escalated to Admin'
                                      : 'Repair / Remedy Proposed',
                                });
                                setClaimFeedback((prev) => ({
                                  ...prev,
                                  [claim.id]: res.error || 'Response sent to buyer & logged.',
                                }));
                              }}
                              className="px-4 py-1.5 rounded-lg bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
                            >
                              Send Remedy Response
                            </button>
                          </div>
                          {claimFeedback[claim.id] && (
                            <div className="text-[11px] text-[#7E4EF2] font-medium">
                              {claimFeedback[claim.id]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-[#EAE6F0] space-y-2">
              <div className="font-semibold text-[#211B2B]">
                Active Order Warranty Certificates ({vendorOrders.filter((o) => o.warranty).length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {vendorOrders
                  .filter((o) => o.warranty)
                  .map((o) => (
                    <div
                      key={o.id}
                      className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-[#211B2B]">
                          {o.warranty!.warrantyId}
                        </div>
                        <div className="text-[11px] text-[#4A4356] truncate">{o.listing.title}</div>
                        <div className="text-[10px] text-[#716B7B]">
                          {o.warranty!.status}
                          {o.warranty!.expiryDate
                            ? ` · Ends ${new Date(o.warranty!.expiryDate).toLocaleDateString()}`
                            : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenOrderDetail(o.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#EAE6F0] bg-white text-[11px] font-medium shrink-0"
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENTS ON HOLD — FINANCIAL LEDGER & PAYOUT TRACKING */}
      {activeTab === 'holds' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-[#EAE6F0] shadow-sm p-4 space-y-1">
              <span className="text-[11px] font-medium text-[#716B7B]">Total Revenue (Gross)</span>
              <div className="text-xl font-semibold text-[#211B2B] tabular-nums">
                {formatNaira(financialLedger.totalRevenue)}
              </div>
              <p className="text-[11px] text-[#716B7B]">All non-refunded orders</p>
            </div>
            <div className="bg-[#F5F0FF] rounded-2xl border border-[#D0BCFC] shadow-sm p-4 space-y-1">
              <span className="text-[11px] font-medium text-[#4A4356]">
                Active Escrow (Under 24h Inspection)
              </span>
              <div className="text-xl font-semibold text-[#211B2B] tabular-nums">
                {formatNaira(financialLedger.activeEscrowAmount)}
              </div>
              <p className="text-[11px] text-[#4A4356]">
                Includes frozen disputes ({formatNaira(financialLedger.frozenDisputeAmount)})
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] shadow-sm p-4 space-y-1">
              <span className="text-[11px] font-medium text-[#716B7B]">Ready for Payout</span>
              <div className="text-xl font-semibold text-[#7E4EF2] tabular-nums">
                {formatNaira(financialLedger.readyForPayoutAmount)}
              </div>
              <p className="text-[11px] text-[#716B7B]">Inspection window cleared</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EAE6F0] shadow-sm p-4 space-y-1">
              <span className="text-[11px] font-medium text-[#716B7B]">Successfully Settled</span>
              <div className="text-xl font-semibold text-[#238653] tabular-nums">
                {formatNaira(financialLedger.settledAmount)}
              </div>
              <p className="text-[11px] text-[#716B7B]">
                Disbursed net after Vendor Platform Service Fee ({vendorFeeRateDisplay})
              </p>
            </div>
          </div>

          {renderBankPayoutPanel()}

          <div className="bg-white rounded-2xl border border-[#EAE6F0] shadow-sm overflow-hidden">
            <div className="p-5 pb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE6F0]">
              <div>
                <h2 className="text-base font-semibold text-[#211B2B]">
                  Immutable Transaction History
                </h2>
                <p className="text-[11px] text-[#716B7B]">
                  Every order reference, gross customer total, Vendor Platform Service Fee (up to 1%, delivery excluded), net expected payout, and disbursement status.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[11px] font-medium text-[#211B2B] tabular-nums">
                {financialLedger.rows.length} ledger entries
              </span>
            </div>

            {financialLedger.rows.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#716B7B]">
                No transaction holds recorded for your storefront yet.
              </div>
            ) : (
              <>
                {/* Desktop / Tablet Responsive Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#EAE6F0] bg-[#FAF9FC] text-[11px] text-[#716B7B]">
                        <th className="py-3 px-4 font-medium">Order Reference</th>
                        <th className="py-3 px-4 font-medium">Device / Item</th>
                        <th className="py-3 px-4 font-medium text-right">Gross Amount (₦)</th>
                        <th className="py-3 px-4 font-medium text-right">
                          Vendor Fee (Up to 1%)
                        </th>
                        <th className="py-3 px-4 font-medium text-right">Net Expected Payout</th>
                        <th className="py-3 px-4 font-medium">Disbursement Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE6F0]">
                      {financialLedger.rows.map((row) => {
                        const statusPillClass =
                          row.disbursementStatus === 'Successfully Settled'
                            ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#238653]'
                            : row.disbursementStatus === 'Ready for Payout'
                            ? 'bg-[#F5F0FF] border-[#D0BCFC] text-[#7E4EF2]'
                            : row.disbursementStatus === 'Frozen (Dispute)' ||
                              row.disbursementStatus === 'Refunded to Customer'
                            ? 'bg-[#FFF5F5] border-[#FED7D7] text-[#C53030]'
                            : 'bg-[#FAF9FC] border-[#EAE6F0] text-[#211B2B]';

                        return (
                          <tr key={row.id} className="hover:bg-[#FAF9FC] transition-colors">
                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onOpenOrderDetail(row.orderId)}
                                className="font-mono font-semibold text-[#211B2B] hover:text-[#A981FF] block text-left"
                              >
                                {row.orderNumber}
                              </button>
                              <span className="font-mono text-[10px] text-[#716B7B]">
                                {row.transactionNumber}
                              </span>
                            </td>
                            <td className="py-3 px-4 align-middle">
                              <div className="font-medium text-[#211B2B] truncate max-w-[230px]">
                                {row.deviceTitle}
                              </div>
                              {row.variationInfo && (
                                <div className="text-[11px] text-[#716B7B]">{row.variationInfo}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 align-middle text-right font-medium text-[#211B2B] tabular-nums whitespace-nowrap">
                              {formatNaira(row.grossAmount)}
                            </td>
                            <td className="py-3 px-4 align-middle text-right text-[#716B7B] tabular-nums whitespace-nowrap">
                              -{formatNaira(row.feeDeduction)}
                            </td>
                            <td className="py-3 px-4 align-middle text-right font-semibold text-[#211B2B] tabular-nums whitespace-nowrap">
                              {formatNaira(row.netExpectedPayout)}
                            </td>
                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-[11px] font-medium ${statusPillClass}`}
                              >
                                {row.disbursementStatus}
                              </span>
                              {!row.isDisputed &&
                                row.disbursementStatus === 'In Escrow (Under 24h Inspection)' &&
                                row.deliveredAt && (
                                  <div className="text-[10px] text-[#7E4EF2] font-medium mt-0.5 tabular-nums">
                                    Timer: {formatCountdown(row.remainingSeconds)}
                                  </div>
                                )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-[#EAE6F0]">
                  {financialLedger.rows.map((row) => (
                    <div key={row.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenOrderDetail(row.orderId)}
                          className="font-mono font-semibold text-[#211B2B] hover:text-[#A981FF]"
                        >
                          {row.orderNumber} · {row.transactionNumber}
                        </button>
                        <span className="px-2 py-0.5 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] text-[10px] font-medium text-[#211B2B]">
                          {row.disbursementStatus}
                        </span>
                      </div>
                      <div className="font-medium text-[#211B2B]">{row.deviceTitle}</div>
                      <div className="grid grid-cols-3 gap-2 pt-1 tabular-nums">
                        <div>
                          <span className="text-[#716B7B] block text-[10px]">Gross</span>
                          <span className="font-medium text-[#211B2B]">
                            {formatNaira(row.grossAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#716B7B] block text-[10px]">Vendor Fee</span>
                          <span className="text-[#716B7B]">-{formatNaira(row.feeDeduction)}</span>
                        </div>
                        <div>
                          <span className="text-[#716B7B] block text-[10px]">Net Payout</span>
                          <span className="font-semibold text-[#211B2B]">
                            {formatNaira(row.netExpectedPayout)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY & HISTORY TAB */}
      {activeTab === 'activity' && (
        <ActivityHistoryView
          role="seller_approved"
          orders={vendorOrders}
          listings={vendorListings}
          conversations={vendorConversations}
          disputes={vendorDisputes}
          auditLog={auditLog}
          onOpenOrder={onOpenOrderDetail}
          onOpenChat={(convId) => {
            setSelectedOrderChatId(convId);
            onTabChange('messages');
          }}
          onOpenListing={(lid) => {
            const target = listings.find((l) => l.id === lid);
            if (target && onViewListingDetails) onViewListingDetails(target);
          }}
        />
      )}

      {/* FOREIGN-USE EVIDENCE TAB */}
      {activeTab === 'evidence' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">Foreign-Use Origin Proof</h2>
              <p className="text-[#716B7B]">
                Submit import manifests, airway bills, and overseas supplier invoices before listing batch items.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEvidenceForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A981FF] text-white font-medium"
            >
              <Plus className="w-4 h-4" />
              {showEvidenceForm ? 'Cancel' : 'Submit New Import Batch'}
            </button>
          </div>

          {evFeedback && (
            <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B]">
              {evFeedback}
            </div>
          )}

          {showEvidenceForm && (
            <form onSubmit={handleSubmitEvidenceBatch} className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={evSourceCountry}
                  onChange={(e) => setEvSourceCountry(e.target.value)}
                  placeholder="Source country (e.g. United States, UK)"
                  className="px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-white"
                />
                <input
                  type="text"
                  required
                  value={evSupplierName}
                  onChange={(e) => setEvSupplierName(e.target.value)}
                  placeholder="Overseas supplier name"
                  className="px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-white"
                />
                <input
                  type="text"
                  required
                  value={evShipmentRef}
                  onChange={(e) => setEvShipmentRef(e.target.value)}
                  placeholder="Airway bill / Shipment ref"
                  className="px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-white font-mono"
                />
                <input
                  type="number"
                  min={1}
                  value={evDeviceCount}
                  onChange={(e) => setEvDeviceCount(e.target.value)}
                  placeholder="Device count"
                  className="px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-white"
                />
                <input
                  type="text"
                  value={evImeis}
                  onChange={(e) => setEvImeis(e.target.value)}
                  placeholder="IMEI / Serial numbers (comma separated)"
                  className="sm:col-span-2 px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-white font-mono"
                />
                <input
                  type="text"
                  value={evFileName}
                  onChange={(e) => setEvFileName(e.target.value)}
                  placeholder="Manifest filename (e.g. DHL_Batch_2026.pdf)"
                  className="sm:col-span-2 px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-white"
                />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#A981FF] text-white font-medium">
                Submit Batch Proof
              </button>
            </form>
          )}

          <div className="space-y-3">
            {evidenceBatches.map((b) => (
              <div key={b.id} className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-[#211B2B]">{b.batchNumber}</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0] font-medium text-[#211B2B]">
                    {b.status}
                  </span>
                </div>
                <div className="text-[#4A4356]">
                  Origin: {b.sourceCountry} · Supplier: {b.supplierName} · Devices: {b.deviceCount}
                </div>
                <div className="text-[#716B7B] font-mono">Waybill: {b.shipmentReference}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROMOTIONS & BUNDLES TAB */}
      {activeTab === 'promotions' && (
        <div className="space-y-4">
          {/* Combo Deal Creator */}
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] flex items-center justify-center text-[#A981FF]">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#211B2B]">
                    Promotions &amp; Bundles — Combo Deal Creator
                  </h2>
                  <p className="text-[11px] text-[#716B7B]">
                    Pair two verified items into a discounted COMBO DEAL or GIFT PACK with 1-tap cart add.
                  </p>
                </div>
              </div>
              {comboCombinedSum > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[11px]">
                  Combined value:{' '}
                  <strong className="text-[#211B2B]">{formatNaira(comboCombinedSum)}</strong>
                  {Number(comboBundlePrice) > 0 && Number(comboBundlePrice) < comboCombinedSum && (
                    <span className="ml-2 text-[#238653] font-semibold">
                      Save {formatNaira(comboCombinedSum - Number(comboBundlePrice))}
                    </span>
                  )}
                </div>
              )}
            </div>

            {comboError && (
              <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#D9534F]">
                {comboError}
              </div>
            )}
            {comboSuccess && (
              <div className="p-3 rounded-xl bg-[#E9F7EF] border border-[#B7E4C7] text-[#238653] font-medium">
                {comboSuccess}
              </div>
            )}

            <form onSubmit={handleCreateComboBundle} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Primary Device</label>
                <select
                  value={comboPrimaryListing?.id || ''}
                  onChange={(e) => setComboPrimaryId(e.target.value)}
                  aria-label="Primary combo device"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
                >
                  {vendorListings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.model || l.title} ({formatNaira(l.price)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Companion Item</label>
                <select
                  value={comboSecondaryListing?.id || ''}
                  onChange={(e) => setComboSecondaryId(e.target.value)}
                  aria-label="Companion combo item"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
                >
                  {vendorListings
                    .filter((l) => l.id !== comboPrimaryListing?.id)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.model || l.title} ({formatNaira(l.price)})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Bundle Price (₦)</label>
                <input
                  type="number"
                  min={1000}
                  value={comboBundlePrice}
                  onChange={(e) => setComboBundlePrice(e.target.value)}
                  placeholder={comboSuggestedPrice ? String(comboSuggestedPrice) : 'e.g. 880000'}
                  aria-label="Bundle price in Naira"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Badge Style</label>
                <select
                  value={comboTag}
                  onChange={(e) => setComboTag(e.target.value as 'COMBO DEAL' | 'GIFT PACK')}
                  aria-label="Combo badge style"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
                >
                  <option value="COMBO DEAL">COMBO DEAL</option>
                  <option value="GIFT PACK">GIFT PACK</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <input
                  type="text"
                  value={comboTitle}
                  onChange={(e) => setComboTitle(e.target.value)}
                  placeholder="Optional custom bundle headline (e.g. iPhone + AirPods Lagos Work Pack)"
                  aria-label="Custom bundle headline"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-medium min-h-[40px]"
              >
                Publish Combo Bundle
              </button>
            </form>
          </div>

          {/* Discount Promo Codes */}
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
            <h2 className="text-base font-semibold text-[#211B2B]">Store Discount Codes</h2>
            {promoNotice && (
              <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B]">
                {promoNotice}
              </div>
            )}
            <form onSubmit={handleCreatePromo} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                type="text"
                required
                value={promoTitle}
                onChange={(e) => setPromoTitle(e.target.value)}
                placeholder="Promotion title"
                className="sm:col-span-2 px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Promo code (optional)"
                className="px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] uppercase"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={promoDiscount}
                  onChange={(e) => setPromoDiscount(e.target.value)}
                  className="w-20 px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                />
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-[#A981FF] text-white font-medium">
                  Launch
                </button>
              </div>
            </form>

            <div className="space-y-2.5">
              {vendor.promotions.map((p) => (
                <div key={p.id} className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-[#211B2B]">{p.name}</div>
                    <div className="text-[#716B7B]">{p.description}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] font-medium text-[#211B2B]">
                    {p.discountValue}% off
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STOREFRONT POLICIES TAB */}
      {activeTab === 'storefront' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
          <h2 className="text-base font-semibold text-[#211B2B]">Storefront & Pickup Policy</h2>
          {storeSaved && (
            <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B]">
              Storefront details saved cleanly.
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="storefront-vendor-state"
                  className="block font-medium text-[#211B2B] mb-1"
                >
                  Business State / Base Location in Nigeria
                </label>
                <select
                  id="storefront-vendor-state"
                  value={storeState}
                  onChange={(e) => setStoreState(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
                >
                  {NIGERIAN_COMMERCIAL_HUBS.map((hub) => (
                    <option key={hub.value} value={hub.value}>
                      {hub.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="storefront-vendor-address"
                  className="block font-medium text-[#211B2B] mb-1"
                >
                  Storefront Street / Commercial Hub Address
                </label>
                <input
                  id="storefront-vendor-address"
                  type="text"
                  value={storeLocation}
                  onChange={(e) => setStoreLocation(e.target.value)}
                  placeholder="e.g. 12 Kodesoh Street, Ikeja Computer Village"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Store Description</label>
              <textarea
                rows={2}
                value={storeDesc}
                onChange={(e) => setStoreDesc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Warranty Policy</label>
              <input
                type="text"
                value={storeWarranty}
                onChange={(e) => setStoreWarranty(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Delivery Policy</label>
              <input
                type="text"
                value={storeDelivery}
                onChange={(e) => setStoreDelivery(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
            </div>
            <label className="flex items-center gap-2 font-medium text-[#211B2B]">
              <input
                type="checkbox"
                checked={storeOffersPickup}
                onChange={(e) => setStoreOffersPickup(e.target.checked)}
                className="accent-[#A981FF]"
              />
              Offer in-store physical pickup (inspection still begins only upon pickup confirmation)
            </label>
            {storeOffersPickup && (
              <input
                type="text"
                value={storePickupLoc}
                onChange={(e) => setStorePickupLoc(e.target.value)}
                placeholder="Verified pickup address"
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
            )}
            <button
              type="button"
              onClick={() => {
                onUpdateVendor({
                  ...vendor,
                  state: storeState,
                  location: storeLocation.trim() || vendor.location,
                  description: storeDesc,
                  warrantyPolicy: storeWarranty,
                  deliveryPolicy: storeDelivery,
                  offersPickup: storeOffersPickup,
                  pickupLocation: storePickupLoc,
                });
                setStoreSaved(true);
                setTimeout(() => setStoreSaved(false), 2000);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-medium"
            >
              Save Storefront Settings
            </button>
          </div>
        </div>
      )}

      {/* REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3 text-xs">
          <h2 className="text-base font-semibold text-[#211B2B]">Verified Customer Reviews</h2>
          <p className="text-[#716B7B]">
            Average score: <strong className="text-[#211B2B]">{vendor.rating.toFixed(1)}★</strong> from {vendor.completedOrders} completed orders.
          </p>
          {(vendor.reviews || []).length === 0 ? (
            <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[#4A4356]">
              Reviews appear here as buyers complete orders and verify device condition accuracy.
            </div>
          ) : (
            (vendor.reviews || []).map((rev) => (
              <div key={rev.id} className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-1">
                <div className="flex justify-between font-semibold text-[#211B2B]">
                  <span>{rev.buyerName}</span>
                  <span>{rev.rating}★</span>
                </div>
                <p className="text-[#4A4356]">{rev.comment}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* MARKETING WITH USEDRIGHT */}
      {activeTab === 'marketing' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
          <h2 className="text-base font-semibold text-[#211B2B]">Marketing with UsedRight</h2>
          <p className="text-[#716B7B]">
            Apply to participate in marketplace-wide featured deals with clear stock and discount commitments.
          </p>
          {collabFeedback && (
            <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B]">
              {collabFeedback}
            </div>
          )}
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-wrap justify-between items-center gap-3">
                <div>
                  <div className="font-semibold text-[#211B2B]">{c.campaignType} — {c.listingTitle}</div>
                  <div className="text-[#716B7B]">{c.objective} · {c.promotionalStock} units</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCampaigns((prev) =>
                      prev.map((x) => (x.id === c.id ? { ...x, status: 'Submitted' } : x))
                    );
                    setCollabFeedback(`Updated campaign "${c.campaignType}" status to Submitted.`);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#A981FF] text-white font-medium"
                >
                  {c.status === 'Active' ? 'Active Campaign' : 'Renew Participation'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#A981FF]" />
              <h2 className="text-base font-semibold text-[#211B2B]">
                Business Location &amp; Regional Hub
              </h2>
            </div>
            <p className="text-[#716B7B]">
              All of your active product listings automatically display this Nigerian state badge so local customers can find and filter your stock.
            </p>
            {settingsLocationSaved && (
              <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B]">
                Business state updated across your storefront and active listings.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="settings-vendor-state"
                  className="block font-medium text-[#211B2B] mb-1"
                >
                  Business State / Base Location in Nigeria
                </label>
                <select
                  id="settings-vendor-state"
                  value={storeState}
                  onChange={(e) => setStoreState(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
                >
                  {NIGERIAN_COMMERCIAL_HUBS.map((hub) => (
                    <option key={hub.value} value={hub.value}>
                      {hub.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="settings-vendor-address"
                  className="block font-medium text-[#211B2B] mb-1"
                >
                  Street / Shop Address
                </label>
                <input
                  id="settings-vendor-address"
                  type="text"
                  value={storeLocation}
                  onChange={(e) => setStoreLocation(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateVendor({
                  ...vendor,
                  state: storeState,
                  location: storeLocation.trim() || vendor.location,
                });
                setSettingsLocationSaved(true);
                setTimeout(() => setSettingsLocationSaved(false), 2000);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-medium"
            >
              Update Business Location
            </button>
          </div>

          {renderBankPayoutPanel()}

          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3 text-xs">
            <h2 className="text-base font-semibold text-[#211B2B]">Vendor Account, ID &amp; Verification</h2>
            <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-1.5">
              <div><strong className="text-[#211B2B]">Permanent Vendor ID:</strong> <span className="font-mono">{vendor.vendorNumber || 'Assigned'}</span></div>
              <div><strong className="text-[#211B2B]">Legal Entity:</strong> {vendor.legalName}</div>
              <div><strong className="text-[#211B2B]">Base State:</strong> {vendor.state || storeState}</div>
              <div><strong className="text-[#211B2B]">CAC / Identity Status:</strong> {vendor.identityVerificationStatus || 'Approved'} ({vendor.cacNumber || 'Individual Verified Vendor'})</div>
              <div>
                <strong className="text-[#211B2B]">Social Media Verification:</strong>{' '}
                {vendor.socialVerificationStatus || 'Approved'}
                {vendor.socialLinks && vendor.socialLinks.length > 0 && (
                  <span> · {vendor.socialLinks.map((s) => `${s.platform}: ${s.handleOrUrl}`).join(', ')}</span>
                )}
              </div>
              <div>
                <strong className="text-[#211B2B]">Vendor Platform Service Fee:</strong> Up to 1% (currently{' '}
                {vendorFeeRateDisplay}) deducted on eligible product subtotal (delivery charges excluded)
              </div>
              <div>
                <strong className="text-[#211B2B]">Inspection Floor:</strong> Minimum {platformConfig.inspectionHours} hours after verified delivery or pickup
              </div>
              {vendor.agreementAcceptedVersion && (
                <div>
                  <strong className="text-[#211B2B]">Accepted Agreement Version:</strong> v{vendor.agreementAcceptedVersion}
                </div>
              )}
            </div>
            {onOpenPolicyCentre && (
              <button
                type="button"
                onClick={() => onOpenPolicyCentre('vendor-agreement')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] hover:border-[#A981FF] text-[#211B2B] font-medium"
              >
                <BookOpen className="w-4 h-4 text-[#A981FF]" />
                Read Vendor Agreement &amp; All 22 Policies
              </button>
            )}
          </div>
        </div>
      )}

      {/* PRICE / STOCK / VARIATION EDIT MODAL */}
      {editingListing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit listing price and stock"
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveListingEdits}
            className="bg-white w-full max-w-lg rounded-2xl border border-[#EAE6F0] shadow-xl p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#EAE6F0] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#211B2B]">Update Price & Stock</h3>
                <p className="text-[#716B7B] truncate max-w-xs">{editingListing.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="p-1.5 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
                aria-label="Close edit modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B]">
              Existing placed orders keep their original purchase price and product snapshot safely.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Base Price (NGN)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Total Stock</label>
                <input
                  type="number"
                  min={0}
                  value={editStock}
                  onChange={(e) => setEditStock(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                />
              </div>
            </div>

            {editVariations.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <div className="font-medium text-[#211B2B]">Option Pricing & Stock</div>
                {editVariations.map((v, idx) => (
                  <div
                    key={v.id}
                    className="p-2.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] grid grid-cols-3 gap-2 items-center"
                  >
                    <div className="truncate font-medium text-[#211B2B]">
                      {v.color} {v.storage || ''} ({v.grade})
                    </div>
                    <input
                      type="number"
                      min={1000}
                      value={v.price}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditVariations((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, price: val } : item))
                        );
                      }}
                      className="px-2 py-1.5 rounded-lg border border-[#EAE6F0] bg-white"
                    />
                    <input
                      type="number"
                      min={0}
                      value={v.stockQuantity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditVariations((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, stockQuantity: val } : item))
                        );
                      }}
                      className="px-2 py-1.5 rounded-lg border border-[#EAE6F0] bg-white"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Change Reason</label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
            </div>

            {editSavedMsg && (
              <div className="p-2.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B]">
                {editSavedMsg}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="px-4 py-2 rounded-xl border border-[#EAE6F0] text-[#211B2B]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#A981FF] text-white font-medium"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
