import React from 'react';
import {
  X,
  Trash2,
  ShieldCheck,
  ArrowRight,
  ShoppingBag,
  Globe,
  Gift,
  Pencil,
  Info,
  Store,
  RotateCcw,
  Plus,
  Minus,
  Send,
  Copy,
  CheckCircle2,
  Clock,
  ExternalLink,
  ArrowLeft,
  MessageCircle,
  Smartphone,
} from 'lucide-react';
import {
  CartItem,
  DeliveryConfig,
  DeliveryMethod,
  DeviceListing,
  GiftOrderDetails,
  GiftSenderVisibility,
  PaymentRequestRecord,
  PlatformFeeConfig,
  VendorStorefront,
} from '../../types/marketplace';
import {
  calculateMultiVendorCheckoutQuote,
  formatNaira,
  isValidNigerianPhone,
  MAX_GIFT_MESSAGE_LENGTH,
  sanitizeGiftMessage,
  validateGiftOrderDetails,
} from '../../utils/marketplace';
import { NIGERIAN_COMMERCIAL_HUBS } from '../../utils/nigerianStates';
import { SmartImage } from '../common/SmartImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  listings?: DeviceListing[];
  vendors?: VendorStorefront[];
  feeConfig?: PlatformFeeConfig;
  deliveryConfig?: DeliveryConfig;
  viewerProfile?: { id: string; name: string; email: string; phone: string; state?: string };
  paymentRequestValidityHours?: number;
  undoRemovedItem?: CartItem | null;
  onUndoRemove?: () => void;
  onRemoveItem: (cartItemId: string) => void;
  onUpdateQuantity?: (cartItemId: string, nextQuantity: number) => void;
  onEditItem?: (item: CartItem) => void;
  onContinueShopping?: () => void;
  onOpenFeeInfo?: () => void;
  onProceedToCheckout: () => void;
  onCreatePaymentRequest?: (payload: {
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
  }) => { error?: string; request?: PaymentRequestRecord; rawToken?: string };
  onOpenPaymentRequestPreview?: (token: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  listings = [],
  vendors = [],
  feeConfig,
  deliveryConfig,
  viewerProfile,
  paymentRequestValidityHours = 24,
  undoRemovedItem,
  onUndoRemove,
  onRemoveItem,
  onUpdateQuantity,
  onEditItem,
  onContinueShopping,
  onOpenFeeInfo,
  onProceedToCheckout,
  onCreatePaymentRequest,
  onOpenPaymentRequestPreview,
}) => {
  const [reqMode, setReqMode] = React.useState<'cart' | 'setup' | 'shared'>('cart');
  const [reqDeliveryMethod, setReqDeliveryMethod] =
    React.useState<DeliveryMethod>('usedright_delivery');
  const [reqIsGift, setReqIsGift] = React.useState(false);
  const [reqName, setReqName] = React.useState(viewerProfile?.name || 'Ayodele Olayinka');
  const [reqPhone, setReqPhone] = React.useState(viewerProfile?.phone || '+234 803 892 4192');
  const [reqStreet, setReqStreet] = React.useState('14 Admiralty Way, Lekki Phase 1');
  const [reqCity, setReqCity] = React.useState('Lagos Island');
  const [reqState, setReqState] = React.useState(viewerProfile?.state || 'Lagos State');
  const [reqInstructions, setReqInstructions] = React.useState('');
  const [reqGiftMessage, setReqGiftMessage] = React.useState('');
  const [reqGiftOccasion, setReqGiftOccasion] = React.useState('Birthday');
  const [reqVisibility, setReqVisibility] = React.useState<GiftSenderVisibility>('show_name');
  const [reqError, setReqError] = React.useState<string | null>(null);
  const [createdReq, setCreatedReq] = React.useState<{
    request: PaymentRequestRecord;
    rawToken: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  if (!isOpen) return null;

  const quote = calculateMultiVendorCheckoutQuote({
    cartItems: items,
    deliveryMethod: reqMode === 'cart' ? 'usedright_delivery' : reqDeliveryMethod,
    listings,
    vendors,
    feeConfig,
    deliveryConfig,
  });

  const feePctText = `${(quote.customerFeeRate * 100).toFixed(1).replace(/\.0$/, '')}%`;

  const getCartItemMaxQty = (item: CartItem): number => {
    const isAccessory =
      item.listing.category === 'accessories' || item.listing.category === 'computer_accessories';
    const rawStock = item.selectedVariation?.stockQuantity ?? item.listing.stockQuantity ?? 1;
    if (!isAccessory && rawStock <= 1) return 1;
    return Math.max(1, Math.min(rawStock, isAccessory ? 10 : rawStock));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping cart"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
    >
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
        <div className="p-4 sm:p-5 border-b border-[#EAE6F0] flex items-center justify-between bg-[#FAF9FC]">
          <div className="flex items-center gap-2">
            {reqMode !== 'cart' ? (
              <button
                type="button"
                onClick={() => {
                  setReqMode('cart');
                  setReqError(null);
                }}
                aria-label="Back to cart items"
                className="p-1.5 rounded-lg bg-white border border-[#EAE6F0] text-[#211B2B]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <ShoppingBag className="w-5 h-5 text-[#A981FF]" />
            )}
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">
                {reqMode === 'setup'
                  ? 'Request Someone to Pay'
                  : reqMode === 'shared'
                  ? 'Share Payment Request'
                  : `Protected Cart (${quote.totalItemsCount})`}
              </h2>
              {reqMode === 'cart' && quote.vendorCount > 1 && (
                <p className="text-[11px] text-[#716B7B]">
                  Multi-vendor order across {quote.vendorCount} verified merchants
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setReqMode('cart');
              onClose();
            }}
            aria-label="Close cart"
            className="p-2 rounded-lg text-[#716B7B] hover:bg-white transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {reqMode === 'setup' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setReqError(null);
                if (!onCreatePaymentRequest) return;
                if (!reqName.trim() || !isValidNigerianPhone(reqPhone)) {
                  setReqError('Enter a valid recipient name and Nigerian mobile number.');
                  return;
                }
                if (reqDeliveryMethod === 'usedright_delivery' && (!reqStreet.trim() || !reqCity.trim())) {
                  setReqError('Enter complete street address and city for delivery.');
                  return;
                }
                const addrPayload = {
                  fullName: reqName.trim(),
                  phone: reqPhone.trim(),
                  street:
                    reqDeliveryMethod === 'physical_pickup'
                      ? quote.vendorGroups[0]?.pickupLocation || 'Vendor Pickup Desk'
                      : reqStreet.trim(),
                  city: reqDeliveryMethod === 'physical_pickup' ? 'In-Store Pickup' : reqCity.trim(),
                  state: reqState,
                };
                let giftDetails: GiftOrderDetails | undefined;
                if (reqIsGift) {
                  giftDetails = {
                    isGift: true,
                    recipientName: reqName.trim(),
                    recipientPhone: reqPhone.trim(),
                    recipientAddress: addrPayload,
                    deliveryInstructions:
                      reqInstructions.trim() || 'Call recipient on arrival and verify 6-digit PIN.',
                    giftMessage: sanitizeGiftMessage(reqGiftMessage) || undefined,
                    senderDisplayName:
                      reqVisibility === 'show_name'
                        ? viewerProfile?.name || 'UsedRight Customer'
                        : undefined,
                    occasion: reqGiftOccasion,
                    senderVisibility: reqVisibility,
                    hidePriceFromPackage: true,
                    specialPackagingGuaranteed: false,
                  };
                  const gCheck = validateGiftOrderDetails(giftDetails, reqDeliveryMethod);
                  if (!gCheck.valid) {
                    setReqError(gCheck.errors.join(' '));
                    return;
                  }
                }
                const res = onCreatePaymentRequest({
                  deliveryMethod: reqDeliveryMethod,
                  deliveryAddress: addrPayload,
                  isGift: reqIsGift,
                  giftDetails,
                });
                if (res.error || !res.request || !res.rawToken) {
                  setReqError(res.error || 'Could not generate payment link.');
                  return;
                }
                setCreatedReq({ request: res.request, rawToken: res.rawToken });
                setReqMode('shared');
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#30102F]">
                Confirm delivery or gift details so the payer sees the locked total ({formatNaira(quote.totalAmount)}) on UsedRight&apos;s hosted review page. Link expires in <strong>{paymentRequestValidityHours}h</strong>.
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReqIsGift(false);
                    setReqName(viewerProfile?.name || 'Ayodele Olayinka');
                    setReqPhone(viewerProfile?.phone || '+234 803 892 4192');
                  }}
                  className={`p-2.5 rounded-xl border text-left ${
                    !reqIsGift ? 'border-2 border-[#A981FF] bg-[#F5F0FF]' : 'border-[#EAE6F0] bg-[#FAF9FC]'
                  }`}
                >
                  <div className="font-semibold text-[#211B2B]">Deliver to Me</div>
                  <div className="text-[10px] text-[#716B7B]">You receive the order</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReqIsGift(true);
                    setReqName('');
                    setReqPhone('');
                  }}
                  data-testid="req-pay-gift-toggle"
                  className={`p-2.5 rounded-xl border text-left ${
                    reqIsGift ? 'border-2 border-[#A981FF] bg-[#F5F0FF]' : 'border-[#EAE6F0] bg-[#FAF9FC]'
                  }`}
                >
                  <div className="font-semibold text-[#211B2B] flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-[#A981FF]" />
                    Send as a Gift
                  </div>
                  <div className="text-[10px] text-[#716B7B]">3-person: You · Payer · Recipient</div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReqDeliveryMethod('usedright_delivery')}
                  className={`py-2 px-2.5 rounded-lg border font-medium ${
                    reqDeliveryMethod === 'usedright_delivery'
                      ? 'border-[#A981FF] bg-[#A981FF] text-white'
                      : 'border-[#EAE6F0] bg-white text-[#211B2B]'
                  }`}
                >
                  Vendor Delivery ({formatNaira(quote.fixedDeliveryFeePerVendor)}/vendor)
                </button>
                <button
                  type="button"
                  onClick={() => setReqDeliveryMethod('physical_pickup')}
                  className={`py-2 px-2.5 rounded-lg border font-medium ${
                    reqDeliveryMethod === 'physical_pickup'
                      ? 'border-[#A981FF] bg-[#A981FF] text-white'
                      : 'border-[#EAE6F0] bg-white text-[#211B2B]'
                  }`}
                >
                  In-Store Pickup (₦0)
                </button>
              </div>

              <div className="space-y-2.5">
                <input
                  type="text"
                  required
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  placeholder={reqIsGift ? 'Gift Recipient Full Name *' : 'Your Full Name *'}
                  aria-label="Recipient Full Name"
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0]"
                />
                <input
                  type="tel"
                  required
                  value={reqPhone}
                  onChange={(e) => setReqPhone(e.target.value)}
                  placeholder={reqIsGift ? 'Recipient Nigerian Phone *' : 'Your Nigerian Phone *'}
                  aria-label="Recipient Phone Number"
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0]"
                />
                {reqDeliveryMethod === 'usedright_delivery' && (
                  <>
                    <input
                      type="text"
                      required
                      value={reqStreet}
                      onChange={(e) => setReqStreet(e.target.value)}
                      placeholder="Street Address *"
                      aria-label="Delivery Street Address"
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={reqCity}
                        onChange={(e) => setReqCity(e.target.value)}
                        placeholder="City / Area *"
                        aria-label="Delivery City"
                        className="px-3 py-2 rounded-xl border border-[#EAE6F0]"
                      />
                      <select
                        value={reqState}
                        onChange={(e) => setReqState(e.target.value)}
                        aria-label="Delivery State"
                        className="px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                      >
                        {NIGERIAN_COMMERCIAL_HUBS.map((h) => (
                          <option key={h.value} value={h.value}>
                            {h.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {reqIsGift && (
                  <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#D0BCFC] space-y-2">
                    <input
                      type="text"
                      required
                      value={reqInstructions}
                      onChange={(e) => setReqInstructions(e.target.value)}
                      placeholder="Gift Delivery Instructions *"
                      aria-label="Gift Delivery Instructions"
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={reqVisibility}
                        onChange={(e) => setReqVisibility(e.target.value as GiftSenderVisibility)}
                        className="px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                      >
                        <option value="show_name">Show My Name to Recipient</option>
                        <option value="anonymous">Send Anonymously</option>
                      </select>
                      <select
                        value={reqGiftOccasion}
                        onChange={(e) => setReqGiftOccasion(e.target.value)}
                        className="px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                      >
                        <option value="Birthday">Birthday</option>
                        <option value="Graduation">Graduation</option>
                        <option value="Congratulations">Congratulations</option>
                        <option value="Just Because">Just Because</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={MAX_GIFT_MESSAGE_LENGTH}
                      value={reqGiftMessage}
                      onChange={(e) => setReqGiftMessage(e.target.value.slice(0, MAX_GIFT_MESSAGE_LENGTH))}
                      placeholder={`Optional gift message (${reqGiftMessage.length}/${MAX_GIFT_MESSAGE_LENGTH})`}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    />
                  </div>
                )}
              </div>

              {reqError && (
                <div className="p-2.5 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-medium">
                  {reqError}
                </div>
              )}

              <button
                type="submit"
                data-testid="generate-payment-request-btn"
                className="w-full py-3 px-4 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold min-h-[44px]"
              >
                Create Shareable Payment Link · {formatNaira(quote.totalAmount)}
              </button>
            </form>
          )}

          {reqMode === 'shared' && createdReq && (() => {
            const baseOrigin =
              typeof window !== 'undefined' ? window.location.origin : 'https://shopusedright.com';
            const shareUrl = `${baseOrigin}/?pay_request=${encodeURIComponent(createdReq.rawToken)}`;
            const shareMsg = `Please complete payment for my UsedRight order (${createdReq.request.requestReference}) totaling ${formatNaira(
              createdReq.request.totalPayableAmount
            )}. Link expires in ${createdReq.request.validityHours}h: ${shareUrl}`;

            return (
              <div data-testid="payment-request-created-panel" className="space-y-3.5 text-xs">
                <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-1 text-[#065F46]">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Payment Request Created ({createdReq.request.requestReference})
                  </div>
                  <div>
                    No order or vendor notification is triggered until payment succeeds.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#716B7B]">Locked Payable Total:</span>
                    <strong className="tabular-nums text-[#211B2B]">
                      {formatNaira(createdReq.request.totalPayableAmount)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#716B7B] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#A981FF]" />
                      Expires:
                    </span>
                    <span className="text-[#211B2B]">
                      {new Date(createdReq.request.expiresAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-[#EAE6F0] font-mono text-[11px] break-all text-[#4A4356]">
                    {shareUrl}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(shareUrl).catch(() => {});
                      }
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-[#211B2B] text-white font-semibold inline-flex items-center justify-center gap-1.5 min-h-[42px]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedLink ? 'Link Copied' : 'Copy Link'}
                  </button>

                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
                    <button
                      type="button"
                      onClick={() => {
                        navigator
                          .share({
                            title: 'UsedRight Payment Request',
                            text: shareMsg,
                            url: shareUrl,
                          })
                          .catch(() => {});
                      }}
                      className="py-2.5 px-3 rounded-xl border border-[#D0BCFC] bg-[#F5F0FF] text-[#30102F] font-semibold inline-flex items-center justify-center gap-1.5 min-h-[42px]"
                    >
                      <Send className="w-3.5 h-3.5 text-[#A981FF]" />
                      Share Sheet
                    </button>
                  ) : (
                    <a
                      href={`sms:?body=${encodeURIComponent(shareMsg)}`}
                      className="py-2.5 px-3 rounded-xl border border-[#EAE6F0] bg-white text-[#211B2B] font-semibold inline-flex items-center justify-center gap-1.5 min-h-[42px]"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#A981FF]" />
                      SMS Compose
                    </a>
                  )}

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-2 py-2.5 px-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46] font-semibold inline-flex items-center justify-center gap-1.5 min-h-[42px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Compose WhatsApp Message
                  </a>
                </div>

                <p className="text-[11px] text-[#716B7B]">
                  Opening WhatsApp or SMS lets you send this link manually — UsedRight does not confirm message delivery inside external apps.
                </p>

                {onOpenPaymentRequestPreview && (
                  <button
                    type="button"
                    data-testid="preview-payer-page-btn"
                    onClick={() => {
                      const tok = createdReq.rawToken;
                      setReqMode('cart');
                      onClose();
                      onOpenPaymentRequestPreview(tok);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold inline-flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Hosted Payer Review Page (Demo)
                  </button>
                )}
              </div>
            );
          })()}

          {reqMode === 'cart' && undoRemovedItem && onUndoRemove && (
            <div
              data-testid="cart-undo-banner"
              className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] flex items-center justify-between gap-2 text-xs"
            >
              <span className="text-[#30102F] truncate">
                Item removed: <strong>{undoRemovedItem.listing.title}</strong>
              </span>
              <button
                type="button"
                onClick={onUndoRemove}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#A981FF] text-white font-semibold shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Undo
              </button>
            </div>
          )}

          {reqMode === 'cart' && items.length === 0 ? (
            <div className="py-14 text-center space-y-4">
              <ShoppingBag className="w-10 h-10 text-[#D0BCFC] mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#211B2B]">Your cart is empty</p>
                <p className="text-xs text-[#716B7B] max-w-xs mx-auto">
                  Browse quality pre-owned phones, laptops, and accessories backed by our Delivery Verification Code and 24-hour inspection window.
                </p>
              </div>
              <button
                type="button"
                onClick={onContinueShopping || onClose}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium min-h-[42px]"
              >
                Continue Shopping
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : reqMode === 'cart' ? (
            quote.vendorGroups.map((group) => (
              <div
                key={group.vendorId}
                className="rounded-2xl border border-[#EAE6F0] bg-[#FAF9FC] overflow-hidden"
              >
                <div className="px-3.5 py-2.5 bg-white border-b border-[#EAE6F0] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-[#211B2B] min-w-0">
                    <Store className="w-3.5 h-3.5 text-[#A981FF] shrink-0" />
                    <span className="truncate">{group.vendorName}</span>
                  </div>
                  <span className="text-[11px] text-[#716B7B] shrink-0">
                    Fixed Delivery: {formatNaira(group.vendorDeliveryFee)}
                  </span>
                </div>

                <div className="p-3 space-y-3">
                  {group.items.map((qItem) => {
                    const rawCartItem =
                      items.find(
                        (it, idx) =>
                          (it.id || `${it.listing.id}-${it.selectedVariation?.id || 'base'}-${idx}`) ===
                          qItem.cartItemId
                      ) || items[0];
                    const maxQty = getCartItemMaxQty(rawCartItem);

                    return (
                      <div
                        key={qItem.cartItemId}
                        className="p-3 rounded-xl border border-[#EAE6F0] bg-white flex gap-3"
                      >
                        <SmartImage
                          src={qItem.selectedVariation?.images?.[0] || qItem.listing.images[0]}
                          alt={qItem.listing.title}
                          category={qItem.listing.category}
                          className="w-16 h-16 rounded-xl object-cover border border-[#EAE6F0] shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs font-semibold text-[#211B2B] line-clamp-2">
                              {qItem.listing.title}
                            </h3>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(qItem.cartItemId)}
                              aria-label={`Remove ${qItem.listing.title}`}
                              className="p-1 text-[#716B7B] hover:text-[#D9534F] shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="text-[11px] text-[#716B7B] flex items-center gap-1.5">
                            <Globe className="w-3 h-3 text-[#A981FF] shrink-0" />
                            <span className="truncate">
                              {qItem.selectedVariation
                                ? `${qItem.selectedVariation.color} · ${qItem.selectedVariation.storage || qItem.selectedVariation.ram || ''} · ${qItem.selectedVariation.grade}`
                                : `${qItem.listing.color} · ${qItem.listing.cosmeticGrade}`}
                            </span>
                          </div>

                          {qItem.selectedAccessories.length > 0 && (
                            <div className="text-[11px] text-[#4A4356] space-y-0.5">
                              {qItem.selectedAccessories.map((acc) => (
                                <div key={acc.id}>
                                  + {acc.name} ({formatNaira(acc.price)})
                                </div>
                              ))}
                            </div>
                          )}

                          {rawCartItem.includedFreeGift && (
                            <div className="text-[11px] text-[#238653] font-medium flex items-center gap-1">
                              <Gift className="w-3 h-3 shrink-0" />
                              <span>FREE GIFT: {rawCartItem.includedFreeGift.title}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="text-sm font-semibold text-[#211B2B] tabular-nums">
                              {formatNaira(qItem.lineSubtotal)}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {onEditItem && (
                                <button
                                  type="button"
                                  onClick={() => onEditItem(rawCartItem)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#EAE6F0] hover:border-[#A981FF] text-[11px] font-medium text-[#211B2B]"
                                >
                                  <Pencil className="w-3 h-3 text-[#A981FF]" />
                                  Edit
                                </button>
                              )}

                              {maxQty > 1 && onUpdateQuantity ? (
                                <div className="inline-flex items-center rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]">
                                  <button
                                    type="button"
                                    aria-label="Decrease quantity"
                                    onClick={() =>
                                      onUpdateQuantity(
                                        qItem.cartItemId,
                                        Math.max(1, qItem.quantity - 1)
                                      )
                                    }
                                    disabled={qItem.quantity <= 1}
                                    className="px-2 py-1 text-[#211B2B] disabled:opacity-40"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="px-2 text-[11px] font-semibold tabular-nums">
                                    {qItem.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label="Increase quantity"
                                    onClick={() =>
                                      onUpdateQuantity(
                                        qItem.cartItemId,
                                        Math.min(maxQty, qItem.quantity + 1)
                                      )
                                    }
                                    disabled={qItem.quantity >= maxQty}
                                    className="px-2 py-1 text-[#211B2B] disabled:opacity-40"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-[#FAF9FC] border border-[#EAE6F0] text-[10px] text-[#716B7B]">
                                  Qty 1 (Inspected unit)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : null}
        </div>

        {reqMode === 'cart' && items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-[#EAE6F0] bg-white space-y-3 shadow-[0_-4px_16px_rgba(33,27,43,0.05)]">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#716B7B]">
                <span>Product Subtotal</span>
                <span className="text-[#211B2B] font-medium tabular-nums">
                  {formatNaira(quote.subtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#716B7B]">
                <span className="inline-flex items-center gap-1">
                  <span>Customer Platform Service Fee ({feePctText})</span>
                  {onOpenFeeInfo && (
                    <button
                      type="button"
                      onClick={onOpenFeeInfo}
                      aria-label="Customer Platform Service Fee details"
                      className="text-[#A981FF] hover:text-[#7E4EF2]"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
                <span className="text-[#211B2B] font-medium tabular-nums">
                  {formatNaira(quote.customer_platform_service_fee)}
                </span>
              </div>
              <div className="flex justify-between text-[#716B7B]">
                <span>
                  Vendor-Managed Delivery ({formatNaira(quote.fixedDeliveryFeePerVendor)} × {quote.vendorCount}{' '}
                  {quote.vendorCount === 1 ? 'vendor' : 'vendors'})
                </span>
                <span className="text-[#211B2B] font-medium tabular-nums">
                  {formatNaira(quote.deliveryFeeTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[#211B2B] pt-2 border-t border-[#EAE6F0]">
                <span>Total</span>
                <span data-testid="cart-total-amount" className="tabular-nums">
                  {formatNaira(quote.totalAmount)}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#A981FF] shrink-0" />
              <span>
                In-Store Pickup is {formatNaira(0)} delivery fee. Select delivery or pickup at checkout.
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onProceedToCheckout}
                data-testid="cart-proceed-checkout"
                className="w-full py-3 px-4 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-sm font-semibold flex items-center justify-center gap-2 min-h-[46px] tabular-nums"
              >
                <span>
                  Checkout · {quote.totalItemsCount} {quote.totalItemsCount === 1 ? 'item' : 'items'} · {formatNaira(quote.totalAmount)}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {onCreatePaymentRequest && (
                <button
                  type="button"
                  data-testid="cart-request-someone-pay"
                  onClick={() => {
                    setReqError(null);
                    setReqMode('setup');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#D0BCFC] bg-[#F5F0FF] hover:bg-[#EAE1FF] text-[#30102F] text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Send className="w-4 h-4 text-[#7E4EF2]" />
                  <span>Request Someone to Pay</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
