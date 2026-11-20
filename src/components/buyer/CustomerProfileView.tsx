import React, { useState, useEffect } from 'react';
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  CreditCard,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Activity,
  Gift,
  Link2,
  Copy,
  ExternalLink,
  XCircle,
  Clock,
  BookOpen,
  ClipboardCheck,
} from 'lucide-react';
import {
  AuditLogEntry,
  CustomerAddress,
  DeviceListing,
  DisputeReason,
  DisputeRecord,
  DisputeResolutionType,
  MessageConversation,
  Order,
  PaymentHold,
  PaymentRequestRecord,
  UserReport,
  WarrantyClaim,
} from '../../types/marketplace';
import { formatNaira } from '../../utils/marketplace';
import { getWarrantyDaysRemaining, isWarrantyActive } from '../../utils/warranty';
import { getShortStateLabel, NIGERIAN_COMMERCIAL_HUBS } from '../../utils/nigerianStates';
import { SmartImage } from '../common/SmartImage';
import { ActivityHistoryView } from '../common/ActivityHistoryView';

export type CustomerSubScreen =
  | 'overview'
  | 'personal_info'
  | 'addresses'
  | 'orders'
  | 'payment_requests'
  | 'warranties'
  | 'activity'
  | 'saved'
  | 'payment_methods'
  | 'protection'
  | 'help';

interface CustomerProfileViewProps {
  orders: Order[];
  paymentRequests?: PaymentRequestRecord[];
  warrantyClaims?: WarrantyClaim[];
  followedVendorIds?: string[];
  paymentHolds: PaymentHold[];
  conversations: MessageConversation[];
  disputes: DisputeRecord[];
  savedDevices: DeviceListing[];
  savedAddresses?: CustomerAddress[];
  onAddSavedAddress?: (address: CustomerAddress) => void;
  listings?: DeviceListing[];
  auditLog?: AuditLogEntry[];
  buyerId?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerState?: string;
  onUpdateBuyerProfile?: (updates: { name: string; phone: string; state: string }) => void;
  inspectionHours?: number;
  initialSubScreen?: CustomerSubScreen;
  initialConversationId?: string;
  initialOpenDisputeForm?: boolean;
  onNavigate: (view: string, extra?: any) => void;
  onOpenOrderDetail: (orderId: string) => void;
  onCancelPaymentRequest?: (paymentRequestId: string) => { error?: string } | void;
  onOpenPaymentRequestPreview?: (token: string) => void;
  onOpenGiftRecipientPortal?: (orderId: string, token?: string) => void;
  onSendMessage: (
    conversationId: string,
    text: string,
    senderRole: 'buyer' | 'vendor' | 'admin'
  ) => void;
  onOpenDispute: (payload: {
    orderId: string;
    conversationId: string;
    reason: DisputeReason;
    description: string;
    requestedResolution: DisputeResolutionType;
    evidenceFiles?: { fileName: string; type: 'image' | 'video' | 'document'; caption?: string }[];
  }) => void;
  onConfirmReceipt: (orderId: string) => void;
  onAcceptOrder: (orderId: string) => void;
  onViewProductDetails: (item: DeviceListing) => void;
  onViewVendorStorefront: (vendorId: string) => void;
  onSubmitReport?: (report: UserReport) => void;
  onOpenProtectionModal: () => void;
  onOpenHowItWorksModal: () => void;
  onOpenInspectionEducationModal?: () => void;
  onOpenPolicyCentre?: (slug?: string) => void;
  onSignOut: () => void;
  onBack?: () => void;
}

export const CustomerProfileView: React.FC<CustomerProfileViewProps> = ({
  orders,
  paymentRequests = [],
  warrantyClaims = [],
  followedVendorIds = [],
  conversations,
  disputes,
  savedDevices,
  savedAddresses,
  onAddSavedAddress,
  listings = [],
  auditLog = [],
  buyerId,
  buyerName = 'Ayodele Olayinka',
  buyerEmail = 'customer@usedright.demo',
  buyerPhone = '+234 803 892 4192',
  buyerState = 'Lagos State',
  onUpdateBuyerProfile,
  inspectionHours = 24,
  initialSubScreen = 'overview',
  onNavigate,
  onOpenOrderDetail,
  onCancelPaymentRequest,
  onOpenPaymentRequestPreview,
  onOpenGiftRecipientPortal,
  onViewProductDetails,
  onOpenProtectionModal,
  onOpenHowItWorksModal,
  onOpenInspectionEducationModal,
  onOpenPolicyCentre,
  onSignOut,
  onBack,
}) => {
  const [subScreen, setSubScreen] = useState<CustomerSubScreen>(initialSubScreen);

  // Personal Information editable state
  const [fullName, setFullName] = useState(buyerName);
  const [phone, setPhone] = useState(buyerPhone);
  const [selectedState, setSelectedState] = useState(buyerState);
  const [profileSaved, setProfileSaved] = useState(false);

  // Delivery Addresses state (synced with lifted savedAddresses when provided)
  const [localAddresses, setLocalAddresses] = useState<CustomerAddress[]>([
    {
      id: 'addr-1',
      label: 'Home (Lekki)',
      fullName: buyerName,
      street: '14 Admiralty Way, Lekki Phase 1',
      city: 'Lagos Island',
      state: 'Lagos State',
      phone: '+234 803 892 4192',
      isDefault: true,
    },
  ]);
  const addresses = savedAddresses && savedAddresses.length > 0 ? savedAddresses : localAddresses;
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState('');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('Lagos');
  const [newAddrState, setNewAddrState] = useState(buyerState || 'Lagos State');
  const [newAddrPhone, setNewAddrPhone] = useState('');

  // Saved Payment Methods state
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 'pm-1', brand: 'GTBank Mastercard', last4: '4821', expiry: '09/28', isDefault: true },
    { id: 'pm-2', brand: 'Paystack Instant Bank Transfer', last4: 'NGN', expiry: 'Verified', isDefault: false },
  ]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardBank, setNewCardBank] = useState('');
  const [newCardLast4, setNewCardLast4] = useState('');
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);
  const [reqActionFeedback, setReqActionFeedback] = useState<string | null>(null);

  const myPaymentRequests = paymentRequests.filter(
    (r) => !buyerId || r.orderOwnerId === buyerId
  );
  const myGiftOrders = orders.filter((o) => o.isGift);

  useEffect(() => {
    setSubScreen(initialSubScreen);
  }, [initialSubScreen]);

  useEffect(() => {
    setSelectedState(buyerState);
  }, [buyerState]);

  const openChatForOrder = (orderId: string) => {
    const conv = conversations.find((c) => c.orderId === orderId);
    onNavigate('messages', {
      conversationId: conv?.id,
      openDisputeForm: false,
    });
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrStreet.trim()) return;
    const newAddr: CustomerAddress = {
      id: `addr-${Date.now()}`,
      label: newAddrLabel.trim() || 'Additional Address',
      fullName: fullName.trim() || buyerName,
      street: newAddrStreet.trim(),
      city: newAddrCity.trim() || 'Lagos',
      state: newAddrState || selectedState || 'Lagos State',
      phone: newAddrPhone.trim() || phone,
    };
    if (onAddSavedAddress) {
      onAddSavedAddress(newAddr);
    } else {
      setLocalAddresses((prev) => [...prev, newAddr]);
    }
    setNewAddrLabel('');
    setNewAddrStreet('');
    setNewAddrPhone('');
    setShowAddAddress(false);
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardBank.trim() || newCardLast4.trim().length < 4) return;
    setPaymentMethods((prev) => [
      ...prev,
      {
        id: `pm-${Date.now()}`,
        brand: newCardBank.trim(),
        last4: newCardLast4.trim().slice(-4),
        expiry: '11/29',
        isDefault: false,
      },
    ]);
    setNewCardBank('');
    setNewCardLast4('');
    setShowAddCard(false);
  };

  const profileMenuRows: {
    id: CustomerSubScreen | 'sign_out';
    label: string;
    subtitle: string;
    icon: any;
    badge?: string | number;
    danger?: boolean;
    onClick: () => void;
  }[] = [
    {
      id: 'personal_info',
      label: 'Personal Information',
      subtitle: `${fullName} · ${getShortStateLabel(selectedState)} · ${buyerEmail}`,
      icon: User,
      onClick: () => setSubScreen('personal_info'),
    },
    {
      id: 'addresses',
      label: 'Delivery Addresses',
      subtitle: `${addresses.length} saved address${addresses.length === 1 ? '' : 'es'}`,
      icon: MapPin,
      onClick: () => setSubScreen('addresses'),
    },
    {
      id: 'orders',
      label: 'My Orders',
      subtitle: 'Track dispatch, delivery & 24-hour inspection',
      icon: ShoppingBag,
      badge: orders.length,
      onClick: () => setSubScreen('orders'),
    },
    {
      id: 'payment_requests',
      label: 'Shared Payments & Gifts',
      subtitle: `${myPaymentRequests.length} payment link(s) · ${myGiftOrders.length} sent gift(s)`,
      icon: Link2,
      badge: myPaymentRequests.length + myGiftOrders.length || undefined,
      onClick: () => setSubScreen('payment_requests'),
    },
    {
      id: 'activity',
      label: 'Activity & History',
      subtitle: 'Past orders, price edits, chat logs & dispute history',
      icon: Activity,
      badge: orders.length + conversations.length + disputes.length,
      onClick: () => setSubScreen('activity'),
    },
    {
      id: 'warranties',
      label: '3-Month Hardware Warranties',
      subtitle: `${orders.filter((o) => o.warranty && isWarrantyActive(o.warranty)).length} active warranty certificates · ${warrantyClaims.length} claims`,
      icon: ShieldCheck,
      badge: orders.filter((o) => o.warranty && isWarrantyActive(o.warranty)).length || undefined,
      onClick: () => setSubScreen('warranties'),
    },
    {
      id: 'saved',
      label: 'Saved Devices & Stores',
      subtitle: `${savedDevices.length} saved devices · ${followedVendorIds.length} followed stores`,
      icon: Heart,
      badge: savedDevices.length > 0 ? savedDevices.length : undefined,
      onClick: () => setSubScreen('saved'),
    },
    {
      id: 'payment_methods',
      label: 'Payment Methods',
      subtitle: 'Cards & bank transfer via UsedRight Escrow',
      icon: CreditCard,
      onClick: () => setSubScreen('payment_methods'),
    },
    {
      id: 'protection',
      label: 'Purchase Protection',
      subtitle: `Minimum ${inspectionHours}-hour inspection window guarantee`,
      icon: ShieldCheck,
      onClick: () => setSubScreen('protection'),
    },
    {
      id: 'help',
      label: 'Help & Support',
      subtitle: 'How UsedRight works & 10-point inspection guide',
      icon: HelpCircle,
      onClick: () => setSubScreen('help'),
    },
    {
      id: 'sign_out',
      label: 'Sign Out',
      subtitle: 'Exit your customer account on this device',
      icon: LogOut,
      danger: true,
      onClick: onSignOut,
    },
  ];

  const profileMenuGroups: {
    groupTitle: string;
    rows: typeof profileMenuRows;
  }[] = [
    {
      groupTitle: 'Account & Orders',
      rows: profileMenuRows.filter((r) =>
        ['personal_info', 'addresses', 'orders', 'activity'].includes(r.id)
      ),
    },
    {
      groupTitle: 'Saved & Payments',
      rows: profileMenuRows.filter((r) =>
        ['payment_requests', 'saved', 'payment_methods', 'warranties'].includes(r.id)
      ),
    },
    {
      groupTitle: 'Protection & Support',
      rows: profileMenuRows.filter((r) => ['protection', 'help'].includes(r.id)),
    },
  ];
  const signOutRow = profileMenuRows.find((r) => r.id === 'sign_out');

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:pb-12 space-y-4">
      {/* Compact Account Header */}
      <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {(subScreen !== 'overview' || onBack) && (
            <button
              type="button"
              onClick={() => {
                if (subScreen !== 'overview') setSubScreen('overview');
                else onBack?.();
              }}
              aria-label="Go back"
              className="w-8 h-8 rounded-full border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] flex items-center justify-center text-[#211B2B] shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-12 h-12 rounded-full bg-[#F5F0FF] border border-[#D0BCFC] text-[#5B37B7] font-semibold flex items-center justify-center shrink-0">
            {fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-[#211B2B] truncate">{fullName}</h1>
            <p className="text-xs text-[#716B7B] truncate">{buyerEmail}</p>
          </div>
        </div>
        {subScreen !== 'overview' && (
          <button
            type="button"
            onClick={() => setSubScreen('overview')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] text-xs font-medium text-[#211B2B] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Profile
          </button>
        )}
      </div>

      {/* OVERVIEW: CLEAN GROUPED VERTICAL SECTIONS */}
      {subScreen === 'overview' && (
        <div data-testid="customer-profile-overview" className="space-y-4">
          {profileMenuGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1.5">
              <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[#716B7B]">
                {group.groupTitle}
              </h2>
              <div className="bg-white rounded-2xl border border-[#EAE6F0] divide-y divide-[#EAE6F0] overflow-hidden">
                {group.rows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={row.onClick}
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors min-h-[56px] hover:bg-[#FAF8F4]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] border border-[#EAE6F0] text-[#7E4EF2] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#211B2B]">{row.label}</div>
                          <div className="text-xs text-[#716B7B] truncate">{row.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {row.badge !== undefined && (
                          <span className="px-2 py-0.5 rounded-full bg-[#F5F0FF] border border-[#D0BCFC] text-[#5B37B7] text-xs font-semibold tabular-nums">
                            {row.badge}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#716B7B]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {signOutRow && (
            <div className="bg-white rounded-2xl border border-[#EAE6F0] overflow-hidden">
              <button
                type="button"
                onClick={signOutRow.onClick}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors min-h-[56px] hover:bg-[#FFF5F5]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] flex items-center justify-center shrink-0">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#C53030]">{signOutRow.label}</div>
                    <div className="text-xs text-[#716B7B] truncate">{signOutRow.subtitle}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#C53030]" />
              </button>
            </div>
          )}
        </div>
      )}

      {subScreen === 'warranties' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3 text-xs">
          <div>
            <h2 className="text-base font-semibold text-[#211B2B]">
              My 3-Month Hardware Warranties
            </h2>
            <p className="text-[#716B7B] mt-0.5">
              Immutable 3-month vendor warranty certificates activated automatically upon verified delivery.
            </p>
          </div>
          {orders.filter((o) => o.warranty).length === 0 ? (
            <p className="text-[#716B7B]">
              No warranty certificates yet. Certificates activate automatically once an order is delivered.
            </p>
          ) : (
            <div className="space-y-2.5">
              {orders
                .filter((o) => o.warranty)
                .map((ord) => {
                  const w = ord.warranty!;
                  const daysLeft = getWarrantyDaysRemaining(w);
                  const active = isWarrantyActive(w);
                  return (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-mono font-semibold text-[#211B2B]">
                          {w.warrantyId} · {w.deviceTitle}
                        </div>
                        <div className="text-[11px] text-[#716B7B]">
                          {w.vendorName} ({w.vendorNumber}) · Status: {w.status}
                          {active && daysLeft > 0 ? ` · ${daysLeft} days left` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenOrderDetail(ord.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#A981FF] text-white font-semibold"
                      >
                        View / Claim
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* SHARED PAYMENTS & SENT GIFTS */}
      {subScreen === 'payment_requests' && (
        <div data-testid="profile-shared-payments-view" className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">
                Shared Payment Requests ({myPaymentRequests.length})
              </h2>
              <p className="text-[#716B7B] mt-0.5">
                Links you created for someone else to pay on your behalf. Vendors are only notified after payment succeeds.
              </p>
            </div>

            {reqActionFeedback && (
              <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#30102F] font-medium">
                {reqActionFeedback}
              </div>
            )}

            {myPaymentRequests.length === 0 ? (
              <p className="text-[#716B7B]">
                No shared payment requests yet. Open your cart and tap &ldquo;Request Someone to Pay&rdquo; to create a locked link.
              </p>
            ) : (
              <div className="space-y-3">
                {myPaymentRequests.map((req) => {
                  const shareToken = req.shareTokenDemo || req.id;
                  const canCancel =
                    req.status === 'Pending payment' ||
                    req.status === 'Draft' ||
                    req.status === 'Failed';
                  const baseOrigin =
                    typeof window !== 'undefined'
                      ? window.location.origin
                      : 'https://shopusedright.com';
                  const shareUrl = `${baseOrigin}/?pay_request=${encodeURIComponent(shareToken)}`;

                  return (
                    <div
                      key={req.id}
                      data-testid={`profile-preq-card-${req.id}`}
                      className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-[#211B2B]">
                            {req.requestReference}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              req.status === 'Paid'
                                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                                : req.status === 'Pending payment'
                                ? 'bg-[#F5F0FF] border-[#D0BCFC] text-[#30102F]'
                                : 'bg-[#FFF5F5] border-[#FED7D7] text-[#C53030]'
                            }`}
                          >
                            {req.status}
                          </span>
                          {req.isGift && req.giftDetails && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#D0BCFC] text-[10px] font-medium text-[#7E4EF2]">
                              <Gift className="w-3 h-3" />
                              Gift to {req.giftDetails.recipientName}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-[#211B2B] tabular-nums">
                          {formatNaira(req.totalPayableAmount)}
                        </span>
                      </div>

                      <div className="text-[#4A4356]">
                        {req.itemsSnapshot.map((i) => `${i.title} (×${i.quantity})`).join(', ')}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#716B7B]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#A981FF]" />
                          Expires {new Date(req.expiresAt).toLocaleString()}
                        </span>
                        {req.payerInfo && (
                          <span>
                            Payer: <strong className="text-[#211B2B]">{req.payerInfo.payerName}</strong>
                            {req.paymentProviderRef ? ` (${req.paymentProviderRef})` : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {req.shareTokenDemo && (
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                navigator.clipboard.writeText(shareUrl).catch(() => {});
                              }
                              setCopiedRequestId(req.id);
                              setTimeout(() => setCopiedRequestId(null), 2000);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#EAE6F0] hover:border-[#A981FF] font-medium text-[#211B2B]"
                          >
                            <Copy className="w-3.5 h-3.5 text-[#A981FF]" />
                            {copiedRequestId === req.id ? 'Link Copied' : 'Copy Link'}
                          </button>
                        )}
                        {onOpenPaymentRequestPreview && req.shareTokenDemo && (
                          <button
                            type="button"
                            onClick={() => onOpenPaymentRequestPreview(req.shareTokenDemo!)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Payer Review Page
                          </button>
                        )}
                        {canCancel && onCancelPaymentRequest && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = onCancelPaymentRequest(req.id);
                              if (res && typeof res === 'object' && res.error) {
                                setReqActionFeedback(res.error);
                              } else {
                                setReqActionFeedback(
                                  `Cancelled payment request ${req.requestReference}. The share link is now blocked.`
                                );
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-medium"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel Link
                          </button>
                        )}
                        {req.childOrderIds?.[0] && (
                          <button
                            type="button"
                            onClick={() => onOpenOrderDetail(req.childOrderIds![0])}
                            className="px-3 py-1.5 rounded-xl bg-white border border-[#EAE6F0] font-medium text-[#211B2B]"
                          >
                            View Confirmed Order
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3 text-xs">
            <div>
              <h3 className="text-sm font-semibold text-[#211B2B]">
                Sent Gift Orders ({myGiftOrders.length})
              </h3>
              <p className="text-[#716B7B] mt-0.5">
                Preview the price-free Gift Recipient Portal for any gift order you sent.
              </p>
            </div>
            {myGiftOrders.length === 0 ? (
              <p className="text-[#716B7B]">No sent gift orders yet.</p>
            ) : (
              <div className="space-y-2.5">
                {myGiftOrders.map((gOrd) => (
                  <div
                    key={gOrd.id}
                    className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-[#211B2B]">
                        {gOrd.listing.title} → {gOrd.giftDetails?.recipientName || gOrd.deliveryAddress.fullName}
                      </div>
                      <div className="text-[11px] text-[#716B7B]">
                        {gOrd.orderNumber} ·{' '}
                        {gOrd.giftDetails?.senderVisibility === 'anonymous'
                          ? 'Anonymous Sender'
                          : 'Named Sender'}{' '}
                        · {gOrd.fulfillmentStatus.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenOrderDetail(gOrd.id)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#EAE6F0] font-medium text-[#211B2B]"
                      >
                        Order Detail
                      </button>
                      {onOpenGiftRecipientPortal && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenGiftRecipientPortal(
                              gOrd.id,
                              gOrd.giftDetails?.recipientPortalToken
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#A981FF] text-white font-semibold"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          Recipient Portal
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PERSONAL INFORMATION */}
      {subScreen === 'personal_info' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
          <h2 className="text-base font-semibold text-[#211B2B]">Personal Information</h2>
          {profileSaved && (
            <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#A981FF]" />
              Account details updated.
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-sm text-[#211B2B]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={buyerEmail}
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-sm text-[#716B7B]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-sm text-[#211B2B]"
              />
            </div>
            <div>
              <label
                htmlFor="profile-customer-state"
                className="block font-medium text-[#211B2B] mb-1"
              >
                Current State in Nigeria (Local Vendor Discovery)
              </label>
              <select
                id="profile-customer-state"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-sm text-[#211B2B]"
              >
                {NIGERIAN_COMMERCIAL_HUBS.map((hub) => (
                  <option key={hub.value} value={hub.value}>
                    {hub.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateBuyerProfile?.({
                  name: fullName.trim() || buyerName,
                  phone: phone.trim() || buyerPhone,
                  state: selectedState,
                });
                setProfileSaved(true);
                setTimeout(() => setProfileSaved(false), 2000);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* DELIVERY ADDRESSES */}
      {subScreen === 'addresses' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#211B2B]">Delivery Addresses</h2>
            <button
              type="button"
              onClick={() => setShowAddAddress((v) => !v)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#A981FF] text-white font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Address
            </button>
          </div>

          {showAddAddress && (
            <form
              onSubmit={handleAddAddress}
              className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Address label (e.g. Office)"
                  value={newAddrLabel}
                  onChange={(e) => setNewAddrLabel(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                />
                <input
                  type="text"
                  placeholder="City (e.g. Victoria Island)"
                  value={newAddrCity}
                  onChange={(e) => setNewAddrCity(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Full street address"
                  value={newAddrStreet}
                  onChange={(e) => setNewAddrStreet(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={newAddrPhone}
                  onChange={(e) => setNewAddrPhone(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                />
                <select
                  aria-label="Address state in Nigeria"
                  value={newAddrState}
                  onChange={(e) => setNewAddrState(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                >
                  {NIGERIAN_COMMERCIAL_HUBS.map((hub) => (
                    <option key={hub.value} value={hub.value}>
                      {hub.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#A981FF] text-white font-medium"
              >
                Save Address
              </button>
            </form>
          )}

          <div className="space-y-2.5">
            {addresses.map((a) => (
              <div key={a.id} className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]">
                <div className="font-semibold text-[#211B2B]">{a.label}</div>
                <div className="text-[#4A4356] mt-0.5">
                  {a.street}, {a.city}, {a.state}
                </div>
                <div className="text-[#716B7B] mt-0.5">{a.phone}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MY ORDERS */}
      {subScreen === 'orders' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4">
          <h2 className="text-base font-semibold text-[#211B2B]">My Orders ({orders.length})</h2>
          <div className="space-y-3">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3">
                  <SmartImage
                    src={ord.listing.images[0]}
                    alt={ord.listing.title}
                    category={ord.listing.category}
                    className="w-14 h-14 rounded-xl object-cover border border-[#EAE6F0] shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-[#211B2B]">
                        {ord.subOrderNumber || ord.orderNumber}
                      </span>
                      {ord.parentOrderNumber && ord.parentOrderNumber !== ord.orderNumber && (
                        <span className="px-2 py-0.5 rounded bg-[#F5F0FF] border border-[#D0BCFC] font-mono text-[10px] text-[#7E4EF2]">
                          Parent: {ord.parentOrderNumber}
                        </span>
                      )}
                      {ord.isGift && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F5F0FF] border border-[#D0BCFC] text-[10px] font-semibold text-[#7E4EF2]">
                          <Gift className="w-3 h-3" />
                          Gift → {ord.giftDetails?.recipientName || 'Recipient'}
                        </span>
                      )}
                      {ord.payerInfo && (
                        <span className="px-2 py-0.5 rounded bg-white border border-[#D0BCFC] text-[10px] font-medium text-[#30102F]">
                          Paid by {ord.payerInfo.payerName}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0] font-medium text-[#4A4356]">
                        {ord.fulfillmentStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="font-medium text-[#211B2B]">{ord.listing.title}</div>
                    <div className="text-[#716B7B]">
                      Vendor: {ord.vendorName || ord.listing.sellerName} • Total:{' '}
                      {formatNaira(ord.totalAmount)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenOrderDetail(ord.id)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#EAE6F0] hover:border-[#A981FF] font-medium text-[#211B2B]"
                  >
                    View Order
                  </button>
                  {ord.isGift && onOpenGiftRecipientPortal && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenGiftRecipientPortal(ord.id, ord.giftDetails?.recipientPortalToken)
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] font-medium text-[#30102F]"
                    >
                      Gift Portal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openChatForOrder(ord.id)}
                    className="px-3.5 py-2 rounded-xl bg-[#A981FF] text-white font-medium"
                  >
                    Transaction Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVITY & HISTORY */}
      {subScreen === 'activity' && (
        <ActivityHistoryView
          role="buyer"
          orders={orders}
          listings={listings}
          conversations={conversations}
          disputes={disputes}
          auditLog={auditLog}
          onOpenOrder={onOpenOrderDetail}
          onOpenChat={(convId) =>
            onNavigate('messages', {
              conversationId: convId,
              openDisputeForm: false,
            })
          }
          onOpenListing={(lid) => {
            const target =
              listings.find((l) => l.id === lid) ||
              savedDevices.find((d) => d.id === lid);
            if (target) onViewProductDetails(target);
          }}
        />
      )}

      {/* SAVED DEVICES */}
      {subScreen === 'saved' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4">
          <h2 className="text-base font-semibold text-[#211B2B]">
            Saved Devices ({savedDevices.length})
          </h2>
          {savedDevices.length === 0 ? (
            <p className="text-xs text-[#716B7B]">No saved devices yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedDevices.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center gap-3 text-xs"
                >
                  <SmartImage
                    src={d.images[0]}
                    alt={d.title}
                    category={d.category}
                    className="w-14 h-14 rounded-xl object-cover border border-[#EAE6F0]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#211B2B] truncate">{d.title}</div>
                    <div className="text-[#716B7B]">{formatNaira(d.price)}</div>
                    <button
                      type="button"
                      onClick={() => onViewProductDetails(d)}
                      className="text-[#A981FF] font-medium hover:underline mt-1"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAYMENT METHODS */}
      {subScreen === 'payment_methods' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">Payment Methods</h2>
              <p className="text-[#716B7B]">
                All payments enter UsedRight Escrow Hold until you inspect your device.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCard((v) => !v)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#A981FF] text-white font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Card
            </button>
          </div>

          {showAddCard && (
            <form
              onSubmit={handleAddCard}
              className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] grid grid-cols-1 sm:grid-cols-3 gap-2.5"
            >
              <input
                type="text"
                required
                placeholder="Bank / Card Brand (e.g. Access Visa)"
                value={newCardBank}
                onChange={(e) => setNewCardBank(e.target.value)}
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
              />
              <input
                type="text"
                required
                maxLength={4}
                placeholder="Last 4 digits"
                value={newCardLast4}
                onChange={(e) => setNewCardLast4(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#A981FF] text-white font-medium sm:col-span-3 w-fit"
              >
                Save Payment Method
              </button>
            </form>
          )}

          <div className="space-y-2.5">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-[#211B2B]">
                    {pm.brand} ·••• {pm.last4}
                  </div>
                  <div className="text-[#716B7B]">Status: {pm.expiry}</div>
                </div>
                {pm.isDefault && (
                  <span className="px-2 py-0.5 rounded-lg bg-[#F5F0FF] text-[#A981FF] font-medium">
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PURCHASE PROTECTION */}
      {subScreen === 'protection' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
          <h2 className="text-base font-semibold text-[#211B2B]">UsedRight Purchase Protection</h2>
          <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-[#EAE6F0] flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#7E4EF2] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <div className="font-semibold text-sm text-[#211B2B]">
                Minimum {inspectionHours}-Hour Physical Inspection Guarantee
              </div>
              <p className="text-[#4A4356] leading-relaxed">
                Your funds remain safely locked in UsedRight Escrow until your device arrives and you confirm receipt. If any undisclosed fault appears within your {inspectionHours}-hour inspection window, open a report directly in your transaction chat to pause payout release immediately.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenProtectionModal}
              className="px-4 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-medium transition-colors"
            >
              Read Fee &amp; Protection Summary
            </button>
            {onOpenPolicyCentre && (
              <button
                type="button"
                onClick={() => onOpenPolicyCentre('customer-platform-service-fee-policy')}
                className="px-4 py-2.5 rounded-xl border border-[#D0BCFC] bg-[#F5F0FF] hover:border-[#A981FF] text-[#211B2B] font-medium transition-colors"
              >
                Open Public Policy Centre (22 Policies)
              </button>
            )}
          </div>
        </div>
      )}

      {/* HELP & SUPPORT */}
      {subScreen === 'help' && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4 text-xs">
          <div>
            <h2 className="text-base font-semibold text-[#211B2B]">Help &amp; Support</h2>
            <p className="text-[#716B7B] mt-0.5">
              Guides, escrow inspection rules, and official UsedRight disclosures.
            </p>
          </div>
          <div className="rounded-2xl border border-[#EAE6F0] divide-y divide-[#EAE6F0] overflow-hidden">
            <button
              type="button"
              onClick={onOpenHowItWorksModal}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAF8F4] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] border border-[#EAE6F0] text-[#7E4EF2] flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-[#211B2B]">How UsedRight Works</div>
                  <div className="text-[11px] text-[#716B7B]">Step-by-step escrow flow</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#716B7B]" />
            </button>

            <button
              type="button"
              onClick={onOpenProtectionModal}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAF8F4] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] border border-[#EAE6F0] text-[#7E4EF2] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-[#211B2B]">Payment Protection Rules</div>
                  <div className="text-[11px] text-[#716B7B]">
                    {inspectionHours}h inspection &amp; dispute window
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#716B7B]" />
            </button>

            {onOpenInspectionEducationModal && (
              <button
                type="button"
                onClick={onOpenInspectionEducationModal}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAF8F4] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] border border-[#EAE6F0] text-[#7E4EF2] flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#211B2B]">10-Point Inspection Guide</div>
                    <div className="text-[11px] text-[#716B7B]">
                      Interactive phone &amp; laptop handover checks
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#716B7B]" />
              </button>
            )}

            {onOpenPolicyCentre && (
              <button
                type="button"
                onClick={() => onOpenPolicyCentre()}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAF8F4] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] border border-[#EAE6F0] text-[#7E4EF2] flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#211B2B]">
                      Public Policy Centre (22 Policies)
                    </div>
                    <div className="text-[11px] text-[#716B7B]">
                      All UsedRight marketplace policies &amp; fee rules
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#716B7B]" />
              </button>
            )}
          </div>
          <div className="p-3 rounded-xl bg-[#FAF8F4] border border-[#EAE6F0] text-[11px] text-[#4A4356]">
            Need direct help with an active order? Open any order and message Support inside its Transaction Chat.
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfileView;
