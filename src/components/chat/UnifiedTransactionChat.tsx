import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Send,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Ban,
  Flag,
  FileUp,
  X,
  Lock,
  Truck,
  Store,
  ShoppingBag,
  ImagePlus,
  Video,
  Film,
  Maximize2,
} from 'lucide-react';
import {
  ChatAttachmentRecord,
  ChatEvidenceTag,
  DisputeReason,
  DisputeRecord,
  DisputeResolutionType,
  DisputeStatus,
  MessageConversation,
  Order,
  OrderStatus,
  PaymentHold,
  UserReport,
  WarrantyClaim,
} from '../../types/marketplace';
import {
  checkBlockingRestriction,
  formatCountdown,
  formatNaira,
  scanMessageForDisallowedContent,
} from '../../utils/marketplace';
import {
  APPROVED_DISPUTE_REASONS,
  validateAttachmentUpload,
} from '../../utils/warranty';
import { uploadChatAttachmentApi } from '../../utils/apiClient';
import { getRoleSafeDisputeView } from '../../utils/transactionEngine';
import { SmartImage } from '../common/SmartImage';

type ThreadFilter =
  | 'all'
  | 'unread'
  | 'enquiries'
  | 'active_orders'
  | 'payment_holds'
  | 'disputes'
  | 'completed';

interface UnifiedTransactionChatProps {
  viewerRole: 'buyer' | 'vendor' | 'admin';
  viewerId: string;
  conversations: MessageConversation[];
  orders: Order[];
  paymentHolds: PaymentHold[];
  disputes: DisputeRecord[];
  warrantyClaims?: WarrantyClaim[];
  restrictedUserIds?: string[];
  initialConversationId?: string;
  initialOpenDisputeForm?: boolean;
  onSendMessage: (
    conversationId: string,
    text: string,
    senderRole: 'buyer' | 'vendor' | 'admin',
    extra?: {
      mediaAttachments?: ChatAttachmentRecord[];
      riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
      triggers?: string[];
    }
  ) => void;
  onFlagOffPlatform?: (payload: {
    conversationId: string;
    orderId?: string;
    orderNumber?: string;
    content: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    triggers: string[];
  }) => void;
  onReportAttachment?: (payload: {
    conversationId: string;
    messageId: string;
    attachmentId: string;
    reason: string;
  }) => void;
  onBuyProduct?: (listingId: string) => void;
  onViewProduct?: (listingId: string) => void;
  onViewOrder?: (orderId: string) => void;
  onViewVendorStorefront?: (vendorId: string) => void;
  onConfirmReceipt?: (orderId: string) => void;
  onAcceptOrder?: (orderId: string) => void;
  onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void;
  onOpenDispute: (payload: {
    orderId: string;
    conversationId: string;
    reason: DisputeReason;
    description: string;
    requestedResolution: DisputeResolutionType;
    evidenceFiles?: { fileName: string; type: 'image' | 'video' | 'document'; caption?: string }[];
  }) => void;
  onAdminUpdateDispute?: (payload: {
    disputeId: string;
    adminName: string;
    newStatus?: DisputeStatus;
    publicMessage?: string;
    internalNote?: string;
  }) => void;
  onAdminResolveDispute?: (payload: {
    disputeId: string;
    adminName: string;
    decision: 'refund_buyer' | 'release_vendor';
    outcomeSummary: string;
  }) => void;
  onSubmitReport?: (report: UserReport) => void;
}

const DISPUTE_REASONS: DisputeReason[] = APPROVED_DISPUTE_REASONS;

const EVIDENCE_TAG_LABELS: { id: ChatEvidenceTag; label: string }[] = [
  { id: 'general', label: 'General Photo/Video' },
  { id: 'pre_dispatch_packaging', label: 'Pre-Dispatch Packaging' },
  { id: 'delivery_handover', label: 'Delivery Handover Proof' },
  { id: 'unboxing_evidence', label: 'Unboxing Inspection' },
  { id: 'defect_proof', label: 'Defect / Issue Proof' },
  { id: 'warranty_proof', label: 'Warranty Evidence' },
];

const RESOLUTION_OPTIONS: DisputeResolutionType[] = [
  'Full Refund to Customer',
  'Partial Refund + Keep Device',
  'Replacement / Return Shipped',
  'Release Payout to Vendor',
];

export const UnifiedTransactionChat: React.FC<UnifiedTransactionChatProps> = ({
  viewerRole,
  viewerId,
  conversations,
  orders,
  paymentHolds,
  disputes,
  warrantyClaims = [],
  restrictedUserIds = [],
  initialConversationId,
  initialOpenDisputeForm = false,
  onSendMessage,
  onFlagOffPlatform,
  onReportAttachment,
  onBuyProduct,
  onViewProduct,
  onViewOrder,
  onViewVendorStorefront,
  onConfirmReceipt,
  onAcceptOrder,
  onUpdateOrderStatus,
  onOpenDispute,
  onAdminUpdateDispute,
  onAdminResolveDispute,
  onSubmitReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<ThreadFilter>('all');
  const [selectedConvId, setSelectedConvId] = useState<string>(
    initialConversationId || conversations[0]?.id || ''
  );
  const [mobileShowThread, setMobileShowThread] = useState<boolean>(!!initialConversationId);
  const [panelExpanded, setPanelExpanded] = useState<boolean>(false);
  const [draftMessage, setDraftMessage] = useState('');

  // Attachment & Evidence Room state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingUploadFile, setPendingUploadFile] = useState<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    mediaType: 'image' | 'video';
    dataBase64: string;
    previewUrl: string;
  } | null>(null);
  const [selectedEvidenceTag, setSelectedEvidenceTag] = useState<ChatEvidenceTag>('general');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<ChatAttachmentRecord | null>(null);
  const [highRiskAlertSent, setHighRiskAlertSent] = useState(false);

  // In-chat Report a Problem (Dispute) form
  const [showDisputeForm, setShowDisputeForm] = useState<boolean>(initialOpenDisputeForm);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('Device not working as advertised');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeResolution, setDisputeResolution] =
    useState<DisputeResolutionType>('Full Refund to Customer');
  const [disputeEvidenceName, setDisputeEvidenceName] = useState('');
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // Admin inline controls inside chat
  const [adminStatusDraft, setAdminStatusDraft] = useState<DisputeStatus>('Under Review');
  const [adminInternalNoteDraft, setAdminInternalNoteDraft] = useState('');

  // Block / Report inline modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] =
    useState<UserReport['reasonCategory']>('Suspicious behaviour');
  const [reportDetails, setReportDetails] = useState('');
  const [blockNotice, setBlockNotice] = useState<string | null>(null);
  const [confirmReceiptModalOpen, setConfirmReceiptModalOpen] = useState(false);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConvId(initialConversationId);
      setMobileShowThread(true);
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (initialOpenDisputeForm) {
      setShowDisputeForm(true);
    }
  }, [initialOpenDisputeForm]);

  const roleFilteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (viewerRole === 'vendor' && c.vendorId !== viewerId) return false;
      if (viewerRole === 'buyer' && c.buyerId !== viewerId) return false;

      const linkedOrder = orders.find((o) => o.id === c.orderId);
      const linkedHold = paymentHolds.find((h) => h.orderId === c.orderId);
      const linkedDispute = disputes.find(
        (d) => d.conversationId === c.id || (c.orderId && d.orderId === c.orderId)
      );

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          c.vendorName.toLowerCase().includes(q) ||
          c.buyerName.toLowerCase().includes(q) ||
          (c.listingTitle || '').toLowerCase().includes(q) ||
          (c.orderNumber || '').toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q);
        if (!hit) return false;
      }

      switch (filterTab) {
        case 'unread':
          return viewerRole === 'vendor'
            ? (c.unreadCountVendor ?? c.unreadCount) > 0
            : (c.unreadCountBuyer ?? c.unreadCount) > 0;
        case 'enquiries':
          return !c.orderId || c.stage === 'pre_purchase';
        case 'active_orders':
          return (
            !!linkedOrder &&
            linkedOrder.fulfillmentStatus !== 'Completed' &&
            linkedOrder.fulfillmentStatus !== 'Refunded'
          );
        case 'payment_holds':
          return (
            !!linkedHold &&
            linkedHold.status !== 'Settled' &&
            linkedHold.status !== 'Refunded'
          );
        case 'disputes':
          return !!linkedDispute;
        case 'completed':
          return (
            linkedOrder?.fulfillmentStatus === 'Completed' ||
            linkedOrder?.fulfillmentStatus === 'Refunded'
          );
        default:
          return true;
      }
    });
  }, [conversations, viewerRole, viewerId, orders, paymentHolds, disputes, searchQuery, filterTab]);

  const activeConv =
    conversations.find((c) => c.id === selectedConvId) || roleFilteredConversations[0] || null;

  const activeOrder = activeConv?.orderId
    ? orders.find((o) => o.id === activeConv.orderId) || null
    : null;
  const activeHold = activeOrder
    ? paymentHolds.find((h) => h.orderId === activeOrder.id) || null
    : null;
  const rawDispute = activeConv
    ? disputes.find(
        (d) => d.conversationId === activeConv.id || (activeOrder && d.orderId === activeOrder.id)
      ) || null
    : null;
  const activeDispute = rawDispute
    ? getRoleSafeDisputeView(
        rawDispute,
        viewerRole === 'admin' ? 'admin' : viewerRole === 'vendor' ? 'seller_approved' : 'buyer'
      )
    : null;

  const safetyScan = useMemo(
    () => scanMessageForDisallowedContent(draftMessage),
    [draftMessage]
  );

  const blockingCheck = useMemo(() => {
    if (!activeConv) return { isRestricted: false, allowed: true };
    return checkBlockingRestriction(
      viewerRole === 'buyer' ? activeConv.buyerId : activeConv.vendorId,
      viewerRole === 'buyer' ? activeConv.vendorId : activeConv.buyerId,
      orders
    );
  }, [activeConv, viewerRole, orders]);

  const remainingSeconds =
    activeOrder?.inspectionRemainingSeconds ??
    activeOrder?.inspectionSecondsRemaining ??
    activeHold?.remainingSeconds ??
    0;

  const activeOrderWarrantyClaims = useMemo(
    () => (activeOrder ? warrantyClaims.filter((c) => c.orderId === activeOrder.id) : []),
    [warrantyClaims, activeOrder]
  );

  const isEvidenceLocked = Boolean(
    activeDispute || activeOrderWarrantyClaims.length > 0
  );

  const isMessagingRestricted =
    viewerRole !== 'admin' && restrictedUserIds.includes(viewerId);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const check = validateAttachmentUpload({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    if (!check.valid || !check.mediaType) {
      setUploadError(check.error || 'Unsupported file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      if (!resultStr) {
        setUploadError('Could not read file contents.');
        return;
      }
      setPendingUploadFile({
        fileName: file.name,
        mimeType: file.type || (check.mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
        sizeBytes: file.size,
        mediaType: check.mediaType!,
        dataBase64: resultStr,
        previewUrl: resultStr,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || isSending || isMessagingRestricted) return;
    const text = draftMessage.trim();
    if (!text && !pendingUploadFile) return;

    const scan = scanMessageForDisallowedContent(text);
    if (scan.shouldBlock) {
      if (!highRiskAlertSent) {
        onFlagOffPlatform?.({
          conversationId: activeConv.id,
          orderId: activeOrder?.id,
          orderNumber: activeOrder?.orderNumber,
          content: text,
          riskLevel: scan.riskLevel,
          triggers: scan.triggers,
        });
        setHighRiskAlertSent(true);
      }
      return;
    }

    setIsSending(true);
    setUploadError(null);
    try {
      let uploadedAttachments: ChatAttachmentRecord[] | undefined;
      if (pendingUploadFile) {
        const res = await uploadChatAttachmentApi({
          conversationId: activeConv.id,
          orderId: activeOrder?.id,
          senderId: viewerId,
          senderRole: viewerRole,
          fileName: pendingUploadFile.fileName,
          mimeType: pendingUploadFile.mimeType,
          dataBase64: pendingUploadFile.dataBase64,
          evidenceTag: selectedEvidenceTag,
        });
        if (res.ok && res.data?.attachment) {
          uploadedAttachments = [res.data.attachment];
        } else {
          // Local deterministic fallback if server upload fails in standalone mode
          uploadedAttachments = [
            {
              id: `att-${Date.now()}`,
              conversationId: activeConv.id,
              orderId: activeOrder?.id,
              senderRole: viewerRole,
              senderId: viewerId,
              mediaType: pendingUploadFile.mediaType,
              mimeType: pendingUploadFile.mimeType,
              fileName: pendingUploadFile.fileName,
              sizeBytes: pendingUploadFile.sizeBytes,
              url: pendingUploadFile.previewUrl,
              evidenceTag: selectedEvidenceTag,
              uploadedAt: new Date().toISOString(),
              immutableLocked: isEvidenceLocked,
            },
          ];
        }
      }

      const fallbackCaption =
        text ||
        `Uploaded ${EVIDENCE_TAG_LABELS.find((t) => t.id === selectedEvidenceTag)?.label || 'evidence'}: ${
          pendingUploadFile?.fileName || ''
        }`;

      if (!scan.isSafe && scan.riskLevel !== 'LOW') {
        onFlagOffPlatform?.({
          conversationId: activeConv.id,
          orderId: activeOrder?.id,
          orderNumber: activeOrder?.orderNumber,
          content: fallbackCaption,
          riskLevel: scan.riskLevel,
          triggers: scan.triggers,
        });
      }

      onSendMessage(activeConv.id, fallbackCaption, viewerRole, {
        mediaAttachments: uploadedAttachments,
        riskLevel: scan.isSafe ? undefined : scan.riskLevel,
        triggers: scan.triggers,
      });
      setDraftMessage('');
      setPendingUploadFile(null);
      setHighRiskAlertSent(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !activeOrder) return;
    if (disputeDescription.trim().length < 10) {
      setDisputeError('Please explain what happened (at least 10 characters).');
      return;
    }
    setDisputeError(null);
    onOpenDispute({
      orderId: activeOrder.id,
      conversationId: activeConv.id,
      reason: disputeReason,
      description: disputeDescription.trim(),
      requestedResolution: disputeResolution,
      evidenceFiles: disputeEvidenceName.trim()
        ? [
            {
              fileName: disputeEvidenceName.trim(),
              type: disputeEvidenceName.toLowerCase().endsWith('.mp4') ? 'video' : 'image',
              caption: 'Uploaded via transaction chat',
            },
          ]
        : [],
    });
    setDisputeDescription('');
    setDisputeEvidenceName('');
    setShowDisputeForm(false);
  };

  const handleSaveInternalNote = () => {
    if (!activeDispute || !onAdminUpdateDispute || !adminInternalNoteDraft.trim()) return;
    onAdminUpdateDispute({
      disputeId: activeDispute.id,
      adminName: 'Adaobi Nwosu',
      newStatus: adminStatusDraft,
      internalNote: adminInternalNoteDraft.trim(),
    });
    setAdminInternalNoteDraft('');
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !onSubmitReport || !reportDetails.trim()) return;
    onSubmitReport({
      id: `rep-${Date.now()}`,
      reporterId: viewerId,
      targetId: viewerRole === 'buyer' ? activeConv.vendorId : activeConv.buyerId,
      targetName: viewerRole === 'buyer' ? activeConv.vendorName : activeConv.buyerName,
      targetType: viewerRole === 'buyer' ? 'vendor' : 'buyer',
      orderReference: activeOrder?.orderNumber,
      reasonCategory: reportCategory,
      details: reportDetails.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Pending Review',
    });
    setReportDetails('');
    setShowReportModal(false);
    setBlockNotice('Your safety report has been submitted to UsedRight Support.');
  };

  const getCustomerPaymentStatusLabel = () => {
    if (activeOrder?.fulfillmentStatus === 'Refunded' || activeHold?.status === 'Refunded') {
      return 'Payment refunded';
    }
    if (activeDispute && activeDispute.status !== 'Resolved' && activeDispute.status !== 'Closed') {
      return 'Payment paused (Dispute open)';
    }
    if (activeOrder?.fulfillmentStatus === 'Completed' || activeHold?.status === 'Settled') {
      return 'Payment released to vendor';
    }
    return 'Payment protected';
  };

  const getVendorPaymentStatusLabel = () => {
    if (activeHold?.status === 'Refunded') return 'Payment refunded to customer';
    if (activeDispute && activeDispute.status !== 'Resolved' && activeDispute.status !== 'Closed') {
      return 'Payment paused — Dispute under review';
    }
    if (activeHold?.status === 'Settled') return 'Payment settled';
    if (activeHold?.status === 'Payment Approved for Release') return 'Payment approved for release';
    if (activeOrder?.fulfillmentStatus === 'Delivered_In_Inspection' || activeOrder?.fulfillmentStatus === 'Delivered') {
      return 'Payment held — Awaiting inspection completion';
    }
    return 'Payment held — Not available for withdrawal yet';
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EAE6F0] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px] max-h-[82vh]">
      {/* LEFT SIDEBAR: CONVERSATIONS & FILTERS */}
      <aside
        className={`lg:col-span-4 border-r border-[#EAE6F0] flex flex-col bg-[#FAF9FC] ${
          mobileShowThread ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="p-3.5 border-b border-[#EAE6F0] bg-white space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#211B2B]">Transaction Messages</h2>
            <span className="text-xs text-[#716B7B]">{roleFilteredConversations.length} threads</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-[#716B7B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, product, or UR-ORD..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] focus:outline-none focus:border-[#A981FF] focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'enquiries', label: 'Enquiries' },
              { id: 'active_orders', label: 'Active Orders' },
              { id: 'payment_holds', label: 'Holds' },
              { id: 'disputes', label: 'Disputes' },
              { id: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as ThreadFilter)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                  filterTab === tab.id
                    ? 'bg-[#A981FF] text-white'
                    : 'bg-[#FAF9FC] text-[#4A4356] border border-[#EAE6F0] hover:border-[#A981FF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#EAE6F0]">
          {roleFilteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#716B7B]">
              No matching conversations found.
            </div>
          ) : (
            roleFilteredConversations.map((c) => {
              const linkedDispute = disputes.find(
                (d) => d.conversationId === c.id || (c.orderId && d.orderId === c.orderId)
              );
              const linkedOrder = orders.find((o) => o.id === c.orderId);
              const unread =
                viewerRole === 'vendor'
                  ? c.unreadCountVendor ?? c.unreadCount
                  : c.unreadCountBuyer ?? c.unreadCount;
              const isSelected = activeConv?.id === c.id;
              const partyName =
                viewerRole === 'vendor'
                  ? c.buyerName
                  : viewerRole === 'admin'
                  ? `${c.buyerName} ↔ ${c.vendorName}`
                  : c.vendorName;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedConvId(c.id);
                    setMobileShowThread(true);
                    setShowDisputeForm(false);
                    setBlockNotice(null);
                  }}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                    isSelected ? 'bg-[#F5F0FF]' : 'bg-white hover:bg-[#FAF9FC]'
                  }`}
                >
                  <SmartImage
                    src={c.listingImage || c.vendorAvatar}
                    alt={c.listingTitle || partyName}
                    className="w-11 h-11 rounded-xl object-cover shrink-0 border border-[#EAE6F0]"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#211B2B] truncate">
                        {partyName}
                      </span>
                      <span className="text-[11px] text-[#716B7B] shrink-0">{c.lastMessageTime}</span>
                    </div>
                    {c.listingTitle && (
                      <p className="text-[11px] font-medium text-[#4A4356] truncate">
                        {c.listingTitle}
                      </p>
                    )}
                    <p className="text-xs text-[#716B7B] truncate">{c.lastMessage}</p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {c.orderNumber && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FAF9FC] border border-[#EAE6F0] text-[10px] font-mono text-[#211B2B]">
                          {c.orderNumber}
                        </span>
                      )}
                      {linkedOrder && (
                        <span className="px-1.5 py-0.5 rounded bg-[#F5F0FF] text-[#4A4356] text-[10px] font-medium">
                          {linkedOrder.fulfillmentStatus.replace(/_/g, ' ')}
                        </span>
                      )}
                      {linkedDispute && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] text-[10px] font-medium">
                          {linkedDispute.status}
                        </span>
                      )}
                      {unread > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-[#A981FF] text-white text-[10px] font-medium">
                          {unread} new
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT WORKSPACE: PINNED TRANSACTION PANEL + MESSAGES + SHORTCUTS */}
      <section
        className={`lg:col-span-8 flex flex-col bg-white min-h-0 ${
          !mobileShowThread ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#716B7B]">
            <MessageSquare className="w-10 h-10 text-[#D0BCFC] mb-2" />
            <p className="text-sm font-medium text-[#211B2B]">Select a conversation</p>
            <p className="text-xs mt-1">
              Every pre-purchase question, order update, payment hold, and dispute lives in one place.
            </p>
          </div>
        ) : (
          <>
            {/* Top Bar */}
            <div className="px-4 py-3 border-b border-[#EAE6F0] flex items-center justify-between gap-2 bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileShowThread(false)}
                  className="lg:hidden p-2 rounded-lg text-[#4A4356] hover:bg-[#FAF9FC] min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#211B2B] truncate">
                    {viewerRole === 'vendor'
                      ? activeConv.buyerName
                      : viewerRole === 'admin'
                      ? `${activeConv.buyerName} & ${activeConv.vendorName}`
                      : activeConv.vendorName}
                  </div>
                  <div className="text-xs text-[#716B7B] truncate">
                    {activeConv.listingTitle}
                    {activeConv.listingPrice ? ` • ${formatNaira(activeConv.listingPrice)}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {viewerRole === 'buyer' && onViewVendorStorefront && (
                  <button
                    type="button"
                    onClick={() => onViewVendorStorefront(activeConv.vendorId)}
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EAE6F0] text-xs font-medium text-[#4A4356] hover:border-[#A981FF]"
                  >
                    <Store className="w-3.5 h-3.5 text-[#A981FF]" />
                    View Store
                  </button>
                )}
                {viewerRole !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (blockingCheck.isRestricted) {
                        setBlockNotice(
                          blockingCheck.reason ||
                            'You cannot block this account while an active order or dispute is being handled by UsedRight.'
                        );
                      } else {
                        setBlockNotice('Account blocked for future enquiries.');
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EAE6F0] text-xs font-medium text-[#4A4356] hover:border-[#D9534F] hover:text-[#D9534F]"
                    title="Block user"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Block</span>
                  </button>
                )}
                {viewerRole !== 'admin' && onSubmitReport && (
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#FED7D7] bg-[#FFF5F5] text-xs font-medium text-[#C53030]"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Report</span>
                  </button>
                )}
              </div>
            </div>

            {blockNotice && (
              <div className="px-4 py-2.5 bg-[#FFF5F5] border-b border-[#FED7D7] text-xs text-[#C53030] flex items-center justify-between gap-2">
                <span>{blockNotice}</span>
                <button
                  type="button"
                  onClick={() => setBlockNotice(null)}
                  className="text-xs font-medium underline shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* TOP CONTEXTUAL PROTECTION & EVIDENCE LOCK BANNER */}
            <div className="px-4 py-2 bg-[#F5F0FF] border-b border-[#D0BCFC] text-[11px] text-[#30102F] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#7E4EF2] shrink-0" />
                Stay protected. Keep all chat and payments inside UsedRight.
              </span>
              {isEvidenceLocked && (
                <span className="inline-flex items-center gap-1 font-semibold text-[#C53030]">
                  <Lock className="w-3 h-3" />
                  Evidence Lock Active (Immutable Record)
                </span>
              )}
            </div>

            {/* PINNED TRANSACTION & PAYMENT-HOLD SUMMARY */}
            <div className="bg-[#FAF9FC] border-b border-[#EAE6F0] px-4 py-3 shrink-0 space-y-2.5">
              {activeOrder ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold font-mono text-[#211B2B]">
                        ORDER: {activeOrder.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0] text-[11px] font-medium text-[#4A4356]">
                        {activeOrder.fulfillmentStatus.replace(/_/g, ' ')}
                      </span>
                      {activeDispute && (
                        <span className="px-2 py-0.5 rounded bg-[#FFF5F5] border border-[#FED7D7] text-[11px] font-medium text-[#C53030]">
                          Dispute: {activeDispute.status} ({activeDispute.disputeNumber})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPanelExpanded((p) => !p)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#A981FF] hover:underline"
                    >
                      {panelExpanded ? (
                        <>
                          Hide details <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          Order & payment details <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Role-Specific Key Numbers */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {viewerRole === 'vendor' ? (
                      <>
                        <div className="p-2 rounded-lg bg-white border border-[#EAE6F0]">
                          <span className="text-[11px] text-[#716B7B] block">Expected Vendor Payout</span>
                          <span className="font-semibold text-[#211B2B]">
                            {formatNaira(activeHold?.netVendorPayout ?? Math.round(activeOrder.itemPrice * 0.99))}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-[#EAE6F0]">
                          <span className="text-[11px] text-[#716B7B] block">Settlement Status</span>
                          <span className="font-medium text-[#4A4356] line-clamp-1">
                            {getVendorPaymentStatusLabel()}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-[#EAE6F0] col-span-2 sm:col-span-1">
                          <span className="text-[11px] text-[#716B7B] block">Inspection Countdown</span>
                          <span className="font-semibold text-[#A981FF] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {activeOrder.disputePaused
                              ? 'Paused (Dispute)'
                              : remainingSeconds > 0
                              ? formatCountdown(remainingSeconds)
                              : 'Completed'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 rounded-lg bg-white border border-[#EAE6F0]">
                          <span className="text-[11px] text-[#716B7B] block">Amount Paid</span>
                          <span className="font-semibold text-[#211B2B]">
                            {formatNaira(activeOrder.totalAmount)}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-[#EAE6F0]">
                          <span className="text-[11px] text-[#716B7B] block">Payment Status</span>
                          <span className="font-medium text-[#4A4356]">
                            {getCustomerPaymentStatusLabel()}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-[#EAE6F0] col-span-2 sm:col-span-1">
                          <span className="text-[11px] text-[#716B7B] block">Inspection Time Left</span>
                          <span className="font-semibold text-[#A981FF] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {activeOrder.disputePaused
                              ? 'Paused (Dispute Open)'
                              : remainingSeconds > 0
                              ? formatCountdown(remainingSeconds)
                              : 'Window closed'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Expanded Breakdown */}
                  {panelExpanded && (
                    <div className="p-3 rounded-xl bg-white border border-[#EAE6F0] text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#716B7B]">Product:</span>
                        <span className="font-medium text-[#211B2B]">{activeOrder.listing.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#716B7B]">Transaction Ref:</span>
                        <span className="font-mono text-[#211B2B]">{activeOrder.transactionNumber || activeHold?.transactionNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#716B7B]">Courier / Method:</span>
                        <span className="text-[#211B2B]">
                          {activeOrder.courierName} ({activeOrder.trackingNumber})
                        </span>
                      </div>
                      {viewerRole === 'vendor' && activeHold && activeHold.status !== 'Settled' && activeHold.status !== 'Refunded' && (
                        <p className="text-[11px] text-[#4A4356] bg-[#F5F0FF] p-2 rounded-lg border border-[#D0BCFC]">
                          Held funds are not available for withdrawal until the inspection window ends without a dispute.
                        </p>
                      )}
                      {activeDispute && (
                        <div className="p-2 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030]">
                          <div className="font-semibold">
                            {activeDispute.disputeNumber} · {activeDispute.reason}
                          </div>
                          <p className="mt-0.5">{activeDispute.description}</p>
                        </div>
                      )}
                      {viewerRole === 'admin' && activeDispute && (
                        <div className="p-2.5 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] space-y-2 mt-2">
                          <div className="text-xs font-semibold text-[#211B2B]">
                            Admin Internal Notes (Hidden from Customer & Vendor)
                          </div>
                          {activeDispute.internalNotes.map((n) => (
                            <div key={n.id} className="text-[11px] text-[#4A4356] bg-white p-2 rounded border border-[#EAE6F0]">
                              <span className="font-medium">{n.adminName} ({n.createdAt}):</span> {n.note}
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={adminStatusDraft}
                              onChange={(e) => setAdminStatusDraft(e.target.value as DisputeStatus)}
                              className="px-2 py-1.5 text-xs rounded-lg border border-[#EAE6F0] bg-white"
                            >
                              {[
                                'Problem Reported',
                                'Under Review',
                                'Waiting for Customer',
                                'Waiting for Vendor',
                                'Resolution Proposed',
                                'Resolved',
                                'Closed',
                              ].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={adminInternalNoteDraft}
                              onChange={(e) => setAdminInternalNoteDraft(e.target.value)}
                              placeholder="Add private internal note..."
                              className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[#EAE6F0] bg-white"
                            />
                            <button
                              type="button"
                              onClick={handleSaveInternalNote}
                              className="px-3 py-1.5 rounded-lg bg-[#211B2B] text-white text-xs font-medium"
                            >
                              Save Note
                            </button>
                          </div>
                          {onAdminResolveDispute &&
                            activeDispute.status !== 'Resolved' &&
                            activeDispute.status !== 'Closed' && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onAdminResolveDispute({
                                      disputeId: activeDispute.id,
                                      adminName: 'Adaobi Nwosu',
                                      decision: 'refund_buyer',
                                      outcomeSummary:
                                        'Evidence verified — full refund approved for customer.',
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg border border-[#FED7D7] bg-[#FFF5F5] text-[#C53030] text-xs font-medium"
                                >
                                  Approve Refund to Customer
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onAdminResolveDispute({
                                      disputeId: activeDispute.id,
                                      adminName: 'Adaobi Nwosu',
                                      decision: 'release_vendor',
                                      outcomeSummary:
                                        'Dispute reviewed — release payout approved for vendor.',
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-[#A981FF] text-white text-xs font-medium"
                                >
                                  Release Payout to Vendor
                                </button>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status-Relevant In-Chat Shortcuts */}
                  <div className="flex flex-wrap gap-1.5">
                    {onViewOrder && (
                      <button
                        type="button"
                        onClick={() => onViewOrder(activeOrder.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#EAE6F0] hover:border-[#A981FF] text-xs font-medium text-[#211B2B]"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#A981FF]" />
                        View Order
                      </button>
                    )}

                    {viewerRole === 'buyer' &&
                      (activeOrder.fulfillmentStatus === 'In transit' ||
                        activeOrder.fulfillmentStatus === 'Ready for Pickup') &&
                      !activeOrder.buyerConfirmedReceipt &&
                      onConfirmReceipt && (
                        <button
                          type="button"
                          onClick={() => setConfirmReceiptModalOpen(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#A981FF] text-white text-xs font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          I've Received My Order
                        </button>
                      )}

                    {viewerRole === 'buyer' &&
                      (activeOrder.fulfillmentStatus === 'Delivered_In_Inspection' ||
                        activeOrder.fulfillmentStatus === 'Delivered') &&
                      !activeOrder.disputePaused &&
                      onAcceptOrder && (
                        <button
                          type="button"
                          onClick={() => onAcceptOrder(activeOrder.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#A981FF] text-white text-xs font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accept & Release Payment
                        </button>
                      )}

                    {viewerRole === 'vendor' &&
                      activeOrder.fulfillmentStatus === 'Order placed' &&
                      onUpdateOrderStatus && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateOrderStatus(activeOrder.id, 'Vendor Accepted Order')
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#A981FF] text-white text-xs font-medium"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Accept Order
                        </button>
                      )}

                    {viewerRole === 'vendor' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvidenceTag('pre_dispatch_packaging');
                          fileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#D0BCFC] text-[#30102F] text-xs font-medium hover:border-[#A981FF]"
                      >
                        <Video className="w-3.5 h-3.5 text-[#7E4EF2]" />
                        Pre-Dispatch Video
                      </button>
                    )}

                    {viewerRole === 'buyer' &&
                      activeOrder.fulfillmentStatus !== 'Completed' &&
                      activeOrder.fulfillmentStatus !== 'Refunded' &&
                      !activeDispute && (
                        <button
                          type="button"
                          onClick={() => setShowDisputeForm((s) => !s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] text-xs font-medium"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                          Open Dispute
                        </button>
                      )}
                  </div>
                </>
              ) : (
                /* Pre-purchase Product Summary Card */
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {activeConv.listingImage && (
                      <SmartImage
                        src={activeConv.listingImage}
                        alt={activeConv.listingTitle || 'Product'}
                        className="w-10 h-10 rounded-lg object-cover border border-[#EAE6F0]"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#211B2B] truncate">
                        {activeConv.listingTitle}
                      </div>
                      <div className="text-xs text-[#716B7B]">
                        {activeConv.listingPrice ? formatNaira(activeConv.listingPrice) : ''} · Pre-Owned · Pre-purchase enquiry
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeConv.listingId && onViewProduct && (
                      <button
                        type="button"
                        onClick={() => onViewProduct(activeConv.listingId!)}
                        className="px-3 py-1.5 rounded-lg border border-[#EAE6F0] bg-white text-xs font-medium text-[#211B2B] hover:border-[#A981FF]"
                      >
                        View Product
                      </button>
                    )}
                    {viewerRole === 'buyer' && activeConv.listingId && onBuyProduct && (
                      <button
                        type="button"
                        onClick={() => onBuyProduct(activeConv.listingId!)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Buy This Product
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* IN-CHAT DISPUTE FORM ("REPORT A PROBLEM") */}
            {showDisputeForm && activeOrder && (
              <form
                onSubmit={handleDisputeSubmit}
                className="p-4 bg-[#FFF5F5] border-b border-[#FED7D7] space-y-3 shrink-0"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#C53030] flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4" />
                    Report a Problem on {activeOrder.orderNumber} (Auto-attaches order & payment hold)
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDisputeForm(false)}
                    className="text-xs text-[#C53030] hover:underline"
                  >
                    Cancel
                  </button>
                </div>

                {disputeError && (
                  <p className="text-xs text-[#C53030] font-medium">{disputeError}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">Reason</label>
                    <select
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
                      className="w-full px-3 py-2 rounded-lg border border-[#EAE6F0] bg-white"
                    >
                      {DISPUTE_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">Requested Resolution</label>
                    <select
                      value={disputeResolution}
                      onChange={(e) =>
                        setDisputeResolution(e.target.value as DisputeResolutionType)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#EAE6F0] bg-white"
                    >
                      {RESOLUTION_OPTIONS.map((res) => (
                        <option key={res} value={res}>
                          {res}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea
                  rows={2}
                  required
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Describe clearly what is wrong so UsedRight Support can review..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#EAE6F0] bg-white"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <FileUp className="w-4 h-4 text-[#716B7B]" />
                    <input
                      type="text"
                      value={disputeEvidenceName}
                      onChange={(e) => setDisputeEvidenceName(e.target.value)}
                      placeholder="Attach photo/video filename (e.g. battery_test.jpg)"
                      className="px-2.5 py-1.5 rounded-lg border border-[#EAE6F0] bg-white text-xs w-64"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#D9534F] text-white text-xs font-medium hover:bg-[#C53030]"
                  >
                    Submit Problem & Freeze Payout
                  </button>
                </div>
              </form>
            )}

            {/* MESSAGE TIMELINE */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
              {activeConv.messages.map((m, idx) => {
                const currentDate = m.dateLabel || 'Today';
                const prevDate =
                  idx > 0 ? activeConv.messages[idx - 1].dateLabel || 'Today' : null;
                const showDateDivider = idx === 0 || currentDate !== prevDate;

                const dateSeparatorNode = showDateDivider ? (
                  <div className="flex items-center justify-center py-1">
                    <span className="px-3 py-0.5 rounded-full bg-[#FAF9FC] border border-[#EAE6F0] text-[10px] font-medium text-[#716B7B]">
                      {currentDate}
                    </span>
                  </div>
                ) : null;

                if (m.sender === 'system') {
                  if (m.isArrivalWelcomeCard) {
                    return (
                      <React.Fragment key={m.id}>
                        {dateSeparatorNode}
                        <div className="flex justify-center">
                          <div className="max-w-xl w-full p-4 rounded-2xl bg-[#F5F0FF] border-2 border-[#A981FF] text-xs text-[#211B2B] space-y-2 shadow-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sm text-[#211B2B]">
                                Arrival &amp; Inspection Guide
                              </span>
                              <span className="text-[11px] text-[#716B7B] shrink-0">
                                {m.timestamp}
                              </span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-line text-[#30102F]">
                              {m.text}
                            </p>
                            {viewerRole === 'buyer' && activeOrder && !activeDispute && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {onViewOrder && (
                                  <button
                                    type="button"
                                    onClick={() => onViewOrder(activeOrder.id)}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-[#D0BCFC] text-[#30102F] font-semibold"
                                  >
                                    View Order &amp; 3-Month Warranty
                                  </button>
                                )}
                                {activeOrder.fulfillmentStatus !== 'Completed' &&
                                  activeOrder.fulfillmentStatus !== 'Refunded' && (
                                    <button
                                      type="button"
                                      onClick={() => setShowDisputeForm(true)}
                                      className="px-3 py-1.5 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-semibold"
                                    >
                                      Open Dispute
                                    </button>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  }
                  return (
                    <React.Fragment key={m.id}>
                      {dateSeparatorNode}
                      <div className="flex justify-center">
                        <div className="max-w-lg px-3 py-2 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs text-[#4A4356]">
                          <div className="flex items-center justify-between gap-3 mb-0.5">
                            <span className="text-[10px] font-semibold text-[#211B2B]">
                              Transaction Update
                            </span>
                            <span className="text-[10px] text-[#716B7B] shrink-0">
                              {m.timestamp}
                            </span>
                          </div>
                          <p className="leading-snug whitespace-pre-line">{m.text}</p>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                if (m.sender === 'admin') {
                  return (
                    <React.Fragment key={m.id}>
                      {dateSeparatorNode}
                      <div className="flex justify-center">
                        <div className="max-w-xl w-full p-3 rounded-xl bg-[#F5F0FF] border border-[#A981FF] text-xs text-[#211B2B]">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-[#211B2B]">
                              <ShieldCheck className="w-4 h-4 text-[#A981FF]" />
                              {m.senderLabel || 'USED RIGHT SUPPORT'}
                            </span>
                            <span className="text-[11px] text-[#716B7B] shrink-0">
                              {m.timestamp}
                            </span>
                          </div>
                          <p className="leading-relaxed">{m.text}</p>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                const isOwn =
                  (viewerRole === 'buyer' && m.sender === 'buyer') ||
                  (viewerRole === 'vendor' && m.sender === 'vendor');

                return (
                  <React.Fragment key={m.id}>
                    {dateSeparatorNode}
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[82%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl text-xs space-y-1.5 ${
                          isOwn
                            ? 'bg-[#A981FF] text-white'
                            : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#211B2B]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px] opacity-85 font-medium">
                          <span>
                            {m.sender === 'buyer' ? activeConv.buyerName : activeConv.vendorName}
                          </span>
                          <span className="shrink-0">{m.timestamp}</span>
                        </div>
                        <p className="leading-relaxed">{m.text}</p>

                        {/* Uploaded Media Attachments */}
                        {m.mediaAttachments && m.mediaAttachments.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {m.mediaAttachments.map((att) => (
                              <div
                                key={att.id}
                                className="rounded-xl overflow-hidden border border-[#EAE6F0] bg-white text-[#211B2B]"
                              >
                                {att.mediaType === 'image' ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewingAttachment(att)}
                                    className="block w-full text-left relative group"
                                    aria-label={`View image ${att.fileName}`}
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.fileName}
                                      className="w-full max-h-48 object-cover"
                                    />
                                    <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] inline-flex items-center gap-1">
                                      <Maximize2 className="w-2.5 h-2.5" /> Zoom
                                    </span>
                                  </button>
                                ) : (
                                  <div className="bg-black">
                                    <video
                                      src={att.url}
                                      controls
                                      className="w-full max-h-48"
                                    />
                                  </div>
                                )}
                                <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[10px] bg-[#FAF9FC]">
                                  <div className="min-w-0">
                                    <div className="font-medium text-[#211B2B] truncate">
                                      {att.fileName}
                                    </div>
                                    <div className="text-[#716B7B]">
                                      {att.evidenceTag.replace(/_/g, ' ')}
                                      {isEvidenceLocked || att.immutableLocked ? ' · Locked' : ''}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setViewingAttachment(att)}
                                      className="px-1.5 py-0.5 rounded border border-[#EAE6F0] text-[#211B2B] hover:border-[#A981FF]"
                                    >
                                      Expand
                                    </button>
                                    {onReportAttachment && !isOwn && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onReportAttachment({
                                            conversationId: activeConv.id,
                                            messageId: m.id,
                                            attachmentId: att.id,
                                            reason: 'Suspicious or off-platform attachment content',
                                          })
                                        }
                                        className="px-1.5 py-0.5 rounded border border-[#FED7D7] bg-[#FFF5F5] text-[#C53030]"
                                      >
                                        Report
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {m.flaggedWarning && (
                          <div className="p-1.5 rounded bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] text-[11px]">
                            {m.flaggedWarning}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* MESSAGE INPUT BAR */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-[#EAE6F0] bg-[#FAF9FC] shrink-0 space-y-2"
            >
              {isMessagingRestricted && (
                <div className="px-3 py-2 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] font-medium">
                  Messaging has been temporarily restricted by UsedRight Moderation. Contact UsedRight Support via your notifications or order view.
                </div>
              )}

              {!safetyScan.isSafe && (
                <div className="px-3 py-2 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">
                        {safetyScan.riskLevel === 'HIGH'
                          ? 'Blocked — High-Risk Off-Platform Diversion Detected'
                          : `${safetyScan.riskLevel} Risk Warning`}
                      </div>
                      <div>{safetyScan.warningMessage}</div>
                    </div>
                  </div>
                  {safetyScan.shouldBlock && onFlagOffPlatform && !highRiskAlertSent && (
                    <button
                      type="button"
                      onClick={() => {
                        onFlagOffPlatform({
                          conversationId: activeConv.id,
                          orderId: activeOrder?.id,
                          orderNumber: activeOrder?.orderNumber,
                          content: draftMessage.trim(),
                          riskLevel: safetyScan.riskLevel,
                          triggers: safetyScan.triggers,
                        });
                        setHighRiskAlertSent(true);
                      }}
                      className="px-2.5 py-1 rounded bg-[#C53030] text-white text-[11px] font-medium shrink-0"
                    >
                      Report Attempt
                    </button>
                  )}
                </div>
              )}

              {uploadError && (
                <div className="px-3 py-2 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] flex items-center justify-between">
                  <span>{uploadError}</span>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="underline text-[11px]"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {pendingUploadFile && (
                <div className="p-2.5 rounded-xl bg-white border border-[#D0BCFC] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {pendingUploadFile.mediaType === 'image' ? (
                      <img
                        src={pendingUploadFile.previewUrl}
                        alt={pendingUploadFile.fileName}
                        className="w-11 h-11 rounded-lg object-cover border border-[#EAE6F0] shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-[#211B2B] text-white flex items-center justify-center shrink-0">
                        <Film className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-[#211B2B] truncate">
                        {pendingUploadFile.fileName}
                      </div>
                      <div className="text-[11px] text-[#716B7B]">
                        {(pendingUploadFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB ·{' '}
                        {pendingUploadFile.mediaType.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Evidence category tag"
                      value={selectedEvidenceTag}
                      onChange={(e) => setSelectedEvidenceTag(e.target.value as ChatEvidenceTag)}
                      className="px-2 py-1.5 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC] text-[11px]"
                    >
                      {EVIDENCE_TAG_LABELS.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setPendingUploadFile(null)}
                      aria-label="Cancel pending upload"
                      className="p-1.5 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                onChange={handleFileSelected}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isMessagingRestricted || isSending}
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload Photo (max 8MB) or Video (max 25MB)"
                  aria-label="Attach photo or video evidence"
                  className="p-2.5 rounded-xl border border-[#EAE6F0] bg-white hover:border-[#A981FF] text-[#4A4356] min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <ImagePlus className="w-4 h-4 text-[#A981FF]" />
                </button>
                <input
                  type="text"
                  disabled={isMessagingRestricted}
                  value={draftMessage}
                  onChange={(e) => {
                    setDraftMessage(e.target.value);
                    setHighRiskAlertSent(false);
                  }}
                  placeholder={
                    viewerRole === 'admin'
                      ? 'Send an official USED RIGHT SUPPORT message...'
                      : 'Ask a question, upload packaging/unboxing proof, or post update...'
                  }
                  className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF] disabled:bg-[#FAF9FC]"
                />
                <button
                  type="submit"
                  disabled={
                    isMessagingRestricted ||
                    isSending ||
                    (!draftMessage.trim() && !pendingUploadFile) ||
                    safetyScan.shouldBlock
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] disabled:opacity-50 text-white text-xs font-medium min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {isSending ? 'Uploading...' : viewerRole === 'admin' ? 'Send as Support' : 'Send'}
                  </span>
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#716B7B]">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#A981FF]" />
                  Protected on UsedRight — JPEG/PNG/WebP (8MB) &amp; MP4/WebM (25MB) supported.
                </span>
              </div>
            </form>
          </>
        )}
      </section>

      {/* Media Lightbox / Video Player Modal */}
      {viewingAttachment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Attachment preview lightbox"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden border border-[#EAE6F0] shadow-2xl">
            <div className="px-4 py-3 border-b border-[#EAE6F0] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#211B2B]">
                  {viewingAttachment.fileName}
                </div>
                <div className="text-[11px] text-[#716B7B]">
                  {viewingAttachment.evidenceTag.replace(/_/g, ' ')} ·{' '}
                  {new Date(viewingAttachment.uploadedAt).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingAttachment(null)}
                aria-label="Close lightbox"
                className="p-1.5 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[70vh]">
              {viewingAttachment.mediaType === 'image' ? (
                <img
                  src={viewingAttachment.url}
                  alt={viewingAttachment.fileName}
                  className="max-h-[70vh] w-auto object-contain"
                />
              ) : (
                <video
                  src={viewingAttachment.url}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-full"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inline Report Account Modal */}
      {showReportModal && activeConv && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleReportSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#EAE6F0] space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#211B2B]">Report Account Behaviour</h3>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 text-[#716B7B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#716B7B]">
              Reporting{' '}
              <span className="font-medium text-[#211B2B]">
                {viewerRole === 'buyer' ? activeConv.vendorName : activeConv.buyerName}
              </span>{' '}
              for UsedRight Support review.
            </p>
            <select
              value={reportCategory}
              onChange={(e) => setReportCategory(e.target.value as UserReport['reasonCategory'])}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE6F0]"
            >
              {[
                'Suspicious behaviour',
                'Off-platform payment requests',
                'Misleading listings',
                'Fraud attempts',
                'Harassment',
                'Other policy violations',
              ].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <textarea
              rows={3}
              required
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Explain what happened..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE6F0]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-3 py-2 rounded-lg border border-[#EAE6F0] text-xs font-medium"
              >
                Cancel
              </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#D9534F] text-white text-xs font-medium"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        )}

      {/* Confirm Physical Receipt Modal */}
      {confirmReceiptModalOpen && activeOrder && onConfirmReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm device receipt in chat"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#EAE6F0] space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#211B2B]">
                Confirm You Received {activeOrder.orderNumber}
              </h3>
              <button
                type="button"
                onClick={() => setConfirmReceiptModalOpen(false)}
                className="p-1 text-[#716B7B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#4A4356] leading-relaxed">
              Have you received your device? Confirming starts your 24-hour inspection period while payment remains safely protected in escrow.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReceiptModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-[#EAE6F0] text-xs font-medium text-[#211B2B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirmReceipt(activeOrder.id);
                  setConfirmReceiptModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#A981FF] text-white text-xs font-semibold"
              >
                Start 24-Hour Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedTransactionChat;
