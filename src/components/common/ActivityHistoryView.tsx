import React, { useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  MessageSquare,
  Package,
  Search,
  ShieldAlert,
  Tag,
  ArrowUpRight,
} from 'lucide-react';
import {
  AuditLogEntry,
  DemoRole,
  DeviceListing,
  DisputeRecord,
  MessageConversation,
  Order,
} from '../../types/marketplace';
import {
  ActivityCategoryFilter,
  buildUnifiedActivityHistory,
  UnifiedActivityItem,
} from '../../utils/vendorOperations';

interface ActivityHistoryViewProps {
  role: Extract<DemoRole, 'buyer' | 'seller_approved'>;
  orders: Order[];
  listings: DeviceListing[];
  conversations: MessageConversation[];
  disputes: DisputeRecord[];
  auditLog?: AuditLogEntry[];
  onOpenOrder?: (orderId: string) => void;
  onOpenChat?: (conversationId?: string) => void;
  onOpenListing?: (listingId: string) => void;
}

const FILTER_OPTIONS: { id: ActivityCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Activity' },
  { id: 'orders', label: 'Orders' },
  { id: 'price_edits', label: 'Price Edits' },
  { id: 'chats', label: 'Chat Logs' },
  { id: 'disputes', label: 'Disputes' },
];

export const ActivityHistoryView: React.FC<ActivityHistoryViewProps> = ({
  role,
  orders,
  listings,
  conversations,
  disputes,
  auditLog = [],
  onOpenOrder,
  onOpenChat,
  onOpenListing,
}) => {
  const [filter, setFilter] = useState<ActivityCategoryFilter>('all');
  const [query, setQuery] = useState('');

  const allActivities = useMemo(
    () =>
      buildUnifiedActivityHistory({
        role,
        orders,
        listings,
        conversations,
        disputes,
        auditLog,
      }),
    [role, orders, listings, conversations, disputes, auditLog]
  );

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allActivities.filter((item) => {
      if (filter !== 'all' && item.category !== filter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.referenceCode || '').toLowerCase().includes(q)
      );
    });
  }, [allActivities, filter, query]);

  const counts = useMemo(
    () => ({
      all: allActivities.length,
      orders: allActivities.filter((i) => i.category === 'orders').length,
      price_edits: allActivities.filter((i) => i.category === 'price_edits').length,
      chats: allActivities.filter((i) => i.category === 'chats').length,
      disputes: allActivities.filter((i) => i.category === 'disputes').length,
    }),
    [allActivities]
  );

  const renderCategoryIcon = (item: UnifiedActivityItem) => {
    const baseCls = 'w-4 h-4 shrink-0';
    switch (item.category) {
      case 'orders':
        return <Package className={baseCls} />;
      case 'price_edits':
        return <Tag className={baseCls} />;
      case 'chats':
        return <MessageSquare className={baseCls} />;
      case 'disputes':
        return <ShieldAlert className={baseCls} />;
      default:
        return <Activity className={baseCls} />;
    }
  };

  const getBadgeStyle = (tone: UnifiedActivityItem['tone']) => {
    if (tone === 'green') {
      return 'bg-[#ECFDF5] text-[#238653] border-[#A7F3D0]';
    }
    if (tone === 'red') {
      return 'bg-[#FFF5F5] text-[#C53030] border-[#FED7D7]';
    }
    if (tone === 'purple') {
      return 'bg-[#F5F0FF] text-[#7E4EF2] border-[#D0BCFC]';
    }
    return 'bg-[#FAF9FC] text-[#4A4356] border-[#EAE6F0]';
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EAE6F0] shadow-sm p-5 space-y-4 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] flex items-center justify-center text-[#A981FF] shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#211B2B]">Activity &amp; History</h2>
            <p className="text-xs text-[#716B7B]">
              Real-time log of past orders, price edits, chat threads, and dispute resolutions.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[11px] font-medium text-[#211B2B] tabular-nums">
          {allActivities.length} recorded events
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => {
            const active = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#A981FF] text-white border-[#A981FF]'
                    : 'bg-[#FAF9FC] text-[#4A4356] border-[#EAE6F0] hover:border-[#A981FF]'
                }`}
              >
                {opt.label} ({counts[opt.id]})
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-56 shrink-0">
          <Search className="w-3.5 h-3.5 text-[#716B7B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search activity history"
            placeholder="Filter by order, device, or log..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-xs text-[#211B2B] placeholder-[#716B7B] focus:outline-none focus:border-[#A981FF] focus:bg-white"
          />
        </div>
      </div>

      {/* Activity Feed */}
      {visibleItems.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] text-center text-[#716B7B]">
          No activity records match this filter yet.
        </div>
      ) : (
        <div className="divide-y divide-[#EAE6F0] border border-[#EAE6F0] rounded-2xl overflow-hidden bg-white">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9FC] transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${getBadgeStyle(
                    item.tone
                  )}`}
                >
                  {renderCategoryIcon(item)}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#211B2B] text-xs sm:text-[13px]">
                      {item.title}
                    </span>
                    {item.referenceCode && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FAF9FC] border border-[#EAE6F0] font-mono text-[10px] text-[#4A4356]">
                        {item.referenceCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#4A4356] leading-relaxed">{item.description}</p>
                  <div className="inline-flex items-center gap-1 text-[11px] text-[#716B7B]">
                    <Clock className="w-3 h-3" />
                    <span>{item.timestampLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {item.orderId && onOpenOrder && (
                  <button
                    type="button"
                    onClick={() => onOpenOrder(item.orderId!)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#EAE6F0] bg-white hover:border-[#A981FF] text-[11px] font-medium text-[#211B2B]"
                  >
                    Order
                    <ArrowUpRight className="w-3 h-3 text-[#A981FF]" />
                  </button>
                )}
                {item.conversationId && onOpenChat && (
                  <button
                    type="button"
                    onClick={() => onOpenChat(item.conversationId)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] hover:border-[#A981FF] text-[11px] font-medium text-[#7E4EF2]"
                  >
                    Chat Log
                  </button>
                )}
                {item.listingId && !item.orderId && onOpenListing && (
                  <button
                    type="button"
                    onClick={() => onOpenListing(item.listingId!)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#EAE6F0] bg-white hover:border-[#A981FF] text-[11px] font-medium text-[#211B2B]"
                  >
                    Listing
                    <ArrowUpRight className="w-3 h-3 text-[#A981FF]" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityHistoryView;
