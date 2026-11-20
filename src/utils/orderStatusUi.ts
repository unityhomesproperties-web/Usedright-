import { DisputeRecord, Order, PaymentHold } from '../types/marketplace';
import { formatCountdown } from './marketplace';

export type OrderViewerRole = 'buyer' | 'vendor' | 'admin';

export interface OrderStatusSummary {
  orderStatusLabel: string;
  paymentStatusLabel: string;
  paymentTone: 'protected' | 'paused' | 'released' | 'refunded';
  deliveryStatusLabel: string;
  deliveryTone: 'pending' | 'in_transit' | 'ready_pickup' | 'verified' | 'issue';
  inspectionStatusLabel: string;
  inspectionTone: 'not_started' | 'active' | 'paused' | 'ended';
  hasVerifiedReceipt: boolean;
  inspectionStartedAt: string | null;
  inspectionDeadlineAt: string | null;
  inspectionRemainingText: string;
}

export function isDeliveryPinAllowedForViewer(
  order: Pick<Order, 'isGift' | 'deliveryVerificationCode' | 'deliveryCodeUsedAt' | 'fulfillmentStatus'>,
  viewerRole: OrderViewerRole
): boolean {
  if (viewerRole !== 'buyer') return false;
  if (order.isGift) return false;
  if (!order.deliveryVerificationCode) return false;
  if (order.deliveryCodeUsedAt) return false;
  return (
    order.fulfillmentStatus === 'In transit' ||
    order.fulfillmentStatus === 'Ready for Pickup'
  );
}

export function hasOrderVerifiedReceipt(
  order: Pick<Order, 'deliveryCodeUsedAt' | 'buyerConfirmedReceipt' | 'fulfillmentStatus'>
): boolean {
  return Boolean(
    order.deliveryCodeUsedAt ||
      order.buyerConfirmedReceipt ||
      order.fulfillmentStatus === 'Delivered_In_Inspection' ||
      order.fulfillmentStatus === 'Delivered' ||
      order.fulfillmentStatus === 'Completed'
  );
}

export function formatFriendlyOrderStage(status: Order['fulfillmentStatus']): string {
  switch (status) {
    case 'Order placed':
      return 'Order Placed';
    case 'Vendor Accepted Order':
      return 'Vendor Accepted';
    case 'Seller preparing device':
      return 'Preparing Device';
    case 'In transit':
      return 'In Transit';
    case 'Ready for Pickup':
      return 'Ready for Pickup';
    case 'Delivered':
    case 'Delivered_In_Inspection':
    case 'Buyer inspection':
      return 'In Inspection';
    case 'Disputed':
    case 'Dispute_Opened':
      return 'Dispute Open';
    case 'Completed':
      return 'Completed';
    case 'Refunded':
      return 'Refunded';
    default:
      return String(status).replace(/_/g, ' ');
  }
}

export function deriveOrderStatusSummary(input: {
  order: Order;
  paymentHold?: PaymentHold | null;
  dispute?: DisputeRecord | null;
  viewerRole: OrderViewerRole;
  remainingSeconds: number;
}): OrderStatusSummary {
  const { order, paymentHold, dispute, viewerRole, remainingSeconds } = input;
  const hasVerifiedReceipt = hasOrderVerifiedReceipt(order);
  const hasOpenDispute = Boolean(
    dispute && dispute.status !== 'Resolved' && dispute.status !== 'Closed'
  );

  // 1. Payment status
  let paymentStatusLabel =
    viewerRole === 'vendor' ? 'Awaiting 24h inspection' : 'Payment protected';
  let paymentTone: OrderStatusSummary['paymentTone'] = 'protected';

  if (order.fulfillmentStatus === 'Refunded' || paymentHold?.status === 'Refunded') {
    paymentStatusLabel =
      viewerRole === 'vendor' ? 'Refunded to customer' : 'Payment refunded';
    paymentTone = 'refunded';
  } else if (hasOpenDispute || order.disputePaused) {
    paymentStatusLabel = 'Paused (Dispute open)';
    paymentTone = 'paused';
  } else if (
    order.fulfillmentStatus === 'Completed' ||
    paymentHold?.status === 'Settled'
  ) {
    paymentStatusLabel =
      viewerRole === 'vendor' ? 'Payout settled' : 'Released to vendor';
    paymentTone = 'released';
  } else if (paymentHold?.status === 'Payment Approved for Release') {
    paymentStatusLabel = 'Approved for release';
    paymentTone = 'released';
  }

  // 2. Delivery status
  let deliveryStatusLabel = 'Awaiting dispatch';
  let deliveryTone: OrderStatusSummary['deliveryTone'] = 'pending';

  if (order.deliveryAttemptFailedReason) {
    deliveryStatusLabel = 'Delivery issue reported';
    deliveryTone = 'issue';
  } else if (hasVerifiedReceipt) {
    deliveryStatusLabel =
      order.deliveryMethod === 'physical_pickup' ? 'Picked up & verified' : 'Delivered & verified';
    deliveryTone = 'verified';
  } else if (order.fulfillmentStatus === 'Ready for Pickup') {
    deliveryStatusLabel = 'Ready for pickup';
    deliveryTone = 'ready_pickup';
  } else if (order.fulfillmentStatus === 'In transit') {
    deliveryStatusLabel = 'In transit';
    deliveryTone = 'in_transit';
  } else if (order.fulfillmentStatus === 'Refunded') {
    deliveryStatusLabel = 'Cancelled / Refunded';
    deliveryTone = 'issue';
  }

  // 3. Inspection status (never starts until physical receipt/PIN verification)
  const inspectionHours = order.inspectionWindowHours || 24;
  let inspectionStatusLabel = `Starts on receipt (${inspectionHours}h)`;
  let inspectionTone: OrderStatusSummary['inspectionTone'] = 'not_started';
  let inspectionRemainingText = `Starts after PIN / receipt`;

  if (order.disputePaused || hasOpenDispute) {
    inspectionStatusLabel = 'Paused (Dispute review)';
    inspectionTone = 'paused';
    inspectionRemainingText = 'Paused while Support reviews';
  } else if (
    order.fulfillmentStatus === 'Completed' ||
    order.fulfillmentStatus === 'Refunded'
  ) {
    inspectionStatusLabel = 'Inspection closed';
    inspectionTone = 'ended';
    inspectionRemainingText = 'Closed';
  } else if (hasVerifiedReceipt) {
    if (remainingSeconds > 0) {
      inspectionStatusLabel = 'Active countdown';
      inspectionTone = 'active';
      inspectionRemainingText = formatCountdown(remainingSeconds);
    } else {
      inspectionStatusLabel = 'Window ended';
      inspectionTone = 'ended';
      inspectionRemainingText = 'Ended';
    }
  }

  return {
    orderStatusLabel: formatFriendlyOrderStage(order.fulfillmentStatus),
    paymentStatusLabel,
    paymentTone,
    deliveryStatusLabel,
    deliveryTone,
    inspectionStatusLabel,
    inspectionTone,
    hasVerifiedReceipt,
    inspectionStartedAt: hasVerifiedReceipt
      ? order.deliveryCodeUsedAt || order.deliveredAt || null
      : null,
    inspectionDeadlineAt: hasVerifiedReceipt ? order.inspectionExpiresAt || null : null,
    inspectionRemainingText,
  };
}

export function shouldHideFooterTrustStack(activeView: string): boolean {
  return [
    'home',
    'messages',
    'order_details',
    'profile',
    'payment_request',
    'gift_recipient_portal',
    'seller_dashboard',
    'admin_dashboard',
    'checkout',
  ].includes(activeView);
}
