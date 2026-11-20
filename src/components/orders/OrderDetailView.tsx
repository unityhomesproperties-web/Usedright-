import React, { useState } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  Clock,
  Truck,
  AlertOctagon,
  CheckCircle2,
  FileText,
  Store,
  KeyRound,
  PackageCheck,
  Lock,
  X,
  Phone,
  CalendarClock,
  Layers,
  Copy,
  RefreshCw,
  UserCheck,
  AlertTriangle,
  Wrench,
  Gift,
  ExternalLink,
  CreditCard,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';
import {
  DeliveryProblemType,
  DisputeRecord,
  Order,
  OrderStatus,
  PaymentHold,
  RecipientComplaintRecord,
  WarrantyClaim,
  WarrantyClaimCategory,
} from '../../types/marketplace';
import {
  formatCountdown,
  formatNaira,
  getOrderStageIndex,
  ORDER_STAGES_8,
} from '../../utils/marketplace';
import { mapCosmeticGrade } from '../../utils/deviceCondition';
import {
  createOrderWarrantySnapshot,
  getWarrantyDaysRemaining,
  isWarrantyActive,
  ORDER_ARRIVAL_MESSAGE_HEADLINE,
  WARRANTY_CLAIM_CATEGORIES,
} from '../../utils/warranty';
import { toSimpleEnglish } from '../../utils/simpleEnglish';
import {
  canRolePerformOrderAction,
  getRoleSafeDisputeView,
} from '../../utils/transactionEngine';
import {
  deriveOrderStatusSummary,
  isDeliveryPinAllowedForViewer,
} from '../../utils/orderStatusUi';
import { SmartImage } from '../common/SmartImage';

interface OrderDetailViewProps {
  order: Order;
  siblingSubOrders?: Order[];
  paymentHold?: PaymentHold;
  dispute?: DisputeRecord;
  warrantyClaims?: WarrantyClaim[];
  recipientComplaints?: RecipientComplaintRecord[];
  viewerRole: 'buyer' | 'vendor' | 'admin';
  onBack: () => void;
  onSelectOrder?: (orderId: string) => void;
  onOpenChat: (orderId: string) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  onConfirmReceipt?: (orderId: string) => void;
  onAcceptOrder?: (orderId: string) => void;
  onOpenDisputeInChat?: (orderId: string) => void;
  onResendDeliveryPin?: (orderId: string) => void;
  onSetAlternativeRecipient?: (
    orderId: string,
    recipient: { name: string; phone: string; relationship: string; note?: string }
  ) => { error?: string } | void;
  onSubmitWarrantyClaim?: (payload: {
    orderId: string;
    issueCategory: WarrantyClaimCategory;
    description: string;
    attachmentNames?: string[];
  }) => { error?: string } | void;
  onReportDeliveryProblem?: (payload: {
    orderId: string;
    type: DeliveryProblemType;
    details: string;
    requestedNewDate?: string;
  }) => void;
  onViewVendorStorefront?: (vendorId: string) => void;
  onViewProduct?: (listingId: string) => void;
  onOpenGiftRecipientPortal?: (orderId: string, recipientToken?: string) => void;
  onOpenPolicyCentre?: () => void;
  onOpenHelp?: () => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order,
  siblingSubOrders = [],
  paymentHold,
  dispute,
  warrantyClaims = [],
  recipientComplaints = [],
  viewerRole,
  onBack,
  onSelectOrder,
  onOpenChat,
  onUpdateStatus,
  onConfirmReceipt,
  onAcceptOrder,
  onOpenDisputeInChat,
  onResendDeliveryPin,
  onSetAlternativeRecipient,
  onSubmitWarrantyClaim,
  onReportDeliveryProblem,
  onViewVendorStorefront,
  onViewProduct,
  onOpenGiftRecipientPortal,
  onOpenPolicyCentre,
  onOpenHelp,
}) => {
  const [confirmReceiptModalOpen, setConfirmReceiptModalOpen] = useState(false);
  const [deliveryProblemOpen, setDeliveryProblemOpen] = useState(false);
  const [problemType, setProblemType] = useState<DeliveryProblemType>('reschedule_requested');
  const [problemDetails, setProblemDetails] = useState('');
  const [problemRescheduleDate, setProblemRescheduleDate] = useState('');
  const [problemSubmittedNotice, setProblemSubmittedNotice] = useState(false);

  const [pinCopiedNotice, setPinCopiedNotice] = useState(false);
  const [pinResentNotice, setPinResentNotice] = useState(false);
  const [altRecipientOpen, setAltRecipientOpen] = useState(false);
  const [altName, setAltName] = useState(order.alternativeRecipient?.name || '');
  const [altPhone, setAltPhone] = useState(order.alternativeRecipient?.phone || '');
  const [altRelationship, setAltRelationship] = useState(
    order.alternativeRecipient?.relationship || 'Sibling / Family'
  );
  const [altNote, setAltNote] = useState(order.alternativeRecipient?.note || '');
  const [altError, setAltError] = useState<string | null>(null);
  const [altSavedNotice, setAltSavedNotice] = useState(false);

  const [warrantyModalOpen, setWarrantyModalOpen] = useState(false);
  const [claimCategory, setClaimCategory] = useState<WarrantyClaimCategory>(
    WARRANTY_CLAIM_CATEGORIES[0]
  );
  const [claimDescription, setClaimDescription] = useState('');
  const [claimAttachmentName, setClaimAttachmentName] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccessNotice, setClaimSuccessNotice] = useState<string | null>(null);
  const [warrantyTermsExpanded, setWarrantyTermsExpanded] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);

  const safeDispute = dispute
    ? getRoleSafeDisputeView(
        dispute,
        viewerRole === 'admin' ? 'admin' : viewerRole === 'vendor' ? 'seller_approved' : 'buyer'
      )
    : undefined;

  const remainingSeconds =
    order.inspectionRemainingSeconds ??
    order.inspectionSecondsRemaining ??
    paymentHold?.remainingSeconds ??
    0;

  const variation = order.selectedVariation || order.variation;
  const knownIssues =
    variation?.disclosedFaults || order.listing.disclosedFaults || [];

  const isAwaitingBuyerReceipt =
    (order.fulfillmentStatus === 'In transit' ||
      order.fulfillmentStatus === 'Ready for Pickup' ||
      order.fulfillmentStatus === 'Delivered') &&
    !order.buyerConfirmedReceipt;

  const buyerReceiptPermission = canRolePerformOrderAction(
    viewerRole,
    'confirm_customer_receipt',
    order.fulfillmentStatus
  );

  const inspectionHours = order.inspectionWindowHours || 24;
  const stageIndex = getOrderStageIndex(order);

  const feeBase = order.feeBaseAmount ?? order.itemPrice + (order.accessoriesPrice || 0);
  const customerFee =
    order.customer_platform_service_fee ?? order.buyerServiceCharge ?? 0;
  const vendorFee =
    order.vendor_platform_service_fee ??
    paymentHold?.vendor_platform_service_fee ??
    paymentHold?.platformFeeVendor ??
    0;
  const expectedVendorPayout =
    paymentHold?.netVendorPayout ?? Math.max(0, feeBase - vendorFee);

  const showConfidentialOtpCard = isDeliveryPinAllowedForViewer(order, viewerRole);

  const orderSummary = deriveOrderStatusSummary({
    order,
    paymentHold,
    dispute: safeDispute,
    viewerRole,
    remainingSeconds,
  });

  const orderRecipientComplaints = recipientComplaints.filter((c) => c.orderId === order.id);

  const isDeliveryVerifiedOrArrived = Boolean(
    order.deliveryCodeUsedAt ||
      order.buyerConfirmedReceipt ||
      order.fulfillmentStatus === 'Delivered_In_Inspection' ||
      order.fulfillmentStatus === 'Delivered' ||
      order.fulfillmentStatus === 'Completed'
  );

  const orderWarranty =
    order.warranty ||
    createOrderWarrantySnapshot({
      orderId: order.id,
      orderNumber: order.subOrderNumber || order.orderNumber,
      listing: order.listing,
      deliveredAtIso: isDeliveryVerifiedOrArrived
        ? order.deliveryCodeUsedAt || order.deliveredAt || new Date().toISOString()
        : undefined,
    });
  const warrantyDaysLeft = getWarrantyDaysRemaining(orderWarranty);
  const warrantyActive = isWarrantyActive(orderWarranty);
  const orderClaims = warrantyClaims.filter((c) => c.orderId === order.id);

  const handleCopyPin = () => {
    if (!order.deliveryVerificationCode) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(order.deliveryVerificationCode).catch(() => {});
    }
    setPinCopiedNotice(true);
    setTimeout(() => setPinCopiedNotice(false), 2000);
  };

  const handleSubmitAlternativeRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSetAlternativeRecipient) return;
    setAltError(null);
    const res = onSetAlternativeRecipient(order.id, {
      name: altName.trim(),
      phone: altPhone.trim(),
      relationship: altRelationship.trim(),
      note: altNote.trim() || undefined,
    });
    if (res && typeof res === 'object' && res.error) {
      setAltError(res.error);
      return;
    }
    setAltRecipientOpen(false);
    setAltSavedNotice(true);
    setTimeout(() => setAltSavedNotice(false), 3000);
  };

  const handleSubmitWarrantyClaimForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitWarrantyClaim) return;
    if (claimDescription.trim().length < 15) {
      setClaimError('Please describe the hardware fault in detail (at least 15 characters).');
      return;
    }
    setClaimError(null);
    const res = onSubmitWarrantyClaim({
      orderId: order.id,
      issueCategory: claimCategory,
      description: claimDescription.trim(),
      attachmentNames: claimAttachmentName.trim() ? [claimAttachmentName.trim()] : [],
    });
    if (res && typeof res === 'object' && res.error) {
      setClaimError(res.error);
      return;
    }
    setWarrantyModalOpen(false);
    setClaimDescription('');
    setClaimAttachmentName('');
    setClaimSuccessNotice('3-Month Warranty claim submitted. The vendor and UsedRight Support have been notified.');
  };

  const handleSubmitDeliveryProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onReportDeliveryProblem || !problemDetails.trim()) return;
    onReportDeliveryProblem({
      orderId: order.id,
      type: problemType,
      details: problemDetails.trim(),
      requestedNewDate: problemRescheduleDate.trim() || undefined,
    });
    setDeliveryProblemOpen(false);
    setProblemDetails('');
    setProblemRescheduleDate('');
    setProblemSubmittedNotice(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:pb-12 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4A4356] hover:text-[#A981FF]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onOpenChat(order.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium min-h-[44px]"
          >
            <MessageSquare className="w-4 h-4" />
            {viewerRole === 'vendor' ? 'Open Customer Chat' : 'Open Transaction Chat'}
          </button>

          {viewerRole === 'buyer' &&
            onReportDeliveryProblem &&
            order.fulfillmentStatus !== 'Completed' &&
            order.fulfillmentStatus !== 'Refunded' && (
              <button
                type="button"
                onClick={() => setDeliveryProblemOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#EAE6F0] hover:border-[#A981FF] text-[#211B2B] text-xs font-medium min-h-[44px]"
              >
                <CalendarClock className="w-4 h-4 text-[#A981FF]" />
                Delivery Issue / Reschedule
              </button>
            )}

          {viewerRole === 'buyer' &&
            order.fulfillmentStatus !== 'Completed' &&
            order.fulfillmentStatus !== 'Refunded' &&
            !safeDispute &&
            onOpenDisputeInChat && (
              <button
                type="button"
                onClick={() => onOpenDisputeInChat(order.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] text-xs font-medium min-h-[44px]"
              >
                <AlertOctagon className="w-4 h-4" />
                Report a Problem
              </button>
            )}
        </div>
      </div>

      {/* Sibling Vendor Sub-Orders Switcher when Parent Order has >1 vendor */}
      {siblingSubOrders.length > 1 && onSelectOrder && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#211B2B] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#A981FF]" />
              Parent Order{' '}
              <span className="font-mono text-[#7E4EF2]">
                {order.parentOrderNumber || order.orderNumber}
              </span>{' '}
              · {siblingSubOrders.length} Vendor Fulfilments
            </span>
            <span className="text-[11px] text-[#716B7B]">
              Each vendor sub-order tracks dispatch &amp; inspection independently
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {siblingSubOrders.map((sub) => {
              const active = sub.id === order.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectOrder(sub.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#F5F0FF] border-[#A981FF] text-[#211B2B]'
                      : 'bg-[#FAF9FC] border-[#EAE6F0] text-[#716B7B] hover:border-[#A981FF]'
                  }`}
                >
                  <span className="font-mono">{sub.subOrderNumber || sub.orderNumber}</span> ·{' '}
                  {sub.vendorName || sub.listing.sellerName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {problemSubmittedNotice && (
        <div className="p-3.5 rounded-2xl bg-[#F5F0FF] border border-[#D0BCFC] text-xs text-[#211B2B] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#A981FF] shrink-0" />
          <span>
            Delivery report recorded. Both the vendor and UsedRight Support have been notified in your notifications and audit log.
          </span>
        </div>
      )}

      {/* FAILED DELIVERY ATTEMPT NOTICE */}
      {order.deliveryAttemptFailedReason && (
        <div className="p-4 rounded-2xl bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Delivery Attempt Marked Failed — Action Required
          </div>
          <p>{order.deliveryAttemptFailedReason}</p>
          {order.deliveryRescheduledWindow && (
            <p className="font-medium text-[#211B2B]">
              Proposed Redelivery Window: {order.deliveryRescheduledWindow}
            </p>
          )}
        </div>
      )}

      {/* ARRIVAL CONFIRMATION CARD (POST-DELIVERY) */}
      {viewerRole === 'buyer' && isDeliveryVerifiedOrArrived && (
        <div
          data-testid="buyer-order-arrival-card"
          className="bg-[#F5F0FF] rounded-2xl border-2 border-[#A981FF] p-5 space-y-3 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-base font-semibold text-[#211B2B]">
                {ORDER_ARRIVAL_MESSAGE_HEADLINE}
              </div>
              <p className="text-xs text-[#4A4356] leading-relaxed max-w-2xl">
                Delivery of <strong className="text-[#211B2B]">{order.listing.title}</strong> is confirmed
                {order.deliveryCodeUsedAt ? ` (${new Date(order.deliveryCodeUsedAt).toLocaleString()})` : ''}. Please inspect your package thoroughly. If anything needs attention, open your Order Chat and select <strong className="text-[#211B2B]">&ldquo;Open Dispute&rdquo;</strong> within {inspectionHours} hours
                {order.inspectionExpiresAt ? ` (deadline: ${new Date(order.inspectionExpiresAt).toLocaleString()})` : ''}.
              </p>
              <p className="text-[11px] font-semibold text-[#30102F]">
                Know Exactly What You’re Buying.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenChat(order.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-semibold min-h-[40px]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Open Transaction Chat
              </button>
              <a
                href="#order-warranty-section"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D0BCFC] text-[#30102F] text-xs font-semibold min-h-[40px]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#A981FF]" />
                {orderWarranty.durationMonths}-Month Warranty
              </a>
            </div>
          </div>
        </div>
      )}

      {/* GIFT ORDER PRIVACY & RECIPIENT PORTAL SUMMARY */}
      {order.isGift && order.giftDetails && (
        <div
          data-testid="order-detail-gift-summary"
          className="bg-white rounded-2xl border-2 border-[#D0BCFC] p-5 space-y-3 text-xs shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#A981FF] flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-[#211B2B]">
                  Gift Order · Delivery to {order.giftDetails.recipientName}
                </h2>
                <p className="text-[#716B7B]">
                  {order.giftDetails.occasion ? `Occasion: ${order.giftDetails.occasion} · ` : ''}
                  Visibility:{' '}
                  <strong className="text-[#211B2B]">
                    {order.giftDetails.senderVisibility === 'anonymous'
                      ? 'Anonymous Sender (sender name hidden from recipient & box)'
                      : `Named Sender (${order.giftDetails.senderDisplayName || order.buyerName})`}
                  </strong>
                </p>
              </div>
            </div>

            {onOpenGiftRecipientPortal && viewerRole !== 'vendor' && (
              <button
                type="button"
                onClick={() =>
                  onOpenGiftRecipientPortal(order.id, order.giftDetails?.recipientPortalToken)
                }
                data-testid="order-detail-open-gift-portal-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Gift Recipient Portal
              </button>
            )}
          </div>

          {order.giftDetails.giftMessage && (
            <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] italic text-[#211B2B]">
              &ldquo;{order.giftDetails.giftMessage}&rdquo;
            </div>
          )}

          <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F] space-y-1">
            <div>
              <strong>Gift Packing &amp; PIN Privacy:</strong> Prices, platform fees, and payment receipts are omitted from the parcel. Special gift wrapping is not guaranteed.
            </div>
            <div>
              {viewerRole === 'buyer'
                ? 'Confidential 6-digit Delivery Verification PIN is routed privately to the gift recipient via the Gift Recipient Portal.'
                : viewerRole === 'vendor'
                ? 'Vendor Notice: Do NOT print prices, service fees, or receipts inside the parcel. Ask the gift recipient for their 6-digit Delivery PIN on handover.'
                : 'Gift recipient PIN & complaint escalation active without purchaser price exposure.'}
            </div>
          </div>
        </div>
      )}

      {/* THIRD-PARTY PAYER & REFUND TRACEABILITY CARD */}
      {order.payerInfo && viewerRole !== 'vendor' && (
        <div
          data-testid="order-detail-payer-card"
          className="bg-white rounded-2xl border border-[#EAE6F0] p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-start gap-2.5">
            <CreditCard className="w-4 h-4 text-[#A981FF] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[#211B2B]">
                Paid on Behalf of Order Owner by {order.payerInfo.payerName}
              </div>
              <div className="text-[11px] text-[#716B7B]">
                {order.paymentRequestReference ? `Request ${order.paymentRequestReference} · ` : ''}
                Payment Ref:{' '}
                <span className="font-mono text-[#211B2B]">
                  {order.payerInfo.paymentProviderRef || order.transactionNumber}
                </span>
              </div>
              {order.refundTargetSummary && (
                <div className="text-[11px] text-[#30102F] mt-0.5">{order.refundTargetSummary}</div>
              )}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] text-[11px] font-medium text-[#4A4356]">
            Refunds trace to original payment channel
          </span>
        </div>
      )}

      {/* GIFT RECIPIENT PROBLEM REPORTS */}
      {orderRecipientComplaints.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#FED7D7] p-4 space-y-2 text-xs">
          <div className="font-semibold text-[#C53030] flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4" />
            Gift Recipient Problem Reports ({orderRecipientComplaints.length})
          </div>
          {orderRecipientComplaints.map((cmp) => (
            <div key={cmp.id} className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] space-y-1">
              <div className="flex justify-between font-medium text-[#211B2B]">
                <span className="font-mono">{cmp.complaintNumber} · {cmp.category}</span>
                <span className="text-[#C53030]">{cmp.status}</span>
              </div>
              <p className="text-[#4A4356]">{cmp.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* CONFIDENTIAL DELIVERY VERIFICATION CODE CARD (BUYER ONLY) */}
      {showConfidentialOtpCard && (
        <div
          data-testid="buyer-delivery-otp-card"
          className="bg-white rounded-2xl border-2 border-[#A981FF] p-5 space-y-3.5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#7E4EF2] flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#211B2B]">
                  Your Confidential 6-Digit Delivery PIN
                </h2>
                <p className="text-[11px] text-[#716B7B]">
                  Private buyer PIN · Separate from Public Package Ref ({order.subOrderNumber || order.orderNumber})
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                data-testid="buyer-delivery-pin-value"
                className="px-4 py-2 rounded-xl bg-[#211B2B] text-white font-mono text-lg font-bold tracking-[0.22em] tabular-nums"
              >
                {order.deliveryVerificationCode}
              </div>
              <button
                type="button"
                onClick={handleCopyPin}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] text-xs font-medium text-[#211B2B] min-h-[40px]"
              >
                <Copy className="w-3.5 h-3.5 text-[#A981FF]" />
                {pinCopiedNotice ? 'Copied' : 'Copy PIN'}
              </button>
              {onResendDeliveryPin && (
                <button
                  type="button"
                  onClick={() => {
                    onResendDeliveryPin(order.id);
                    setPinResentNotice(true);
                    setTimeout(() => setPinResentNotice(false), 3000);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#D0BCFC] bg-[#F5F0FF] text-xs font-medium text-[#30102F] min-h-[40px]"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#7E4EF2]" />
                  Refresh PIN
                </button>
              )}
            </div>
          </div>

          {pinResentNotice && (
            <div className="text-[11px] font-medium text-[#7E4EF2]">
              A fresh 6-digit single-use Delivery PIN has been generated for this order.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#716B7B]">
            <span>
              PIN Expiry:{' '}
              <strong className="text-[#211B2B]">
                {order.deliveryCodeExpiresAt
                  ? new Date(order.deliveryCodeExpiresAt).toLocaleString()
                  : 'Active until handover'}
              </strong>
            </span>
            <span>
              Failed Verification Attempts:{' '}
              <strong className="text-[#211B2B] tabular-nums">
                {order.deliveryCodeAttempts || 0} / 5
              </strong>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] font-medium">
            Only share this 6-digit PIN when you have physically inspected the parcel at delivery. Public Order Refs ({order.subOrderNumber || order.orderNumber}) cannot be used to confirm delivery.
          </div>

          {/* Authorise Alternative Recipient */}
          <div className="pt-1 border-t border-[#EAE6F0] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[#4A4356] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#A981FF]" />
                {order.alternativeRecipient ? (
                  <span>
                    Authorised Alternative Recipient:{' '}
                    <strong className="text-[#211B2B]">
                      {order.alternativeRecipient.name} ({order.alternativeRecipient.relationship})
                    </strong>{' '}
                    · {order.alternativeRecipient.phone}
                  </span>
                ) : (
                  <span>Won&apos;t be around? Authorise a trusted person to collect on your behalf.</span>
                )}
              </div>
              {onSetAlternativeRecipient && (
                <button
                  type="button"
                  onClick={() => setAltRecipientOpen((v) => !v)}
                  className="text-xs font-semibold text-[#7E4EF2] hover:underline"
                >
                  {altRecipientOpen
                    ? 'Close Form'
                    : order.alternativeRecipient
                    ? 'Update Recipient'
                    : 'Authorise Alternative Recipient'}
                </button>
              )}
            </div>

            {altSavedNotice && (
              <div className="text-[11px] font-medium text-[#7E4EF2]">
                Alternative recipient updated and shared with the vendor for safe handover.
              </div>
            )}

            {altRecipientOpen && onSetAlternativeRecipient && (
              <form
                onSubmit={handleSubmitAlternativeRecipient}
                className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs"
              >
                {altError && (
                  <div className="sm:col-span-2 text-[#C53030] font-medium">{altError}</div>
                )}
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Recipient Full Name</label>
                  <input
                    type="text"
                    required
                    value={altName}
                    onChange={(e) => setAltName(e.target.value)}
                    placeholder="e.g. Tolu Olayinka"
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE6F0] bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Recipient Phone</label>
                  <input
                    type="tel"
                    required
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="0803 111 2222"
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE6F0] bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Relationship</label>
                  <input
                    type="text"
                    required
                    value={altRelationship}
                    onChange={(e) => setAltRelationship(e.target.value)}
                    placeholder="e.g. Spouse, Office Reception"
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE6F0] bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Handover Note (Optional)</label>
                  <input
                    type="text"
                    value={altNote}
                    onChange={(e) => setAltNote(e.target.value)}
                    placeholder="e.g. At front security desk"
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE6F0] bg-white"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
                  >
                    Save Authorised Recipient
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="text-[11px] text-[#716B7B]">
            Once the vendor&apos;s dispatcher or pickup desk verifies this PIN in person, your{' '}
            <strong className="text-[#211B2B]">{inspectionHours}-hour inspection window</strong> starts automatically while your funds stay safely protected.
          </p>
        </div>
      )}

      {/* TOP ORDER & ESCROW STATUS OVERVIEW */}
      <div
        data-testid="order-status-overview"
        className="bg-white rounded-2xl border border-[#EAE6F0] p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#211B2B]">
              {orderSummary.orderStatusLabel}
            </h2>
            <p className="text-[11px] text-[#716B7B]">
              {order.deliveryMethod === 'physical_pickup'
                ? 'In-Store Pickup fulfilment & protected inspection flow'
                : 'Vendor-managed delivery & protected inspection flow'}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-xs font-medium text-[#30102F]">
            Stage {Math.min(stageIndex + 1, ORDER_STAGES_8.length)} of {ORDER_STAGES_8.length}
          </span>
        </div>

        {/* Distinct Status Grid: Order, Payment, Delivery, Inspection */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-[#FAF8F4] border border-[#EAE6F0]">
            <div className="text-[10px] font-medium text-[#716B7B]">Order Stage</div>
            <div className="font-semibold text-[#211B2B] mt-0.5 leading-snug">
              {orderSummary.orderStatusLabel}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF8F4] border border-[#EAE6F0]">
            <div className="text-[10px] font-medium text-[#716B7B]">Payment Status</div>
            <div
              className={`font-semibold mt-0.5 leading-snug ${
                orderSummary.paymentTone === 'paused' || orderSummary.paymentTone === 'refunded'
                  ? 'text-[#C53030]'
                  : orderSummary.paymentTone === 'released'
                  ? 'text-[#065F46]'
                  : 'text-[#5B37B7]'
              }`}
            >
              {orderSummary.paymentStatusLabel}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF8F4] border border-[#EAE6F0]">
            <div className="text-[10px] font-medium text-[#716B7B]">Delivery Status</div>
            <div
              className={`font-semibold mt-0.5 leading-snug ${
                orderSummary.deliveryTone === 'issue'
                  ? 'text-[#C53030]'
                  : orderSummary.deliveryTone === 'verified'
                  ? 'text-[#065F46]'
                  : 'text-[#211B2B]'
              }`}
            >
              {orderSummary.deliveryStatusLabel}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC]">
            <div className="text-[10px] font-medium text-[#5B37B7]">
              {inspectionHours}h Inspection Status
            </div>
            <div
              data-testid="order-inspection-status-value"
              className={`font-semibold mt-0.5 leading-snug tabular-nums ${
                orderSummary.inspectionTone === 'paused'
                  ? 'text-[#C53030]'
                  : orderSummary.inspectionTone === 'active'
                  ? 'text-[#5B37B7]'
                  : 'text-[#30102F]'
              }`}
            >
              {orderSummary.inspectionTone === 'active'
                ? orderSummary.inspectionRemainingText
                : orderSummary.inspectionStatusLabel}
            </div>
          </div>
        </div>

        {/* Verified Receipt & 24-Hour Inspection Window Timestamps */}
        {orderSummary.hasVerifiedReceipt && (
          <div
            data-testid="order-inspection-timestamps"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#FAF8F4] border border-[#EAE6F0] text-xs"
          >
            <div>
              <div className="text-[10px] text-[#716B7B]">Receipt / Inspection Started</div>
              <div className="font-medium text-[#211B2B] mt-0.5">
                {orderSummary.inspectionStartedAt
                  ? new Date(orderSummary.inspectionStartedAt).toLocaleString()
                  : 'Confirmed on delivery'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#716B7B]">Inspection Deadline</div>
              <div className="font-medium text-[#211B2B] mt-0.5">
                {orderSummary.inspectionDeadlineAt
                  ? new Date(orderSummary.inspectionDeadlineAt).toLocaleString()
                  : `${inspectionHours} hours from receipt`}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#716B7B]">Remaining Inspection Time</div>
              <div className="font-semibold text-[#5B37B7] mt-0.5 tabular-nums flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{orderSummary.inspectionRemainingText}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {ORDER_STAGES_8.map((stageLabel, idx) => {
            const done = idx <= stageIndex;
            const current = idx === stageIndex;
            return (
              <div key={stageLabel} className="space-y-1.5">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    done ? 'bg-[#A981FF]' : 'bg-[#EAE6F0]'
                  }`}
                />
                <div className="flex items-start gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0 ${
                      current
                        ? 'bg-[#A981FF] text-white'
                        : done
                        ? 'bg-[#F5F0FF] text-[#7E4EF2] border border-[#D0BCFC]'
                        : 'bg-[#FAF9FC] text-[#716B7B] border border-[#EAE6F0]'
                    }`}
                  >
                    {done && idx < stageIndex ? '✓' : idx + 1}
                  </span>
                  <span
                    className={`text-[11px] leading-tight ${
                      done ? 'font-medium text-[#211B2B]' : 'text-[#716B7B]'
                    }`}
                  >
                    {stageLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* PROMINENT BUYER RECEIPT PROMPT */}
        {viewerRole === 'buyer' && isAwaitingBuyerReceipt && onConfirmReceipt && (
          <div className="p-4 rounded-2xl bg-[#F5F0FF] border-2 border-[#A981FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[#211B2B] flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-[#A981FF]" />
                Have you physically received your device?
              </div>
              <p className="text-xs text-[#4A4356]">
                Confirming receipt starts your {inspectionHours}-hour inspection period while payment stays safely protected.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmReceiptModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-semibold whitespace-nowrap min-h-[44px] shrink-0"
            >
              I&apos;ve Received My Order
            </button>
          </div>
        )}
      </div>

      {/* Order Header Card */}
      <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EAE6F0] pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold font-mono text-[#211B2B]">
                {order.subOrderNumber || order.orderNumber}
              </h1>
              {order.parentOrderNumber && order.parentOrderNumber !== order.orderNumber && (
                <span className="px-2 py-0.5 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] font-mono text-[11px] text-[#716B7B]">
                  Parent: {order.parentOrderNumber}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-lg bg-[#F5F0FF] text-[#211B2B] border border-[#D0BCFC] text-xs font-medium">
                {order.fulfillmentStatus.replace(/_/g, ' ')}
              </span>
              {safeDispute && (
                <span className="px-2.5 py-0.5 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] text-xs font-medium">
                  Dispute: {safeDispute.status} ({safeDispute.disputeNumber})
                </span>
              )}
            </div>
            <div className="text-xs text-[#716B7B] flex flex-wrap gap-3">
              <span>
                Transaction Ref:{' '}
                <strong className="font-mono text-[#211B2B]">
                  {order.transactionNumber || paymentHold?.transactionNumber || 'Pending'}
                </strong>
              </span>
              <span>
                Vendor ID:{' '}
                <strong className="font-mono text-[#211B2B]">
                  {order.vendorNumber || 'UR-VND-000101'}
                </strong>
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs text-[#716B7B]">
              {viewerRole === 'vendor' ? 'Expected Vendor Payout' : 'Sub-Order Total'}
            </div>
            <div className="text-xl font-semibold text-[#211B2B] tabular-nums">
              {viewerRole === 'vendor'
                ? formatNaira(expectedVendorPayout)
                : formatNaira(order.totalAmount)}
            </div>
          </div>
        </div>

        {/* Snapshot Product & Variation */}
        <div className="flex flex-col sm:flex-row gap-4">
          <SmartImage
            src={variation?.images?.[0] || order.listing.images[0]}
            alt={order.listing.title}
            category={order.listing.category}
            className="w-24 h-24 rounded-xl object-cover border border-[#EAE6F0] shrink-0"
          />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#211B2B]">{order.listing.title}</h2>
              {onViewProduct && (
                <button
                  type="button"
                  onClick={() => onViewProduct(order.listing.id)}
                  className="text-xs font-medium text-[#7E4EF2] hover:underline"
                >
                  View Listing Snapshot
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-[#4A4356]">
              <span className="px-2 py-0.5 rounded bg-[#FAF9FC] border border-[#EAE6F0]">
                Colour: {variation?.color || order.listing.color}
              </span>
              {(variation?.storage || order.listing.storage) && (
                <span className="px-2 py-0.5 rounded bg-[#FAF9FC] border border-[#EAE6F0]">
                  Storage: {variation?.storage || order.listing.storage}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-[#FAF9FC] border border-[#EAE6F0]">
                Condition: {mapCosmeticGrade(variation?.grade || order.listing.cosmeticGrade).label} ({variation?.grade || order.listing.cosmeticGrade}) · Pre-Owned
              </span>
            </div>

            {order.items && order.items.length > 1 && (
              <div className="text-[11px] text-[#716B7B]">
                Includes {order.items.length} line items from {order.vendorName || order.listing.sellerName}:{' '}
                {order.items.map((i) => `${i.listing.title} (×${i.quantity || 1})`).join(', ')}
              </div>
            )}

            {knownIssues.length > 0 && (
              <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] space-y-1">
                <div className="font-semibold">Disclosed Issues Included in Order Snapshot:</div>
                {knownIssues.map((issue, i) => (
                  <div key={i}>• {toSimpleEnglish(issue).label}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Hold, Inspection & Vendor-Managed Dispatch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#A981FF]" />
            Payment Hold, Fees &amp; Inspection Window
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#716B7B]">Hold Status</span>
              <span className="font-medium text-[#211B2B]">
                {paymentHold?.status || 'Payment Received'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#716B7B]">Inspection Window</span>
              <span className="font-medium text-[#211B2B]">
                {inspectionHours} hours after delivery confirmation
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#716B7B]">Time Remaining</span>
              <span className="font-semibold text-[#7E4EF2] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {order.disputePaused
                  ? 'Paused (Dispute Open)'
                  : order.fulfillmentStatus === 'Delivered_In_Inspection' ||
                    order.buyerConfirmedReceipt
                  ? remainingSeconds > 0
                    ? formatCountdown(remainingSeconds)
                    : 'Ended'
                  : 'Starts after delivery code / receipt confirmation'}
              </span>
            </div>

            {viewerRole === 'vendor' ? (
              <>
                <div className="flex justify-between border-t border-[#EAE6F0] pt-2">
                  <span className="text-[#716B7B]">Eligible Product Subtotal</span>
                  <span className="tabular-nums">{formatNaira(feeBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716B7B]">Vendor Platform Service Fee (Up to 1%)</span>
                  <span className="tabular-nums text-[#716B7B]">-{formatNaira(vendorFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-[#211B2B]">
                  <span>Expected Vendor Payout</span>
                  <span className="tabular-nums">{formatNaira(expectedVendorPayout)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between border-t border-[#EAE6F0] pt-2">
                  <span className="text-[#716B7B]">Product Subtotal</span>
                  <span className="tabular-nums">{formatNaira(feeBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716B7B]">Customer Platform Service Fee (Up to 0.7%)</span>
                  <span className="tabular-nums">{formatNaira(customerFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716B7B]">Fixed Delivery Fee</span>
                  <span className="tabular-nums">
                    {order.deliveryFee === 0 ? 'Free (Pickup)' : formatNaira(order.deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-[#211B2B]">
                  <span>Total Paid</span>
                  <span className="tabular-nums">{formatNaira(order.totalAmount)}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {viewerRole === 'buyer' &&
              buyerReceiptPermission.allowed &&
              onConfirmReceipt && (
                <button
                  type="button"
                  onClick={() => setConfirmReceiptModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#A981FF] text-white text-xs font-medium min-h-[40px]"
                >
                  I&apos;ve Received My Order
                </button>
              )}

            {viewerRole === 'buyer' &&
              (order.fulfillmentStatus === 'Delivered_In_Inspection' ||
                order.fulfillmentStatus === 'Delivered') &&
              !order.disputePaused &&
              onAcceptOrder && (
                <button
                  type="button"
                  onClick={() => onAcceptOrder(order.id)}
                  className="px-4 py-2 rounded-xl bg-[#A981FF] text-white text-xs font-medium min-h-[40px]"
                >
                  Accept Order &amp; Release Payment
                </button>
              )}

            {viewerRole === 'vendor' &&
              order.fulfillmentStatus === 'Order placed' &&
              onUpdateStatus && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, 'Vendor Accepted Order')}
                  className="px-4 py-2 rounded-xl bg-[#A981FF] text-white text-xs font-medium min-h-[40px]"
                >
                  Accept Order
                </button>
              )}

            {viewerRole === 'vendor' &&
              order.fulfillmentStatus === 'Vendor Accepted Order' &&
              onUpdateStatus && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, 'Seller preparing device')}
                  className="px-4 py-2 rounded-xl bg-[#A981FF] text-white text-xs font-medium min-h-[40px]"
                >
                  Start Preparation
                </button>
              )}

            {viewerRole === 'vendor' && (
              <div className="w-full p-2.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[11px] text-[#716B7B] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#A981FF] shrink-0" />
                <span>
                  Role-locked: Arrange dispatch and enter the customer&apos;s one-time Delivery Verification Code inside your Vendor Orders Action Centre. Vendors cannot manually mark orders Delivered.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Vendor-Managed Dispatch & Party Card */}
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#A981FF]" />
            Vendor-Managed Delivery &amp; Party Info
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#716B7B]">Fulfilment Model</span>
              <span className="font-medium text-[#211B2B]">
                {order.deliveryMethod === 'physical_pickup'
                  ? 'In-Store Pickup (Free)'
                  : 'Vendor-Managed Delivery (Fixed Fee)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#716B7B]">Dispatcher / Courier</span>
              <span className="font-medium text-[#211B2B]">
                {order.dispatchDetails?.dispatcherOrCourierName || order.courierName || 'Vendor Logistics'}
              </span>
            </div>
            {order.dispatchDetails?.dispatcherPhone && (
              <div className="flex justify-between">
                <span className="text-[#716B7B]">Dispatcher Contact</span>
                <span className="font-mono text-[#211B2B] flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#A981FF]" />
                  {order.dispatchDetails.dispatcherPhone}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#716B7B]">Dispatch Reference</span>
              <span className="font-mono text-[#211B2B]">
                {order.dispatchDetails?.dispatchReference || order.trackingNumber}
              </span>
            </div>
            {order.dispatchDetails?.expectedDeliveryWindow && (
              <div className="flex justify-between">
                <span className="text-[#716B7B]">Expected Delivery Window</span>
                <span className="text-[#211B2B]">
                  {order.dispatchDetails.expectedDeliveryWindow}
                </span>
              </div>
            )}
            {order.dispatchDetails?.deliveryNotes && (
              <div className="p-2.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[11px] text-[#4A4356]">
                <strong className="text-[#211B2B]">Dispatch Notes:</strong>{' '}
                {order.dispatchDetails.deliveryNotes}
              </div>
            )}

            {order.deliveryMethod === 'physical_pickup' && order.pickupLocation && (
              <div className="p-2.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#211B2B] space-y-1">
                <div className="font-semibold">Store Pickup Address:</div>
                <div>{order.pickupLocation}</div>
                {order.pickupHours && <div className="text-[#716B7B]">Hours: {order.pickupHours}</div>}
                {order.pickupInstructions && (
                  <div className="text-[#4A4356]">{order.pickupInstructions}</div>
                )}
              </div>
            )}

            {order.deliveryProblemReport && (
              <div className="p-2.5 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[11px] text-[#C53030] space-y-0.5">
                <div className="font-semibold">
                  Delivery Report ({order.deliveryProblemReport.type.replace(/_/g, ' ')})
                </div>
                <div>{order.deliveryProblemReport.details}</div>
                {order.deliveryProblemReport.requestedNewDate && (
                  <div>Requested Date: {order.deliveryProblemReport.requestedNewDate}</div>
                )}
              </div>
            )}

            <div>
              <span className="text-[#716B7B] block mb-0.5">
                {viewerRole === 'vendor'
                  ? 'Customer Delivery Address'
                  : 'Delivery Address'}
              </span>
              <span className="text-[#211B2B]">
                {`${order.buyerName} · ${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state}`}
              </span>
            </div>

            {viewerRole === 'buyer' && onViewVendorStorefront && (
              <button
                type="button"
                onClick={() => onViewVendorStorefront(order.listing.sellerId)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7E4EF2] hover:underline pt-1"
              >
                <Store className="w-3.5 h-3.5" />
                Visit {order.vendorName || order.listing.sellerName} Storefront
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3-MONTH VENDOR HARDWARE WARRANTY & CLAIMS */}
      <div
        id="order-warranty-section"
        data-testid="order-warranty-card"
        className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EAE6F0] pb-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[#211B2B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#A981FF]" />
                {orderWarranty.durationMonths}-Month Vendor Hardware Warranty
              </h3>
              <span className="px-2 py-0.5 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] font-mono text-[11px] text-[#30102F]">
                {orderWarranty.warrantyId}
              </span>
              <span
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                  warrantyActive
                    ? 'bg-[#F5F0FF] text-[#7E4EF2] border border-[#D0BCFC]'
                    : 'bg-[#FAF9FC] text-[#716B7B] border border-[#EAE6F0]'
                }`}
              >
                {orderWarranty.status}
                {warrantyActive && warrantyDaysLeft > 0 ? ` · ${warrantyDaysLeft} days left` : ''}
              </span>
            </div>
            <p className="text-[11px] text-[#716B7B] mt-1">
              Backed by {orderWarranty.vendorName} ({orderWarranty.vendorNumber}) · Separate from the {inspectionHours}-hour escrow inspection window
            </p>
          </div>

          {viewerRole === 'buyer' &&
            isDeliveryVerifiedOrArrived &&
            onSubmitWarrantyClaim &&
            orderWarranty.status !== 'Voided' && (
              <button
                type="button"
                onClick={() => {
                  setClaimError(null);
                  setWarrantyModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-semibold min-h-[40px]"
              >
                <Wrench className="w-3.5 h-3.5" />
                Submit Warranty Claim
              </button>
            )}
        </div>

        {claimSuccessNotice && (
          <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-xs text-[#30102F] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#A981FF] shrink-0" />
            <span>{claimSuccessNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]">
            <div className="text-[11px] text-[#716B7B]">Warranty Start Date</div>
            <div className="font-semibold text-[#211B2B] mt-0.5">
              {orderWarranty.startDate
                ? new Date(orderWarranty.startDate).toLocaleDateString()
                : 'Activates upon verified delivery'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]">
            <div className="text-[11px] text-[#716B7B]">Warranty Expiry Date</div>
            <div className="font-semibold text-[#211B2B] mt-0.5">
              {orderWarranty.expiryDate
                ? new Date(orderWarranty.expiryDate).toLocaleDateString()
                : `${orderWarranty.durationMonths} calendar months after delivery`}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]">
            <div className="text-[11px] text-[#716B7B]">Device / IMEI Snapshot</div>
            <div className="font-mono text-[#211B2B] mt-0.5 truncate">
              {orderWarranty.serialOrImei || order.listing.imeiOrSerial || 'Recorded in order'}
            </div>
          </div>
        </div>

        {orderWarranty.disclosedFaultsExcluded.length > 0 && (
          <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[11px] text-[#C53030]">
            <strong>Disclosed Pre-Existing Faults Excluded from Warranty:</strong>{' '}
            {orderWarranty.disclosedFaultsExcluded
              .map((f) => toSimpleEnglish(f).label)
              .join(' · ')}
          </div>
        )}

        <div className="border border-[#EAE6F0] rounded-xl overflow-hidden">
          <button
            type="button"
            data-testid="toggle-warranty-terms"
            aria-expanded={warrantyTermsExpanded}
            onClick={() => setWarrantyTermsExpanded((v) => !v)}
            className="w-full px-3.5 py-2.5 bg-[#FAF9FC] hover:bg-[#F5F0FF] flex items-center justify-between text-xs font-medium text-[#211B2B] transition-colors"
          >
            <span>Warranty Coverage &amp; Exclusion Terms</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#5B37B7]">
              {warrantyTermsExpanded ? 'Hide terms' : 'Read terms'}
              {warrantyTermsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          </button>
          {warrantyTermsExpanded && (
            <div className="p-3.5 bg-white border-t border-[#EAE6F0] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-1.5">
                <div className="font-semibold text-[#211B2B]">Covered Under Warranty</div>
                <ul className="space-y-1 text-[11px] text-[#4A4356]">
                  {orderWarranty.coveredTerms.map((term, i) => (
                    <li key={i}>• {term}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-1.5">
                <div className="font-semibold text-[#211B2B]">Excluded from Coverage</div>
                <ul className="space-y-1 text-[11px] text-[#4A4356]">
                  {orderWarranty.excludedTerms.map((term, i) => (
                    <li key={i}>• {term}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {orderClaims.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#EAE6F0]">
            <div className="text-xs font-semibold text-[#211B2B]">
              Submitted Warranty Claims ({orderClaims.length})
            </div>
            {orderClaims.map((claim) => (
              <div
                key={claim.id}
                className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-[#211B2B]">
                    {claim.claimNumber} · {claim.issueCategory}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] font-medium text-[#30102F]">
                    {claim.status}
                  </span>
                </div>
                <p className="text-[#4A4356]">{claim.description}</p>
                {claim.proposedRemedy && (
                  <div className="p-2 rounded-lg bg-white border border-[#EAE6F0] text-[11px] text-[#211B2B]">
                    <strong>Vendor Remedy ({claim.proposedRemedy}):</strong>{' '}
                    {claim.vendorResponse}
                  </div>
                )}
                {claim.resolutionSummary && (
                  <div className="text-[11px] text-[#7E4EF2] font-medium">
                    Resolution: {claim.resolutionSummary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timestamped Order History (Collapsed beyond recent 2 events) */}
      <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#A981FF]" />
            Order Activity History ({order.events.length})
          </h3>
          {order.events.length > 2 && (
            <button
              type="button"
              data-testid="toggle-order-activity"
              aria-expanded={activityExpanded}
              onClick={() => setActivityExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#5B37B7] hover:underline"
            >
              {activityExpanded ? 'Show latest' : `Show all ${order.events.length}`}
              {activityExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
        <div className="space-y-2.5">
          {(activityExpanded ? order.events : order.events.slice(-2)).map((ev, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#A981FF] shrink-0 mt-0.5" />
              <div>
                <div className="text-[#211B2B] font-medium">{ev.title}</div>
                <div className="text-[11px] text-[#716B7B]">{ev.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(onOpenPolicyCentre || onOpenHelp) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-[#FAF8F4] border border-[#EAE6F0] text-xs text-[#716B7B]">
          <span>Questions about delivery, escrow hold, or warranty terms?</span>
          <div className="flex items-center gap-4">
            {onOpenHelp && (
              <button
                type="button"
                onClick={onOpenHelp}
                className="font-medium text-[#5B37B7] hover:underline"
              >
                Help &amp; Support
              </button>
            )}
            {onOpenPolicyCentre && (
              <button
                type="button"
                onClick={onOpenPolicyCentre}
                className="inline-flex items-center gap-1 font-medium text-[#5B37B7] hover:underline"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Policies &amp; Guidelines
              </button>
            )}
          </div>
        </div>
      )}

      {/* SUBMIT 3-MONTH WARRANTY CLAIM MODAL */}
      {warrantyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submit 3-month warranty claim"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSubmitWarrantyClaimForm}
            className="bg-white max-w-md w-full rounded-2xl border border-[#EAE6F0] p-5 space-y-3.5 shadow-xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#EAE6F0] pb-3">
              <h3 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#A981FF]" />
                Submit {orderWarranty.durationMonths}-Month Warranty Claim
              </h3>
              <button
                type="button"
                onClick={() => setWarrantyModalOpen(false)}
                className="p-1.5 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
                aria-label="Close warranty claim modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F]">
              Warranty claims route directly to {orderWarranty.vendorName} (with UsedRight Support oversight) for repair, diagnostic check, or replacement. Completed escrow settlements are not reversed by warranty claims.
            </div>

            {claimError && (
              <div className="p-2.5 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-medium">
                {claimError}
              </div>
            )}

            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Hardware Fault Category</label>
              <select
                value={claimCategory}
                onChange={(e) => setClaimCategory(e.target.value as WarrantyClaimCategory)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
              >
                {WARRANTY_CLAIM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#211B2B] mb-1">
                Describe the Hardware Issue
              </label>
              <textarea
                rows={3}
                required
                value={claimDescription}
                onChange={(e) => setClaimDescription(e.target.value)}
                placeholder="Explain when the issue started and what symptoms appear during normal use..."
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#211B2B] mb-1">
                Supporting Photo / Video Filename (Optional)
              </label>
              <input
                type="text"
                value={claimAttachmentName}
                onChange={(e) => setClaimAttachmentName(e.target.value)}
                placeholder="e.g. battery_drain_diagnostic.mp4"
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setWarrantyModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EAE6F0] text-[#211B2B] font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
              >
                Submit Warranty Claim
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REPORT DELIVERY PROBLEM / RESCHEDULE MODAL */}
      {deliveryProblemOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Report delivery issue or reschedule"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSubmitDeliveryProblem}
            className="bg-white max-w-md w-full rounded-2xl border border-[#EAE6F0] p-5 space-y-4 shadow-xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#EAE6F0] pb-3">
              <h3 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#A981FF]" />
                Report Delivery Issue or Reschedule
              </h3>
              <button
                type="button"
                onClick={() => setDeliveryProblemOpen(false)}
                className="p-1.5 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
                aria-label="Close delivery problem modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Issue Type</label>
              <select
                value={problemType}
                onChange={(e) => setProblemType(e.target.value as DeliveryProblemType)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-[#211B2B]"
              >
                <option value="reschedule_requested">Request Delivery Reschedule</option>
                <option value="overdue_dispatch">Overdue Dispatch / No Tracking Update</option>
                <option value="non_delivery">Marked Delivered / Package Not Received</option>
                <option value="damaged">Damaged Package on Arrival</option>
                <option value="wrong_item">Wrong Item Delivered</option>
              </select>
            </div>

            {problemType === 'reschedule_requested' && (
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">
                  Preferred Delivery Date / Time
                </label>
                <input
                  type="text"
                  value={problemRescheduleDate}
                  onChange={(e) => setProblemRescheduleDate(e.target.value)}
                  placeholder="e.g. Tomorrow afternoon (2:00 PM – 5:00 PM)"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                />
              </div>
            )}

            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Details</label>
              <textarea
                rows={3}
                required
                value={problemDetails}
                onChange={(e) => setProblemDetails(e.target.value)}
                placeholder="Explain what happened or when the dispatcher should arrive..."
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeliveryProblemOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EAE6F0] text-[#211B2B] font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM PHYSICAL RECEIPT MODAL */}
      {confirmReceiptModalOpen && onConfirmReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm device receipt"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <div className="bg-white max-w-md w-full rounded-2xl border border-[#EAE6F0] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#211B2B] flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-[#A981FF]" />
                Confirm Device Receipt
              </h3>
              <button
                type="button"
                onClick={() => setConfirmReceiptModalOpen(false)}
                className="p-1.5 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
                aria-label="Close confirmation modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#4A4356] leading-relaxed">
              Have you physically received <strong className="text-[#211B2B]">{order.listing.title}</strong>? Confirming starts your{' '}
              <strong className="text-[#211B2B]">{inspectionHours}-hour inspection period</strong>. Your payment of{' '}
              <strong className="text-[#211B2B]">{formatNaira(order.totalAmount)}</strong> stays protected while you verify battery, screen, SIM, and biometrics.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmReceiptModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#EAE6F0] text-xs font-medium text-[#211B2B]"
              >
                Not Yet
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirmReceipt(order.id);
                  setConfirmReceiptModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-semibold"
              >
                Yes, Start 24-Hour Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailView;

