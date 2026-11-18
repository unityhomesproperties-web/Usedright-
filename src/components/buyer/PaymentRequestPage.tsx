import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Gift,
  Lock,
  MapPin,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Store,
  Truck,
  XCircle,
} from 'lucide-react';
import {
  MarketplaceState,
  Order,
  ParentOrderRecord,
  PaymentRequestRecord,
  PaymentRequestStatus,
} from '../../types/marketplace';
import {
  buildPayerSafeRequestView,
  formatNaira,
  isValidNigerianPhone,
  PayerSafeRequestView,
  PaymentRequestAvailabilityResult,
  sha256Hex,
} from '../../utils/marketplace';
import { toSimpleEnglish } from '../../utils/simpleEnglish';
import { fetchPaymentRequestApi, payPaymentRequestApi } from '../../utils/apiClient';
import { SmartImage } from '../common/SmartImage';

interface PaymentRequestPageProps {
  token: string;
  state: MarketplaceState;
  viewerRole: string;
  viewerProfile?: { id: string; name: string; email: string; phone: string };
  onAttemptLocalCheckout: (payload: {
    paymentRequestId: string;
    payerId?: string;
    payerName: string;
    payerEmail: string;
    payerPhone: string;
    isAuthenticatedCustomer: boolean;
    expectedAmount: number;
    outcome: 'success' | 'pending' | 'failed';
    paymentProviderRef?: string;
  }) => {
    status: PaymentRequestStatus;
    error?: string;
    parentOrder?: ParentOrderRecord;
    childOrders?: Order[];
    paymentReference?: string;
  };
  onSyncServerCompleted?: (payload: {
    parentOrder: ParentOrderRecord;
    childOrders: Order[];
    requestId: string;
    paymentReference?: string;
    payerName: string;
    payerEmail: string;
    payerPhone: string;
  }) => void;
  onRefreshState?: (paymentRequestId: string) => void;
  onBackToMarketplace: () => void;
}

const STATUS_BADGE_MAP: Record<PaymentRequestStatus, { bg: string; text: string; border: string }> = {
  Draft: { bg: 'bg-[#FAF9FC]', text: 'text-[#4A4356]', border: 'border-[#EAE6F0]' },
  'Pending payment': { bg: 'bg-[#F5F0FF]', text: 'text-[#30102F]', border: 'border-[#D0BCFC]' },
  'Payment processing': { bg: 'bg-[#FFFBEB]', text: 'text-[#92400E]', border: 'border-[#FDE68A]' },
  Paid: { bg: 'bg-[#ECFDF5]', text: 'text-[#065F46]', border: 'border-[#A7F3D0]' },
  Expired: { bg: 'bg-[#FFF5F5]', text: 'text-[#991B1B]', border: 'border-[#FED7D7]' },
  Cancelled: { bg: 'bg-[#FFF5F5]', text: 'text-[#991B1B]', border: 'border-[#FED7D7]' },
  Failed: { bg: 'bg-[#FFF5F5]', text: 'text-[#C53030]', border: 'border-[#FED7D7]' },
  Invalidated: { bg: 'bg-[#FFF5F5]', text: 'text-[#991B1B]', border: 'border-[#FED7D7]' },
};

export const PaymentRequestPage: React.FC<PaymentRequestPageProps> = ({
  token,
  state,
  viewerRole,
  viewerProfile,
  onAttemptLocalCheckout,
  onRefreshState,
  onBackToMarketplace,
}) => {
  const tokenHash = sha256Hex(token.trim());
  const localMatch: PaymentRequestRecord | undefined = (state.paymentRequests || []).find(
    (r) => r.tokenHash === tokenHash || r.shareTokenDemo === token.trim() || r.id === token.trim()
  );

  const [serverView, setServerView] = useState<PayerSafeRequestView | null>(null);
  const [serverAvailability, setServerAvailability] =
    useState<PaymentRequestAvailabilityResult | null>(null);
  const [loading, setLoading] = useState(!localMatch);
  const [notFound, setNotFound] = useState(false);

  const [payerName, setPayerName] = useState(
    viewerRole === 'buyer' && viewerProfile?.name ? viewerProfile.name : ''
  );
  const [payerEmail, setPayerEmail] = useState(
    viewerRole === 'buyer' && viewerProfile?.email ? viewerProfile.email : ''
  );
  const [payerPhone, setPayerPhone] = useState(
    viewerRole === 'buyer' && viewerProfile?.phone ? viewerProfile.phone : ''
  );
  const [outcome, setOutcome] = useState<'success' | 'pending' | 'failed'>('success');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receiptCopied, setReceiptCopied] = useState(false);

  useEffect(() => {
    let active = true;
    if (localMatch && onRefreshState) {
      onRefreshState(localMatch.id);
    }
    fetchPaymentRequestApi(token.trim()).then((res) => {
      if (!active) return;
      if (res.ok && res.data?.request) {
        setServerView(res.data.request);
        setServerAvailability(res.data.availability);
        setNotFound(false);
      } else if (!localMatch) {
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const localSafeView: PayerSafeRequestView | null = localMatch
    ? buildPayerSafeRequestView(localMatch)
    : null;

  // Prefer fresh local state once updated, falling back to server view if opened cold
  const safeView = localSafeView || serverView;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-sm text-[#716B7B]">
        Verifying secure UsedRight payment request link...
      </div>
    );
  }

  if (notFound || !safeView) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-[#FED7D7] p-6 text-center space-y-3">
          <XCircle className="w-10 h-10 text-[#C53030] mx-auto" />
          <h1 className="text-lg font-semibold text-[#211B2B]">Payment Request Not Found</h1>
          <p className="text-xs text-[#716B7B]">
            This payment link may be invalid, damaged, or already cleared in Demo Mode.
          </p>
          <button
            type="button"
            onClick={onBackToMarketplace}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#A981FF] text-white text-xs font-semibold min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to UsedRight
          </button>
        </div>
      </div>
    );
  }

  const badgeStyle = STATUS_BADGE_MAP[safeView.status] || STATUS_BADGE_MAP['Pending payment'];
  const feePctText = `${(safeView.customerFeeRate * 100).toFixed(1).replace(/\.0$/, '')}%`;
  const isPayable =
    safeView.status === 'Pending payment' ||
    safeView.status === 'Failed' ||
    safeView.status === 'Payment processing';
  const linkedParent = safeView.parentOrderId
    ? (state.parentOrders || []).find((p) => p.id === safeView.parentOrderId)
    : undefined;
  const linkedOrders = safeView.parentOrderId
    ? state.orders.filter((o) => o.parentOrderId === safeView.parentOrderId)
    : [];

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (payerName.trim().length < 2) {
      setErrorMsg('Enter your full name for the payment receipt.');
      return;
    }
    if (!payerEmail.includes('@') || payerEmail.trim().length < 5) {
      setErrorMsg('Enter a valid email address to receive your electronic payment receipt.');
      return;
    }
    if (!isValidNigerianPhone(payerPhone)) {
      setErrorMsg('Enter a valid Nigerian mobile phone number.');
      return;
    }

    setSubmitting(true);
    try {
      let result: {
        status: PaymentRequestStatus;
        error?: string;
        parentOrder?: ParentOrderRecord;
        childOrders?: Order[];
        paymentReference?: string;
      };

      if (localMatch) {
        result = onAttemptLocalCheckout({
          paymentRequestId: localMatch.id,
          payerId: viewerRole === 'buyer' ? viewerProfile?.id : undefined,
          payerName: payerName.trim(),
          payerEmail: payerEmail.trim(),
          payerPhone: payerPhone.trim(),
          isAuthenticatedCustomer: viewerRole === 'buyer',
          expectedAmount: safeView.totalPayableAmount,
          outcome,
        });
      } else {
        const apiRes = await payPaymentRequestApi(token.trim(), {
          payerId: viewerRole === 'buyer' ? viewerProfile?.id : undefined,
          payerName: payerName.trim(),
          payerEmail: payerEmail.trim(),
          payerPhone: payerPhone.trim(),
          isAuthenticatedCustomer: viewerRole === 'buyer',
          expectedAmount: safeView.totalPayableAmount,
          outcome,
        });
        result = {
          status: apiRes.data?.status || safeView.status,
          error: apiRes.error || apiRes.data?.error,
          parentOrder: apiRes.data?.parentOrder,
          childOrders: apiRes.data?.childOrders,
          paymentReference: apiRes.data?.paymentReference,
        };
        if (apiRes.data?.request) {
          setServerView(apiRes.data.request);
        }
      }

      // Mirror demo request payment to server if backed locally
      if (localMatch) {
        void payPaymentRequestApi(token.trim(), {
          payerId: viewerRole === 'buyer' ? viewerProfile?.id : undefined,
          payerName: payerName.trim(),
          payerEmail: payerEmail.trim(),
          payerPhone: payerPhone.trim(),
          isAuthenticatedCustomer: viewerRole === 'buyer',
          expectedAmount: safeView.totalPayableAmount,
          outcome,
          paymentProviderRef: result.paymentReference,
        }).catch(() => {});
      }

      if (result.error) {
        setErrorMsg(result.error);
      } else if (result.status === 'Paid' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="payment-request-page"
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-5"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToMarketplace}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4A4356] hover:text-[#A981FF] min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to UsedRight Marketplace
        </button>

        <span
          data-testid="payment-request-status-badge"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
        >
          {safeView.status}
        </span>
      </div>

      {/* Clear Context Banner */}
      <div className="bg-white rounded-2xl border-2 border-[#A981FF] p-5 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7E4EF2]">
              UsedRight Hosted Payment Request · {safeView.requestReference}
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#211B2B]">
              You are paying for an order selected by {safeView.orderOwnerDisplayName}
            </h1>
            <p className="text-xs text-[#4A4356] leading-relaxed">
              {safeView.orderOwnerDisplayName} selected these pre-owned items on UsedRight (
              <span className="font-medium">Know Exactly What You’re Buying</span>) and sent you this
              locked payment link. Paying here settles the order without giving you access to their
              UsedRight account.
            </p>
          </div>
          <div className="md:text-right shrink-0 md:pl-4 md:border-l md:border-[#EAE6F0]">
            <div className="text-[11px] text-[#716B7B]">Locked Total Payable</div>
            <div
              data-testid="payment-request-total"
              className="text-2xl font-bold text-[#211B2B] tabular-nums"
            >
              {formatNaira(safeView.totalPayableAmount)}
            </div>
            <div className="text-[11px] text-[#716B7B] flex items-center md:justify-end gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-[#A981FF]" />
              Expires {new Date(safeView.expiresAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F] flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#7E4EF2] shrink-0" />
          <span>
            <strong>Read-Only Order Lock:</strong> Items, condition grades, disclosed limitations,
            quantities, vendors, recipient details, and delivery destination are locked by the Order
            Owner and cannot be altered by the payer.
          </span>
        </div>
      </div>

      {/* Blocked / Expired / Invalidated / Cancelled Banner */}
      {!isPayable && safeView.status !== 'Paid' && (
        <div
          data-testid="payment-request-blocked-banner"
          className="p-5 rounded-2xl bg-[#FFF5F5] border-2 border-[#FED7D7] space-y-2"
        >
          <div className="flex items-center gap-2 font-semibold text-[#C53030] text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>Payment Link Unavailable ({safeView.status})</span>
          </div>
          <p className="text-xs text-[#4A4356] leading-relaxed">
            {safeView.invalidatedReason ||
              serverAvailability?.reason ||
              (safeView.status === 'Expired'
                ? 'This payment request has passed its validity window. Ask the Order Owner to generate a fresh link.'
                : safeView.status === 'Cancelled'
                ? 'This payment request was cancelled by the Order Owner before payment.'
                : 'Item availability or pricing changed after this request was created. Checkout is blocked to protect you from stale pricing.')}
          </p>
        </div>
      )}

      {/* Paid Electronic Receipt View */}
      {safeView.status === 'Paid' && (
        <div
          data-testid="payment-request-receipt"
          className="bg-white rounded-2xl border-2 border-[#238653] p-5 space-y-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE6F0] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#238653] flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#211B2B]">
                  Electronic Payment Receipt · Paid
                </h2>
                <p className="text-xs text-[#716B7B]">
                  Duplicate payments are blocked automatically on this request.
                </p>
              </div>
            </div>
            {safeView.paymentProviderRef && (
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(safeView.paymentProviderRef!).catch(() => {});
                  }
                  setReceiptCopied(true);
                  setTimeout(() => setReceiptCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAE6F0] text-xs font-medium text-[#211B2B] max-w-full"
              >
                <Copy className="w-3.5 h-3.5 text-[#A981FF] shrink-0" />
                <span className="truncate">
                  {receiptCopied ? 'Ref Copied' : `Copy Ref: ${safeView.paymentProviderRef}`}
                </span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#FAF9FC] p-3.5 rounded-xl border border-[#EAE6F0]">
            <div>
              <span className="text-[#716B7B]">Payment Request Ref:</span>{' '}
              <strong className="font-mono text-[#211B2B]">{safeView.requestReference}</strong>
            </div>
            <div>
              <span className="text-[#716B7B]">Payment Provider Ref:</span>{' '}
              <strong className="font-mono text-[#211B2B]">
                {safeView.paymentProviderRef || 'Confirmed'}
              </strong>
            </div>
            {linkedParent && (
              <div>
                <span className="text-[#716B7B]">Confirmed Order Ref:</span>{' '}
                <strong className="font-mono text-[#211B2B]">
                  {linkedParent.parentOrderNumber}
                </strong>
              </div>
            )}
            <div>
              <span className="text-[#716B7B]">Amount Paid (NGN):</span>{' '}
              <strong className="tabular-nums text-[#211B2B]">
                {formatNaira(safeView.totalPayableAmount)}
              </strong>
            </div>
            {safeView.payerSummary && (
              <div className="sm:col-span-2">
                <span className="text-[#716B7B]">Paid By:</span>{' '}
                <strong className="text-[#211B2B]">{safeView.payerSummary.payerName}</strong> (
                {safeView.payerSummary.maskedEmail})
              </div>
            )}
            {linkedOrders.length > 0 && (
              <div className="sm:col-span-2 text-[#4A4356]">
                Fulfilment Sub-Orders Created ({linkedOrders.length}):{' '}
                <span className="font-mono">
                  {linkedOrders.map((o) => o.subOrderNumber || o.orderNumber).join(', ')}
                </span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F]">
            {safeView.isGift
              ? 'Because this is a Gift Order, the gift recipient receives the confidential Delivery Verification PIN and delivery updates without seeing prices or this payment receipt.'
              : 'Order updates and the Delivery Verification PIN are sent to the Order Owner.'}{' '}
            Any approved refund traces strictly back to payment reference{' '}
            <strong className="font-mono">{safeView.paymentProviderRef}</strong> and the original
            payment channel.
          </div>
        </div>
      )}

      {/* Main Two-Column Review & Checkout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Locked Order Items & Delivery Summary */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#211B2B]">
                Locked Items &amp; Condition Disclosures ({safeView.items.length})
              </h2>
              <span className="text-[11px] text-[#716B7B]">
                {safeView.vendorCount} {safeView.vendorCount === 1 ? 'vendor' : 'vendors'}
              </span>
            </div>

            <div className="space-y-3">
              {safeView.items.map((item) => {
                const variationSummary = `${item.color}${item.storage ? ` · ${item.storage}` : ''}${item.ram ? ` · ${item.ram}` : ''} · ${item.cosmeticGrade}`;
                return (
                <div
                  key={item.cartItemId}
                  className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2"
                >
                  <div className="flex gap-3">
                    <SmartImage
                      src={item.image}
                      alt={item.title}
                      category={item.category}
                      className="w-16 h-16 rounded-xl object-cover border border-[#EAE6F0] shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-[#211B2B] line-clamp-2">
                          {item.title}
                        </h3>
                        <span className="font-semibold text-[#211B2B] tabular-nums shrink-0">
                          {formatNaira(item.lineSubtotal)}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#716B7B]">
                        {variationSummary} · Qty {item.quantity}
                      </div>
                      <div className="text-[11px] text-[#4A4356] flex items-center gap-1">
                        <Store className="w-3 h-3 text-[#A981FF]" />
                        <span>Sold by: {item.vendorName}</span>
                      </div>
                    </div>
                  </div>

                  {item.disclosedFaults.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[11px] text-[#C53030]">
                      <strong>Disclosed Limitations:</strong>{' '}
                      {item.disclosedFaults.map((f) => toSimpleEnglish(f).label).join(' · ')}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Locked Fulfilment & Gift Context */}
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3 text-xs">
            <h2 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
              {safeView.isGift ? (
                <Gift className="w-4 h-4 text-[#A981FF]" />
              ) : (
                <MapPin className="w-4 h-4 text-[#A981FF]" />
              )}
              {safeView.isGift ? 'Gift Fulfilment Summary (Locked)' : 'Delivery Arrangement (Locked)'}
            </h2>

            {safeView.isGift ? (
              <div className="p-3.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] space-y-1.5 text-[#30102F]">
                <div>
                  <strong>Recipient:</strong> {safeView.giftRecipientFirstName || 'Gift Recipient'} ·{' '}
                  {safeView.deliveryDestinationSummary}
                </div>
                {safeView.giftOccasion && (
                  <div>
                    <strong>Occasion:</strong> {safeView.giftOccasion}
                  </div>
                )}
                <div>
                  <strong>Sender Privacy Preference:</strong>{' '}
                  {safeView.giftSenderVisibility === 'anonymous'
                    ? 'Anonymous gift send (sender name hidden from recipient)'
                    : 'Sender name visible to recipient'}
                </div>
                <div className="text-[11px] text-[#4A4356] pt-1">
                  Package will omit all prices &amp; payment receipts. Special gift wrap is not
                  guaranteed.
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center gap-2 text-[#4A4356]">
                <Truck className="w-4 h-4 text-[#A981FF] shrink-0" />
                <span>
                  {safeView.deliveryMethod === 'physical_pickup'
                    ? `In-Store Pickup selected (${safeView.deliveryDestinationSummary})`
                    : `Vendor-Managed Delivery to ${safeView.deliveryDestinationSummary}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cost Breakdown + Payer Checkout Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3 text-xs">
            <h2 className="text-sm font-semibold text-[#211B2B]">Authoritative Cost Breakdown</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-[#716B7B]">
                <span>Product Subtotal</span>
                <span className="font-medium text-[#211B2B] tabular-nums">
                  {formatNaira(safeView.subtotalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-[#716B7B]">
                <span>Customer Platform Service Fee ({feePctText})</span>
                <span className="font-medium text-[#211B2B] tabular-nums">
                  {formatNaira(safeView.customer_platform_service_fee)}
                </span>
              </div>
              <div className="flex justify-between text-[#716B7B]">
                <span>
                  {safeView.deliveryMethod === 'physical_pickup'
                    ? 'In-Store Pickup'
                    : `Vendor-Managed Delivery (${safeView.vendorCount} vendor${
                        safeView.vendorCount === 1 ? '' : 's'
                      })`}
                </span>
                <span className="font-medium text-[#211B2B] tabular-nums">
                  {safeView.deliveryFeeTotal === 0 ? 'Free (₦0)' : formatNaira(safeView.deliveryFeeTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[#211B2B] pt-2 border-t border-[#EAE6F0]">
                <span>Total Payable</span>
                <span className="tabular-nums">{formatNaira(safeView.totalPayableAmount)}</span>
              </div>
            </div>
            <p className="text-[11px] text-[#716B7B]">
              Single fee only — UsedRight never charges a second customer service fee when someone
              else pays on your behalf.
            </p>
          </div>

          {isPayable && (
            <form
              onSubmit={handlePaySubmit}
              className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs"
            >
              <div>
                <h2 className="text-sm font-semibold text-[#211B2B]">
                  Payer Details (For Your Payment Receipt)
                </h2>
                <p className="text-[11px] text-[#716B7B] mt-0.5">
                  No UsedRight account required. Complete payment securely on behalf of{' '}
                  {safeView.orderOwnerDisplayName}.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="payer-full-name" className="block font-medium text-[#211B2B] mb-1">
                    Payer Full Name *
                  </label>
                  <input
                    id="payer-full-name"
                    type="text"
                    required
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="e.g. Chinedu Olayinka"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
                  />
                </div>
                <div>
                  <label htmlFor="payer-email" className="block font-medium text-[#211B2B] mb-1">
                    Payer Email (Receipt Delivery) *
                  </label>
                  <input
                    id="payer-email"
                    type="email"
                    required
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
                  />
                </div>
                <div>
                  <label htmlFor="payer-phone" className="block font-medium text-[#211B2B] mb-1">
                    Payer Nigerian Phone *
                  </label>
                  <input
                    id="payer-phone"
                    type="tel"
                    required
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="0803 123 4567"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
                  />
                </div>
              </div>

              {/* Isolated Demo Paystack Simulator Outcome */}
              <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#D0BCFC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#211B2B] flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#A981FF]" />
                    Demo Paystack Outcome
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F0FF] text-[#30102F] font-medium">
                    Demo Mode Only
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
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
                        setOutcome(opt.id);
                        setErrorMsg(null);
                      }}
                      className={`py-2 px-2 rounded-lg border text-[11px] font-medium transition-colors ${
                        outcome === opt.id
                          ? 'border-[#A981FF] bg-[#A981FF] text-white'
                          : 'border-[#EAE6F0] bg-white text-[#211B2B]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div
                  data-testid="payment-request-error"
                  className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-medium"
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                data-testid="payment-request-pay-btn"
                className="w-full py-3 px-4 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 min-h-[48px] tabular-nums"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Pay {formatNaira(safeView.totalPayableAmount)} Now
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentRequestPage;
