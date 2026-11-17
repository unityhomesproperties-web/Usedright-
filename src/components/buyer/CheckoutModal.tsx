import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  ArrowLeft,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Truck,
  MapPin,
  AlertOctagon,
  MessageSquare,
  Smartphone,
  ShoppingBag,
  Info,
  Store,
  RefreshCw,
  CreditCard,
  Clock,
  ChevronRight,
  Gift,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import {
  AccessoryItem,
  CartItem,
  CustomerAddress,
  DeliveryConfig,
  DeliveryMethod,
  DemoRole,
  DeviceListing,
  GiftOrderDetails,
  GiftSenderVisibility,
  Order,
  ParentOrderRecord,
  PlatformFeeConfig,
  ProductVariation,
  ThirdPartyPayerDeclaration,
  VendorStorefront,
} from '../../types/marketplace';
import {
  calculateMultiVendorCheckoutQuote,
  DEMO_OTP_CODE,
  formatNaira,
  generateRandomUrlToken,
  isValidNigerianPhone,
  MAX_GIFT_MESSAGE_LENGTH,
  sanitizeGiftMessage,
  sha256Hex,
  validateGiftOrderDetails,
  verifySimulatedOtp,
} from '../../utils/marketplace';
import { toSimpleEnglish } from '../../utils/simpleEnglish';
import { NIGERIAN_COMMERCIAL_HUBS } from '../../utils/nigerianStates';
import { initializeCheckoutPayment, verifyCheckoutPayment } from '../../utils/apiClient';
import { SmartImage } from '../common/SmartImage';

export interface CheckoutDraftState {
  deliveryMethod: DeliveryMethod;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  stateName: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToShopping?: () => void;
  viewerRole?: DemoRole;
  draft?: CheckoutDraftState;
  onDraftChange?: (next: CheckoutDraftState) => void;
  onQuickOtpComplete?: (details: { name: string; phone: string }) => void;
  cartItems: CartItem[];
  directListing: DeviceListing | null;
  directAccessories: AccessoryItem[];
  directVariation: ProductVariation | null;
  listings?: DeviceListing[];
  vendors?: VendorStorefront[];
  feeConfig?: PlatformFeeConfig;
  deliveryConfig?: DeliveryConfig;
  savedAddresses?: CustomerAddress[];
  onSaveAddress?: (address: CustomerAddress) => void;
  inspectionHours?: number;
  buyerInfo: {
    id: string;
    name: string;
    email: string;
    phone: string;
    state?: string;
  };
  onMultiVendorOrderCompleted?: (payload: {
    parentOrder: ParentOrderRecord;
    childOrders: Order[];
    isDirectBuyNow: boolean;
  }) => { conversationIds: string[]; primaryOrderId: string };
  onOpenOrderChat: (conversationId: string) => void;
  onViewOrderDetail?: (orderId: string) => void;
  onOpenGiftRecipientPortal?: (orderId: string, recipientToken?: string) => void;
  onOpenFeeInfo?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onBackToShopping,
  viewerRole = 'buyer',
  draft,
  onDraftChange,
  onQuickOtpComplete,
  cartItems,
  directListing,
  directAccessories,
  directVariation,
  listings = [],
  vendors = [],
  feeConfig,
  deliveryConfig,
  savedAddresses = [],
  onSaveAddress,
  inspectionHours = 24,
  buyerInfo,
  onMultiVendorOrderCompleted,
  onOpenOrderChat,
  onViewOrderDetail,
  onOpenGiftRecipientPortal,
  onOpenFeeInfo,
}) => {
  const defaultSavedAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];

  const [localDeliveryMethod, setLocalDeliveryMethod] = useState<DeliveryMethod>('usedright_delivery');
  const [localFullName, setLocalFullName] = useState(defaultSavedAddr?.fullName || buyerInfo.name);
  const [localPhone, setLocalPhone] = useState(
    viewerRole === 'visitor' ? '' : defaultSavedAddr?.phone || buyerInfo.phone
  );
  const [localStreet, setLocalStreet] = useState(
    defaultSavedAddr?.street || '14 Admiralty Way, Lekki Phase 1'
  );
  const [localCity, setLocalCity] = useState(defaultSavedAddr?.city || 'Lagos Island');
  const [localStateName, setLocalStateName] = useState(
    defaultSavedAddr?.state || buyerInfo.state || 'Lagos State'
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>(defaultSavedAddr?.id || 'custom');
  const [landmark, setLandmark] = useState(defaultSavedAddr?.landmark || '');

  // Send as a Gift mode & privacy configuration
  const [isGiftOrder, setIsGiftOrder] = useState(false);
  const [giftDeliveryInstructions, setGiftDeliveryInstructions] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [giftOccasion, setGiftOccasion] = useState('Birthday');
  const [giftSenderVisibility, setGiftSenderVisibility] = useState<GiftSenderVisibility>('show_name');
  const [giftSenderDisplayName, setGiftSenderDisplayName] = useState(buyerInfo.name);
  const [giftError, setGiftError] = useState<string | null>(null);

  // Third-party payer declaration & payment account name matching guidance
  const [usingThirdPartyPayer, setUsingThirdPartyPayer] = useState(false);
  const [payerRelationship, setPayerRelationship] = useState<ThirdPartyPayerDeclaration['relationship']>('Parent');
  const [payerFullName, setPayerFullName] = useState('');
  const [payerNote, setPayerNote] = useState('');
  const [acknowledgedNameGuidance, setAcknowledgedNameGuidance] = useState(true);

  const deliveryMethod = draft?.deliveryMethod ?? localDeliveryMethod;
  const fullName = draft?.fullName ?? localFullName;
  const phone = draft?.phone ?? localPhone;
  const street = draft?.street ?? localStreet;
  const city = draft?.city ?? localCity;
  const stateName = draft?.stateName ?? localStateName;

  const updateField = (patch: Partial<CheckoutDraftState>) => {
    const next: CheckoutDraftState = {
      deliveryMethod,
      fullName,
      phone,
      street,
      city,
      stateName,
      ...patch,
    };
    if (onDraftChange) {
      onDraftChange(next);
    } else {
      if (patch.deliveryMethod !== undefined) setLocalDeliveryMethod(patch.deliveryMethod);
      if (patch.fullName !== undefined) setLocalFullName(patch.fullName);
      if (patch.phone !== undefined) setLocalPhone(patch.phone);
      if (patch.street !== undefined) setLocalStreet(patch.street);
      if (patch.city !== undefined) setLocalCity(patch.city);
      if (patch.stateName !== undefined) setLocalStateName(patch.stateName);
    }
  };

  useEffect(() => {
    if (isOpen && viewerRole !== 'visitor' && defaultSavedAddr && !draft?.street) {
      setSelectedAddressId(defaultSavedAddr.id);
      updateField({
        fullName: defaultSavedAddr.fullName,
        phone: defaultSavedAddr.phone,
        street: defaultSavedAddr.street,
        city: defaultSavedAddr.city,
        stateName: defaultSavedAddr.state,
      });
      setLandmark(defaultSavedAddr.landmark || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, viewerRole]);

  // Simulated 4-digit SMS OTP Popup State for visitors
  const [otpVerified, setOtpVerified] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Payment Simulator & Idempotency State
  const [demoOutcome, setDemoOutcome] = useState<'success' | 'pending' | 'failed'>('success');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    `idem-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [completedResult, setCompletedResult] = useState<{
    parentOrder: ParentOrderRecord;
    childOrders: Order[];
    conversationIds: string[];
    primaryOrderId: string;
  } | null>(null);

  const effectiveCartItems: CartItem[] = useMemo(() => {
    if (directListing) {
      return [
        {
          id: `buy-now-${directListing.id}`,
          listing: directListing,
          selectedVariation: directVariation || undefined,
          quantity: 1,
          selectedAccessories: directAccessories || [],
          includedFreeGift: directListing.freeGift,
        },
      ];
    }
    return cartItems;
  }, [directListing, directVariation, directAccessories, cartItems]);

  const quote = useMemo(
    () =>
      calculateMultiVendorCheckoutQuote({
        cartItems: effectiveCartItems,
        deliveryMethod,
        listings,
        vendors,
        feeConfig,
        deliveryConfig,
      }),
    [effectiveCartItems, deliveryMethod, listings, vendors, feeConfig, deliveryConfig]
  );

  if (!isOpen) return null;
  if (!completedResult && effectiveCartItems.length === 0) return null;

  const isGuestSession = viewerRole === 'visitor' && !otpVerified;
  const feePctText = `${(quote.customerFeeRate * 100).toFixed(1).replace(/\.0$/, '')}%`;

  const disclosedIssues = Array.from(
    new Set(
      effectiveCartItems.flatMap((it) => [
        ...(it.listing.disclosedFaults || []),
        ...(it.selectedVariation?.disclosedFaults || []),
      ])
    )
  );

  const handleSelectSavedAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    setAddressError(null);
    const addr = savedAddresses.find((a) => a.id === addrId);
    if (addr) {
      updateField({
        fullName: addr.fullName,
        phone: addr.phone,
        street: addr.street,
        city: addr.city,
        stateName: addr.state,
      });
      setLandmark(addr.landmark || '');
    }
  };

  const handleRequestOtp = () => {
    if (!isValidNigerianPhone(phone)) {
      setPhoneError('Enter a valid Nigerian phone number.');
      return;
    }
    setPhoneError(null);
    setOtpInput('');
    setOtpError(null);
    setShowOtpPopup(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifySimulatedOtp(otpInput)) {
      setOtpError(`Invalid code. Enter the demo SMS code ${DEMO_OTP_CODE}.`);
      return;
    }
    setOtpError(null);
    setOtpVerified(true);
    setShowOtpPopup(false);
    onQuickOtpComplete?.({
      name: fullName.trim() || 'Verified Customer',
      phone: phone.trim(),
    });
  };

  const finalizeVerifiedOrder = (parentOrder: ParentOrderRecord, childOrders: Order[]) => {
    const syncInfo = onMultiVendorOrderCompleted?.({
      parentOrder,
      childOrders,
      isDirectBuyNow: Boolean(directListing),
    });
    setCompletedResult({
      parentOrder,
      childOrders,
      conversationIds: syncInfo?.conversationIds || [],
      primaryOrderId: syncInfo?.primaryOrderId || childOrders[0]?.id || '',
    });
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setAddressError(null);

    if (!isValidNigerianPhone(phone)) {
      setPhoneError('Enter a valid Nigerian phone number.');
      return;
    }
    setPhoneError(null);

    if (usingThirdPartyPayer && payerFullName.trim().length < 3) {
      setPaymentError('Enter the full name on the bank account or card paying for this order.');
      return;
    }

    if (deliveryMethod === 'usedright_delivery') {
      if (!street.trim() || !city.trim() || !stateName.trim()) {
        setAddressError('Please complete your street address, city, and state for delivery.');
        return;
      }
      if (selectedAddressId === 'custom' && onSaveAddress && viewerRole !== 'visitor') {
        onSaveAddress({
          id: `addr-${Date.now()}`,
          label: `${city.trim()} Address`,
          fullName: fullName.trim() || buyerInfo.name,
          phone: phone.trim(),
          street: street.trim(),
          city: city.trim(),
          state: stateName.trim(),
          landmark: landmark.trim() || undefined,
          isDefault: savedAddresses.length === 0,
        });
      }
    }

    if (isGuestSession) {
      handleRequestOtp();
      return;
    }

    if (quote.unavailableItemIds.length > 0) {
      setPaymentError('One or more items in your cart are no longer available. Please review your cart before paying.');
      return;
    }

    setIsSubmitting(true);
    try {
      const addressPayload =
        deliveryMethod === 'physical_pickup'
          ? {
              fullName: fullName.trim() || buyerInfo.name,
              phone: phone.trim() || buyerInfo.phone,
              street: quote.vendorGroups[0]?.pickupLocation || 'Verified Vendor Pickup Desk',
              city: 'In-Store Pickup',
              state: quote.vendorGroups[0]?.vendorState || stateName || 'Lagos State',
            }
          : {
              fullName: fullName.trim() || buyerInfo.name,
              phone: phone.trim() || buyerInfo.phone,
              street: street.trim(),
              city: city.trim(),
              state: stateName.trim(),
              landmark: landmark.trim() || undefined,
            };

      const thirdPartyPayload: ThirdPartyPayerDeclaration = usingThirdPartyPayer
        ? {
            relationship: payerRelationship,
            payerFullName: payerFullName.trim(),
            note: payerNote.trim() || undefined,
            acknowledgedNameGuidance,
            requiresVerificationFlag: payerRelationship === 'Approved Third-Party Payer',
          }
        : {
            relationship: 'Self',
            payerFullName: fullName.trim() || buyerInfo.name,
            acknowledgedNameGuidance,
            requiresVerificationFlag: false,
          };

      let giftPayload: GiftOrderDetails | undefined;
      if (isGiftOrder) {
        const rawPortalToken = generateRandomUrlToken(10);
        const sanitizedMsg = sanitizeGiftMessage(giftMessage);
        giftPayload = {
          isGift: true,
          recipientName: fullName.trim(),
          recipientPhone: phone.trim(),
          recipientAddress: addressPayload,
          deliveryInstructions:
            giftDeliveryInstructions.trim() ||
            'Call recipient on arrival and confirm Delivery Verification PIN at handover.',
          giftMessage: sanitizedMsg || undefined,
          senderDisplayName:
            giftSenderVisibility === 'show_name'
              ? giftSenderDisplayName.trim() || buyerInfo.name
              : undefined,
          occasion: giftOccasion.trim() || undefined,
          senderVisibility: giftSenderVisibility,
          hidePriceFromPackage: true,
          specialPackagingGuaranteed: false,
          recipientPortalToken: rawPortalToken,
          recipientAccessTokenHash: sha256Hex(rawPortalToken),
        };
        const giftValidation = validateGiftOrderDetails(giftPayload, deliveryMethod);
        if (!giftValidation.valid) {
          setGiftError(giftValidation.errors.join(' '));
          setIsSubmitting(false);
          return;
        }
        setGiftError(null);
      }

      const initRes = await initializeCheckoutPayment({
        cartItems: effectiveCartItems,
        deliveryMethod,
        buyerId: buyerInfo.id,
        orderOwnerId: buyerInfo.id,
        buyerName: buyerInfo.name,
        buyerEmail: buyerInfo.email,
        buyerPhone: buyerInfo.phone || phone.trim(),
        thirdPartyPayer: thirdPartyPayload,
        isGift: isGiftOrder,
        giftDetails: giftPayload,
        deliveryAddress: addressPayload,
        idempotencyKey,
        demoOutcome,
        acceptedPriceChanges: true,
      });

      if (!initRes.ok || !initRes.data) {
        setPaymentError(
          initRes.error || 'Payment initialization failed. No order was created and you were not charged.'
        );
        return;
      }

      if (initRes.data.status === 'failed') {
        setPaymentError(
          initRes.data.message ||
            'Simulated Paystack payment declined. Your cart is preserved — switch outcome or retry safely.'
        );
        setIdempotencyKey(`idem-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
        return;
      }

      if (initRes.data.status === 'pending') {
        setPendingRef(initRes.data.reference);
        return;
      }

      const verifyRes = await verifyCheckoutPayment({ reference: initRes.data.reference });
      if (!verifyRes.ok || !verifyRes.data?.verified || !verifyRes.data.parentOrder || !verifyRes.data.childOrders) {
        setPaymentError(
          verifyRes.error || verifyRes.data?.error || 'Could not verify payment. Please retry.'
        );
        return;
      }

      finalizeVerifiedOrder(verifyRes.data.parentOrder, verifyRes.data.childOrders);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverifyPending = async () => {
    if (!pendingRef) return;
    setIsSubmitting(true);
    setPaymentError(null);
    try {
      const verifyRes = await verifyCheckoutPayment({
        reference: pendingRef,
        forceCompletePending: true,
      });
      if (verifyRes.ok && verifyRes.data?.verified && verifyRes.data.parentOrder && verifyRes.data.childOrders) {
        setPendingRef(null);
        finalizeVerifiedOrder(verifyRes.data.parentOrder, verifyRes.data.childOrders);
      } else {
        setPaymentError(verifyRes.data?.message || verifyRes.error || 'Payment is still awaiting confirmation.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseReset = () => {
    setCompletedResult(null);
    setShowOtpPopup(false);
    setOtpVerified(false);
    setPendingRef(null);
    setPaymentError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Protected UsedRight checkout"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-[#EAE6F0] shadow-2xl p-4 sm:p-6 space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-[#EAE6F0] pb-3">
          <div className="flex items-center gap-2.5">
            {!completedResult && (
              <button
                type="button"
                onClick={onBackToShopping || handleCloseReset}
                aria-label="Back to shopping"
                className="w-8 h-8 rounded-full border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] flex items-center justify-center text-[#211B2B] shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">
                {completedResult ? 'Order Confirmed & Payment Verified' : 'UsedRight Checkout (Demo Mode)'}
              </h2>
              <p className="text-xs text-[#716B7B]">
                Demo Mode payment simulation · Authoritative server quote &amp; Delivery Verification Code protection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseReset}
            aria-label="Close checkout"
            className="p-2 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedResult ? (
          <div className="space-y-4 py-1">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#F5F0FF] border border-[#D0BCFC] text-[#A981FF] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[#211B2B]">
                Payment Confirmed · {completedResult.parentOrder.paymentStatus}
              </h3>
              <p className="text-xs text-[#4A4356]">
                Parent Order{' '}
                <strong className="font-mono text-[#211B2B]">
                  {completedResult.parentOrder.parentOrderNumber}
                </strong>{' '}
                · Transaction{' '}
                <strong className="font-mono text-[#211B2B]">
                  {completedResult.parentOrder.transactionNumber}
                </strong>
              </p>
            </div>

            {/* Child Vendor Sub-Orders Summary */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[#211B2B]">
                Vendor Fulfilment Groups ({completedResult.childOrders.length})
              </div>
              {completedResult.childOrders.map((child) => (
                <div
                  key={child.id}
                  className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-mono font-semibold text-[#211B2B]">
                      {child.subOrderNumber || child.orderNumber}
                    </div>
                    <div className="text-[#4A4356] truncate">
                      {child.vendorName || child.listing.sellerName} · {child.listing.title}
                      {child.items && child.items.length > 1 ? ` (+${child.items.length - 1} more)` : ''}
                    </div>
                    <div className="text-[11px] text-[#716B7B]">
                      Delivery Fee: {formatNaira(child.deliveryFee)} · Dispatch by vendor
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-[#211B2B] tabular-nums">
                      {formatNaira(child.totalAmount)}
                    </div>
                    {onViewOrderDetail && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCloseReset();
                          onViewOrderDetail(child.id);
                        }}
                        className="text-[11px] font-medium text-[#A981FF] hover:underline"
                      >
                        Track Sub-Order →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Exact Matching Payment Breakdown */}
            <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#716B7B]">Product Subtotal</span>
                <span className="tabular-nums">{formatNaira(completedResult.parentOrder.subtotalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#716B7B]">Customer Platform Service Fee</span>
                <span className="tabular-nums">
                  {formatNaira(completedResult.parentOrder.customer_platform_service_fee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#716B7B]">Fixed Delivery Total</span>
                <span className="tabular-nums">{formatNaira(completedResult.parentOrder.deliveryFeeTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[#211B2B] pt-1.5 border-t border-[#EAE6F0]">
                <span>Total Paid (Demo Verified)</span>
                <span data-testid="confirmation-total-paid" className="tabular-nums">
                  {formatNaira(completedResult.parentOrder.totalPaid)}
                </span>
              </div>
            </div>

            {completedResult.childOrders[0]?.isGift ? (
              <div className="p-3.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F] space-y-2">
                <div className="font-semibold flex items-center gap-1.5 text-[#211B2B]">
                  <Gift className="w-4 h-4 text-[#A981FF]" />
                  Gift Order Confirmed · Privacy &amp; PIN Routed to Recipient
                </div>
                <p>
                  Recipient:{' '}
                  <strong>{completedResult.childOrders[0]?.giftDetails?.recipientName}</strong> ·{' '}
                  Visibility:{' '}
                  <strong>
                    {completedResult.childOrders[0]?.giftDetails?.senderVisibility === 'anonymous'
                      ? 'Anonymous (sender hidden)'
                      : `Visible (${
                          completedResult.childOrders[0]?.giftDetails?.senderDisplayName ||
                          buyerInfo.name
                        })`}
                  </strong>
                  . All prices &amp; payment receipts are omitted from the package and recipient
                  portal.
                </p>
                {onOpenGiftRecipientPortal && completedResult.childOrders[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      const ord = completedResult.childOrders[0];
                      handleCloseReset();
                      onOpenGiftRecipientPortal(ord.id, ord.giftDetails?.recipientPortalToken);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A981FF] text-white font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview Gift Recipient Portal (Demo)
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F]">
                Once each vendor arranges dispatch or marks your order ready for pickup, you will receive a confidential{' '}
                <strong>Delivery Verification Code</strong> inside Order Details &amp; your Notifications Bell. Never share the code before physically receiving your package.
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              {onViewOrderDetail && (
                <button
                  type="button"
                  onClick={() => {
                    const ordId = completedResult.primaryOrderId;
                    handleCloseReset();
                    onViewOrderDetail(ordId);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-semibold min-h-[44px]"
                >
                  View Order &amp; Track Delivery
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {completedResult.conversationIds[0] && (
                <button
                  type="button"
                  onClick={() => {
                    const convId = completedResult.conversationIds[0];
                    handleCloseReset();
                    onOpenOrderChat(convId);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-[#D0BCFC] bg-[#F5F0FF] text-[#30102F] text-xs font-medium min-h-[44px]"
                >
                  <MessageSquare className="w-4 h-4 text-[#A981FF]" />
                  Transaction Chat
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseReset}
                className="py-3 px-4 rounded-xl border border-[#EAE6F0] text-xs font-medium text-[#211B2B] min-h-[44px]"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitCheckout} className="space-y-4">
            {/* Visitor OTP Quick Verification */}
            {(viewerRole === 'visitor' || otpVerified) && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                  otpVerified ? 'bg-[#ECFDF5] border-[#A7F3D0]' : 'bg-[#F5F0FF] border-[#D0BCFC]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[#211B2B]">
                    <Smartphone className="w-4 h-4 text-[#A981FF]" />
                    <span>
                      {otpVerified
                        ? 'Phone Verified & Buyer Account Created'
                        : 'Quick Mobile Verification (Guest Checkout)'}
                    </span>
                  </div>
                  {otpVerified && (
                    <span className="px-2 py-0.5 rounded-full bg-white text-[#238653] border border-[#A7F3D0] text-[10px] font-semibold">
                      Verified
                    </span>
                  )}
                </div>

                {!otpVerified && (
                  <>
                    <p className="text-[11px] text-[#4A4356]">
                      Verify your Nigerian phone number so we can send your Delivery Verification Code and inspection alerts.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="tel"
                        required
                        aria-label="Mobile number for OTP"
                        value={phone}
                        onChange={(e) => {
                          setPhoneError(null);
                          updateField({ phone: e.target.value });
                        }}
                        placeholder="0803 123 4567"
                        className="flex-1 px-3 py-2 rounded-xl border border-[#D0BCFC] bg-white text-[#211B2B]"
                      />
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        className="px-3.5 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold whitespace-nowrap min-h-[38px]"
                      >
                        Send Verification Code
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Multi-Vendor Itemized Breakdown */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#211B2B]">
                  Order Summary ({quote.totalItemsCount} {quote.totalItemsCount === 1 ? 'item' : 'items'} across{' '}
                  {quote.vendorCount} {quote.vendorCount === 1 ? 'vendor' : 'vendors'})
                </span>
              </div>

              {quote.vendorGroups.map((group) => (
                <div
                  key={group.vendorId}
                  className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs pb-2 border-b border-[#EAE6F0]">
                    <div className="flex items-center gap-1.5 font-semibold text-[#211B2B]">
                      <Store className="w-3.5 h-3.5 text-[#A981FF]" />
                      <span>{group.vendorName}</span>
                    </div>
                    <span className="text-[11px] text-[#716B7B]">
                      {deliveryMethod === 'physical_pickup'
                        ? 'Pickup Fee: ₦0'
                        : `Vendor Delivery: ${formatNaira(group.vendorDeliveryFee)}`}
                    </span>
                  </div>

                  {group.items.map((item) => (
                    <div key={item.cartItemId} className="flex gap-3 items-center">
                      <SmartImage
                        src={item.selectedVariation?.images?.[0] || item.listing.images[0]}
                        alt={item.listing.title}
                        category={item.listing.category}
                        className="w-12 h-12 rounded-lg object-cover border border-[#EAE6F0] shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-medium text-[#211B2B] truncate">{item.listing.title}</div>
                        <div className="text-[11px] text-[#716B7B] truncate">
                          {item.selectedVariation
                            ? `${item.selectedVariation.color} · ${item.selectedVariation.storage || item.selectedVariation.ram || ''} · ${item.selectedVariation.grade}`
                            : `${item.listing.color} · ${item.listing.cosmeticGrade}`}{' '}
                          · Qty {item.quantity}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-[#211B2B] tabular-nums shrink-0">
                        {formatNaira(item.lineSubtotal)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {disclosedIssues.length > 0 && (
              <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" />
                  Acknowledged Product Disclosures
                </div>
                {disclosedIssues.map((issue, idx) => (
                  <div key={idx}>• {toSimpleEnglish(issue).label}</div>
                ))}
              </div>
            )}

            {/* Delivery or Collection Method */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[#211B2B]">Delivery or In-Store Pickup</div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => updateField({ deliveryMethod: 'usedright_delivery' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    deliveryMethod === 'usedright_delivery'
                      ? 'border-2 border-[#A981FF] bg-[#F5F0FF]'
                      : 'border-[#EAE6F0] bg-[#FAF9FC]'
                  }`}
                >
                  <Truck className="w-4 h-4 text-[#A981FF] mb-1" />
                  <div className="font-semibold text-[#211B2B]">Vendor-Managed Delivery</div>
                  <div className="text-[11px] text-[#716B7B]">
                    {formatNaira(quote.fixedDeliveryFeePerVendor)} per vendor · Code protected
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateField({ deliveryMethod: 'physical_pickup' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    deliveryMethod === 'physical_pickup'
                      ? 'border-2 border-[#A981FF] bg-[#F5F0FF]'
                      : 'border-[#EAE6F0] bg-[#FAF9FC]'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-[#A981FF] mb-1" />
                  <div className="font-semibold text-[#211B2B]">In-Store Pickup</div>
                  <div className="text-[11px] text-[#716B7B]">₦0 fee · Collect with Pickup Code</div>
                </button>
              </div>
            </div>

            {/* Who is receiving this order? Deliver to Me vs Send as a Gift */}
            <div className="space-y-2.5 text-xs">
              <div className="font-semibold text-[#211B2B]">Who is receiving this order?</div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  data-testid="checkout-mode-self"
                  onClick={() => {
                    setIsGiftOrder(false);
                    setGiftError(null);
                    if (defaultSavedAddr) {
                      handleSelectSavedAddress(defaultSavedAddr.id);
                    } else {
                      updateField({ fullName: buyerInfo.name, phone: buyerInfo.phone });
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    !isGiftOrder
                      ? 'border-2 border-[#A981FF] bg-[#F5F0FF]'
                      : 'border-[#EAE6F0] bg-[#FAF9FC]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-[#A981FF] mb-1" />
                  <div className="font-semibold text-[#211B2B]">Deliver to Me</div>
                  <div className="text-[11px] text-[#716B7B]">
                    PIN &amp; order updates come straight to you
                  </div>
                </button>
                <button
                  type="button"
                  data-testid="checkout-mode-gift"
                  onClick={() => {
                    setIsGiftOrder(true);
                    setSelectedAddressId('custom');
                    updateField({
                      fullName: '',
                      phone: '',
                      street: '',
                      city: '',
                    });
                    setLandmark('');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isGiftOrder
                      ? 'border-2 border-[#A981FF] bg-[#F5F0FF]'
                      : 'border-[#EAE6F0] bg-[#FAF9FC]'
                  }`}
                >
                  <Gift className="w-4 h-4 text-[#A981FF] mb-1" />
                  <div className="font-semibold text-[#211B2B]">Send as a Gift</div>
                  <div className="text-[11px] text-[#716B7B]">
                    Hide price on package · Route PIN to recipient
                  </div>
                </button>
              </div>
            </div>

            {/* Recipient Contact + Saved Address Selector (Delivery) OR Pickup Desk Guide (In-Store Pickup) */}
            <div className="space-y-3 text-xs">
              {!isGiftOrder && deliveryMethod === 'usedright_delivery' && savedAddresses.length > 0 && viewerRole !== 'visitor' && (
                <div className="space-y-1.5">
                  <div className="font-medium text-[#211B2B]">Saved Delivery Addresses</div>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => handleSelectSavedAddress(addr.id)}
                        className={`px-3 py-2 rounded-xl border text-left transition-colors ${
                          selectedAddressId === addr.id
                            ? 'border-[#A981FF] bg-[#F5F0FF] text-[#30102F] font-semibold'
                            : 'border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]'
                        }`}
                      >
                        <div>{addr.label}</div>
                        <div className="text-[10px] text-[#716B7B] truncate max-w-[180px]">
                          {addr.street}, {addr.city}
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddressId('custom');
                        updateField({ street: '', city: '' });
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium ${
                        selectedAddressId === 'custom'
                          ? 'border-[#A981FF] bg-[#F5F0FF] text-[#30102F]'
                          : 'border-[#EAE6F0] bg-white text-[#716B7B]'
                      }`}
                    >
                      + Use New Address
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">
                    {isGiftOrder ? 'Gift Recipient Full Name *' : 'Recipient Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => updateField({ fullName: e.target.value })}
                    placeholder={isGiftOrder ? 'e.g. Tomiwa Adeyemi' : ''}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">
                    {isGiftOrder ? 'Recipient Nigerian Phone *' : 'Nigerian Mobile Number'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhoneError(null);
                      updateField({ phone: e.target.value });
                    }}
                    placeholder="0803 123 4567"
                    className={`w-full px-3 py-2 rounded-xl border ${
                      phoneError ? 'border-[#D9534F]' : 'border-[#EAE6F0]'
                    }`}
                  />
                  {phoneError && (
                    <p data-testid="checkout-phone-error" className="text-[11px] text-[#D9534F] mt-1 font-medium">
                      {phoneError}
                    </p>
                  )}
                </div>

                {deliveryMethod === 'usedright_delivery' && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block font-medium text-[#211B2B] mb-1">Street Address</label>
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => updateField({ street: e.target.value })}
                        placeholder="House number, street name, estate"
                        className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0]"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#211B2B] mb-1">City / Area</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => updateField({ city: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0]"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#211B2B] mb-1">State</label>
                      <select
                        value={stateName}
                        onChange={(e) => updateField({ stateName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                      >
                        {NIGERIAN_COMMERCIAL_HUBS.map((hub) => (
                          <option key={hub.value} value={hub.value}>
                            {hub.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-medium text-[#211B2B] mb-1">
                        Nearest Landmark (Optional)
                      </label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Opposite Admiralty Plaza"
                        className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0]"
                      />
                    </div>
                  </>
                )}
              </div>

              {deliveryMethod === 'physical_pickup' && (
                <div
                  data-testid="pickup-desk-instructions"
                  className="p-3.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] space-y-2 text-[#30102F]"
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#A981FF]" />
                    Vendor Pickup Locations &amp; Collection Instructions
                  </div>
                  {quote.vendorGroups.map((group) => (
                    <div key={group.vendorId} className="p-2.5 rounded-lg bg-white border border-[#EAE6F0] space-y-0.5">
                      <div className="font-semibold text-[#211B2B]">{group.vendorName}</div>
                      <div className="text-[11px] text-[#4A4356]">{group.pickupLocation}</div>
                      <div className="text-[11px] text-[#716B7B]">Hours: {group.pickupHours}</div>
                      <div className="text-[11px] text-[#716B7B]">{group.pickupInstructions}</div>
                    </div>
                  ))}
                </div>
              )}

              {addressError && (
                <div className="p-2.5 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-medium">
                  {addressError}
                </div>
              )}

              {isGiftOrder && (
                <div
                  data-testid="checkout-gift-options-card"
                  className="p-4 rounded-xl bg-[#FAF9FC] border border-[#D0BCFC] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#211B2B] flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-[#A981FF]" />
                      Gift Delivery Instructions, Note &amp; Privacy
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F0FF] text-[#30102F] font-medium">
                      Prices Hidden From Box
                    </span>
                  </div>

                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">
                      Delivery Instructions for Courier *
                    </label>
                    <input
                      type="text"
                      required={isGiftOrder}
                      value={giftDeliveryInstructions}
                      onChange={(e) => setGiftDeliveryInstructions(e.target.value)}
                      placeholder="e.g. Call recipient at reception; confirm PIN in person"
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-[#211B2B] mb-1">
                        Sender Visibility Preference
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setGiftSenderVisibility('show_name')}
                          className={`py-2 px-2.5 rounded-lg border text-[11px] font-medium ${
                            giftSenderVisibility === 'show_name'
                              ? 'border-[#A981FF] bg-[#A981FF] text-white'
                              : 'border-[#EAE6F0] bg-white text-[#211B2B]'
                          }`}
                        >
                          Show My Name
                        </button>
                        <button
                          type="button"
                          onClick={() => setGiftSenderVisibility('anonymous')}
                          className={`py-2 px-2.5 rounded-lg border text-[11px] font-medium inline-flex items-center justify-center gap-1 ${
                            giftSenderVisibility === 'anonymous'
                              ? 'border-[#211B2B] bg-[#211B2B] text-white'
                              : 'border-[#EAE6F0] bg-white text-[#211B2B]'
                          }`}
                        >
                          <EyeOff className="w-3 h-3" />
                          Send Anonymously
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-[#211B2B] mb-1">
                        Occasion (Optional)
                      </label>
                      <select
                        value={giftOccasion}
                        onChange={(e) => setGiftOccasion(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                      >
                        <option value="Birthday">Birthday</option>
                        <option value="Graduation">Graduation</option>
                        <option value="Work Upgrade">Work Upgrade</option>
                        <option value="Congratulations">Congratulations</option>
                        <option value="Anniversary">Anniversary</option>
                        <option value="Appreciation">Appreciation</option>
                        <option value="Just Because">Just Because</option>
                      </select>
                    </div>
                  </div>

                  {giftSenderVisibility === 'show_name' && (
                    <div>
                      <label className="block font-medium text-[#211B2B] mb-1">
                        Sender Display Name Shown to Recipient
                      </label>
                      <input
                        type="text"
                        value={giftSenderDisplayName}
                        onChange={(e) => setGiftSenderDisplayName(e.target.value)}
                        placeholder={buyerInfo.name}
                        className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="font-medium text-[#211B2B]">
                        Gift Message (Optional)
                      </label>
                      <span className="text-[11px] text-[#716B7B] tabular-nums">
                        {giftMessage.length}/{MAX_GIFT_MESSAGE_LENGTH}
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={MAX_GIFT_MESSAGE_LENGTH}
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value.slice(0, MAX_GIFT_MESSAGE_LENGTH))}
                      placeholder="Write a personal note for the recipient..."
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    />
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F] space-y-1">
                    <div>
                      <strong>Privacy &amp; Packaging Notice:</strong> Vendors are instructed never to put item prices, service fees, or payment receipts inside gift packages.
                    </div>
                    <div>
                      <strong>Special Gift Wrap Not Guaranteed:</strong> Standard protective UsedRight/courier packaging is used; decorative wrapping is not guaranteed. Refunds &amp; escrow authority remain with the purchaser.
                    </div>
                  </div>

                  {giftError && (
                    <div className="p-2.5 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-medium">
                      {giftError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Account Name Guidance & Optional Third-Party Payer Declaration */}
            <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#A981FF] shrink-0 mt-0.5" />
                <span>
                  <strong className="font-semibold text-[#211B2B]">
                    Payment Account Name Guidance:
                  </strong>{' '}
                  To avoid automated payment verification holds, use your own bank account or card matching your UsedRight name ({fullName || buyerInfo.name}). If someone else is paying for this order, declare them below.
                </span>
              </div>

              <label className="flex items-start gap-2 text-[11px] text-[#211B2B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgedNameGuidance}
                  onChange={(e) => setAcknowledgedNameGuidance(e.target.checked)}
                  className="mt-0.5 rounded border-[#D0BCFC] accent-[#A981FF] shrink-0"
                />
                <span>
                  I understand payment verification works fastest when the account name matches my profile or is declared below.
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-[#211B2B] cursor-pointer pt-1 border-t border-[#EAE6F0]">
                <input
                  type="checkbox"
                  checked={usingThirdPartyPayer}
                  onChange={(e) => setUsingThirdPartyPayer(e.target.checked)}
                  className="rounded border-[#D0BCFC] accent-[#A981FF]"
                />
                <span>Someone else is paying for this order (Declare Third-Party Payer)</span>
              </label>

              {usingThirdPartyPayer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">
                      Payer Relationship
                    </label>
                    <select
                      value={payerRelationship}
                      onChange={(e) =>
                        setPayerRelationship(
                          e.target.value as ThirdPartyPayerDeclaration['relationship']
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    >
                      <option value="Parent">Parent / Guardian</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Joint Account">Joint Account Holder</option>
                      <option value="Authorised Business">Authorised Business / Employer</option>
                      <option value="Approved Third-Party Payer">
                        Approved Third-Party Payer (Additional Review)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">
                      Full Name on Paying Account / Card
                    </label>
                    <input
                      type="text"
                      required={usingThirdPartyPayer}
                      value={payerFullName}
                      onChange={(e) => setPayerFullName(e.target.value)}
                      placeholder="e.g. Chinedu Olayinka"
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-[#211B2B] mb-1">
                      Payment Note for Verification (Optional)
                    </label>
                    <input
                      type="text"
                      value={payerNote}
                      onChange={(e) => setPayerNote(e.target.value)}
                      placeholder="e.g. Gift purchase from brother's GTBank account"
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Totals Breakdown */}
            <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#716B7B]">Product Subtotal</span>
                <span className="tabular-nums">{formatNaira(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#716B7B] inline-flex items-center gap-1">
                  <span>Customer Platform Service Fee ({feePctText})</span>
                  {onOpenFeeInfo && (
                    <button
                      type="button"
                      onClick={onOpenFeeInfo}
                      aria-label="Learn about Customer Platform Service Fee"
                      className="text-[#A981FF] hover:text-[#7E4EF2]"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
                <span className="tabular-nums">{formatNaira(quote.customer_platform_service_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#716B7B]">
                  {deliveryMethod === 'physical_pickup'
                    ? 'In-Store Pickup'
                    : `Vendor-Managed Delivery (${formatNaira(quote.fixedDeliveryFeePerVendor)} × ${quote.vendorCount})`}
                </span>
                <span className="tabular-nums">
                  {quote.deliveryFeeTotal === 0 ? 'Free (₦0)' : formatNaira(quote.deliveryFeeTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[#211B2B] pt-2 border-t border-[#EAE6F0]">
                <span>Total Payable</span>
                <span data-testid="checkout-total-payable" className="tabular-nums">
                  {formatNaira(quote.totalAmount)}
                </span>
              </div>
            </div>

            {/* Isolated Demo Payment Simulator */}
            <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#D0BCFC] space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#211B2B] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#A981FF]" />
                  Demo Paystack Payment Outcome
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F0FF] text-[#30102F] font-medium">
                  Demo Mode Only
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'success', label: 'Success' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'failed', label: 'Failed' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDemoOutcome(opt.id);
                      setPaymentError(null);
                    }}
                    className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                      demoOutcome === opt.id
                        ? 'border-[#A981FF] bg-[#A981FF] text-white'
                        : 'border-[#EAE6F0] bg-white text-[#211B2B]'
                    }`}
                  >
                    Simulate {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {pendingRef && (
              <div className="p-3.5 rounded-xl bg-[#F5F0FF] border border-[#A981FF] text-xs space-y-2">
                <div className="font-semibold text-[#30102F] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#A981FF]" />
                  Payment Pending Confirmation ({pendingRef})
                </div>
                <p className="text-[#4A4356]">
                  Payment has not cleared yet — no paid order has been issued. Re-verify once bank transfer completes.
                </p>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleReverifyPending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#A981FF] text-white font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-verify &amp; Complete Payment
                </button>
              </div>
            )}

            {paymentError && (
              <div
                data-testid="checkout-payment-error"
                className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] font-medium"
              >
                {paymentError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#A981FF] shrink-0 mt-0.5" />
              <span>
                UsedRight holds funds safely under our approved payment arrangement. Your {inspectionHours}-hour inspection timer starts only when your Delivery Verification Code is confirmed at handover.
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="checkout-submit-payment"
                className="w-full py-3 px-4 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 min-h-[48px] tabular-nums"
              >
                <Lock className="w-4 h-4" />
                {isSubmitting
                  ? 'Verifying Payment...'
                  : isGuestSession
                  ? `Verify Phone & Continue (${formatNaira(quote.totalAmount)})`
                  : `Pay ${formatNaira(quote.totalAmount)} (Demo Simulation)`}
              </button>

              <button
                type="button"
                onClick={onBackToShopping || handleCloseReset}
                className="w-full py-2.5 px-4 rounded-xl border border-[#EAE6F0] bg-white hover:border-[#A981FF] text-xs font-medium text-[#211B2B] inline-flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#A981FF]" />
                ← Continue Shopping / Add More Items
              </button>
            </div>
          </form>
        )}

        {/* Simulated 4-Digit SMS OTP Popup for Visitor Sign-up */}
        {showOtpPopup && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Enter 4-digit SMS verification code"
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          >
            <form
              onSubmit={handleVerifyOtp}
              className="bg-white rounded-2xl max-w-sm w-full border border-[#D0BCFC] shadow-2xl p-5 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#F5F0FF] text-[#A981FF] flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#211B2B]">
                      Enter code sent to your phone
                    </h3>
                    <p className="text-[11px] text-[#716B7B]">Sent to {phone || 'your mobile'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtpPopup(false)}
                  aria-label="Close OTP verification"
                  className="p-1.5 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B]">
                Simulated SMS Demo Code: <strong className="font-mono text-sm">{DEMO_OTP_CODE}</strong>
              </div>

              <div>
                <label className="block font-medium text-[#211B2B] mb-1">4-Digit SMS Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  autoFocus
                  value={otpInput}
                  onChange={(e) => {
                    setOtpError(null);
                    setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                  placeholder="4829"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#A981FF] text-center font-mono text-lg tracking-[0.5em] text-[#211B2B] focus:outline-none"
                />
                {otpError && <p className="text-[#D9534F] mt-1 font-medium">{otpError}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold min-h-[42px]"
              >
                Verify &amp; Continue Checkout
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
