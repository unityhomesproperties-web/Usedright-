import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  AccessoryItem,
  AppNotification,
  CartItem,
  Category,
  CategoryConfig,
  ChatAttachmentRecord,
  CustomerAddress,
  DeliveryConfig,
  DeliveryMethod,
  DeliveryProblemType,
  DemoRole,
  DeviceListing,
  DisputeReason,
  DisputeResolutionType,
  DisputeStatus,
  ForeignUseEvidenceBatch,
  GiftOrderDetails,
  MarketplaceState,
  MessageConversation,
  ModerationRiskLevel,
  Order,
  OrderStatus,
  ParentOrderRecord,
  PaymentHold,
  PaymentRequestRecord,
  PaymentRequestStatus,
  PolicyDocument,
  ProductVariation,
  RecipientComplaintCategory,
  RecipientComplaintRecord,
  UserReport,
  VendorSocialLink,
  VendorStorefront,
  WarrantyClaimCategory,
  WarrantyClaimStatus,
} from './types/marketplace';
import {
  createInitialMarketplaceState,
  DEMO_ADMIN_CREDENTIALS,
  DEMO_BUYER,
} from './data/marketplaceCatalog';
import { VENDOR_REGISTRATION_DECLARATIONS } from './data/policiesCatalog';
import {
  applyCatalogToolbarFilters,
  BUYER_FEE_RATE,
  CatalogToolbarFilters,
  DEFAULT_CATALOG_TOOLBAR_FILTERS,
  filterListings,
  scanMessageForDisallowedContent,
} from './utils/marketplace';
import { shouldShowDemoControls } from './utils/homeUiPolicy';
import {
  enrichListingsWithVendorState,
  getListingVendorState,
  inferStateFromLocationText,
  NIGERIAN_COMMERCIAL_HUBS,
  normalizeNigerianState,
} from './utils/nigerianStates';
import {
  adminJoinDisputeAndUpdate,
  adminModerateFlag,
  adminOverrideDeliveryConfirmation,
  adminResolveDispute,
  adminReviewVendorVerification,
  adminSavePolicyVersion,
  adminUpdateDeliveryConfig,
  adminUpdatePaymentRequestConfig,
  adminUpdatePlatformFees,
  adminUpdateWarrantyClaim,
  adminUpdateWarrantyConfig,
  advanceInspectionTimer,
  attemptPaymentRequestCheckout,
  cancelPaymentRequestRecord,
  completeOrderSettlement,
  configureAdminSettings,
  confirmPhysicalDeliveryOrReceipt,
  createPaymentRequestRecord,
  flagOffPlatformAttempt,
  markDeliveryAttemptFailed,
  openDisputeInChat,
  recordVendorAgreementAcceptance,
  refreshPaymentRequestState,
  reportDeliveryProblemOrReschedule,
  resendDeliveryVerificationCode,
  setOrderAlternativeRecipient,
  simulateDispatch,
  simulatePayment,
  submitRecipientProblemReport,
  submitWarrantyClaim,
  toggleFollowVendor,
  updateListingSafely,
  vendorArrangeDispatch,
  vendorRespondWarrantyClaim,
  verifyDeliveryCodeAndStartInspection,
} from './utils/transactionEngine';
import {
  adminOverrideDeliveryApi,
  adminPublishPolicyApi,
  adminTakeModerationActionApi,
  adminUpdateDeliveryConfigApi,
  adminUpdateFeesApi,
  adminUpdatePaymentRequestConfigApi,
  adminUpdateWarrantyPolicyApi,
  adminVerifyVendorApi,
  cancelPaymentRequestApi,
  createPaymentRequestApi,
  markDeliveryFailedApi,
  recordVendorAgreementAcceptApi,
  resendDeliveryPinApi,
  resetServerDemoDatabase,
  respondWarrantyClaimApi,
  setAlternativeRecipientApi,
  submitGiftRecipientComplaintApi,
  submitVendorDispatchApi,
  submitWarrantyClaimApi,
  toggleFollowVendorApi,
  verifyDeliveryOtpApi,
} from './utils/apiClient';
import { Navbar, VendorNavTab } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { BuyerHome } from './components/buyer/BuyerHome';
import { ExploreView } from './components/buyer/ExploreView';
import { ProductDetailsView } from './components/buyer/ProductDetailsView';
import { CatalogFilterBar } from './components/buyer/CatalogFilterBar';
import { LiveSearchOverlay } from './components/buyer/LiveSearchOverlay';
import { CartDrawer } from './components/buyer/CartDrawer';
import { CheckoutModal, CheckoutDraftState } from './components/buyer/CheckoutModal';
import { CustomerProfileView, CustomerSubScreen } from './components/buyer/CustomerProfileView';
import { PaymentRequestPage } from './components/buyer/PaymentRequestPage';
import { UnifiedTransactionChat } from './components/chat/UnifiedTransactionChat';
import { OrderDetailView } from './components/orders/OrderDetailView';
import { GiftRecipientPortalView } from './components/orders/GiftRecipientPortalView';
import { VendorsDirectoryView } from './components/vendor/VendorsDirectoryView';
import { PublicVendorStorefront } from './components/vendor/PublicVendorStorefront';
import { SellerDashboard } from './components/seller/SellerDashboard';
import { PendingSellerView } from './components/seller/PendingSellerView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { HowItWorksModal } from './components/common/HowItWorksModal';
import { BuyerProtectionModal } from './components/common/BuyerProtectionModal';
import { InspectionEducationModal } from './components/common/InspectionEducationModal';
import { PolicyCentreModal } from './components/policy/PolicyCentreModal';
import { DemoControlsBar } from './components/common/DemoControlsBar';

const STORAGE_STATE_KEY = 'usedright_marketplace_state_v2';
const STORAGE_SAVED_KEY = 'usedright_saved_items_v2';
const STORAGE_BUYER_PROFILE_KEY = 'usedright_buyer_profile_v1';
const STORAGE_ADDRESSES_KEY = 'usedright_saved_addresses_v1';

const DEFAULT_SAVED_ADDRESSES: CustomerAddress[] = [
  {
    id: 'addr-default-1',
    label: 'Home (Lekki Phase 1)',
    fullName: DEMO_BUYER.name,
    phone: DEMO_BUYER.phone,
    street: '14 Admiralty Way, Lekki Phase 1',
    city: 'Lagos Island',
    state: 'Lagos State',
    landmark: 'Opposite Admiralty Mall',
    isDefault: true,
  },
];

function loadInitialState(): MarketplaceState {
  const seed = createInitialMarketplaceState();
  try {
    const raw = localStorage.getItem(STORAGE_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MarketplaceState;
      if (parsed && parsed.platformConfig && Array.isArray(parsed.listings)) {
        // Sanitize categories: remove 'other_tech', rename 'computer_accessories' -> 'Laptop Accessories'
        const sanitizedCategories = (parsed.platformConfig.categories || [])
          .filter((c) => (c.id as string) !== 'other_tech')
          .map((c) =>
            c.id === 'computer_accessories'
              ? {
                  ...c,
                  label: 'Laptop Accessories',
                  shortLabel: 'Laptop Gear',
                  description: 'Padded laptop sleeves, USB-C laptop chargers & laptop bags',
                }
              : c
          );

        // Remove retired router/monitor listings and merge any newly added rich catalog items
        const retiredIds = new Set(['dev-other-tplink-ax55', 'dev-pcgear-dell-27']);
        const seedById = new Map(seed.listings.map((item) => [item.id, item]));
        const existingClean = parsed.listings
          .filter((l) => !retiredIds.has(l.id))
          .map((l) => {
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
              bundleItems: seedMatch?.bundleItems && !l.bundleItems ? seedMatch.bundleItems : l.bundleItems,
              promoBadge: seedMatch?.promoBadge || l.promoBadge,
            };
          });
        const existingIds = new Set(existingClean.map((l) => l.id));
        const missingNewCatalog = seed.listings.filter(
          (l) =>
            (l.id.startsWith('ur-') ||
              l.id === 'dev-phone-ip15-promax' ||
              l.id === 'dev-laptop-bag-tomtoc') &&
            !existingIds.has(l.id)
        );

        // Merge any newly seeded sample orders, holds, and conversations if missing from older localStorage
        const existingOrderIds = new Set((parsed.orders || []).map((o) => o.id));
        const missingOrders = seed.orders.filter((o) => !existingOrderIds.has(o.id));
        const existingHoldIds = new Set((parsed.paymentHolds || []).map((h) => h.id));
        const missingHolds = seed.paymentHolds.filter((h) => !existingHoldIds.has(h.id));
        const existingConvIds = new Set((parsed.conversations || []).map((c) => c.id));
        const missingConvs = seed.conversations.filter((c) => !existingConvIds.has(c.id));

        // Hydrate vendor states, permanent IDs, social links & merge newly seeded catalog vendors
        const seedVendorById = new Map(seed.vendors.map((v) => [v.id, v]));
        const hydratedVendors: VendorStorefront[] = (parsed.vendors || seed.vendors).map((v) => {
          const seedVendor = seedVendorById.get(v.id);
          return {
            ...v,
            vendorNumber: v.vendorNumber || seedVendor?.vendorNumber || v.id,
            state:
              v.state ||
              seedVendor?.state ||
              inferStateFromLocationText(v.location),
            socialLinks: v.socialLinks || seedVendor?.socialLinks,
            socialVerificationStatus:
              v.socialVerificationStatus || seedVendor?.socialVerificationStatus,
            identityVerificationStatus:
              v.identityVerificationStatus || seedVendor?.identityVerificationStatus,
            followerCount: v.followerCount ?? seedVendor?.followerCount,
            isSuspended: v.isSuspended ?? seedVendor?.isSuspended,
          };
        });
        const existingVendorIds = new Set(hydratedVendors.map((v) => v.id));
        const missingVendors = seed.vendors.filter((v) => !existingVendorIds.has(v.id));
        const mergedVendors = [...hydratedVendors, ...missingVendors];

        // Hydrate policies & merge any missing seeded documents
        const existingPolicies = parsed.policies || [];
        const existingPolicySlugs = new Set(existingPolicies.map((p) => p.slug));
        const missingPolicies = (seed.policies || []).filter((p) => !existingPolicySlugs.has(p.slug));
        const mergedPolicies =
          existingPolicies.length > 0
            ? [...existingPolicies, ...missingPolicies]
            : seed.policies || [];

        // Hydrate order fields (6-digit Delivery PIN & 3-Month Warranty) for seeded orders
        const seedOrderById = new Map(seed.orders.map((o) => [o.id, o]));
        const hydratedExistingOrders = (parsed.orders || []).map((o) => {
          const sOrd = seedOrderById.get(o.id);
          return {
            ...o,
            deliveryVerificationCode:
              o.deliveryVerificationCode || sOrd?.deliveryVerificationCode,
            deliveryCodeGeneratedAt:
              o.deliveryCodeGeneratedAt || sOrd?.deliveryCodeGeneratedAt,
            deliveryCodeExpiresAt:
              o.deliveryCodeExpiresAt || sOrd?.deliveryCodeExpiresAt,
            dispatchDetails: o.dispatchDetails || sOrd?.dispatchDetails,
            warranty: o.warranty || sOrd?.warranty,
            isGift: o.isGift ?? sOrd?.isGift,
            giftDetails: o.giftDetails || sOrd?.giftDetails,
            payerInfo: o.payerInfo || sOrd?.payerInfo,
            paymentRequestId: o.paymentRequestId || sOrd?.paymentRequestId,
            refundTargetSummary: o.refundTargetSummary || sOrd?.refundTargetSummary,
          };
        });

        // Merge any newly seeded PaymentRequests, RecipientComplaints, and Notifications
        const existingPreqIds = new Set((parsed.paymentRequests || []).map((r) => r.id));
        const missingPreqs = (seed.paymentRequests || []).filter((r) => !existingPreqIds.has(r.id));
        const existingComplaintIds = new Set((parsed.recipientComplaints || []).map((c) => c.id));
        const missingComplaints = (seed.recipientComplaints || []).filter(
          (c) => !existingComplaintIds.has(c.id)
        );
        const existingNotifIds = new Set((parsed.notifications || []).map((n) => n.id));
        const missingNotifs = (seed.notifications || []).filter((n) => !existingNotifIds.has(n.id));

        return {
          ...parsed,
          platformConfig: {
            ...parsed.platformConfig,
            paymentRequestValidityHours:
              parsed.platformConfig.paymentRequestValidityHours ??
              seed.platformConfig.paymentRequestValidityHours ??
              24,
            categories:
              sanitizedCategories.length > 0
                ? sanitizedCategories
                : seed.platformConfig.categories,
          },
          feeConfig: parsed.feeConfig || seed.feeConfig,
          feeAuditLog: parsed.feeAuditLog || seed.feeAuditLog || [],
          deliveryConfig: parsed.deliveryConfig || seed.deliveryConfig,
          warrantyConfig: parsed.warrantyConfig || seed.warrantyConfig,
          warrantyClaims: parsed.warrantyClaims || seed.warrantyClaims || [],
          moderationFlags: parsed.moderationFlags || seed.moderationFlags || [],
          restrictedMessagingUserIds:
            parsed.restrictedMessagingUserIds || seed.restrictedMessagingUserIds || [],
          followedVendorIds: parsed.followedVendorIds || seed.followedVendorIds || [],
          nextVendorSeq: parsed.nextVendorSeq || seed.nextVendorSeq || 10,
          policies: mergedPolicies,
          vendorAcceptances: parsed.vendorAcceptances || seed.vendorAcceptances || [],
          parentOrders: parsed.parentOrders || seed.parentOrders || [],
          paymentRequests: [...(parsed.paymentRequests || []), ...missingPreqs],
          recipientComplaints: [...(parsed.recipientComplaints || []), ...missingComplaints],
          notifications: [...missingNotifs, ...(parsed.notifications || [])],
          vendors: mergedVendors,
          pendingSellerState: {
            ...seed.pendingSellerState,
            ...parsed.pendingSellerState,
            vendorNumber:
              parsed.pendingSellerState?.vendorNumber ||
              seed.pendingSellerState.vendorNumber,
            socialLinks:
              parsed.pendingSellerState?.socialLinks ||
              seed.pendingSellerState.socialLinks,
            socialVerificationStatus:
              parsed.pendingSellerState?.socialVerificationStatus ||
              seed.pendingSellerState.socialVerificationStatus,
            state:
              parsed.pendingSellerState?.state ||
              seed.pendingSellerState.state ||
              'Lagos State',
          },
          listings: [...missingNewCatalog, ...existingClean],
          orders: [...missingOrders, ...hydratedExistingOrders],
          paymentHolds: [...missingHolds, ...(parsed.paymentHolds || [])],
          conversations: [...missingConvs, ...(parsed.conversations || [])],
        };
      }
    }
  } catch {
    // fallback to clean seed
  }
  return seed;
}

function parseUrlRouteParams(): {
  payRequestToken?: string;
  giftOrder?: { orderId: string; rtok?: string };
} {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const payToken = params.get('pay_request')?.trim();
    if (payToken) return { payRequestToken: payToken };
    const giftOrderId = params.get('gift_order')?.trim();
    if (giftOrderId) {
      return {
        giftOrder: {
          orderId: giftOrderId,
          rtok: params.get('rtok')?.trim() || undefined,
        },
      };
    }
  } catch {
    // ignore malformed URL params
  }
  return {};
}

export default function App() {
  const initialRouteParams = useMemo(() => parseUrlRouteParams(), []);
  const [state, setState] = useState<MarketplaceState>(() => loadInitialState());
  const [role, setRole] = useState<DemoRole>('visitor');
  const [buyerProfile, setBuyerProfile] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_BUYER_PROFILE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          id: parsed.id || DEMO_BUYER.id,
          name: parsed.name || DEMO_BUYER.name,
          email: parsed.email || DEMO_BUYER.email,
          phone: parsed.phone || DEMO_BUYER.phone,
          state: parsed.state || 'Lagos State',
        };
      }
    } catch {
      // fallback to default buyer profile
    }
    return {
      id: DEMO_BUYER.id,
      name: DEMO_BUYER.name,
      email: DEMO_BUYER.email,
      phone: DEMO_BUYER.phone,
      state: 'Lagos State',
    };
  });

  // Navigation & Sub-views + Universal Back History + Token-Scoped Public Views
  const initialViewName = initialRouteParams.payRequestToken
    ? 'payment_request'
    : initialRouteParams.giftOrder
    ? 'gift_recipient_portal'
    : 'home';
  const [activeView, setActiveView] = useState<string>(initialViewName);
  const [viewHistory, setViewHistory] = useState<string[]>([]);
  const activeViewRef = useRef<string>(initialViewName);
  activeViewRef.current = activeView;
  const [activePayRequestToken, setActivePayRequestToken] = useState<string | null>(
    initialRouteParams.payRequestToken || null
  );
  const [activeGiftPortal, setActiveGiftPortal] = useState<{
    orderId: string;
    rtok?: string;
  } | null>(initialRouteParams.giftOrder || null);

  const [vendorTab, setVendorTab] = useState<VendorNavTab>('overview');
  const [customerSubScreen, setCustomerSubScreen] = useState<CustomerSubScreen>('overview');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [openDisputeInChatFlag, setOpenDisputeInChatFlag] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState<boolean>(false);
  const [catalogFilters, setCatalogFilters] = useState<CatalogToolbarFilters>(
    DEFAULT_CATALOG_TOOLBAR_FILTERS
  );
  const [browseReturnState, setBrowseReturnState] = useState<{
    view: string;
    scrollY: number;
  }>({ view: 'home', scrollY: 0 });

  // Cart & Checkout
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [undoRemovedItem, setUndoRemovedItem] = useState<CartItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [directCheckout, setDirectCheckout] = useState<{
    listing: DeviceListing | null;
    accessories: AccessoryItem[];
    variation: ProductVariation | null;
  }>({ listing: null, accessories: [], variation: null });
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraftState>({
    deliveryMethod: 'usedright_delivery',
    fullName: DEMO_BUYER.name,
    phone: '',
    street: '14 Admiralty Way, Lekki Phase 1',
    city: 'Lagos Island',
    stateName: 'Lagos State',
  });
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_ADDRESSES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_SAVED_ADDRESSES;
  });

  // Saved Items
  const [savedItemIds, setSavedItemIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_KEY);
      return raw ? JSON.parse(raw) : ['dev-phone-ip13-demo'];
    } catch {
      return ['dev-phone-ip13-demo'];
    }
  });

  // Modals & Auth Gating
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authContextMessage, setAuthContextMessage] = useState<string | undefined>(undefined);
  const [pendingAuthAction, setPendingAuthAction] = useState<((nextRole: DemoRole) => void) | null>(
    null
  );
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [protectionModalOpen, setProtectionModalOpen] = useState(false);
  const [inspectionGuideOpen, setInspectionGuideOpen] = useState(false);
  const [policyModalSlug, setPolicyModalSlug] = useState<string | null>(null);

  // Persist authoritative MarketplaceState & saved IDs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota limits
    }
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(savedItemIds));
    } catch {
      // ignore
    }
  }, [savedItemIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BUYER_PROFILE_KEY, JSON.stringify(buyerProfile));
    } catch {
      // ignore
    }
  }, [buyerProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ADDRESSES_KEY, JSON.stringify(savedAddresses));
    } catch {
      // ignore
    }
  }, [savedAddresses]);

  const commitViewTransition = useCallback((nextView: string, pushBrowser = true) => {
    const prevView = activeViewRef.current;
    if (prevView && prevView !== nextView) {
      setViewHistory((hist) => [...hist.slice(-19), prevView]);
      if (pushBrowser && typeof window !== 'undefined' && window.history?.pushState) {
        try {
          window.history.pushState({ view: nextView }, '', `#${nextView}`);
        } catch {
          // ignore sandboxed history restrictions
        }
      }
    }
    setActiveView(nextView);
  }, []);

  const handleUniversalBack = useCallback(() => {
    setViewHistory((hist) => {
      if (hist.length === 0) {
        setActiveView('home');
        return [];
      }
      const prev = hist[hist.length - 1];
      setActiveView(prev || 'home');
      return hist.slice(0, -1);
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = (ev: PopStateEvent) => {
      const target = (ev.state && typeof ev.state.view === 'string' && ev.state.view) || null;
      if (target) {
        setActiveView(target);
      } else {
        handleUniversalBack();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleUniversalBack]);

  // Live 1-second timer advancing active post-delivery inspection countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const tickingOrders = prev.orders.filter(
          (o) =>
            !o.disputePaused &&
            (o.fulfillmentStatus === 'Delivered' ||
              o.fulfillmentStatus === 'Buyer inspection' ||
              o.fulfillmentStatus === 'Delivered_In_Inspection') &&
            (o.inspectionRemainingSeconds ?? o.inspectionSecondsRemaining ?? 0) > 0
        );
        if (tickingOrders.length === 0) return prev;
        let next = prev;
        for (const ord of tickingOrders) {
          next = advanceInspectionTimer(next, ord.id, 1);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeCategories = useMemo(
    () =>
      state.platformConfig.categories
        .filter((c) => c.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.platformConfig.categories]
  );

  const primaryVendor = state.vendors[0];

  const openAuthPrompt = useCallback(
    (
      mode: 'login' | 'register' = 'login',
      contextMessage?: string,
      afterLogin?: (nextRole: DemoRole) => void
    ) => {
      setAuthModalMode(mode);
      setAuthContextMessage(contextMessage);
      setPendingAuthAction(() => afterLogin || null);
      setAuthModalOpen(true);
    },
    []
  );

  const handleLoginSuccess = (
    nextRole: DemoRole,
    userEmail?: string,
    userName?: string,
    userState?: string
  ) => {
    setRole(nextRole);
    const normalizedUserState =
      userState && userState !== 'all' ? normalizeNigerianState(userState) : undefined;
    if (nextRole === 'buyer' && (userEmail || userName || normalizedUserState)) {
      setBuyerProfile((prev) => ({
        ...prev,
        email: userEmail || prev.email,
        name: userName || prev.name,
        state: normalizedUserState || prev.state,
      }));
      if (normalizedUserState) {
        setCheckoutDraft((prev) => ({ ...prev, stateName: normalizedUserState }));
      }
    }
    if (nextRole === 'seller_pending' && (userName || normalizedUserState)) {
      setState((prev) => ({
        ...prev,
        pendingSellerState: {
          ...prev.pendingSellerState,
          businessName: userName || prev.pendingSellerState.businessName,
          state: normalizedUserState || prev.pendingSellerState.state || 'Lagos State',
        },
      }));
    }
    setAuthModalOpen(false);
    setAuthContextMessage(undefined);

    if (pendingAuthAction) {
      const action = pendingAuthAction;
      setPendingAuthAction(null);
      action(nextRole);
      return;
    }

    if (nextRole === 'admin') {
      commitViewTransition('admin_dashboard');
    } else if (nextRole === 'seller_approved' || nextRole === 'seller_pending') {
      setVendorTab('overview');
      commitViewTransition('seller_dashboard');
    } else if (nextRole === 'buyer' && activeView === 'admin_dashboard') {
      commitViewTransition('home');
    }
  };

  const handleSignOut = () => {
    setRole('visitor');
    setPendingAuthAction(null);
    setViewHistory([]);
    if (
      ['profile', 'messages', 'seller_dashboard', 'admin_dashboard', 'order_details'].includes(
        activeView
      )
    ) {
      setActiveView('home');
    }
  };

  const handleNavigate = (view: string, extra?: any) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (view === 'home' || view === 'explore' || view === 'deals') {
      if (!extra?.preserveBrandFilter && catalogFilters.brand !== 'all') {
        setCatalogFilters((prev) => ({ ...prev, brand: 'all' }));
      }
    }

    if (view === 'admin_dashboard') {
      if (role !== 'admin') {
        openAuthPrompt(
          'login',
          'Administrator credentials are required to open UsedRight Support & Governance.',
          (nextRole) => {
            if (nextRole === 'admin') commitViewTransition('admin_dashboard');
          }
        );
        return;
      }
      commitViewTransition('admin_dashboard');
      return;
    }

    if (view === 'seller_dashboard') {
      if (role === 'visitor') {
        openAuthPrompt('login', 'Sign in with a vendor account to open the Vendor Dashboard.', (nextRole) => {
          if (nextRole === 'seller_approved' || nextRole === 'seller_pending') {
            commitViewTransition('seller_dashboard');
          }
        });
        return;
      }
      commitViewTransition('seller_dashboard');
      return;
    }

    if (view === 'profile') {
      if (role === 'visitor') {
        openAuthPrompt('login', 'Sign in or create an account to view your orders and payment holds.', (nextRole) => {
          if (nextRole === 'buyer') {
            setCustomerSubScreen(extra?.subScreen || 'overview');
            commitViewTransition('profile');
          } else if (nextRole === 'seller_approved' || nextRole === 'seller_pending') {
            commitViewTransition('seller_dashboard');
          } else if (nextRole === 'admin') {
            commitViewTransition('admin_dashboard');
          }
        });
        return;
      }
      if (extra?.subScreen) setCustomerSubScreen(extra.subScreen);
      else setCustomerSubScreen('overview');
      commitViewTransition('profile');
      return;
    }

    if (view === 'messages') {
      if (role === 'visitor') {
        openAuthPrompt(
          'login',
          'Sign in to read messages and chat safely inside UsedRight.',
          (nextRole) => {
            if (nextRole === 'seller_approved') {
              setVendorTab('messages');
              commitViewTransition('seller_dashboard');
            } else if (nextRole === 'admin') {
              commitViewTransition('admin_dashboard');
            } else {
              commitViewTransition('messages');
            }
          }
        );
        return;
      }
      if (typeof extra === 'string') {
        setSelectedConversationId(extra);
        setOpenDisputeInChatFlag(false);
      } else if (extra && typeof extra === 'object') {
        if (extra.conversationId) setSelectedConversationId(extra.conversationId);
        setOpenDisputeInChatFlag(Boolean(extra.openDisputeForm));
      } else {
        setOpenDisputeInChatFlag(false);
      }

      if (role === 'seller_approved') {
        setVendorTab('messages');
        commitViewTransition('seller_dashboard');
      } else {
        commitViewTransition('messages');
      }
      return;
    }

    if (view === 'order_details' && typeof extra === 'string') {
      if (role === 'visitor') {
        openAuthPrompt('login', 'Sign in to view full order and payment hold details.', () => {
          setSelectedOrderId(extra);
          commitViewTransition('order_details');
        });
        return;
      }
      setSelectedOrderId(extra);
      commitViewTransition('order_details');
      return;
    }

    commitViewTransition(view);
  };

  // Start or open pre-purchase conversation with a vendor
  const startConversationWithVendor = (listing: DeviceListing) => {
    const existing = state.conversations.find(
      (c) =>
        c.buyerId === buyerProfile.id &&
        c.vendorId === listing.sellerId &&
        c.listingId === listing.id
    );
    if (existing) {
      setSelectedConversationId(existing.id);
      setOpenDisputeInChatFlag(false);
      setActiveView('messages');
      return;
    }

    const vendor = state.vendors.find((v) => v.id === listing.sellerId);
    const convId = `conv-${Date.now()}`;
    const newConv: MessageConversation = {
      id: convId,
      vendorId: listing.sellerId,
      vendorName: listing.sellerName,
      vendorAvatar: vendor?.logo || listing.images[0] || '',
      buyerId: buyerProfile.id,
      buyerName: buyerProfile.name,
      listingId: listing.id,
      listingTitle: listing.title,
      listingPrice: listing.price,
      listingImage: listing.images[0] || '',
      stage: 'pre_purchase',
      lastMessage: `Inquiry started for ${listing.title}`,
      lastMessageTime: 'Just now',
      unreadCount: 0,
      unreadCountVendor: 1,
      unreadCountBuyer: 0,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'system',
          text: `Pre-purchase inquiry opened for ${listing.title}. Ask about battery, scratches, pickup, or delivery before ordering.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          productRef: {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            image: listing.images[0] || '',
            condition: listing.condition,
          },
        },
      ],
    };

    setState((prev) => ({
      ...prev,
      conversations: [newConv, ...prev.conversations],
    }));
    setSelectedConversationId(convId);
    setOpenDisputeInChatFlag(false);
    setActiveView('messages');
  };

  const handleMessageSeller = (listing: DeviceListing) => {
    if (role === 'visitor') {
      openAuthPrompt(
        'login',
        `Sign in or create a free customer account to message ${listing.sellerName} safely inside UsedRight.`,
        (nextRole) => {
          if (nextRole === 'seller_approved') {
            setVendorTab('messages');
            setActiveView('seller_dashboard');
          } else {
            startConversationWithVendor(listing);
          }
        }
      );
      return;
    }
    startConversationWithVendor(listing);
  };

  const getCartItemKey = (item: CartItem, idx: number) =>
    item.id || `${item.listing.id}-${item.selectedVariation?.id || 'base'}-${idx}`;

  const handleAddToCart = (
    listing: DeviceListing,
    selectedAccessories?: AccessoryItem[],
    selectedVariation?: ProductVariation
  ) => {
    setCartItems((prev) => [
      ...prev,
      {
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        listing,
        selectedVariation,
        quantity: 1,
        selectedAccessories,
        includedFreeGift: listing.freeGift,
      },
    ]);
    setUndoRemovedItem(null);
    setIsCartOpen(true);
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) => {
      const target = prev.find((it, idx) => getCartItemKey(it, idx) === cartItemId) || null;
      if (target) setUndoRemovedItem(target);
      return prev.filter((it, idx) => getCartItemKey(it, idx) !== cartItemId);
    });
  };

  const handleUndoRemoveCartItem = () => {
    if (!undoRemovedItem) return;
    setCartItems((prev) => [...prev, undoRemovedItem]);
    setUndoRemovedItem(null);
  };

  const handleUpdateCartQuantity = (cartItemId: string, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      handleRemoveCartItem(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((it, idx) =>
        getCartItemKey(it, idx) === cartItemId ? { ...it, quantity: nextQuantity } : it
      )
    );
  };

  const handleEditCartItem = (item: CartItem) => {
    setIsCartOpen(false);
    setEditingCartItem(item);
    setSelectedListingId(item.listing.id);
    commitViewTransition('product_details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEditedCartItem = (
    cartItemId: string,
    listing: DeviceListing,
    selectedAccessories?: AccessoryItem[],
    selectedVariation?: ProductVariation
  ) => {
    setCartItems((prev) =>
      prev.map((it, idx) =>
        getCartItemKey(it, idx) === cartItemId
          ? {
              ...it,
              listing,
              selectedAccessories,
              selectedVariation,
              includedFreeGift: listing.freeGift,
            }
          : it
      )
    );
    setEditingCartItem(null);
    setIsCartOpen(true);
  };

  const handleSaveAddress = (address: CustomerAddress) => {
    setSavedAddresses((prev) => {
      const exists = prev.some(
        (a) =>
          a.street.trim().toLowerCase() === address.street.trim().toLowerCase() &&
          a.state === address.state
      );
      if (exists) return prev;
      return [address, ...prev];
    });
  };

  const handleBuyNow = (
    listing: DeviceListing,
    selectedAccessories: AccessoryItem[] = [],
    selectedVariation?: ProductVariation
  ) => {
    setDirectCheckout({
      listing,
      accessories: selectedAccessories,
      variation: selectedVariation || null,
    });
    setIsCheckoutOpen(true);
  };

  const handleProceedCartCheckout = () => {
    setIsCartOpen(false);
    setDirectCheckout({ listing: null, accessories: [], variation: null });
    setIsCheckoutOpen(true);
  };

  const handleMultiVendorOrderCompleted = ({
    parentOrder,
    childOrders,
    isDirectBuyNow,
  }: {
    parentOrder: ParentOrderRecord;
    childOrders: Order[];
    isDirectBuyNow: boolean;
  }) => {
    const nowTimeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const convIds: string[] = [];

    const newHolds: PaymentHold[] = [];
    const newConvs: MessageConversation[] = [];
    const newNotifications: AppNotification[] = [];

    childOrders.forEach((child, idx) => {
      const convId = `conv-${Date.now()}-${idx}`;
      convIds.push(convId);
      const vendorId = child.vendorId || child.listing.sellerId;
      const vendorName = child.vendorName || child.listing.sellerName;
      const feeBase =
        child.feeBaseAmount ?? child.itemPrice + (child.accessoriesPrice || 0);
      const vendorFee = child.vendor_platform_service_fee ?? Math.round(feeBase * 0.01);

      newHolds.push({
        id: `hold-${Date.now()}-${idx}`,
        orderId: child.id,
        orderNumber: child.orderNumber,
        transactionNumber: child.transactionNumber || parentOrder.transactionNumber,
        vendorId,
        vendorNumber: child.vendorNumber || vendorId,
        vendorName,
        buyerId: child.buyerId,
        buyerName: child.buyerName,
        deviceTitle:
          child.items && child.items.length > 1
            ? `${child.listing.title} + ${child.items.length - 1} more`
            : child.listing.title,
        itemTitle: child.listing.title,
        deviceImage: child.selectedVariation?.images?.[0] || child.listing.images[0],
        variationInfo: child.selectedVariation
          ? `${child.selectedVariation.color} · ${child.selectedVariation.grade}`
          : child.listing.cosmeticGrade,
        grossAmount: child.totalAmount,
        amount: child.totalAmount,
        platformFeeBuyer: child.customer_platform_service_fee ?? child.buyerServiceCharge,
        platformFeeVendor: vendorFee,
        customer_platform_service_fee:
          child.customer_platform_service_fee ?? child.buyerServiceCharge,
        vendor_platform_service_fee: vendorFee,
        customerFeeRate: child.customerFeeRate,
        vendorFeeRate: child.vendorFeeRate,
        deliveryFeeAllocated: child.deliveryFee,
        netVendorPayout: Math.max(0, feeBase - vendorFee),
        paymentReceivedAt: nowTimeLabel,
        createdAt: nowTimeLabel,
        inspectionHours: child.inspectionWindowHours || 24,
        remainingSeconds: child.inspectionRemainingSeconds ?? 86400,
        status: 'Payment Received',
        isDisputed: false,
      });

      newConvs.push({
        id: convId,
        vendorId,
        vendorName,
        vendorAvatar: child.listing.images[0],
        buyerId: child.buyerId,
        buyerName: child.buyerName,
        listingId: child.listing.id,
        listingTitle:
          child.items && child.items.length > 1
            ? `${child.listing.title} (+${child.items.length - 1})`
            : child.listing.title,
        listingPrice: feeBase,
        listingImage: child.selectedVariation?.images?.[0] || child.listing.images[0],
        orderId: child.id,
        orderNumber: child.orderNumber,
        stage: 'post_purchase',
        lastMessage: `Order ${child.orderNumber} paid (${child.transactionNumber}). Vendor notified to arrange fulfilment.`,
        lastMessageTime: 'Just now',
        unreadCount: 0,
        unreadCountVendor: 1,
        unreadCountBuyer: 0,
        messages: [
          {
            id: `msg-${Date.now()}-${idx}`,
            sender: 'system',
            orderNumber: child.orderNumber,
            text: `Sub-order ${child.orderNumber} under Parent Order ${parentOrder.parentOrderNumber} confirmed. ${vendorName} will arrange ${
              child.deliveryMethod === 'physical_pickup' ? 'store pickup' : 'vendor-managed dispatch'
            } and share tracking details.`,
            timestamp: nowTimeLabel,
            dateLabel: 'Today',
          },
        ],
      });

      newNotifications.push({
        id: `notif-vnd-ord-${Date.now()}-${idx}`,
        title: `New Paid Order ${child.orderNumber}`,
        message: `${child.buyerName} paid ₦${child.totalAmount.toLocaleString('en-NG')}. Arrange dispatch to send delivery verification code.`,
        time: 'Just now',
        read: false,
        type: 'order',
        recipientRole: 'vendor',
        orderId: child.id,
        conversationId: convId,
      });
    });

    newNotifications.unshift({
      id: `notif-buy-ord-${Date.now()}`,
      title: `Order ${parentOrder.parentOrderNumber} Confirmed`,
      message: `Paid ₦${parentOrder.totalPaid.toLocaleString('en-NG')} across ${parentOrder.vendorCount} vendor(s). Watch notifications for dispatch & Delivery Verification Code.`,
      time: 'Just now',
      read: false,
      type: 'order',
      recipientRole: 'buyer',
      orderId: childOrders[0]?.id,
    });

    setState((prev) => {
      if ((prev.parentOrders || []).some((p) => p.id === parentOrder.id)) {
        return prev;
      }
      const existingOrderIds = new Set(prev.orders.map((o) => o.id));
      const uniqueOrders = childOrders.filter((o) => !existingOrderIds.has(o.id));
      let nextListings = [...prev.listings];
      uniqueOrders.forEach((child) => {
        const lines = child.items && child.items.length > 0
          ? child.items
          : [{ listing: child.listing, selectedVariation: child.selectedVariation, quantity: 1 }];
        lines.forEach((line) => {
          const qty = line.quantity ?? 1;
          nextListings = nextListings.map((item) => {
            if (item.id !== line.listing.id) return item;
            if (line.selectedVariation && item.variations) {
              const nextVars = item.variations.map((v) =>
                v.id === line.selectedVariation?.id
                  ? {
                      ...v,
                      stockQuantity: Math.max(0, v.stockQuantity - qty),
                      isAvailable: Math.max(0, v.stockQuantity - qty) > 0,
                    }
                  : v
              );
              return {
                ...item,
                variations: nextVars,
                totalStock: nextVars.reduce((s, v) => s + v.stockQuantity, 0),
              };
            }
            const nextStock = Math.max(0, (item.stockQuantity ?? 1) - qty);
            return {
              ...item,
              stockQuantity: nextStock,
              totalStock: Math.max(0, (item.totalStock ?? nextStock + qty) - qty),
            };
          });
        });
      });

      return {
        ...prev,
        listings: nextListings,
        parentOrders: [parentOrder, ...(prev.parentOrders || [])],
        orders: [...uniqueOrders, ...prev.orders],
        paymentHolds: [...newHolds, ...prev.paymentHolds],
        conversations: [...newConvs, ...prev.conversations],
        notifications: [...newNotifications, ...prev.notifications],
        auditLog: [
          {
            id: `aud-pord-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actorRole: 'buyer',
            actorName: parentOrder.buyerName,
            actionType: 'order_created',
            entityRef: parentOrder.parentOrderNumber,
            details: `Multi-vendor checkout completed (${parentOrder.vendorCount} vendor(s), total ₦${parentOrder.totalPaid.toLocaleString('en-NG')}).`,
          },
          ...prev.auditLog,
        ],
      };
    });

    if (!isDirectBuyNow) {
      setCartItems([]);
      setUndoRemovedItem(null);
    }
    setDirectCheckout({ listing: null, accessories: [], variation: null });
    return {
      conversationIds: convIds,
      primaryOrderId: childOrders[0]?.id || '',
    };
  };

  const handleSendMessage = (
    conversationId: string,
    text: string,
    senderRole: 'buyer' | 'vendor' | 'admin',
    extra?: {
      mediaAttachments?: ChatAttachmentRecord[];
      riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
      triggers?: string[];
    }
  ) => {
    const scan = scanMessageForDisallowedContent(text);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const msg = {
          id: `msg-${Date.now()}`,
          sender: senderRole,
          senderLabel: senderRole === 'admin' ? 'USED RIGHT SUPPORT' : undefined,
          isOfficialUpdate: senderRole === 'admin',
          text,
          timestamp,
          mediaAttachments: extra?.mediaAttachments,
          flaggedWarning: scan.isSafe ? undefined : scan.warningMessage,
        };
        const previewText =
          extra?.mediaAttachments && extra.mediaAttachments.length > 0
            ? `[${extra.mediaAttachments[0].mediaType.toUpperCase()}] ${text}`
            : text;
        return {
          ...c,
          lastMessage: senderRole === 'admin' ? `USED RIGHT SUPPORT: ${previewText}` : previewText,
          lastMessageTime: 'Just now',
          unreadCountBuyer:
            senderRole === 'vendor' || senderRole === 'admin'
              ? (c.unreadCountBuyer || 0) + 1
              : 0,
          unreadCountVendor:
            senderRole === 'buyer' || senderRole === 'admin'
              ? (c.unreadCountVendor || 0) + 1
              : 0,
          messages: [...c.messages, msg],
        };
      }),
    }));
  };

  const handleOpenDispute = (payload: {
    orderId: string;
    conversationId: string;
    reason: DisputeReason;
    description: string;
    requestedResolution: DisputeResolutionType;
    evidenceFiles?: { fileName: string; type: 'image' | 'video' | 'document'; caption?: string }[];
  }) => {
    setState((prev) => openDisputeInChat(prev, payload).state);
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    if (status === 'In transit' || status === 'Ready for Pickup') {
      setState((prev) => simulateDispatch(prev, orderId));
      return;
    }
    if (status === 'Delivered_In_Inspection' || status === 'Delivered') {
      setState((prev) => confirmPhysicalDeliveryOrReceipt(prev, orderId, 'courier'));
      return;
    }
    const eventTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eventTitle =
      status === 'Vendor Accepted Order'
        ? 'Vendor accepted order'
        : status === 'Seller preparing device'
        ? 'Vendor started device preparation'
        : `Order status updated to ${status}`;

    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              fulfillmentStatus: status,
              events: [
                ...o.events,
                {
                  title: eventTitle,
                  time: eventTime,
                  done: true,
                },
              ],
            }
          : o
      ),
      paymentHolds: prev.paymentHolds.map((h) =>
        h.orderId === orderId && status === 'Seller preparing device'
          ? { ...h, status: 'Preparing Order' }
          : h
      ),
      conversations: prev.conversations.map((c) =>
        c.orderId === orderId
          ? {
              ...c,
              lastMessage: eventTitle,
              lastMessageTime: 'Just now',
              messages: [
                ...c.messages,
                {
                  id: `msg-${Date.now()}`,
                  sender: 'system',
                  text: `${eventTitle}. Funds remain safely protected on UsedRight.`,
                  timestamp: eventTime,
                  dateLabel: 'Today',
                  isOfficialUpdate: true,
                },
              ],
            }
          : c
      ),
    }));
  };

  const handleConfirmReceipt = (orderId: string) => {
    setState((prev) => confirmPhysicalDeliveryOrReceipt(prev, orderId, 'buyer'));
  };

  const handleAcceptOrder = (orderId: string) => {
    setState((prev) =>
      completeOrderSettlement(prev, orderId, 'Customer verified device condition and approved payout')
    );
  };

  const handleAdminUpdateDispute = (payload: {
    disputeId: string;
    adminName: string;
    newStatus?: DisputeStatus;
    publicMessage?: string;
    internalNote?: string;
  }) => {
    setState((prev) => adminJoinDisputeAndUpdate(prev, payload));
  };

  const handleAdminResolveDispute = (payload: {
    disputeId: string;
    adminName: string;
    decision: 'refund_buyer' | 'release_vendor';
    outcomeSummary: string;
  }) => {
    setState((prev) => adminResolveDispute(prev, payload));
  };

  const handleConfigureAdmin = (payload: {
    brandNewEnabled?: boolean;
    inspectionHours?: number;
    categories?: CategoryConfig[];
    adminName?: string;
  }) => {
    setState((prev) => configureAdminSettings(prev, payload));
  };

  const handleSubmitReport = (report: UserReport) => {
    setState((prev) => ({
      ...prev,
      reports: [report, ...prev.reports],
      auditLog: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorRole: role,
          actorName: role === 'seller_approved' ? primaryVendor.name : buyerProfile.name,
          actionType: 'report_submitted',
          entityRef: report.targetName,
          details: `Report submitted (${report.reasonCategory}): ${report.details}`,
        },
        ...prev.auditLog,
      ],
    }));
  };

  const handleArrangeDispatch = (
    orderId: string,
    details: {
      dispatcherOrCourierName: string;
      dispatcherPhone?: string;
      dispatchReference: string;
      dispatchDate?: string;
      expectedDeliveryWindow: string;
      deliveryNotes?: string;
    }
  ): { error?: string } => {
    let errorResult: string | undefined;
    setState((prev) => {
      const res = vendorArrangeDispatch(prev, { orderId, ...details });
      errorResult = res.error;
      return res.state;
    });
    void submitVendorDispatchApi(orderId, details);
    return { error: errorResult };
  };

  const handleVerifyDeliveryCode = (
    orderId: string,
    code: string
  ): { verified: boolean; error?: string; remainingAttempts?: number } => {
    const res = verifyDeliveryCodeAndStartInspection(state, {
      orderId,
      enteredCode: code,
      actorVendorId: primaryVendor.id,
      actorName: primaryVendor.name,
    });
    setState(res.state);
    void verifyDeliveryOtpApi(orderId, {
      code,
      vendorId: primaryVendor.id,
      actorName: primaryVendor.name,
    });
    return {
      verified: res.verified,
      error: res.error,
      remainingAttempts: res.remainingAttempts,
    };
  };

  const handleAdminOverrideDelivery = (orderId: string, reason: string): { error?: string } => {
    const res = adminOverrideDeliveryConfirmation(state, {
      orderId,
      adminName: DEMO_ADMIN_CREDENTIALS.name,
      reason,
    });
    if (res.error) return { error: res.error };
    setState(res.state);
    void adminOverrideDeliveryApi(orderId, {
      role: 'admin',
      adminName: DEMO_ADMIN_CREDENTIALS.name,
      reason,
    });
    return {};
  };

  const handleReportDeliveryProblem = (payload: {
    orderId: string;
    type: DeliveryProblemType;
    details: string;
    requestedNewDate?: string;
  }) => {
    setState((prev) =>
      reportDeliveryProblemOrReschedule(prev, {
        ...payload,
        buyerName: buyerProfile.name,
      })
    );
  };

  const handleAdminUpdateFees = (payload: {
    customerFeeRate: number;
    vendorFeeRate: number;
    vendorSpecificRates?: Record<string, number>;
    promotionalLabel?: string;
    effectiveDate?: string;
    expiryDate?: string;
    eligibilityRules?: string;
    reason: string;
    adminName: string;
  }): { errors: string[] } => {
    const res = adminUpdatePlatformFees(state, payload);
    if (res.errors.length === 0) {
      setState(res.state);
      void adminUpdateFeesApi({ role: 'admin', ...payload });
    }
    return { errors: res.errors };
  };

  const handleAdminUpdateDeliveryConfig = (
    payload: Partial<DeliveryConfig> & { adminName: string }
  ): { error?: string } => {
    const res = adminUpdateDeliveryConfig(state, payload);
    if (!res.error) {
      setState(res.state);
      void adminUpdateDeliveryConfigApi(payload);
    }
    return { error: res.error };
  };

  const handleAdminSavePolicy = (payload: {
    policyId?: string;
    title: string;
    summary: string;
    version: string;
    status: PolicyDocument['status'];
    effectiveDate: string;
    changeSummary: string;
    requiresVendorReacceptance?: boolean;
    sections: PolicyDocument['sections'];
    adminName: string;
  }) => {
    setState((prev) => adminSavePolicyVersion(prev, payload));
    void adminPublishPolicyApi(payload);
  };

  const handleAcceptVendorAgreement = (version: string) => {
    const declarations = VENDOR_REGISTRATION_DECLARATIONS.map(() => true);
    const termsPolicy = (state.policies || []).find((p) => p.slug === 'vendor-agreement');
    setState((prev) =>
      recordVendorAgreementAcceptance(prev, {
        vendorId: primaryVendor.id,
        vendorName: primaryVendor.name,
        agreementVersion: version,
        policyVersion: termsPolicy?.currentVersion || '1.0',
        declarationsAccepted: declarations,
        finalConsentAccepted: true,
        verifiedIdentityRef: primaryVendor.vendorNumber,
      })
    );
    void recordVendorAgreementAcceptApi({
      vendorId: primaryVendor.id,
      vendorName: primaryVendor.name,
      agreementVersion: version,
      policyVersion: termsPolicy?.currentVersion || '1.0',
      declarationsAccepted: declarations,
      finalConsentAccepted: true,
      verifiedIdentityRef: primaryVendor.vendorNumber,
    });
  };

  const handleResendDeliveryPin = (orderId: string) => {
    setState((prev) =>
      resendDeliveryVerificationCode(prev, {
        orderId,
        buyerId: buyerProfile.id,
      }).state
    );
    void resendDeliveryPinApi(orderId, buyerProfile.id);
  };

  const handleSetAlternativeRecipient = (
    orderId: string,
    recipient: { name: string; phone: string; relationship: string; note?: string }
  ): { error?: string } => {
    const res = setOrderAlternativeRecipient(state, {
      orderId,
      buyerId: buyerProfile.id,
      ...recipient,
    });
    if (res.error) return { error: res.error };
    setState(res.state);
    void setAlternativeRecipientApi(orderId, {
      buyerId: buyerProfile.id,
      ...recipient,
    });
    return {};
  };

  const handleMarkDeliveryFailed = (
    orderId: string,
    reason: string,
    rescheduledWindow?: string
  ): { error?: string } => {
    const res = markDeliveryAttemptFailed(state, {
      orderId,
      actorVendorId: primaryVendor.id,
      reason,
      rescheduledWindow,
    });
    if (res.error) return { error: res.error };
    setState(res.state);
    void markDeliveryFailedApi(orderId, {
      vendorId: primaryVendor.id,
      reason,
      rescheduledWindow,
    });
    return {};
  };

  const handleSubmitWarrantyClaim = (payload: {
    orderId: string;
    issueCategory: WarrantyClaimCategory;
    description: string;
    attachmentNames?: string[];
  }): { error?: string } => {
    const res = submitWarrantyClaim(state, {
      ...payload,
      buyerId: buyerProfile.id,
      buyerName: buyerProfile.name,
    });
    if (res.error) return { error: res.error };
    setState(res.state);
    void submitWarrantyClaimApi(payload.orderId, {
      buyerId: buyerProfile.id,
      buyerName: buyerProfile.name,
      issueCategory: payload.issueCategory,
      description: payload.description,
      attachmentNames: payload.attachmentNames,
    });
    return {};
  };

  const handleRespondWarrantyClaim = (payload: {
    orderId: string;
    claimId: string;
    proposedRemedy:
      | 'Repair'
      | 'Replacement'
      | 'Diagnostic Check'
      | 'Declined (Excluded Damage)'
      | undefined;
    vendorResponse: string;
    nextStatus: WarrantyClaimStatus;
  }): { error?: string } => {
    const res = vendorRespondWarrantyClaim(state, {
      claimId: payload.claimId,
      vendorId: primaryVendor.id,
      vendorName: primaryVendor.name,
      proposedRemedy: payload.proposedRemedy,
      vendorResponse: payload.vendorResponse,
      nextStatus: payload.nextStatus,
    });
    if (res.error) return { error: res.error };
    setState(res.state);
    void respondWarrantyClaimApi(payload.orderId, payload.claimId, {
      role: 'vendor',
      vendorId: primaryVendor.id,
      vendorName: primaryVendor.name,
      proposedRemedy: payload.proposedRemedy,
      vendorResponse: payload.vendorResponse,
      nextStatus: payload.nextStatus,
    });
    return {};
  };

  const handleAdminUpdateWarrantyConfig = (payload: {
    defaultDurationMonths: number;
    claimResponseSlaHours: number;
    coveredSummary: string[];
    excludedSummary: string[];
    adminName: string;
  }) => {
    setState((prev) => adminUpdateWarrantyConfig(prev, payload));
    void adminUpdateWarrantyPolicyApi({ role: 'admin', ...payload });
  };

  const handleAdminUpdateWarrantyClaim = (payload: {
    claimId: string;
    status: WarrantyClaimStatus;
    resolutionSummary?: string;
    adminNotes?: string;
    adminName: string;
  }) => {
    const targetClaim = (state.warrantyClaims || []).find((c) => c.id === payload.claimId);
    setState((prev) => adminUpdateWarrantyClaim(prev, payload));
    if (targetClaim) {
      void respondWarrantyClaimApi(targetClaim.orderId, payload.claimId, {
        role: 'admin',
        status: payload.status,
        resolutionSummary: payload.resolutionSummary,
        adminNotes: payload.adminNotes,
        adminName: payload.adminName,
      });
    }
  };

  const handleFlagOffPlatform = (payload: {
    conversationId: string;
    orderId?: string;
    orderNumber?: string;
    content: string;
    riskLevel: ModerationRiskLevel;
    triggers: string[];
  }) => {
    const isVendorActor = role === 'seller_approved';
    setState((prev) =>
      flagOffPlatformAttempt(prev, {
        userId: isVendorActor ? primaryVendor.id : buyerProfile.id,
        userName: isVendorActor ? primaryVendor.name : buyerProfile.name,
        userRole: isVendorActor ? 'vendor' : 'buyer',
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        conversationId: payload.conversationId,
        contentType: 'chat_text',
        flaggedContent: payload.content,
        triggers: payload.triggers,
        riskLevel: payload.riskLevel,
      }).state
    );
  };

  const handleReportAttachment = (payload: {
    conversationId: string;
    messageId: string;
    attachmentId: string;
    reason: string;
  }) => {
    const conv = state.conversations.find((c) => c.id === payload.conversationId);
    const isVendorActor = role === 'seller_approved';
    setState((prev) =>
      flagOffPlatformAttempt(prev, {
        userId: isVendorActor ? conv?.buyerId || buyerProfile.id : conv?.vendorId || primaryVendor.id,
        userName: isVendorActor ? conv?.buyerName || buyerProfile.name : conv?.vendorName || primaryVendor.name,
        userRole: isVendorActor ? 'buyer' : 'vendor',
        orderId: conv?.orderId,
        orderNumber: conv?.orderNumber,
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        contentType: 'chat_image',
        flaggedContent: `Reported attachment ${payload.attachmentId}: ${payload.reason}`,
        triggers: ['Reported media attachment'],
        riskLevel: 'MEDIUM',
      }).state
    );
  };

  const handleAdminModerateFlag = (payload: {
    flagId: string;
    action: 'warn' | 'restrict_messaging' | 'suspend_vendor' | 'dismiss';
    adminName: string;
    note?: string;
  }): { error?: string } => {
    setState((prev) => adminModerateFlag(prev, payload));
    void adminTakeModerationActionApi(payload.flagId, {
      role: 'admin',
      ...payload,
    });
    return {};
  };

  const handleAdminVerifyVendor = (payload: {
    vendorId: string;
    decision: 'Approved' | 'Rejected' | 'Needs Info';
    identityStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info';
    socialStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info';
    notes?: string;
    adminName: string;
  }): { error?: string } => {
    setState((prev) => adminReviewVendorVerification(prev, payload));
    void adminVerifyVendorApi(payload.vendorId, {
      role: 'admin',
      ...payload,
    });
    return {};
  };

  const handleToggleFollowVendor = (vendorId: string) => {
    setState((prev) => toggleFollowVendor(prev, vendorId).state);
    void toggleFollowVendorApi(vendorId);
  };

  const handleUpdatePendingSocialVerification = (payload: {
    socialLinks: VendorSocialLink[];
    alternativeManualVerification: boolean;
    alternativeManualReason?: string;
  }) => {
    setState((prev) => ({
      ...prev,
      pendingSellerState: {
        ...prev.pendingSellerState,
        socialLinks: payload.socialLinks,
        socialVerificationStatus: 'Under Review',
        alternativeManualVerification: payload.alternativeManualVerification,
        alternativeManualReason: payload.alternativeManualReason,
      },
    }));
  };

  const handleNotificationClick = (notif: AppNotification) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notif.id ? { ...n, read: true } : n
      ),
    }));
    if (notif.orderId) {
      handleOpenOrderDetail(notif.orderId);
      return;
    }
    if (notif.paymentRequestId) {
      handleNavigate('profile', { subScreen: 'payment_requests' });
      return;
    }
    if (notif.conversationId) {
      handleNavigate('messages', { conversationId: notif.conversationId });
    }
  };

  const handleMarkAllNotificationsRead = () => {
    const targetRole =
      role === 'admin' ? 'admin' : role === 'seller_approved' ? 'vendor' : 'buyer';
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        !n.recipientRole || n.recipientRole === targetRole ? { ...n, read: true } : n
      ),
    }));
  };

  const handleResetDemoData = () => {
    localStorage.removeItem(STORAGE_STATE_KEY);
    localStorage.removeItem(STORAGE_ADDRESSES_KEY);
    const fresh = createInitialMarketplaceState();
    setState(fresh);
    setCartItems([]);
    setEditingCartItem(null);
    setUndoRemovedItem(null);
    setSavedAddresses(DEFAULT_SAVED_ADDRESSES);
    setSelectedOrderId(null);
    setSelectedConversationId(undefined);
    setActiveView('home');
    void resetServerDemoDatabase();
  };

  const handleToggleSave = (id: string) => {
    setSavedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleViewDetails = (item: DeviceListing) => {
    if (activeView !== 'product_details') {
      setBrowseReturnState({
        view: activeView,
        scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
      });
    }
    setSelectedListingId(item.id);
    commitViewTransition('product_details');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleBackFromProductDetails = () => {
    const targetView = browseReturnState.view || 'home';
    const targetScrollY = browseReturnState.scrollY || 0;
    setViewHistory((hist) => hist.slice(0, -1));
    setActiveView(targetView);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: targetScrollY, behavior: 'instant' as ScrollBehavior });
        });
      });
    }
  };

  const handleViewVendorStorefront = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    commitViewTransition('vendor_storefront');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleOpenOrderDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    commitViewTransition('order_details');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  // ====== SEND AS A GIFT & REQUEST SOMEONE TO PAY HANDLERS ======
  const handleOpenPaymentRequestPreview = (token: string) => {
    setIsCartOpen(false);
    setActivePayRequestToken(token);
    setActiveView('payment_request');
    setViewHistory((hist) =>
      activeViewRef.current && activeViewRef.current !== 'payment_request'
        ? [...hist.slice(-19), activeViewRef.current]
        : hist
    );
    if (typeof window !== 'undefined' && window.history?.pushState) {
      try {
        window.history.pushState(
          { view: 'payment_request' },
          '',
          `${window.location.pathname}?pay_request=${encodeURIComponent(token)}`
        );
      } catch {
        // ignore sandbox restrictions
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenGiftRecipientPortal = (orderId: string, rtok?: string) => {
    setIsCheckoutOpen(false);
    const matchingOrder = state.orders.find((o) => o.id === orderId);
    const resolvedToken = rtok || matchingOrder?.giftDetails?.recipientPortalToken;
    setActiveGiftPortal({ orderId, rtok: resolvedToken });
    setActiveView('gift_recipient_portal');
    setViewHistory((hist) =>
      activeViewRef.current && activeViewRef.current !== 'gift_recipient_portal'
        ? [...hist.slice(-19), activeViewRef.current]
        : hist
    );
    if (typeof window !== 'undefined' && window.history?.pushState) {
      try {
        const qs = resolvedToken
          ? `?gift_order=${encodeURIComponent(orderId)}&rtok=${encodeURIComponent(resolvedToken)}`
          : `?gift_order=${encodeURIComponent(orderId)}`;
        window.history.pushState(
          { view: 'gift_recipient_portal' },
          '',
          `${window.location.pathname}${qs}`
        );
      } catch {
        // ignore sandbox restrictions
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreatePaymentRequest = (payload: {
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
  }): { error?: string; request?: PaymentRequestRecord; rawToken?: string } => {
    const giftSrc = payload.giftDetails;
    const res = createPaymentRequestRecord(state, {
      orderOwnerId: buyerProfile.id,
      orderOwnerName: buyerProfile.name,
      orderOwnerEmail: buyerProfile.email,
      orderOwnerPhone: buyerProfile.phone || payload.deliveryAddress.phone || '08000000000',
      cartItems,
      deliveryMethod: payload.deliveryMethod,
      deliveryAddress: payload.deliveryAddress,
      isGift: payload.isGift,
      giftInput:
        payload.isGift && giftSrc
          ? {
              recipientName: giftSrc.recipientName,
              recipientPhone: giftSrc.recipientPhone,
              street: giftSrc.recipientAddress?.street,
              city: giftSrc.recipientAddress?.city,
              state: giftSrc.recipientAddress?.state,
              landmark: giftSrc.recipientAddress?.landmark,
              deliveryInstructions: giftSrc.deliveryInstructions,
              giftMessage: giftSrc.giftMessage,
              senderVisibility: giftSrc.senderVisibility,
              senderDisplayName: giftSrc.senderDisplayName,
              occasion: giftSrc.occasion,
            }
          : undefined,
    });
    if (res.error || !res.request) {
      return { error: res.error || 'Could not create payment request link.' };
    }
    setState(res.state);
    void createPaymentRequestApi({
      orderOwnerId: buyerProfile.id,
      orderOwnerName: buyerProfile.name,
      orderOwnerEmail: buyerProfile.email,
      orderOwnerPhone: buyerProfile.phone || payload.deliveryAddress.phone || '08000000000',
      cartItems,
      deliveryMethod: payload.deliveryMethod,
      deliveryAddress: payload.deliveryAddress,
      isGift: payload.isGift,
      giftDetails: res.request.giftDetails,
      validityHours: res.request.validityHours,
      customRawToken: res.rawToken,
    });
    return { request: res.request, rawToken: res.rawToken };
  };

  const handleRefreshPaymentRequest = useCallback((paymentRequestId: string) => {
    setState((prev) => refreshPaymentRequestState(prev, paymentRequestId).state);
  }, []);

  const handleCancelPaymentRequest = (paymentRequestId: string): { error?: string } => {
    const res = cancelPaymentRequestRecord(state, {
      paymentRequestId,
      actorBuyerId: buyerProfile.id,
    });
    if (res.error) return { error: res.error };
    setState(res.state);
    void cancelPaymentRequestApi(paymentRequestId, { orderOwnerId: buyerProfile.id });
    return {};
  };

  const handleAttemptPaymentRequestCheckout = (payload: {
    paymentRequestId: string;
    payerId?: string;
    payerName: string;
    payerEmail: string;
    payerPhone: string;
    isAuthenticatedCustomer: boolean;
    expectedAmount: number;
    outcome: 'success' | 'pending' | 'failed';
    paymentProviderRef?: string;
  }): {
    status: PaymentRequestStatus;
    error?: string;
    parentOrder?: ParentOrderRecord;
    childOrders?: Order[];
    paymentReference?: string;
  } => {
    const res = attemptPaymentRequestCheckout(state, payload);
    setState(res.state);
    return {
      status: res.status,
      error: res.error,
      parentOrder: res.parentOrder,
      childOrders: res.childOrders,
      paymentReference: res.parentOrder?.paymentProviderRef,
    };
  };

  const handleSubmitRecipientComplaint = (payload: {
    orderId: string;
    recipientToken?: string;
    category: RecipientComplaintCategory;
    description: string;
    attachmentNames?: string[];
  }): { error?: string; complaint?: RecipientComplaintRecord } => {
    const res = submitRecipientProblemReport(state, {
      orderId: payload.orderId,
      category: payload.category,
      description: payload.description,
    });
    if (res.error) return { error: res.error };
    setState(res.state);
    void submitGiftRecipientComplaintApi(payload.orderId, {
      rtok: payload.recipientToken,
      category: payload.category,
      description: payload.description,
      attachmentNames: payload.attachmentNames,
    });
    return { complaint: res.complaint };
  };

  const handleAdminUpdatePaymentRequestConfig = (payload: {
    validityHours: number;
    adminName: string;
  }) => {
    setState((prev) => adminUpdatePaymentRequestConfig(prev, payload));
    void adminUpdatePaymentRequestConfigApi({
      role: 'admin',
      validityHours: payload.validityHours,
      adminName: payload.adminName,
    });
  };

  // Unread messages badge count scoped to current user role
  const unreadMessagesCount = useMemo(() => {
    if (role === 'visitor') return 0;
    if (role === 'seller_approved') {
      return state.conversations
        .filter((c) => c.vendorId === primaryVendor.id)
        .reduce((sum, c) => sum + (c.unreadCountVendor || 0), 0);
    }
    if (role === 'admin') {
      return state.disputes.filter((d) => d.status !== 'Resolved' && d.status !== 'Closed').length;
    }
    return state.conversations
      .filter((c) => c.buyerId === buyerProfile.id)
      .reduce((sum, c) => sum + (c.unreadCountBuyer || 0), 0);
  }, [role, state.conversations, state.disputes, primaryVendor.id, buyerProfile.id]);

  // Role-scoped notifications
  const visibleNotifications = useMemo(() => {
    if (role === 'visitor') return [];
    const targetRole =
      role === 'admin' ? 'admin' : role === 'seller_approved' ? 'vendor' : 'buyer';
    return state.notifications.filter(
      (n) => !n.recipientRole || n.recipientRole === targetRole
    );
  }, [role, state.notifications]);

  const resolvedListings = useMemo(
    () => enrichListingsWithVendorState(state.listings, state.vendors),
    [state.listings, state.vendors]
  );

  const activeNationwideListings = useMemo(
    () => filterListings(resolvedListings, {}, state.platformConfig, state.vendors),
    [resolvedListings, state.platformConfig, state.vendors]
  );

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    NIGERIAN_COMMERCIAL_HUBS.forEach((h) => {
      counts[h.value] = 0;
    });
    activeNationwideListings.forEach((item) => {
      const st = getListingVendorState(item, state.vendors);
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [activeNationwideListings, state.vendors]);

  const currentListing =
    resolvedListings.find((l) => l.id === selectedListingId) || resolvedListings[0];
  const currentVendor =
    state.vendors.find((v) => v.id === selectedVendorId) || primaryVendor;
  const currentOrder = state.orders.find((o) => o.id === selectedOrderId);
  const savedDevices = resolvedListings.filter((l) => savedItemIds.includes(l.id));
  const isCategoryRoute = activeCategories.some((c) => c.id === activeView);
  const showCatalogFilterBar =
    activeView === 'explore' ||
    activeView === 'deals' ||
    isCategoryRoute;

  const showDemoControls = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const search = window.location.search || '';
    let hasSessionDemoFlag = false;
    try {
      if (/(?:\?|&)(?:demo|preview)=1(?:&|$)/.test(search)) {
        window.sessionStorage.setItem('usedright_demo_session', '1');
      }
      hasSessionDemoFlag = window.sessionStorage.getItem('usedright_demo_session') === '1';
    } catch {
      // ignore storage errors
    }
    return shouldShowDemoControls({
      role,
      isDev: Boolean(import.meta.env.DEV),
      search,
      hasSessionDemoFlag,
    });
  }, [role]);

  const matchingToolbarCount = useMemo(() => {
    if (!showCatalogFilterBar) return undefined;
    return applyCatalogToolbarFilters(
      resolvedListings,
      catalogFilters,
      state.platformConfig,
      {
        category: isCategoryRoute ? (activeView as Category) : 'all',
        dealsOnly: activeView === 'deals',
        searchQuery: activeView === 'explore' ? searchQuery : undefined,
      },
      state.vendors
    ).length;
  }, [
    showCatalogFilterBar,
    resolvedListings,
    catalogFilters,
    state.platformConfig,
    state.vendors,
    isCategoryRoute,
    activeView,
    searchQuery,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9FC] text-[#211B2B]">
      <Navbar
        currentRole={role}
        activeView={activeView}
        customerSubScreen={customerSubScreen}
        isCartOpen={isCartOpen}
        onNavigate={handleNavigate}
        activeCategories={activeCategories}
        cartCount={cartItems.length}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSearchOverlay={() => setIsSearchOverlayOpen(true)}
        onOpenProtectionModal={() => setProtectionModalOpen(true)}
        onOpenHowItWorksModal={() => setHowItWorksOpen(true)}
        onOpenInspectionEducationModal={() => setInspectionGuideOpen(true)}
        onOpenAuthModal={(mode = 'login', msg) => openAuthPrompt(mode, msg)}
        onSignOut={handleSignOut}
        notifications={visibleNotifications}
        onMarkNotificationRead={(id) =>
          setState((prev) => ({
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
          }))
        }
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
        unreadMessagesCount={unreadMessagesCount}
        vendorTab={vendorTab}
        onSelectVendorTab={(tab) => {
          setVendorTab(tab);
          setActiveView('seller_dashboard');
        }}
      />

      {showCatalogFilterBar && (
        <CatalogFilterBar
          filters={catalogFilters}
          onChange={setCatalogFilters}
          totalCount={matchingToolbarCount}
          customerState={role === 'buyer' ? buyerProfile.state : undefined}
          locationCounts={locationCounts}
          totalActiveCount={activeNationwideListings.length}
        />
      )}

      <main className="flex-1 min-w-0">
        {activeView === 'home' && (
          <BuyerHome
            listings={resolvedListings}
            vendors={state.vendors}
            platformConfig={state.platformConfig}
            customerState={role === 'buyer' ? buyerProfile.state : undefined}
            catalogFilters={catalogFilters}
            onCatalogFiltersChange={setCatalogFilters}
            onSelectCategory={(cat) => {
              setCatalogFilters((prev) => ({ ...prev, brand: 'all' }));
              if (cat === 'all') handleNavigate('explore');
              else handleNavigate(cat);
            }}
            onSelectBrandCategory={(cat, brandFilter) => {
              setCatalogFilters({
                ...DEFAULT_CATALOG_TOOLBAR_FILTERS,
                brand: brandFilter,
              });
              handleNavigate(cat, { preserveBrandFilter: true });
            }}
            onSelectDeals={() => handleNavigate('deals')}
            onViewDetails={handleViewDetails}
            onAddToCart={handleAddToCart}
            onOpenHowItWorks={() => setHowItWorksOpen(true)}
            onOpenBuyerProtection={() => setProtectionModalOpen(true)}
            onOpenInspectionEducationModal={() => setInspectionGuideOpen(true)}
            savedItemIds={savedItemIds}
            onToggleSave={handleToggleSave}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNavigateToExplore={(cat) => handleNavigate(cat || 'explore')}
          />
        )}

        {(activeView === 'explore' || activeView === 'deals' || isCategoryRoute) && (
          <ExploreView
            listings={resolvedListings}
            vendors={state.vendors}
            platformConfig={state.platformConfig}
            customerState={role === 'buyer' ? buyerProfile.state : undefined}
            initialCategory={isCategoryRoute ? (activeView as Category) : 'all'}
            dealsOnly={activeView === 'deals'}
            initialSearchQuery={searchQuery}
            catalogFilters={catalogFilters}
            onCatalogFiltersChange={setCatalogFilters}
            onSelectDealsRoute={() => handleNavigate('deals')}
            onSelectCategoryRoute={(cat) =>
              handleNavigate(cat === 'all' ? 'explore' : cat)
            }
            onViewDetails={handleViewDetails}
            onAddToCart={handleAddToCart}
            savedItemIds={savedItemIds}
            onToggleSave={handleToggleSave}
            onBack={handleUniversalBack}
          />
        )}

        {activeView === 'product_details' && currentListing && (
          <ProductDetailsView
            listing={currentListing}
            allListings={resolvedListings}
            inspectionHours={state.platformConfig.inspectionHours}
            onBack={() => {
              setEditingCartItem(null);
              handleBackFromProductDetails();
            }}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onMessageSeller={handleMessageSeller}
            onViewVendorStorefront={handleViewVendorStorefront}
            editingCartItem={
              editingCartItem && editingCartItem.listing.id === currentListing.id
                ? editingCartItem
                : null
            }
            onSaveEditedCartItem={handleSaveEditedCartItem}
            onOpenHowItWorks={() => setHowItWorksOpen(true)}
            onOpenBuyerProtection={() => setProtectionModalOpen(true)}
            onOpenInspectionEducationModal={() => setInspectionGuideOpen(true)}
          />
        )}

        {activeView === 'vendors' && (
          <VendorsDirectoryView
            vendors={state.vendors}
            onSelectVendor={handleViewVendorStorefront}
            onBackToMarketplace={handleUniversalBack}
            followedVendorIds={state.followedVendorIds || []}
            onToggleFollowVendor={handleToggleFollowVendor}
          />
        )}

        {activeView === 'vendor_storefront' && currentVendor && (
          <PublicVendorStorefront
            vendor={currentVendor}
            listings={resolvedListings}
            platformConfig={state.platformConfig}
            onBack={handleUniversalBack}
            onViewDetails={handleViewDetails}
            onAddToCart={handleAddToCart}
            savedItemIds={savedItemIds}
            onToggleSave={handleToggleSave}
            onMessageVendor={handleMessageSeller}
            isFollowing={(state.followedVendorIds || []).includes(currentVendor.id)}
            onToggleFollow={handleToggleFollowVendor}
          />
        )}

        {activeView === 'messages' && role !== 'visitor' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 space-y-4">
            <button
              type="button"
              onClick={handleUniversalBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#211B2B] hover:text-[#A981FF]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <UnifiedTransactionChat
              viewerRole={
                role === 'admin' ? 'admin' : role === 'seller_approved' ? 'vendor' : 'buyer'
              }
              viewerId={
                role === 'seller_approved'
                  ? primaryVendor.id
                  : role === 'admin'
                  ? 'admin-1'
                  : buyerProfile.id
              }
              conversations={
                role === 'admin'
                  ? state.conversations
                  : role === 'seller_approved'
                  ? state.conversations.filter((c) => c.vendorId === primaryVendor.id)
                  : state.conversations.filter((c) => c.buyerId === buyerProfile.id)
              }
              orders={state.orders}
              paymentHolds={state.paymentHolds}
              disputes={state.disputes}
              warrantyClaims={state.warrantyClaims || []}
              restrictedUserIds={state.restrictedMessagingUserIds || []}
              initialConversationId={selectedConversationId}
              initialOpenDisputeForm={openDisputeInChatFlag}
              onSendMessage={handleSendMessage}
              onFlagOffPlatform={handleFlagOffPlatform}
              onReportAttachment={handleReportAttachment}
              onBuyProduct={(listingId) => {
                const target = state.listings.find((l) => l.id === listingId);
                if (target) handleBuyNow(target);
              }}
              onViewProduct={(listingId) => {
                const target = state.listings.find((l) => l.id === listingId);
                if (target) handleViewDetails(target);
              }}
              onViewOrder={handleOpenOrderDetail}
              onViewVendorStorefront={handleViewVendorStorefront}
              onConfirmReceipt={handleConfirmReceipt}
              onAcceptOrder={handleAcceptOrder}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onOpenDispute={handleOpenDispute}
              onAdminUpdateDispute={handleAdminUpdateDispute}
              onAdminResolveDispute={handleAdminResolveDispute}
              onSubmitReport={handleSubmitReport}
            />
          </div>
        )}

        {activeView === 'profile' && role === 'buyer' && (
          <CustomerProfileView
            orders={state.orders.filter((o) => o.buyerId === buyerProfile.id)}
            paymentRequests={(state.paymentRequests || []).filter(
              (r) => r.orderOwnerId === buyerProfile.id
            )}
            warrantyClaims={(state.warrantyClaims || []).filter(
              (c) => c.buyerId === buyerProfile.id
            )}
            followedVendorIds={state.followedVendorIds || []}
            paymentHolds={state.paymentHolds.filter((h) => h.buyerId === buyerProfile.id)}
            conversations={state.conversations.filter((c) => c.buyerId === buyerProfile.id)}
            disputes={state.disputes.filter((d) => d.buyerId === buyerProfile.id)}
            savedDevices={savedDevices}
            savedAddresses={savedAddresses}
            onAddSavedAddress={handleSaveAddress}
            listings={resolvedListings}
            auditLog={state.auditLog}
            buyerId={buyerProfile.id}
            buyerName={buyerProfile.name}
            buyerEmail={buyerProfile.email}
            buyerPhone={buyerProfile.phone}
            buyerState={buyerProfile.state}
            onUpdateBuyerProfile={({ name, phone, state: nextState }) => {
              const normalized = normalizeNigerianState(nextState);
              setBuyerProfile((prev) => ({
                ...prev,
                name,
                phone,
                state: normalized,
              }));
              setCheckoutDraft((prev) => ({ ...prev, stateName: normalized }));
            }}
            inspectionHours={state.platformConfig.inspectionHours}
            initialSubScreen={customerSubScreen}
            initialConversationId={selectedConversationId}
            initialOpenDisputeForm={openDisputeInChatFlag}
            onNavigate={handleNavigate}
            onOpenOrderDetail={handleOpenOrderDetail}
            onCancelPaymentRequest={handleCancelPaymentRequest}
            onOpenPaymentRequestPreview={handleOpenPaymentRequestPreview}
            onOpenGiftRecipientPortal={handleOpenGiftRecipientPortal}
            onSendMessage={handleSendMessage}
            onOpenDispute={handleOpenDispute}
            onConfirmReceipt={handleConfirmReceipt}
            onAcceptOrder={handleAcceptOrder}
            onViewProductDetails={handleViewDetails}
            onViewVendorStorefront={handleViewVendorStorefront}
            onSubmitReport={handleSubmitReport}
            onOpenProtectionModal={() => setProtectionModalOpen(true)}
            onOpenHowItWorksModal={() => setHowItWorksOpen(true)}
            onOpenInspectionEducationModal={() => setInspectionGuideOpen(true)}
            onOpenPolicyCentre={(slug) => setPolicyModalSlug(slug || 'about-usedright')}
            onSignOut={handleSignOut}
            onBack={handleUniversalBack}
          />
        )}

        {activeView === 'order_details' && currentOrder && (
          <OrderDetailView
            order={currentOrder}
            siblingSubOrders={
              currentOrder.parentOrderId
                ? state.orders.filter((o) => o.parentOrderId === currentOrder.parentOrderId)
                : []
            }
            paymentHold={state.paymentHolds.find((h) => h.orderId === currentOrder.id)}
            dispute={state.disputes.find((d) => d.orderId === currentOrder.id)}
            warrantyClaims={state.warrantyClaims || []}
            recipientComplaints={state.recipientComplaints || []}
            viewerRole={
              role === 'admin' ? 'admin' : role === 'seller_approved' ? 'vendor' : 'buyer'
            }
            onBack={() => {
              if (viewHistory.length > 0) {
                handleUniversalBack();
              } else if (role === 'admin') {
                setActiveView('admin_dashboard');
              } else if (role === 'seller_approved') {
                setVendorTab('orders');
                setActiveView('seller_dashboard');
              } else {
                setCustomerSubScreen('orders');
                setActiveView('profile');
              }
            }}
            onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
            onOpenChat={(orderId) => {
              const conv = state.conversations.find((c) => c.orderId === orderId);
              handleNavigate('messages', { conversationId: conv?.id, openDisputeForm: false });
            }}
            onUpdateStatus={handleUpdateOrderStatus}
            onConfirmReceipt={handleConfirmReceipt}
            onAcceptOrder={handleAcceptOrder}
            onOpenDisputeInChat={(orderId) => {
              const conv = state.conversations.find((c) => c.orderId === orderId);
              handleNavigate('messages', { conversationId: conv?.id, openDisputeForm: true });
            }}
            onResendDeliveryPin={handleResendDeliveryPin}
            onSetAlternativeRecipient={handleSetAlternativeRecipient}
            onSubmitWarrantyClaim={handleSubmitWarrantyClaim}
            onReportDeliveryProblem={handleReportDeliveryProblem}
            onViewVendorStorefront={handleViewVendorStorefront}
            onViewProduct={(listingId) => {
              const target = state.listings.find((l) => l.id === listingId);
              if (target) handleViewDetails(target);
            }}
            onOpenGiftRecipientPortal={handleOpenGiftRecipientPortal}
          />
        )}

        {activeView === 'payment_request' && activePayRequestToken && (
          <PaymentRequestPage
            token={activePayRequestToken}
            state={state}
            viewerRole={role}
            viewerProfile={role === 'buyer' ? buyerProfile : undefined}
            onAttemptLocalCheckout={handleAttemptPaymentRequestCheckout}
            onRefreshState={handleRefreshPaymentRequest}
            onBackToMarketplace={() => {
              setActivePayRequestToken(null);
              if (typeof window !== 'undefined' && window.history?.replaceState) {
                try {
                  window.history.replaceState({}, '', window.location.pathname);
                } catch {
                  // ignore
                }
              }
              setActiveView('home');
            }}
          />
        )}

        {activeView === 'gift_recipient_portal' && activeGiftPortal && (
          <GiftRecipientPortalView
            orderId={activeGiftPortal.orderId}
            recipientToken={activeGiftPortal.rtok}
            state={state}
            onSubmitRecipientComplaint={handleSubmitRecipientComplaint}
            onBackToMarketplace={() => {
              setActiveGiftPortal(null);
              if (typeof window !== 'undefined' && window.history?.replaceState) {
                try {
                  window.history.replaceState({}, '', window.location.pathname);
                } catch {
                  // ignore
                }
              }
              setActiveView('home');
            }}
          />
        )}

        {activeView === 'seller_dashboard' && role === 'seller_approved' && (
          <SellerDashboard
            activeTab={vendorTab}
            onTabChange={setVendorTab}
            vendor={primaryVendor}
            listings={state.listings}
            orders={state.orders}
            paymentHolds={state.paymentHolds}
            conversations={state.conversations}
            disputes={state.disputes}
            platformConfig={state.platformConfig}
            feeConfig={state.feeConfig}
            policies={state.policies}
            evidenceBatches={state.evidenceBatches}
            auditLog={state.auditLog}
            onUpdateVendor={(updated: VendorStorefront) =>
              setState((prev) => {
                const prevVendor = prev.vendors.find((v) => v.id === updated.id);
                const bankUpdated =
                  updated.payoutBankAccount &&
                  (updated.payoutBankAccount.accountNumber !==
                    prevVendor?.payoutBankAccount?.accountNumber ||
                    updated.payoutBankAccount.bankName !==
                      prevVendor?.payoutBankAccount?.bankName);
                const normalizedState = updated.state
                  ? normalizeNigerianState(updated.state)
                  : prevVendor?.state || inferStateFromLocationText(updated.location);
                const nextVendor: VendorStorefront = {
                  ...updated,
                  state: normalizedState,
                };
                return {
                  ...prev,
                  vendors: prev.vendors.map((v) => (v.id === updated.id ? nextVendor : v)),
                  listings: prev.listings.map((l) =>
                    l.sellerId === updated.id ? { ...l, sellerState: normalizedState } : l
                  ),
                  auditLog: bankUpdated
                    ? [
                        {
                          id: `aud-${Date.now()}`,
                          timestamp: new Date().toISOString(),
                          actorRole: 'seller_approved',
                          actorName: updated.name,
                          actionType: 'admin_config_changed',
                          entityRef: updated.vendorNumber || updated.id,
                          details: `Updated payout bank account (${updated.payoutBankAccount?.bankName} · ${updated.payoutBankAccount?.accountNumber}).`,
                        },
                        ...prev.auditLog,
                      ]
                    : prev.auditLog,
                };
              })
            }
            onAddListing={(newListing: DeviceListing) =>
              setState((prev) => ({
                ...prev,
                listings: [newListing, ...prev.listings],
                auditLog: [
                  {
                    id: `aud-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    actorRole: 'seller_approved',
                    actorName: primaryVendor.name,
                    actionType: 'listing_updated',
                    entityRef: newListing.batchReference || newListing.id,
                    details: `Published listing "${newListing.title}" at ₦${newListing.price.toLocaleString('en-NG')}.`,
                  },
                  ...prev.auditLog,
                ],
              }))
            }
            onAddMultipleListings={(newListings: DeviceListing[]) =>
              setState((prev) => ({
                ...prev,
                listings: [...newListings, ...prev.listings],
                auditLog: [
                  {
                    id: `aud-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    actorRole: 'seller_approved',
                    actorName: primaryVendor.name,
                    actionType: 'listing_updated',
                    entityRef: newListings[0]?.batchReference || primaryVendor.id,
                    details: `Bulk uploaded ${newListings.length} accessory/gadget item(s): ${newListings
                      .map((l) => l.title)
                      .slice(0, 3)
                      .join(', ')}${newListings.length > 3 ? '…' : ''}.`,
                  },
                  ...prev.auditLog,
                ],
              }))
            }
            onUpdateListing={(id, updates, reason) =>
              setState((prev) => updateListingSafely(prev, id, updates, reason))
            }
            onAddEvidenceBatch={(batch: ForeignUseEvidenceBatch) =>
              setState((prev) => ({
                ...prev,
                evidenceBatches: [batch, ...prev.evidenceBatches],
              }))
            }
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onArrangeDispatch={handleArrangeDispatch}
            onVerifyDeliveryCode={handleVerifyDeliveryCode}
            onMarkDeliveryFailed={handleMarkDeliveryFailed}
            warrantyClaims={state.warrantyClaims || []}
            restrictedUserIds={state.restrictedMessagingUserIds || []}
            onRespondWarrantyClaim={handleRespondWarrantyClaim}
            onFlagOffPlatform={handleFlagOffPlatform}
            onAcceptVendorAgreement={handleAcceptVendorAgreement}
            onOpenPolicyCentre={(slug) => setPolicyModalSlug(slug || 'vendor-agreement')}
            onOpenOrderDetail={handleOpenOrderDetail}
            onViewListingDetails={handleViewDetails}
            onSendMessage={handleSendMessage}
            onViewPublicStorefront={handleViewVendorStorefront}
            onReorderListings={(nextListings: DeviceListing[]) =>
              setState((prev) => ({ ...prev, listings: nextListings }))
            }
            onSubmitReport={handleSubmitReport}
            onSignOut={handleSignOut}
          />
        )}

        {activeView === 'seller_dashboard' && role === 'seller_pending' && (
          <PendingSellerView
            verificationState={state.pendingSellerState}
            onSimulateApproval={() => {
              setRole('seller_approved');
              setVendorTab('overview');
              setActiveView('seller_dashboard');
            }}
            onOpenHowItWorks={() => setHowItWorksOpen(true)}
            onUpdateSocialVerification={handleUpdatePendingSocialVerification}
          />
        )}

        {activeView === 'admin_dashboard' && role === 'admin' && (
          <AdminDashboard
            state={state}
            onSendMessage={handleSendMessage}
            onAdminUpdateDispute={handleAdminUpdateDispute}
            onAdminResolveDispute={handleAdminResolveDispute}
            onConfigureAdmin={handleConfigureAdmin}
            onAdminUpdateFees={handleAdminUpdateFees}
            onAdminUpdateDeliveryConfig={handleAdminUpdateDeliveryConfig}
            onAdminSavePolicy={handleAdminSavePolicy}
            onAdminOverrideDelivery={handleAdminOverrideDelivery}
            onAdminVerifyVendor={handleAdminVerifyVendor}
            onAdminModerateFlag={handleAdminModerateFlag}
            onAdminUpdateWarrantyConfig={handleAdminUpdateWarrantyConfig}
            onAdminUpdateWarrantyClaim={handleAdminUpdateWarrantyClaim}
            onAdminUpdatePaymentRequestConfig={handleAdminUpdatePaymentRequestConfig}
            onOpenPolicyCentre={(slug) => setPolicyModalSlug(slug || 'about-usedright')}
            onViewOrder={handleOpenOrderDetail}
            onExitAdmin={handleSignOut}
          />
        )}
      </main>

      <Footer
        onNavigate={handleNavigate}
        onOpenHowItWorks={() => setHowItWorksOpen(true)}
        onOpenBuyerProtection={() => setProtectionModalOpen(true)}
        onOpenInspectionEducationModal={() => setInspectionGuideOpen(true)}
        onOpenPolicyCentre={(slug) => setPolicyModalSlug(slug || 'about-usedright')}
        hideTopTrustBanner={activeView === 'home'}
      />

      {/* Cart & Checkout */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        listings={resolvedListings}
        vendors={state.vendors}
        feeConfig={state.feeConfig}
        deliveryConfig={state.deliveryConfig}
        viewerProfile={role === 'buyer' ? buyerProfile : undefined}
        paymentRequestValidityHours={state.platformConfig.paymentRequestValidityHours ?? 24}
        undoRemovedItem={undoRemovedItem}
        onUndoRemove={handleUndoRemoveCartItem}
        onRemoveItem={handleRemoveCartItem}
        onUpdateQuantity={handleUpdateCartQuantity}
        onEditItem={handleEditCartItem}
        onContinueShopping={() => {
          setIsCartOpen(false);
          handleNavigate('explore');
        }}
        onOpenFeeInfo={() => setProtectionModalOpen(true)}
        onProceedToCheckout={handleProceedCartCheckout}
        onCreatePaymentRequest={handleCreatePaymentRequest}
        onOpenPaymentRequestPreview={handleOpenPaymentRequestPreview}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onBackToShopping={() => {
          setIsCheckoutOpen(false);
          handleNavigate('explore');
        }}
        viewerRole={role}
        draft={checkoutDraft}
        onDraftChange={setCheckoutDraft}
        onQuickOtpComplete={({ name, phone }) => {
          setRole('buyer');
          setBuyerProfile((prev) => ({
            ...prev,
            name: name || prev.name,
            phone: phone || prev.phone,
          }));
        }}
        cartItems={cartItems}
        directListing={directCheckout.listing}
        directAccessories={directCheckout.accessories}
        directVariation={directCheckout.variation}
        listings={resolvedListings}
        vendors={state.vendors}
        feeConfig={state.feeConfig}
        deliveryConfig={state.deliveryConfig}
        savedAddresses={savedAddresses}
        onSaveAddress={handleSaveAddress}
        inspectionHours={state.platformConfig.inspectionHours}
        buyerInfo={buyerProfile}
        onMultiVendorOrderCompleted={handleMultiVendorOrderCompleted}
        onOpenOrderChat={(convId) => {
          setIsCheckoutOpen(false);
          setSelectedConversationId(convId);
          setOpenDisputeInChatFlag(false);
          commitViewTransition('messages');
        }}
        onViewOrderDetail={(orderId) => {
          setIsCheckoutOpen(false);
          handleOpenOrderDetail(orderId);
        }}
        onOpenGiftRecipientPortal={handleOpenGiftRecipientPortal}
        onOpenFeeInfo={() => setProtectionModalOpen(true)}
      />

      {/* Live Search Overlay */}
      <LiveSearchOverlay
        isOpen={isSearchOverlayOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={() => setIsSearchOverlayOpen(false)}
        listings={resolvedListings}
        vendors={state.vendors}
        platformConfig={state.platformConfig}
        onViewDetails={handleViewDetails}
        onSelectVendor={handleViewVendorStorefront}
        onAddToCart={handleAddToCart}
        savedItemIds={savedItemIds}
        onToggleSave={handleToggleSave}
        followedVendorIds={state.followedVendorIds || []}
        onToggleFollowVendor={handleToggleFollowVendor}
      />

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingAuthAction(null);
          setAuthContextMessage(undefined);
        }}
        onLoginSuccess={handleLoginSuccess}
        onVendorAgreementAccepted={({
          vendorName,
          agreementVersion,
          declarationsAccepted,
          finalConsentAccepted,
          state: vendorState,
          socialLinks,
          alternativeManualVerification,
          alternativeManualReason,
        }) => {
          const termsPolicy = (state.policies || []).find((p) => p.slug === 'vendor-agreement');
          const vendorRegId = `vendor-reg-${Date.now()}`;
          setState((prev) => {
            const withPending = {
              ...prev,
              pendingSellerState: {
                ...prev.pendingSellerState,
                businessName: vendorName || prev.pendingSellerState.businessName,
                state: vendorState || prev.pendingSellerState.state,
                socialLinks:
                  socialLinks && socialLinks.length > 0
                    ? socialLinks
                    : prev.pendingSellerState.socialLinks,
                socialVerificationStatus: 'Under Review' as const,
                alternativeManualVerification: Boolean(alternativeManualVerification),
                alternativeManualReason,
              },
            };
            return recordVendorAgreementAcceptance(withPending, {
              vendorId: vendorRegId,
              vendorName,
              agreementVersion,
              policyVersion: termsPolicy?.currentVersion || '1.0',
              declarationsAccepted,
              finalConsentAccepted,
            });
          });
          void recordVendorAgreementAcceptApi({
            vendorId: vendorRegId,
            vendorName,
            agreementVersion,
            policyVersion: termsPolicy?.currentVersion || '1.0',
            declarationsAccepted,
            finalConsentAccepted,
          });
        }}
        onOpenPolicyCentre={(slug) => setPolicyModalSlug(slug || 'vendor-agreement')}
        initialMode={authModalMode}
        contextMessage={authContextMessage}
        onResetDemoData={handleResetDemoData}
      />

      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
        inspectionHours={state.platformConfig.inspectionHours}
      />

      <BuyerProtectionModal
        isOpen={protectionModalOpen}
        onClose={() => setProtectionModalOpen(false)}
        inspectionHours={state.platformConfig.inspectionHours}
        customerFeeRate={state.feeConfig?.customerFeeRate ?? BUYER_FEE_RATE}
        onOpenPolicyCentre={(slug) => {
          setProtectionModalOpen(false);
          setPolicyModalSlug(slug || 'customer-platform-service-fee-policy');
        }}
      />

      <InspectionEducationModal
        isOpen={inspectionGuideOpen}
        onClose={() => setInspectionGuideOpen(false)}
        inspectionHours={state.platformConfig.inspectionHours}
      />

      <PolicyCentreModal
        isOpen={policyModalSlug !== null}
        onClose={() => setPolicyModalSlug(null)}
        policies={state.policies || []}
        initialSlug={policyModalSlug || undefined}
      />

      {/* Floating Demo Controls (hidden from ordinary production customers) */}
      {showDemoControls && (
      <DemoControlsBar
        currentRole={role}
        activeView={activeView}
        onSelectRole={(nextRole) => handleLoginSuccess(nextRole)}
        orders={state.orders}
        onSimulatePayment={(orderId) => setState((prev) => simulatePayment(prev, orderId))}
        onSimulateDispatch={(orderId) => setState((prev) => simulateDispatch(prev, orderId))}
        onSimulateDelivery={(orderId) =>
          setState((prev) => confirmPhysicalDeliveryOrReceipt(prev, orderId, 'courier'))
        }
        onConfirmReceipt={handleConfirmReceipt}
        onAdvanceInspectionTimer={(orderId, secs) =>
          setState((prev) => advanceInspectionTimer(prev, orderId, secs))
        }
        onOpenDisputeDemo={(orderId) => {
          const conv = state.conversations.find((c) => c.orderId === orderId);
          setState((prev) =>
            openDisputeInChat(prev, {
              orderId,
              conversationId: conv?.id || '',
              reason: 'Device not working as advertised',
              description: 'Demo problem report opened for inspection review.',
              requestedResolution: 'Full Refund to Customer',
            }).state
          );
        }}
        onSimulateAdminResponse={(orderId) => {
          const dsp = state.disputes.find((d) => d.orderId === orderId);
          if (!dsp) return;
          setState((prev) =>
            adminJoinDisputeAndUpdate(prev, {
              disputeId: dsp.id,
              adminName: DEMO_ADMIN_CREDENTIALS.name,
              newStatus: 'Under Review',
              publicMessage:
                'UsedRight Support has joined this chat and paused vendor settlement while reviewing your photos and device record.',
              internalNote: 'Admin triage initiated via Demo Controls.',
            })
          );
        }}
        onResolveDisputeDemo={(orderId, decision) => {
          const dsp = state.disputes.find((d) => d.orderId === orderId);
          if (!dsp) return;
          setState((prev) =>
            adminResolveDispute(prev, {
              disputeId: dsp.id,
              adminName: DEMO_ADMIN_CREDENTIALS.name,
              decision,
              outcomeSummary:
                decision === 'refund_buyer'
                  ? 'Full refund approved to customer.'
                  : 'Payout approved for release to vendor.',
            })
          );
        }}
        onCompleteSettlement={(orderId) =>
          setState((prev) =>
            completeOrderSettlement(prev, orderId, 'Demo settlement completed cleanly')
          )
        }
        onSimulateWarrantyClaimDemo={(orderId) =>
          setState((prev) =>
            submitWarrantyClaim(prev, {
              orderId,
              buyerId: buyerProfile.id,
              buyerName: buyerProfile.name,
              issueCategory: 'Display or touch malfunction',
              description:
                'Demo warranty claim: touch digitizer freezes intermittently along the right edge after 14 days of use.',
              attachmentNames: ['touch_test_video.mp4'],
            }).state
          )
        }
        onSimulateModerationFlagDemo={() =>
          setState((prev) =>
            flagOffPlatformAttempt(prev, {
              userId: buyerProfile.id,
              userName: buyerProfile.name,
              userRole: 'buyer',
              orderId: state.orders[0]?.id,
              orderNumber: state.orders[0]?.orderNumber,
              conversationId: state.conversations[0]?.id,
              contentType: 'chat_text',
              flaggedContent: 'Demo Flag: Pay directly to 0123456789 OPay account outside escrow.',
              triggers: ['Direct bank transfer request', 'Off-platform payment bypass'],
              riskLevel: 'HIGH',
            }).state
          )
        }
        onResetDemoData={handleResetDemoData}
      />
      )}
    </div>
  );
}
