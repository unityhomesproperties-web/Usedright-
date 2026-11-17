import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  Sliders,
  Flag,
  FileText,
  MessageSquare,
  Plus,
  CheckCircle2,
  LogOut,
  Lock,
  Percent,
  BookOpen,
  Truck,
  KeyRound,
  Store,
  ShieldAlert,
  Wrench,
  ExternalLink,
  Gift,
  Link2,
} from 'lucide-react';
import {
  CategoryConfig,
  DeliveryConfig,
  DisputeStatus,
  MarketplaceState,
  PolicyDocument,
  WarrantyClaimStatus,
} from '../../types/marketplace';
import {
  BUYER_FEE_RATE,
  DEFAULT_FIXED_DELIVERY_FEE,
  formatNaira,
  SELLER_FEE_RATE,
  validatePlatformFeeConfig,
} from '../../utils/marketplace';
import { NIGERIAN_COMMERCIAL_HUBS } from '../../utils/nigerianStates';
import { UnifiedTransactionChat } from '../chat/UnifiedTransactionChat';

interface AdminDashboardProps {
  state: MarketplaceState;
  onSendMessage: (
    conversationId: string,
    text: string,
    senderRole: 'buyer' | 'vendor' | 'admin'
  ) => void;
  onAdminUpdateDispute: (payload: {
    disputeId: string;
    adminName: string;
    newStatus?: DisputeStatus;
    publicMessage?: string;
    internalNote?: string;
  }) => void;
  onAdminResolveDispute: (payload: {
    disputeId: string;
    adminName: string;
    decision: 'refund_buyer' | 'release_vendor';
    outcomeSummary: string;
  }) => void;
  onConfigureAdmin: (payload: {
    brandNewEnabled?: boolean;
    inspectionHours?: number;
    categories?: CategoryConfig[];
    adminName?: string;
  }) => void;
  onAdminUpdateFees?: (payload: {
    customerFeeRate: number;
    vendorFeeRate: number;
    vendorSpecificRates?: Record<string, number>;
    promotionalLabel?: string;
    effectiveDate?: string;
    expiryDate?: string;
    eligibilityRules?: string;
    reason: string;
    adminName: string;
  }) => { errors: string[] };
  onAdminUpdateDeliveryConfig?: (
    payload: Partial<DeliveryConfig> & { adminName: string }
  ) => { error?: string };
  onAdminSavePolicy?: (payload: {
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
  }) => void;
  onAdminOverrideDelivery?: (
    orderId: string,
    reason: string
  ) => { error?: string };
  onAdminVerifyVendor?: (payload: {
    vendorId: string;
    decision: 'Approved' | 'Rejected' | 'Needs Info';
    identityStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info';
    socialStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info';
    notes?: string;
    adminName: string;
  }) => { error?: string };
  onAdminModerateFlag?: (payload: {
    flagId: string;
    action: 'warn' | 'restrict_messaging' | 'suspend_vendor' | 'dismiss';
    adminName: string;
    note?: string;
  }) => { error?: string };
  onAdminUpdateWarrantyConfig?: (payload: {
    defaultDurationMonths: number;
    claimResponseSlaHours: number;
    coveredSummary: string[];
    excludedSummary: string[];
    adminName: string;
  }) => void;
  onAdminUpdateWarrantyClaim?: (payload: {
    claimId: string;
    status: WarrantyClaimStatus;
    resolutionSummary?: string;
    adminNotes?: string;
    adminName: string;
  }) => void;
  onAdminUpdatePaymentRequestConfig?: (payload: {
    validityHours: number;
    adminName: string;
  }) => void;
  onOpenPolicyCentre?: (slug?: string) => void;
  onViewOrder: (orderId: string) => void;
  onExitAdmin: () => void;
}

type AdminTab =
  | 'disputes'
  | 'payment_requests'
  | 'vendors'
  | 'moderation'
  | 'warranties'
  | 'fees'
  | 'policies'
  | 'config'
  | 'reports'
  | 'audit';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  state,
  onSendMessage,
  onAdminUpdateDispute,
  onAdminResolveDispute,
  onConfigureAdmin,
  onAdminUpdateFees,
  onAdminUpdateDeliveryConfig,
  onAdminSavePolicy,
  onAdminOverrideDelivery,
  onAdminVerifyVendor,
  onAdminModerateFlag,
  onAdminUpdateWarrantyConfig,
  onAdminUpdateWarrantyClaim,
  onAdminUpdatePaymentRequestConfig,
  onOpenPolicyCentre,
  onViewOrder,
  onExitAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('disputes');
  const [selectedDisputeConvId, setSelectedDisputeConvId] = useState<string | undefined>(
    state.disputes[0]?.conversationId
  );
  const [hoursInput, setHoursInput] = useState<number>(state.platformConfig.inspectionHours);
  const [payReqValidityInput, setPayReqValidityInput] = useState<number>(
    state.platformConfig.paymentRequestValidityHours ?? 24
  );
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryBrands, setNewCategoryBrands] = useState('');
  const [configSavedNotice, setConfigSavedNotice] = useState<string | null>(null);
  const [vendorReviewNote, setVendorReviewNote] = useState<Record<string, string>>({});
  const [vendorReviewFeedback, setVendorReviewFeedback] = useState<string | null>(null);
  const [moderationNote, setModerationNote] = useState<Record<string, string>>({});
  const [moderationFeedback, setModerationFeedback] = useState<string | null>(null);
  const [warrantyMonthsInput, setWarrantyMonthsInput] = useState<number>(
    state.warrantyConfig?.defaultDurationMonths ?? 3
  );
  const [warrantySlaInput, setWarrantySlaInput] = useState<number>(
    state.warrantyConfig?.claimResponseSlaHours ?? 48
  );
  const [warrantyPolicySaved, setWarrantyPolicySaved] = useState<string | null>(null);
  const [claimAdminNote, setClaimAdminNote] = useState<Record<string, string>>({});

  // Admin Delivery Override form state
  const [overrideOrderId, setOverrideOrderId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideFeedback, setOverrideFeedback] = useState<string | null>(null);

  // Fees & Delivery controls state
  const [customerFeePct, setCustomerFeePct] = useState<string>(() =>
    ((state.feeConfig?.customerFeeRate ?? BUYER_FEE_RATE) * 100).toFixed(2).replace(/\.?0+$/, '')
  );
  const [vendorFeePct, setVendorFeePct] = useState<string>(() =>
    ((state.feeConfig?.vendorFeeRate ?? SELLER_FEE_RATE) * 100).toFixed(2).replace(/\.?0+$/, '')
  );
  const [promoLabel, setPromoLabel] = useState(state.feeConfig?.promotionalLabel || '');
  const [feeEffectiveDate, setFeeEffectiveDate] = useState(
    state.feeConfig?.effectiveDate || new Date().toISOString().slice(0, 10)
  );
  const [feeExpiryDate, setFeeExpiryDate] = useState(state.feeConfig?.expiryDate || '');
  const [feeReason, setFeeReason] = useState('Standard platform service fee governance update');
  const [vendorRateOverrides, setVendorRateOverrides] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    const existing = state.feeConfig?.vendorSpecificRates || {};
    Object.entries(existing).forEach(([vid, rate]) => {
      map[vid] = (rate * 100).toFixed(2).replace(/\.?0+$/, '');
    });
    return map;
  });
  const [feeErrors, setFeeErrors] = useState<string[]>([]);
  const [feeSuccess, setFeeSuccess] = useState<string | null>(null);

  const [fixedDeliveryFeeInput, setFixedDeliveryFeeInput] = useState<number>(
    state.deliveryConfig?.fixedDeliveryFee ?? DEFAULT_FIXED_DELIVERY_FEE
  );
  const [deliveryWindowInput, setDeliveryWindowInput] = useState(
    state.deliveryConfig?.estimatedDeliveryWindow || '1–3 business days after vendor dispatch'
  );
  const [freePickupInput, setFreePickupInput] = useState(
    state.deliveryConfig?.freePickupEnabled !== false
  );
  const [deliverySavedNotice, setDeliverySavedNotice] = useState<string | null>(null);

  // Policy Manager state
  const policiesList = state.policies || [];
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(policiesList[0]?.id || '');
  const selectedPolicy =
    policiesList.find((p) => p.id === selectedPolicyId) || policiesList[0];
  const [policyTitleDraft, setPolicyTitleDraft] = useState(selectedPolicy?.title || '');
  const [policySummaryDraft, setPolicySummaryDraft] = useState(selectedPolicy?.summary || '');
  const [policyVersionDraft, setPolicyVersionDraft] = useState(
    selectedPolicy?.currentVersion || '2026.2'
  );
  const [policyStatusDraft, setPolicyStatusDraft] = useState<PolicyDocument['status']>(
    selectedPolicy?.status || 'Published'
  );
  const [policyChangeSummary, setPolicyChangeSummary] = useState(
    'Clarified operational wording and effective governance metadata'
  );
  const [policyRequireReaccept, setPolicyRequireReaccept] = useState(
    Boolean(selectedPolicy?.requiresVendorReacceptance)
  );
  const [policySavedMsg, setPolicySavedMsg] = useState<string | null>(null);

  const selectPolicyForEdit = (pol: PolicyDocument) => {
    setSelectedPolicyId(pol.id);
    setPolicyTitleDraft(pol.title);
    setPolicySummaryDraft(pol.summary);
    setPolicyVersionDraft(pol.currentVersion);
    setPolicyStatusDraft(pol.status);
    setPolicyRequireReaccept(pol.requiresVendorReacceptance);
    setPolicySavedMsg(null);
  };

  const handleSaveInspectionHours = () => {
    const safeHours = Math.max(24, hoursInput);
    setHoursInput(safeHours);
    onConfigureAdmin({ inspectionHours: safeHours, adminName: 'Adaobi Nwosu' });
    setConfigSavedNotice(`Inspection period updated to ${safeHours} hours (minimum 24h enforced).`);
  };

  const handleToggleBrandNew = () => {
    const nextVal = !state.platformConfig.brandNewEnabled;
    onConfigureAdmin({ brandNewEnabled: nextVal, adminName: 'Adaobi Nwosu' });
    setConfigSavedNotice(
      nextVal
        ? 'Brand-New device listings are now enabled alongside Foreign-Used.'
        : 'Brand-New device listings disabled. Marketplace is strictly Foreign-Used.'
    );
  };

  const handleToggleCategory = (catId: string) => {
    const nextCats = state.platformConfig.categories.map((c) =>
      c.id === catId ? { ...c, enabled: !c.enabled } : c
    );
    onConfigureAdmin({ categories: nextCats, adminName: 'Adaobi Nwosu' });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryLabel.trim()) return;
    const slug = newCategoryLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    const newCat: CategoryConfig = {
      id: slug,
      label: newCategoryLabel.trim(),
      shortLabel: newCategoryLabel.trim(),
      description: `${newCategoryLabel.trim()} products`,
      brands: newCategoryBrands
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
      enabled: true,
      sortOrder: state.platformConfig.categories.length + 1,
    };
    onConfigureAdmin({
      categories: [...state.platformConfig.categories, newCat],
      adminName: 'Adaobi Nwosu',
    });
    setNewCategoryLabel('');
    setNewCategoryBrands('');
    setConfigSavedNotice(`Added new category "${newCat.label}" without rebuilding.`);
  };

  const handleSaveFees = (e: React.FormEvent) => {
    e.preventDefault();
    setFeeErrors([]);
    setFeeSuccess(null);

    const custRate = Number(customerFeePct) / 100;
    const vendRate = Number(vendorFeePct) / 100;
    const vendorRatesParsed: Record<string, number> = {};

    Object.entries(vendorRateOverrides).forEach(([vid, pctStr]) => {
      if (pctStr.trim() !== '') {
        vendorRatesParsed[vid] = Number(pctStr) / 100;
      }
    });

    const check = validatePlatformFeeConfig({
      customerFeeRate: custRate,
      vendorFeeRate: vendRate,
      vendorSpecificRates: vendorRatesParsed,
    });
    if (!check.valid) {
      setFeeErrors(check.errors);
      return;
    }

    if (onAdminUpdateFees) {
      const res = onAdminUpdateFees({
        customerFeeRate: custRate,
        vendorFeeRate: vendRate,
        vendorSpecificRates: vendorRatesParsed,
        promotionalLabel: promoLabel.trim() || undefined,
        effectiveDate: feeEffectiveDate,
        expiryDate: feeExpiryDate || undefined,
        reason: feeReason.trim() || 'Admin fee governance update',
        adminName: 'Adaobi Nwosu',
      });
      if (res.errors && res.errors.length > 0) {
        setFeeErrors(res.errors);
        return;
      }
    }
    setFeeSuccess(
      `Saved approved fees: Customer ${(custRate * 100).toFixed(2)}% (max 0.7%), Vendor ${(vendRate * 100).toFixed(2)}% (max 1.0%).`
    );
  };

  const handleSaveDeliveryConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (fixedDeliveryFeeInput < 0) return;
    onAdminUpdateDeliveryConfig?.({
      fixedDeliveryFee: Math.round(fixedDeliveryFeeInput),
      estimatedDeliveryWindow: deliveryWindowInput.trim(),
      freePickupEnabled: freePickupInput,
      adminName: 'Adaobi Nwosu',
    });
    setDeliverySavedNotice(
      `Fixed delivery fee updated to ${formatNaira(Math.round(fixedDeliveryFeeInput))} per vendor.`
    );
  };

  const activeShipmentsNeedingAttention = state.orders.filter(
    (o) =>
      o.fulfillmentStatus === 'In transit' ||
      o.fulfillmentStatus === 'Ready for Pickup' ||
      Boolean(o.deliveryProblemReport)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6">
      {/* Admin Header */}
      <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#211B2B] text-[#D0BCFC] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#211B2B]">
              UsedRight Support &amp; Operations Console
            </h1>
            <p className="text-xs text-[#716B7B]">
              Disputes, Delivery Overrides, Fee Ceilings (0.7% / 1.0%), 22-Document Policy Governance &amp; Audit Logs
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenPolicyCentre && (
            <button
              type="button"
              onClick={() => onOpenPolicyCentre()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D0BCFC] bg-[#F5F0FF] text-[#211B2B] text-xs font-medium min-h-[40px]"
            >
              <BookOpen className="w-4 h-4 text-[#A981FF]" />
              Public Policy Reader
            </button>
          )}
          <button
            type="button"
            onClick={onExitAdmin}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#FED7D7] bg-[#FFF5F5] text-[#C53030] text-xs font-medium min-h-[40px]"
          >
            <LogOut className="w-4 h-4" />
            Exit Admin
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'disputes', label: `Disputes & Delivery (${state.disputes.length})`, icon: AlertOctagon },
          {
            id: 'payment_requests',
            label: `Pay Links & Gifts (${(state.paymentRequests || []).length + (state.recipientComplaints || []).length})`,
            icon: Link2,
          },
          {
            id: 'vendors',
            label: `Vendor Verification (${state.vendors.length + (state.pendingSellerState ? 1 : 0)})`,
            icon: Store,
          },
          {
            id: 'moderation',
            label: `Safety Moderation (${(state.moderationFlags || []).filter((f) => f.status === 'Pending Review').length})`,
            icon: ShieldAlert,
          },
          {
            id: 'warranties',
            label: `Warranty & Claims (${(state.warrantyClaims || []).length})`,
            icon: Wrench,
          },
          { id: 'fees', label: 'Fees & Delivery', icon: Percent },
          { id: 'policies', label: `Policy Manager (${policiesList.length})`, icon: BookOpen },
          { id: 'config', label: 'Categories & Inspection', icon: Sliders },
          { id: 'reports', label: `Safety Reports (${state.reports.length})`, icon: Flag },
          { id: 'audit', label: `Audit History (${state.auditLog.length})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-[#A981FF] text-white border-[#A981FF]'
                  : 'bg-white text-[#4A4356] border-[#EAE6F0] hover:border-[#A981FF]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* PAYMENT REQUESTS & GIFT RECIPIENT COMPLAINTS */}
      {activeTab === 'payment_requests' && (
        <div className="space-y-5 text-xs">
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#A981FF]" />
                  Shared Payment Requests ({(state.paymentRequests || []).length})
                </h2>
                <p className="text-[11px] text-[#716B7B]">
                  Monitor locked 3-party payment links, payer attribution, gift privacy, and suspicious duplicate/tamper attempts.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] font-medium text-[#30102F]">
                Default Validity: {state.platformConfig.paymentRequestValidityHours ?? 24}h
              </span>
            </div>

            {(state.paymentRequests || []).length === 0 ? (
              <p className="text-[#716B7B]">No payment requests recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {(state.paymentRequests || []).map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-[#211B2B]">
                          {req.requestReference}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0] font-medium">
                          {req.status}
                        </span>
                        {req.isGift && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F5F0FF] border border-[#D0BCFC] text-[#7E4EF2] font-medium">
                            <Gift className="w-3 h-3" />
                            Gift ({req.giftDetails?.senderVisibility === 'anonymous' ? 'Anonymous' : 'Named'})
                          </span>
                        )}
                        {(req.suspiciousAttemptsCount || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-semibold">
                            Suspicious Attempts: {req.suspiciousAttemptsCount}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-[#211B2B] tabular-nums">
                        {formatNaira(req.totalPayableAmount)}
                      </span>
                    </div>
                    <div className="text-[#4A4356]">
                      Owner: <strong>{req.orderOwnerName}</strong>
                      {req.payerInfo ? ` · Paid by: ${req.payerInfo.payerName} (${req.payerInfo.payerEmail})` : ' · Unpaid'}
                      {req.parentOrderNumber ? ` · Order: ${req.parentOrderNumber}` : ''}
                    </div>
                    {req.childOrderIds?.[0] && (
                      <button
                        type="button"
                        onClick={() => onViewOrder(req.childOrderIds![0])}
                        className="text-[#7E4EF2] font-semibold hover:underline"
                      >
                        Inspect Order →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#A981FF]" />
              Gift Recipient Problem Reports ({(state.recipientComplaints || []).length})
            </h2>
            {(state.recipientComplaints || []).length === 0 ? (
              <p className="text-[#716B7B]">No unauthenticated recipient complaints reported.</p>
            ) : (
              <div className="space-y-2.5">
                {(state.recipientComplaints || []).map((cmp) => (
                  <div
                    key={cmp.id}
                    className="p-3.5 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-[#211B2B]">
                        {cmp.complaintNumber} · {cmp.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#FED7D7] text-[#C53030] font-semibold">
                        {cmp.status}
                      </span>
                    </div>
                    <div className="font-medium text-[#211B2B]">
                      {cmp.recipientName} reported &ldquo;{cmp.category}&rdquo; (Vendor: {cmp.vendorName})
                    </div>
                    <p className="text-[#4A4356]">{cmp.description}</p>
                    <button
                      type="button"
                      onClick={() => onViewOrder(cmp.orderId)}
                      className="text-[#7E4EF2] font-semibold hover:underline"
                    >
                      Open Gift Order &amp; Dispute →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DISPUTES & ADMIN DELIVERY OVERRIDE */}
      {activeTab === 'disputes' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.disputes.map((d) => {
              const hold = state.paymentHolds.find((h) => h.orderId === d.orderId);
              return (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-[#211B2B]">
                      {d.disputeNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] text-[11px] font-medium">
                      {d.status}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-[#211B2B] line-clamp-1">
                    {d.listingTitle}
                  </div>
                  <div className="text-xs text-[#716B7B]">
                    Order: <span className="font-mono">{d.orderNumber}</span> • Held:{' '}
                    <span className="font-medium text-[#211B2B]">
                      {hold ? formatNaira(hold.grossAmount) : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-[#4A4356] line-clamp-2">{d.description}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedDisputeConvId(d.conversationId)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-[#A981FF] text-white text-xs font-medium"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Join Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewOrder(d.orderId)}
                      className="px-3 py-2 rounded-lg border border-[#EAE6F0] text-xs font-medium text-[#4A4356]"
                    >
                      Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Shipments & Audited Admin Delivery Override */}
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#A981FF]" />
                  Active Shipments &amp; Audited Admin Delivery Override
                </h2>
                <p className="text-[11px] text-[#716B7B]">
                  For exceptional cases (e.g., locked OTP after 5 failed attempts or offline customer confirmation), Admin can manually confirm delivery with an audited reason.
                </p>
              </div>
              {overrideFeedback && (
                <span className="px-3 py-1 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-xs font-medium text-[#211B2B]">
                  {overrideFeedback}
                </span>
              )}
            </div>

            {activeShipmentsNeedingAttention.length === 0 ? (
              <p className="text-xs text-[#716B7B]">No shipments awaiting delivery code verification.</p>
            ) : (
              <div className="space-y-2">
                {activeShipmentsNeedingAttention.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-semibold text-[#211B2B]">
                          {ord.subOrderNumber || ord.orderNumber}
                        </span>{' '}
                        · {ord.listing.title} ({ord.buyerName})
                        <div className="text-[11px] text-[#716B7B]">
                          Status: {ord.fulfillmentStatus.replace(/_/g, ' ')} · Dispatcher:{' '}
                          {ord.dispatchDetails?.dispatcherOrCourierName || ord.courierName}
                          {ord.deliveryCodeAttempts ? ` · Failed OTP attempts: ${ord.deliveryCodeAttempts}/5` : ''}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onViewOrder(ord.id)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#EAE6F0] font-medium"
                        >
                          Inspect Order
                        </button>
                        {onAdminOverrideDelivery && !ord.deliveryCodeUsedAt && (
                          <button
                            type="button"
                            onClick={() => {
                              setOverrideOrderId(overrideOrderId === ord.id ? null : ord.id);
                              setOverrideReason('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#211B2B] text-white font-medium"
                          >
                            Override Delivery
                          </button>
                        )}
                      </div>
                    </div>

                    {overrideOrderId === ord.id && onAdminOverrideDelivery && (
                      <div className="pt-2 border-t border-[#EAE6F0] flex flex-wrap gap-2 items-center">
                        <input
                          type="text"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="Required audit reason (e.g. Verified courier proof after buyer lost phone)"
                          className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-[#EAE6F0] bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const res = onAdminOverrideDelivery(ord.id, overrideReason);
                            if (res.error) {
                              setOverrideFeedback(res.error);
                            } else {
                              setOverrideFeedback(`Delivery override confirmed for ${ord.orderNumber}.`);
                              setOverrideOrderId(null);
                              setOverrideReason('');
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-[#A981FF] text-white font-semibold"
                        >
                          Confirm Audited Override
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Embedded Unified Chat in Admin Support Role */}
          <UnifiedTransactionChat
            viewerRole="admin"
            viewerId="admin-1"
            conversations={state.conversations}
            orders={state.orders}
            paymentHolds={state.paymentHolds}
            disputes={state.disputes}
            warrantyClaims={state.warrantyClaims || []}
            restrictedUserIds={state.restrictedMessagingUserIds || []}
            initialConversationId={selectedDisputeConvId}
            onSendMessage={onSendMessage}
            onViewOrder={onViewOrder}
            onOpenDispute={() => {}}
            onAdminUpdateDispute={onAdminUpdateDispute}
            onAdminResolveDispute={onAdminResolveDispute}
          />
        </div>
      )}

      {/* VENDOR VERIFICATION QUEUE (IDENTITY VS SOCIAL / MANUAL) */}
      {activeTab === 'vendors' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE6F0] pb-3">
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">
                Vendor Verification Queue (Identity vs Social / Manual Review)
              </h2>
              <p className="text-[#716B7B]">
                Review legal/CAC identity and 2-link social verification separately. Every seller receives a permanent human-readable ID (U-XXXX).
              </p>
            </div>
            {vendorReviewFeedback && (
              <span className="px-3 py-1 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[#30102F] font-medium">
                {vendorReviewFeedback}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {state.pendingSellerState && (
              <div className="p-4 rounded-2xl bg-[#F5F0FF]/55 border-2 border-[#A981FF] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-[#7E4EF2] mr-2">
                      {state.pendingSellerState.vendorNumber || 'U-NEW'}
                    </span>
                    <strong className="text-sm text-[#211B2B]">
                      {state.pendingSellerState.businessName}
                    </strong>{' '}
                    <span className="text-[#716B7B]">· Pending Onboarding Application</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white border border-[#D0BCFC] font-semibold text-[#30102F]">
                    {state.pendingSellerState.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-white border border-[#EAE6F0] space-y-1">
                    <div className="font-semibold text-[#211B2B]">
                      1. Identity &amp; CAC Check ({state.pendingSellerState.status || 'Under Review'})
                    </div>
                    <div className="text-[#4A4356]">
                      Seller Type: {state.pendingSellerState.businessType || 'registered_business'} · State:{' '}
                      {state.pendingSellerState.state || 'Nigeria'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#EAE6F0] space-y-1">
                    <div className="font-semibold text-[#211B2B]">
                      2. Social / Manual Trust Check ({state.pendingSellerState.socialVerificationStatus || 'Under Review'})
                    </div>
                    {state.pendingSellerState.socialLinks && state.pendingSellerState.socialLinks.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {state.pendingSellerState.socialLinks.map((link) => (
                          <a
                            key={link.id}
                            href={link.normalizedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#FAF9FC] border border-[#EAE6F0] text-[#7E4EF2] hover:underline"
                          >
                            {link.platform}: {link.handleOrUrl}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    ) : state.pendingSellerState.alternativeManualVerification ? (
                      <div className="text-[#4A4356]">
                        <strong>Alternative Manual Review Requested:</strong>{' '}
                        {state.pendingSellerState.alternativeManualReason}
                      </div>
                    ) : (
                      <div className="text-[#716B7B]">No social links submitted yet.</div>
                    )}
                  </div>
                </div>

                {onAdminVerifyVendor && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={vendorReviewNote['pending-seller'] || ''}
                      onChange={(e) =>
                        setVendorReviewNote((prev) => ({
                          ...prev,
                          'pending-seller': e.target.value,
                        }))
                      }
                      placeholder="Reviewer notes (visible if Needs Info / Rejected)..."
                      className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-[#EAE6F0] bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const res = onAdminVerifyVendor({
                          vendorId: 'pending-seller',
                          decision: 'Approved',
                          identityStatus: 'Approved',
                          socialStatus: 'Approved',
                          notes: vendorReviewNote['pending-seller'] || 'Identity & social links verified.',
                          adminName: 'Adaobi Nwosu',
                        });
                        setVendorReviewFeedback(res.error || `Approved ${state.pendingSellerState.businessName}.`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#A981FF] text-white font-semibold"
                    >
                      Approve Both
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = onAdminVerifyVendor({
                          vendorId: 'pending-seller',
                          decision: 'Needs Info',
                          socialStatus: 'Needs Info',
                          notes:
                            vendorReviewNote['pending-seller'] ||
                            'Please supply an active business social link or shop proof.',
                          adminName: 'Adaobi Nwosu',
                        });
                        setVendorReviewFeedback(res.error || 'Requested more social verification info.');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#D0BCFC] bg-white text-[#30102F] font-medium"
                    >
                      Needs Info
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = onAdminVerifyVendor({
                          vendorId: 'pending-seller',
                          decision: 'Rejected',
                          identityStatus: 'Rejected',
                          socialStatus: 'Rejected',
                          notes: vendorReviewNote['pending-seller'] || 'Verification failed audit.',
                          adminName: 'Adaobi Nwosu',
                        });
                        setVendorReviewFeedback(res.error || 'Application rejected.');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#FED7D7] bg-[#FFF5F5] text-[#C53030] font-medium"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {state.vendors.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-[#7E4EF2] mr-2">
                      {v.vendorNumber || 'U-0001'}
                    </span>
                    <strong className="text-[#211B2B]">{v.name}</strong>{' '}
                    <span className="text-[#716B7B]">· {v.state || v.location}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0]">
                      Identity: {v.identityVerificationStatus || (v.verificationBadge ? 'Approved' : 'Under Review')}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0]">
                      Social: {v.socialVerificationStatus || 'Approved'}
                    </span>
                  </div>
                </div>
                {v.socialLinks && v.socialLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {v.socialLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.normalizedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#EAE6F0] text-[11px] text-[#7E4EF2] hover:underline"
                      >
                        {link.platform}: {link.handleOrUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
                {onAdminVerifyVendor && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const res = onAdminVerifyVendor({
                          vendorId: v.id,
                          decision: 'Approved',
                          identityStatus: 'Approved',
                          socialStatus: 'Approved',
                          notes: 'Verified in Admin Vendor Queue.',
                          adminName: 'Adaobi Nwosu',
                        });
                        setVendorReviewFeedback(res.error || `Verified ${v.name}.`);
                      }}
                      className="px-3 py-1 rounded-lg bg-[#A981FF] text-white font-medium"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = onAdminVerifyVendor({
                          vendorId: v.id,
                          decision: 'Needs Info',
                          socialStatus: 'Needs Info',
                          notes: 'Requested refreshed business social link proof.',
                          adminName: 'Adaobi Nwosu',
                        });
                        setVendorReviewFeedback(res.error || `Marked ${v.name} Needs Info.`);
                      }}
                      className="px-3 py-1 rounded-lg border border-[#EAE6F0] bg-white text-[#4A4356] font-medium"
                    >
                      Needs Info
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OFF-PLATFORM SAFETY MODERATION QUEUE */}
      {activeTab === 'moderation' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE6F0] pb-3">
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">
                Off-Platform &amp; Direct-Payment Moderation Queue
              </h2>
              <p className="text-[#716B7B]">
                Automatically captures HIGH-risk blocked diversion attempts and suspicious chat/checkout messages for enforcement.
              </p>
            </div>
            {moderationFeedback && (
              <span className="px-3 py-1 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[#30102F] font-medium">
                {moderationFeedback}
              </span>
            )}
          </div>

          {(state.restrictedMessagingUserIds || []).length > 0 && (
            <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030]">
              <strong>Messaging Restricted User IDs:</strong>{' '}
              {(state.restrictedMessagingUserIds || []).join(', ')}
            </div>
          )}

          {(state.moderationFlags || []).length === 0 ? (
            <p className="text-[#716B7B]">No moderation flags recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {(state.moderationFlags || []).map((flag) => (
                <div
                  key={flag.id}
                  className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          flag.riskLevel === 'HIGH'
                            ? 'bg-[#C53030] text-white'
                            : flag.riskLevel === 'MEDIUM'
                            ? 'bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030]'
                            : 'bg-white border border-[#EAE6F0] text-[#4A4356]'
                        }`}
                      >
                        {flag.riskLevel} RISK
                      </span>
                      <strong className="text-[#211B2B]">
                        {flag.userName} ({flag.userRole})
                      </strong>
                      {flag.orderNumber && (
                        <span className="font-mono text-[#716B7B]">{flag.orderNumber}</span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0] font-medium text-[#211B2B]">
                      {flag.status} · Prior warnings: {flag.priorWarningsCount}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-[#EAE6F0] text-[#211B2B]">
                    &ldquo;{flag.flaggedContent}&rdquo;
                  </div>

                  <div className="text-[11px] text-[#716B7B]">
                    Triggers: {flag.triggers.join(' · ')}
                  </div>

                  {onAdminModerateFlag && flag.status === 'Pending Review' && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={moderationNote[flag.id] || ''}
                        onChange={(e) =>
                          setModerationNote((prev) => ({ ...prev, [flag.id]: e.target.value }))
                        }
                        placeholder="Optional moderation note..."
                        className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg border border-[#EAE6F0] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const res = onAdminModerateFlag({
                            flagId: flag.id,
                            action: 'warn',
                            adminName: 'Adaobi Nwosu',
                            note: moderationNote[flag.id] || undefined,
                          });
                          setModerationFeedback(res.error || `Issued warning to ${flag.userName}.`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#A981FF] text-white font-medium"
                      >
                        Warn
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = onAdminModerateFlag({
                            flagId: flag.id,
                            action: 'restrict_messaging',
                            adminName: 'Adaobi Nwosu',
                            note: moderationNote[flag.id] || undefined,
                          });
                          setModerationFeedback(res.error || `Restricted messaging for ${flag.userName}.`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#211B2B] text-white font-medium"
                      >
                        Restrict Messaging
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = onAdminModerateFlag({
                            flagId: flag.id,
                            action: 'suspend_vendor',
                            adminName: 'Adaobi Nwosu',
                            note: moderationNote[flag.id] || undefined,
                          });
                          setModerationFeedback(res.error || `Suspended ${flag.userName}.`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#C53030] text-white font-medium"
                      >
                        Suspend Vendor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = onAdminModerateFlag({
                            flagId: flag.id,
                            action: 'dismiss',
                            adminName: 'Adaobi Nwosu',
                            note: moderationNote[flag.id] || undefined,
                          });
                          setModerationFeedback(res.error || 'Flag dismissed.');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[#EAE6F0] bg-white text-[#4A4356] font-medium"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3-MONTH WARRANTY POLICY & CLAIMS MANAGER */}
      {activeTab === 'warranties' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#211B2B]">
                  Global Vendor Hardware Warranty Policy
                </h2>
                <p className="text-[#716B7B]">
                  Configure default post-delivery warranty duration and vendor SLA across verified categories.
                </p>
              </div>
              {warrantyPolicySaved && (
                <span className="px-3 py-1 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[#30102F] font-medium">
                  {warrantyPolicySaved}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">
                  Default Warranty Duration (Months)
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={warrantyMonthsInput}
                  onChange={(e) => setWarrantyMonthsInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">
                  Vendor Claim Response SLA (Hours)
                </label>
                <input
                  type="number"
                  min={12}
                  max={168}
                  value={warrantySlaInput}
                  onChange={(e) => setWarrantySlaInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                />
              </div>
            </div>

            {onAdminUpdateWarrantyConfig && (
              <button
                type="button"
                onClick={() => {
                  onAdminUpdateWarrantyConfig({
                    defaultDurationMonths: warrantyMonthsInput,
                    claimResponseSlaHours: warrantySlaInput,
                    coveredSummary: state.warrantyConfig?.coveredSummary || [],
                    excludedSummary: state.warrantyConfig?.excludedSummary || [],
                    adminName: 'Adaobi Nwosu',
                  });
                  setWarrantyPolicySaved(
                    `Saved ${warrantyMonthsInput}-month warranty policy (${warrantySlaInput}h vendor SLA).`
                  );
                }}
                className="px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
              >
                Save Warranty Policy
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
            <h2 className="text-base font-semibold text-[#211B2B]">
              Submitted Warranty Claims ({(state.warrantyClaims || []).length})
            </h2>
            {(state.warrantyClaims || []).length === 0 ? (
              <p className="text-[#716B7B]">No post-delivery warranty claims submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {(state.warrantyClaims || []).map((claim) => (
                  <div
                    key={claim.id}
                    className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-[#211B2B]">
                          {claim.claimNumber}
                        </span>{' '}
                        · {claim.deviceTitle} ({claim.buyerName} ↔ {claim.vendorName})
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0] font-medium text-[#211B2B]">
                        {claim.status}
                      </span>
                    </div>
                    <p className="text-[#4A4356]">{claim.description}</p>
                    {claim.vendorResponse && (
                      <div className="p-2 rounded bg-white border border-[#EAE6F0]">
                        <strong>Vendor Proposed ({claim.proposedRemedy}):</strong> {claim.vendorResponse}
                      </div>
                    )}
                    {onAdminUpdateWarrantyClaim && claim.status !== 'Resolved' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={claimAdminNote[claim.id] || ''}
                          onChange={(e) =>
                            setClaimAdminNote((prev) => ({
                              ...prev,
                              [claim.id]: e.target.value,
                            }))
                          }
                          placeholder="Admin resolution summary..."
                          className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-[#EAE6F0] bg-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onAdminUpdateWarrantyClaim({
                              claimId: claim.id,
                              status: 'Resolved',
                              resolutionSummary:
                                claimAdminNote[claim.id] || 'Vendor remedy verified and completed.',
                              adminName: 'Adaobi Nwosu',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#A981FF] text-white font-semibold"
                        >
                          Mark Resolved
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onAdminUpdateWarrantyClaim({
                              claimId: claim.id,
                              status: 'Escalated to Admin',
                              adminNotes: claimAdminNote[claim.id] || 'Escalated for SLA enforcement.',
                              adminName: 'Adaobi Nwosu',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#211B2B] text-white font-medium"
                        >
                          Escalate
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FEES & FIXED DELIVERY CONTROLS */}
      {activeTab === 'fees' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Service Fees Governance */}
            <form
              onSubmit={handleSaveFees}
              className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs"
            >
              <div>
                <h2 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#A981FF]" />
                  Platform Service Fee Governance (Hard Caps Enforced)
                </h2>
                <p className="text-[11px] text-[#716B7B] mt-0.5">
                  Customer Platform Service Fee: 0% to 0.7% max · Vendor Platform Service Fee: 0% to 1.0% max. Delivery charges are excluded.
                </p>
              </div>

              {feeErrors.length > 0 && (
                <div
                  data-testid="admin-fee-validation-error"
                  className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] space-y-1"
                >
                  {feeErrors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              {feeSuccess && (
                <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#238653] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{feeSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="admin-customer-fee-input"
                    className="block font-medium text-[#211B2B] mb-1"
                  >
                    Customer Platform Service Fee (% · Max 0.7%)
                  </label>
                  <input
                    id="admin-customer-fee-input"
                    type="number"
                    step="0.05"
                    value={customerFeePct}
                    onChange={(e) => setCustomerFeePct(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] font-mono"
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-vendor-fee-input"
                    className="block font-medium text-[#211B2B] mb-1"
                  >
                    Vendor Platform Service Fee (% · Max 1.0%)
                  </label>
                  <input
                    id="admin-vendor-fee-input"
                    type="number"
                    step="0.05"
                    value={vendorFeePct}
                    onChange={(e) => setVendorFeePct(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">
                    Promotional Rate Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={promoLabel}
                    onChange={(e) => setPromoLabel(e.target.value)}
                    placeholder="e.g. Q4 Lagos Launch Promo"
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={feeEffectiveDate}
                    onChange={(e) => setFeeEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={feeExpiryDate}
                    onChange={(e) => setFeeExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">
                    Audit Change Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={feeReason}
                    onChange={(e) => setFeeReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#EAE6F0] space-y-2">
                <div className="font-semibold text-[#211B2B]">
                  Negotiated Per-Vendor Fee Rates (0% – 1.0% Max)
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {state.vendors.slice(0, 6).map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]"
                    >
                      <span className="truncate font-medium text-[#211B2B]">{v.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          step="0.05"
                          placeholder={vendorFeePct}
                          value={vendorRateOverrides[v.id] || ''}
                          onChange={(e) =>
                            setVendorRateOverrides((prev) => ({
                              ...prev,
                              [v.id]: e.target.value,
                            }))
                          }
                          aria-label={`Negotiated fee percentage for ${v.name}`}
                          className="w-20 px-2 py-1 rounded-lg border border-[#EAE6F0] bg-white font-mono text-right"
                        />
                        <span className="text-[#716B7B]">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
              >
                Save Platform Fee Configuration
              </button>
            </form>

            {/* Fixed Delivery & Vendor-Managed Rules */}
            <form
              onSubmit={handleSaveDeliveryConfig}
              className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs"
            >
              <div>
                <h2 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#A981FF]" />
                  Vendor-Managed Fixed Delivery Configuration
                </h2>
                <p className="text-[11px] text-[#716B7B] mt-0.5">
                  Vendors arrange their own dispatchers/logistics. Customers pay one fixed delivery fee per distinct vendor; delivery fees are excluded from platform fee percentages.
                </p>
              </div>

              {deliverySavedNotice && (
                <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#238653] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{deliverySavedNotice}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-[#211B2B] mb-1">
                  Fixed Delivery Fee per Vendor (₦)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={fixedDeliveryFeeInput}
                  onChange={(e) => setFixedDeliveryFeeInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-[#211B2B] mb-1">
                  Default Estimated Delivery Window
                </label>
                <input
                  type="text"
                  value={deliveryWindowInput}
                  onChange={(e) => setDeliveryWindowInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                />
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={freePickupInput}
                  onChange={(e) => setFreePickupInput(e.target.checked)}
                  className="accent-[#A981FF]"
                />
                <span className="font-medium text-[#211B2B]">
                  Enable Free In-Store Pickup (₦0 delivery fee) across participating vendors
                </span>
              </label>

              <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-1.5">
                <div className="font-semibold text-[#211B2B]">Supported Commercial Hubs</div>
                <div className="flex flex-wrap gap-1.5">
                  {NIGERIAN_COMMERCIAL_HUBS.map((h) => (
                    <span
                      key={h.value}
                      className="px-2 py-0.5 rounded-lg bg-white border border-[#EAE6F0] text-[11px] text-[#4A4356]"
                    >
                      {h.value}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#211B2B] hover:bg-[#4A4356] text-white font-semibold"
              >
                Save Delivery Configuration
              </button>
            </form>
          </div>

          {/* Fee Change Audit Log */}
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-[#211B2B]">Fee Governance Audit History</h3>
            {(state.feeAuditLog || []).length === 0 ? (
              <p className="text-[#716B7B]">No fee adjustments recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(state.feeAuditLog || []).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-wrap justify-between gap-2"
                  >
                    <div>
                      <strong className="text-[#211B2B]">{rec.targetType}</strong>:{' '}
                      {(rec.previousRate * 100).toFixed(2)}% →{' '}
                      <span className="font-semibold text-[#7E4EF2]">
                        {(rec.newRate * 100).toFixed(2)}%
                      </span>{' '}
                      ({rec.reason})
                    </div>
                    <span className="text-[11px] text-[#716B7B]">
                      {rec.adminName} · Effective {rec.effectiveDate}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* POLICY MANAGER (22 VERSIONED POLICIES + VENDOR ACCEPTANCE LOG) */}
      {activeTab === 'policies' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* List of 22 Policies */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-2 max-h-[540px] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE6F0]">
                <h2 className="text-sm font-semibold text-[#211B2B]">
                  All Platform Policies ({policiesList.length})
                </h2>
                {onOpenPolicyCentre && (
                  <button
                    type="button"
                    onClick={() => onOpenPolicyCentre(selectedPolicy?.slug)}
                    className="text-xs font-medium text-[#7E4EF2] hover:underline"
                  >
                    Preview Public Reader
                  </button>
                )}
              </div>
              {policiesList.map((pol) => {
                const active = selectedPolicy?.id === pol.id;
                return (
                  <button
                    key={pol.id}
                    type="button"
                    onClick={() => selectPolicyForEdit(pol)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors text-xs ${
                      active
                        ? 'bg-[#F5F0FF] border-[#A981FF] text-[#211B2B]'
                        : 'bg-[#FAF9FC] border-[#EAE6F0] text-[#4A4356] hover:border-[#D0BCFC]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {pol.number}. {pol.title}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0] text-[10px]">
                        v{pol.currentVersion} · {pol.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#716B7B] truncate mt-0.5">{pol.category}</div>
                  </button>
                );
              })}
            </div>

            {/* Policy Version Editor */}
            {selectedPolicy && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onAdminSavePolicy?.({
                    policyId: selectedPolicy.id,
                    title: policyTitleDraft.trim() || selectedPolicy.title,
                    summary: policySummaryDraft.trim() || selectedPolicy.summary,
                    version: policyVersionDraft.trim() || selectedPolicy.currentVersion,
                    status: policyStatusDraft,
                    effectiveDate: new Date().toISOString().slice(0, 10),
                    changeSummary: policyChangeSummary.trim() || 'Admin policy update',
                    requiresVendorReacceptance: policyRequireReaccept,
                    sections: selectedPolicy.sections,
                    adminName: 'Adaobi Nwosu',
                  });
                  setPolicySavedMsg(
                    `Saved ${policyStatusDraft} version v${policyVersionDraft} for "${policyTitleDraft}".`
                  );
                }}
                className="lg:col-span-7 bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE6F0] pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#211B2B]">
                      Edit Policy #{selectedPolicy.number}: {selectedPolicy.title}
                    </h3>
                    <p className="text-[11px] text-[#716B7B]">
                      Slug: <span className="font-mono">{selectedPolicy.slug}</span> · Versions recorded:{' '}
                      {selectedPolicy.versions.length}
                    </p>
                  </div>
                </div>

                {policySavedMsg && (
                  <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#238653] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{policySavedMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">Policy Title</label>
                    <input
                      type="text"
                      value={policyTitleDraft}
                      onChange={(e) => setPolicyTitleDraft(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-[#211B2B] mb-1">Version</label>
                      <input
                        type="text"
                        value={policyVersionDraft}
                        onChange={(e) => setPolicyVersionDraft(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#211B2B] mb-1">Status</label>
                      <select
                        value={policyStatusDraft}
                        onChange={(e) =>
                          setPolicyStatusDraft(e.target.value as PolicyDocument['status'])
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                      >
                        <option value="Published">Published</option>
                        <option value="Draft">Draft</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">Summary</label>
                  <textarea
                    rows={3}
                    value={policySummaryDraft}
                    onChange={(e) => setPolicySummaryDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">
                    Version Change Summary *
                  </label>
                  <input
                    type="text"
                    required
                    value={policyChangeSummary}
                    onChange={(e) => setPolicyChangeSummary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  />
                </div>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyRequireReaccept}
                    onChange={(e) => setPolicyRequireReaccept(e.target.checked)}
                    className="accent-[#A981FF]"
                  />
                  <span className="font-medium text-[#211B2B]">
                    Require vendors to explicitly re-accept this updated policy version
                  </span>
                </label>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
                >
                  Save &amp; Record Policy Version
                </button>
              </form>
            )}
          </div>

          {/* Vendor Agreement Acceptance Audit Log */}
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-[#211B2B]">
              Vendor Agreement &amp; 15+1 Declaration Acceptances ({(state.vendorAcceptances || []).length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(state.vendorAcceptances || []).map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <strong className="text-[#211B2B]">{acc.vendorName}</strong> ({acc.vendorId}) ·
                    Agreement <span className="font-mono">v{acc.agreementVersion}</span> ·{' '}
                    {acc.declarationsAccepted.filter(Boolean).length}/
                    {acc.declarationsAccepted.length} declarations + final consent
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                      acc.status === 'Accepted'
                        ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#238653]'
                        : 'bg-white border border-[#EAE6F0] text-[#716B7B]'
                    }`}
                  >
                    {acc.status} · {acc.acceptedAt.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inspection & Condition Policy */}
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#211B2B]">
              Inspection Hold &amp; Condition Policy
            </h2>

            {configSavedNotice && (
              <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-xs text-[#211B2B] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#A981FF]" />
                {configSavedNotice}
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#211B2B]">
                    Brand-New Products Section
                  </div>
                  <p className="text-xs text-[#716B7B] mt-0.5">
                    Keep disabled while UsedRight focuses exclusively on foreign-used technology.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBrandNew}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium min-h-[40px] ${
                    state.platformConfig.brandNewEnabled
                      ? 'bg-[#A981FF] text-white'
                      : 'bg-white border border-[#EAE6F0] text-[#4A4356]'
                  }`}
                >
                  {state.platformConfig.brandNewEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2.5">
              <label className="block text-xs font-semibold text-[#211B2B]">
                Post-Delivery Inspection Hours (Minimum 24 Hours Enforced)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={24}
                  max={168}
                  value={hoursInput}
                  onChange={(e) => setHoursInput(Number(e.target.value))}
                  className="w-28 px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] bg-white"
                />
                <button
                  type="button"
                  onClick={handleSaveInspectionHours}
                  className="px-4 py-2 rounded-xl bg-[#A981FF] text-white text-xs font-medium min-h-[40px]"
                >
                  Save Inspection Hours
                </button>
              </div>
              <p className="text-[11px] text-[#716B7B] flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#A981FF]" />
                Values below 24 hours are automatically raised to 24 hours.
              </p>
            </div>

            {onAdminUpdatePaymentRequestConfig && (
              <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2.5">
                <label
                  htmlFor="admin-preq-validity-input"
                  className="block text-xs font-semibold text-[#211B2B]"
                >
                  Payment Request Link Validity Window (1 – 168 Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="admin-preq-validity-input"
                    type="number"
                    min={1}
                    max={168}
                    value={payReqValidityInput}
                    onChange={(e) => setPayReqValidityInput(Number(e.target.value))}
                    className="w-28 px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clamped = Math.max(1, Math.min(168, Math.floor(payReqValidityInput || 24)));
                      setPayReqValidityInput(clamped);
                      onAdminUpdatePaymentRequestConfig({
                        validityHours: clamped,
                        adminName: 'Adaobi Nwosu',
                      });
                      setConfigSavedNotice(
                        `Payment request link validity updated to ${clamped} hour(s).`
                      );
                    }}
                    className="px-4 py-2 rounded-xl bg-[#211B2B] text-white text-xs font-medium min-h-[40px]"
                  >
                    Save Link Validity
                  </button>
                </div>
                <p className="text-[11px] text-[#716B7B]">
                  Controls how long &ldquo;Request Someone to Pay&rdquo; links remain payable before automatic expiry.
                </p>
              </div>
            )}
          </div>

          {/* Configurable Category Manager */}
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#211B2B]">
              Marketplace Categories ({state.platformConfig.categories.length})
            </h2>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {state.platformConfig.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-medium text-[#211B2B]">{cat.label}</div>
                    <div className="text-[11px] text-[#716B7B]">{cat.brands.join(', ')}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      cat.enabled
                        ? 'bg-[#A981FF] text-white'
                        : 'bg-white border border-[#EAE6F0] text-[#716B7B]'
                    }`}
                  >
                    {cat.enabled ? 'Active' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCategory} className="pt-3 border-t border-[#EAE6F0] space-y-2">
              <div className="text-xs font-semibold text-[#211B2B]">Add New Category</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="Category name (e.g. Smart Home)"
                  className="px-3 py-2 text-xs rounded-xl border border-[#EAE6F0]"
                />
                <input
                  type="text"
                  value={newCategoryBrands}
                  onChange={(e) => setNewCategoryBrands(e.target.value)}
                  placeholder="Brands (comma separated)"
                  className="px-3 py-2 text-xs rounded-xl border border-[#EAE6F0]"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A981FF] text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#211B2B]">Safety &amp; Behaviour Reports</h2>
          {state.reports.length === 0 ? (
            <p className="text-xs text-[#716B7B]">No user reports submitted yet.</p>
          ) : (
            <div className="space-y-2.5">
              {state.reports.map((rep) => (
                <div key={rep.id} className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs space-y-1">
                  <div className="flex justify-between font-medium text-[#211B2B]">
                    <span>
                      {rep.targetName} ({rep.targetType}) — {rep.reasonCategory}
                    </span>
                    <span className="text-[#C53030]">{rep.status}</span>
                  </div>
                  <p className="text-[#4A4356]">{rep.details}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#211B2B]">System Audit Log</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {state.auditLog.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="font-mono font-medium text-[#A981FF] mr-2">
                    [{entry.entityRef}]
                  </span>
                  <span className="text-[#211B2B]">{entry.details}</span>
                </div>
                <span className="text-[11px] text-[#716B7B]">
                  {entry.actorName} • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

