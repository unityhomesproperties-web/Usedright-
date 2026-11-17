import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  KeyRound,
  Lock,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import {
  MarketplaceState,
  Order,
  RecipientComplaintCategory,
  RecipientComplaintRecord,
} from '../../types/marketplace';
import {
  buildRecipientSafeOrderView,
  formatCountdown,
  getOrderStageIndex,
  ORDER_STAGES_8,
  RecipientSafeOrderView,
} from '../../utils/marketplace';
import { toSimpleEnglish } from '../../utils/simpleEnglish';
import { fetchGiftRecipientViewApi, submitGiftRecipientComplaintApi } from '../../utils/apiClient';
import { SmartImage } from '../common/SmartImage';

interface GiftRecipientPortalViewProps {
  orderId: string;
  recipientToken?: string;
  state: MarketplaceState;
  onSubmitRecipientComplaint: (payload: {
    orderId: string;
    recipientToken?: string;
    category: RecipientComplaintCategory;
    description: string;
    attachmentNames?: string[];
  }) => { error?: string; complaint?: RecipientComplaintRecord };
  onBackToMarketplace: () => void;
}

const COMPLAINT_CATEGORIES: RecipientComplaintCategory[] = [
  'Wrong product',
  'Undisclosed defect',
  'Missing accessories',
  'Incorrect product condition',
  'Delivery damage',
  'Other',
];

export const GiftRecipientPortalView: React.FC<GiftRecipientPortalViewProps> = ({
  orderId,
  recipientToken,
  state,
  onSubmitRecipientComplaint,
  onBackToMarketplace,
}) => {
  const localOrder: Order | undefined = state.orders.find((o) => o.id === orderId && o.isGift);
  const [serverView, setServerView] = useState<RecipientSafeOrderView | null>(null);
  const [serverComplaints, setServerComplaints] = useState<RecipientComplaintRecord[]>([]);
  const [loading, setLoading] = useState(!localOrder);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  const [pinCopied, setPinCopied] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [category, setCategory] = useState<RecipientComplaintCategory>('Wrong product');
  const [description, setDescription] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<RecipientComplaintRecord | null>(null);

  useEffect(() => {
    let active = true;
    fetchGiftRecipientViewApi(orderId, recipientToken).then((res) => {
      if (!active) return;
      if (res.ok && res.data?.view) {
        setServerView(res.data.view);
        setServerComplaints(res.data.complaints || []);
      } else if (!localOrder && res.error) {
        setForbiddenError(res.error);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [orderId, recipientToken, localOrder]);

  const safeView: RecipientSafeOrderView | null = localOrder
    ? buildRecipientSafeOrderView(localOrder)
    : serverView;

  const complaints = localOrder
    ? (state.recipientComplaints || []).filter((c) => c.orderId === orderId)
    : serverComplaints;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-sm text-[#716B7B]">
        Loading your Gift Delivery Portal...
      </div>
    );
  }

  if (forbiddenError || !safeView) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-[#FED7D7] p-6 text-center space-y-3">
          <AlertOctagon className="w-10 h-10 text-[#C53030] mx-auto" />
          <h1 className="text-lg font-semibold text-[#211B2B]">Gift Link Unavailable</h1>
          <p className="text-xs text-[#716B7B]">
            {forbiddenError || 'This Gift Recipient link could not be verified.'}
          </p>
          <button
            type="button"
            onClick={onBackToMarketplace}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#A981FF] text-white text-xs font-semibold min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Visit UsedRight
          </button>
        </div>
      </div>
    );
  }

  const stageIndex = localOrder ? getOrderStageIndex(localOrder) : 2;
  const awaitingPinHandover =
    Boolean(safeView.deliveryVerificationCode) &&
    !safeView.deliveryCodeUsedAt &&
    (safeView.fulfillmentStatus === 'In transit' ||
      safeView.fulfillmentStatus === 'Ready for Pickup');

  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (description.trim().length < 10) {
      setSubmitError('Please describe the issue in at least 10 characters.');
      return;
    }

    if (localOrder) {
      const res = onSubmitRecipientComplaint({
        orderId: safeView.orderId,
        recipientToken,
        category,
        description: description.trim(),
        attachmentNames: attachmentName.trim() ? [attachmentName.trim()] : [],
      });
      if (res.error) {
        setSubmitError(res.error);
        return;
      }
      if (res.complaint) setSubmitSuccess(res.complaint);
    }

    void submitGiftRecipientComplaintApi(safeView.orderId, {
      rtok: recipientToken,
      category,
      description: description.trim(),
      attachmentNames: attachmentName.trim() ? [attachmentName.trim()] : [],
    }).then((apiRes) => {
      if (!localOrder && apiRes.ok && apiRes.data?.complaint) {
        setSubmitSuccess(apiRes.data.complaint);
        setServerComplaints((prev) => [apiRes.data!.complaint!, ...prev]);
      }
    });

    setComplaintOpen(false);
    setDescription('');
    setAttachmentName('');
  };

  return (
    <div
      data-testid="gift-recipient-portal"
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToMarketplace}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4A4356] hover:text-[#A981FF] min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          UsedRight Home
        </button>

        <span className="px-3 py-1 rounded-full bg-[#F5F0FF] border border-[#D0BCFC] text-[#30102F] text-xs font-semibold">
          Gift Recipient Portal · No Account Needed
        </span>
      </div>

      {/* Gift Hero Card — Respects Sender Anonymity & Hides All Prices */}
      <div className="bg-white rounded-2xl border-2 border-[#A981FF] p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#A981FF] flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-[#7E4EF2]">
                  {safeView.orderNumber}
                </span>
                {safeView.occasion && (
                  <span className="px-2 py-0.5 rounded-full bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] font-medium text-[#30102F]">
                    Occasion: {safeView.occasion}
                  </span>
                )}
              </div>
              <h1 className="text-lg font-semibold text-[#211B2B]">
                Hi {safeView.recipientName}, a UsedRight gift is on the way to you
              </h1>
              <p
                data-testid="gift-sender-visibility-label"
                className="text-xs text-[#4A4356]"
              >
                {safeView.senderDisplayMode === 'anonymous'
                  ? 'Anonymous Sender — the sender chose to keep their name private.'
                  : `Gift sent by ${safeView.senderDisplayLabel || 'Someone special'}`}
              </p>
            </div>
          </div>

          <span className="px-3 py-1.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-medium text-[#211B2B]">
            {safeView.fulfillmentStatus.replace(/_/g, ' ')}
          </span>
        </div>

        {safeView.giftMessage && (
          <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-sm text-[#211B2B] italic">
            &ldquo;{safeView.giftMessage}&rdquo;
          </div>
        )}

        <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F] flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#7E4EF2] shrink-0" />
          <span>
            Pricing, platform fees, and purchaser payment receipts are hidden on gift orders. UsedRight
            protects this device with a Delivery Verification PIN, inspection window, and 3-month
            vendor hardware warranty.
          </span>
        </div>
      </div>

      {/* Confidential Delivery Verification PIN for Recipient */}
      {awaitingPinHandover && (
        <div
          data-testid="gift-recipient-pin-card"
          className="bg-white rounded-2xl border-2 border-[#A981FF] p-5 space-y-3 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#7E4EF2] flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#211B2B]">
                  Your Confidential Delivery Verification PIN
                </h2>
                <p className="text-[11px] text-[#716B7B]">
                  Share this 6-digit code ONLY after physically receiving your gift package.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                data-testid="gift-recipient-pin-value"
                className="px-4 py-2 rounded-xl bg-[#211B2B] text-white font-mono text-lg font-bold tracking-[0.22em] tabular-nums"
              >
                {safeView.deliveryVerificationCode}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (safeView.deliveryVerificationCode && navigator.clipboard) {
                    navigator.clipboard.writeText(safeView.deliveryVerificationCode).catch(() => {});
                  }
                  setPinCopied(true);
                  setTimeout(() => setPinCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-xs font-medium text-[#211B2B] min-h-[40px]"
              >
                <Copy className="w-3.5 h-3.5 text-[#A981FF]" />
                {pinCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[11px] text-[#C53030]">
            Never give this PIN over phone calls or chat before the courier physically hands over the
            device. Confirming this PIN starts the {safeView.inspectionWindowHours}-hour inspection
            window and activates the 3-month vendor warranty.
          </div>
        </div>
      )}

      {/* 8-Stage Progress Bar */}
      <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#A981FF]" />
            Delivery Progress &amp; Inspection
          </h2>
          {safeView.inspectionRemainingSeconds > 0 && safeView.deliveryCodeUsedAt && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] font-semibold text-[#30102F] tabular-nums">
              <Clock className="w-3.5 h-3.5 text-[#A981FF]" />
              Inspection window: {formatCountdown(safeView.inspectionRemainingSeconds)} left
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
          {ORDER_STAGES_8.map((stage, idx) => {
            const done = idx <= stageIndex;
            return (
              <div key={stage} className="space-y-1 text-center">
                <div
                  className={`h-1.5 rounded-full ${
                    done ? 'bg-[#A981FF]' : 'bg-[#EAE6F0]'
                  }`}
                />
                <div
                  className={`text-[10px] leading-tight ${
                    done ? 'text-[#211B2B] font-medium' : 'text-[#716B7B]'
                  }`}
                >
                  {stage}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#FAF9FC] p-3.5 rounded-xl border border-[#EAE6F0]">
          <div>
            <span className="text-[#716B7B]">Destination Area:</span>{' '}
            <strong className="text-[#211B2B]">
              {safeView.deliveryMethod === 'physical_pickup' && safeView.pickupLocation
                ? `Pickup: ${safeView.pickupLocation}`
                : safeView.recipientCityState}
            </strong>
          </div>
          <div>
            <span className="text-[#716B7B]">Courier / Waybill:</span>{' '}
            <strong className="text-[#211B2B]">
              {safeView.courierName || 'Vendor Dispatch'}{' '}
              {safeView.trackingNumber ? `(${safeView.trackingNumber})` : ''}
            </strong>
          </div>
          {safeView.deliveryInstructions && (
            <div className="sm:col-span-2 text-[#4A4356]">
              <span className="text-[#716B7B]">Delivery Instructions:</span>{' '}
              {safeView.deliveryInstructions}
            </div>
          )}
        </div>
      </div>

      {/* Price-Free Package Contents & Disclosures */}
      <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-[#A981FF]" />
          Included Gift Device (Prices Hidden)
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]">
          <SmartImage
            src={safeView.deviceImage}
            alt={safeView.deviceTitle}
            className="w-20 h-20 rounded-xl object-cover border border-[#EAE6F0] shrink-0"
          />
          <div className="space-y-1.5 text-xs flex-1">
            <div className="text-sm font-semibold text-[#211B2B]">{safeView.deviceTitle}</div>
            <div className="text-[#716B7B]">{safeView.deviceSpecsLabel}</div>
            <div className="flex items-center gap-1.5 text-[#4A4356]">
              <Store className="w-3.5 h-3.5 text-[#A981FF]" />
              <span>
                Supplied by: {safeView.vendorName} ({safeView.vendorState})
              </span>
            </div>
            {safeView.disclosedFaults.length > 0 && (
              <div className="p-2 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[11px] text-[#C53030]">
                <strong>Known Condition Disclosures:</strong>{' '}
                {safeView.disclosedFaults.map((f) => toSimpleEnglish(f).label).join(' · ')}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-[#4A4356]">
            <ShieldCheck className="w-4 h-4 text-[#A981FF]" />
            <span>
              <strong>{safeView.warrantyDurationMonths}-Month Vendor Hardware Warranty:</strong>{' '}
              {safeView.warrantyStatus || 'Activates on delivery'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setComplaintOpen((v) => !v)}
            data-testid="gift-recipient-report-problem-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-semibold min-h-[42px]"
          >
            <AlertOctagon className="w-4 h-4" />
            Report a Delivery / Product Problem
          </button>
        </div>
      </div>

      {/* Recipient Complaint Submission Form (No Login Required) */}
      {complaintOpen && (
        <form
          onSubmit={handleSubmitComplaint}
          data-testid="gift-recipient-complaint-form"
          className="bg-white rounded-2xl border-2 border-[#FED7D7] p-5 space-y-3 text-xs"
        >
          <div>
            <h3 className="text-sm font-semibold text-[#211B2B]">
              Report a Delivery or Device Problem (No Account Needed)
            </h3>
            <p className="text-[#716B7B] mt-0.5">
              UsedRight will immediately notify the purchaser, vendor, and UsedRight Support. Any
              financial refund decision stays with the purchaser and original payment method.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="gift-complaint-category" className="block font-medium text-[#211B2B] mb-1">
                Problem Category *
              </label>
              <select
                id="gift-complaint-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as RecipientComplaintCategory)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              >
                {COMPLAINT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gift-complaint-photo" className="block font-medium text-[#211B2B] mb-1">
                Evidence Photo / Video Filename (Optional)
              </label>
              <input
                id="gift-complaint-photo"
                type="text"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                placeholder="e.g. damaged_corner_photo.jpg"
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gift-complaint-desc" className="block font-medium text-[#211B2B] mb-1">
              Describe What Happened *
            </label>
            <textarea
              id="gift-complaint-desc"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what is wrong, missing, or damaged..."
              className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
            />
          </div>

          {submitError && (
            <div className="p-2.5 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-medium">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setComplaintOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#EAE6F0] text-[#4A4356] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="gift-recipient-complaint-submit"
              className="px-4 py-2 rounded-xl bg-[#C53030] text-white font-semibold"
            >
              Submit Problem Report
            </button>
          </div>
        </form>
      )}

      {submitSuccess && (
        <div
          data-testid="gift-recipient-complaint-confirmation"
          className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065F46] flex items-start gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Complaint {submitSuccess.complaintNumber} Recorded:</strong> We notified the
            purchaser, vendor, and UsedRight Support. Inspection timer has been paused where
            applicable.
          </div>
        </div>
      )}

      {complaints.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-2.5 text-xs">
          <h3 className="text-sm font-semibold text-[#211B2B]">
            Submitted Recipient Complaints ({complaints.length})
          </h3>
          {complaints.map((c) => (
            <div key={c.id} className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-[#211B2B]">{c.complaintNumber}</span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0] text-[11px] font-medium">
                  {c.status}
                </span>
              </div>
              <div className="font-medium text-[#211B2B]">{c.category}</div>
              <div className="text-[#4A4356]">{c.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GiftRecipientPortalView;
