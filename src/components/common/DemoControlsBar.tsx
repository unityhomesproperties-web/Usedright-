import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  RotateCcw,
  ShieldCheck,
  Clock,
  Truck,
  CheckCircle2,
  AlertOctagon,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { DemoRole, Order } from '../../types/marketplace';

interface DemoControlsBarProps {
  currentRole: DemoRole;
  activeView?: string;
  onSelectRole: (role: DemoRole) => void;
  orders: Order[];
  onSimulatePayment: (orderId: string) => void;
  onSimulateDispatch: (orderId: string) => void;
  onSimulateDelivery: (orderId: string) => void;
  onConfirmReceipt: (orderId: string) => void;
  onAdvanceInspectionTimer: (orderId: string, seconds: number) => void;
  onOpenDisputeDemo: (orderId: string) => void;
  onSimulateAdminResponse: (orderId: string) => void;
  onResolveDisputeDemo: (orderId: string, decision: 'refund_buyer' | 'release_vendor') => void;
  onCompleteSettlement: (orderId: string) => void;
  onSimulateWarrantyClaimDemo?: (orderId: string) => void;
  onSimulateModerationFlagDemo?: () => void;
  onResetDemoData: () => void;
}

export const DemoControlsBar: React.FC<DemoControlsBarProps> = ({
  currentRole,
  activeView = 'home',
  onSelectRole,
  orders,
  onSimulatePayment,
  onSimulateDispatch,
  onSimulateDelivery,
  onConfirmReceipt,
  onAdvanceInspectionTimer,
  onOpenDisputeDemo,
  onSimulateAdminResponse,
  onResolveDisputeDemo,
  onCompleteSettlement,
  onSimulateWarrantyClaimDemo,
  onSimulateModerationFlagDemo,
  onResetDemoData,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');

  const targetOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];
  const isPdp = activeView === 'product_details';

  return (
    <div
      className={`fixed right-3 z-40 ${
        isPdp ? 'bottom-[104px] md:bottom-[80px]' : 'bottom-[104px] md:bottom-4'
      } ${expanded ? 'max-w-md w-[calc(100%-24px)] sm:w-auto' : 'w-auto'}`}
    >
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Demo Simulator (Demo Mode Only)"
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#211B2B]/90 hover:bg-[#211B2B] backdrop-blur-md text-white text-[11px] font-medium shadow-lg border border-[#4A4356] min-h-[34px] transition-all"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#D0BCFC]" />
          <span className={isPdp ? 'inline' : 'sm:hidden'}>Demo</span>
          {!isPdp && <span className="hidden sm:inline">Demo Simulator</span>}
          <ChevronUp className="w-3.5 h-3.5 text-[#D0BCFC]" />
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-[#D0BCFC] shadow-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-[#EAE6F0] pb-2">
            <div>
              <div className="font-semibold text-[#211B2B]">Demo Simulator (Demo Mode Only)</div>
              <div className="text-[11px] text-[#716B7B]">
                Simulated lifecycle controls — does not represent real money transfers.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Collapse demo simulator"
              className="p-1.5 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* 5-Role Switcher */}
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-[#716B7B]">Demo Environment Persona:</div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['visitor', 'Visitor'],
                  ['buyer', 'Customer'],
                  ['seller_approved', 'Vendor'],
                  ['seller_pending', 'Pending Vendor'],
                  ['admin', 'Admin'],
                ] as [DemoRole, string][]
              ).map(([r, label]) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onSelectRole(r)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    currentRole === r
                      ? 'bg-[#A981FF] text-white'
                      : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#211B2B]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Order Selector & Lifecycle Actions */}
          {targetOrder && (
            <div className="space-y-2 pt-1 border-t border-[#EAE6F0]">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-medium text-[#716B7B]">Order:</label>
                <select
                  value={targetOrder.id}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC] font-mono text-[11px]"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} ({o.fulfillmentStatus.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => onSimulatePayment(targetOrder.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] hover:border-[#A981FF] flex items-center gap-1 font-medium text-[#211B2B]"
                >
                  <CreditCard className="w-3 h-3 text-[#A981FF]" />
                  Simulate Payment
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateDispatch(targetOrder.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] hover:border-[#A981FF] flex items-center gap-1 font-medium text-[#211B2B]"
                >
                  <Truck className="w-3 h-3 text-[#A981FF]" />
                  Simulate Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateDelivery(targetOrder.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] hover:border-[#A981FF] flex items-center gap-1 font-medium text-[#211B2B]"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#A981FF]" />
                  Simulate Delivery
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmReceipt(targetOrder.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] hover:border-[#A981FF] flex items-center gap-1 font-medium text-[#211B2B]"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#A981FF]" />
                  Confirm Receipt
                </button>
                <button
                  type="button"
                  onClick={() => onAdvanceInspectionTimer(targetOrder.id, 6 * 3600)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] flex items-center gap-1 font-medium text-[#211B2B]"
                >
                  <Clock className="w-3 h-3 text-[#A981FF]" />
                  Advance Timer (+6h)
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDisputeDemo(targetOrder.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] flex items-center gap-1 font-medium text-[#C53030]"
                >
                  <AlertOctagon className="w-3 h-3" />
                  Open Dispute
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateAdminResponse(targetOrder.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] hover:border-[#A981FF] flex items-center gap-1 font-medium text-[#211B2B]"
                >
                  <MessageSquare className="w-3 h-3 text-[#A981FF]" />
                  Simulate Admin Reply
                </button>
                <button
                  type="button"
                  onClick={() => onCompleteSettlement(targetOrder.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#A981FF] text-white flex items-center gap-1 font-medium"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Complete Settlement
                </button>
                <button
                  type="button"
                  onClick={() => onResolveDisputeDemo(targetOrder.id, 'refund_buyer')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-medium"
                >
                  Simulate Refund
                </button>
                <button
                  type="button"
                  onClick={() => onResolveDisputeDemo(targetOrder.id, 'release_vendor')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] text-[#211B2B] font-medium"
                >
                  Resolve: Pay Vendor
                </button>
                {onSimulateWarrantyClaimDemo && (
                  <button
                    type="button"
                    onClick={() => onSimulateWarrantyClaimDemo(targetOrder.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[#30102F] font-medium"
                  >
                    Demo Warranty Claim
                  </button>
                )}
                {onSimulateModerationFlagDemo && (
                  <button
                    type="button"
                    onClick={onSimulateModerationFlagDemo}
                    className="px-2.5 py-1.5 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] font-medium"
                  >
                    Flag Chat Bypass
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[#EAE6F0] flex justify-end">
            <button
              type="button"
              onClick={onResetDemoData}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#D9534F] hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Data &amp; Storage
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoControlsBar;
