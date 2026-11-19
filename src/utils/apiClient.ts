import type {
  CartItem,
  ChatAttachmentRecord,
  ChatEvidenceTag,
  DeliveryConfig,
  DeliveryMethod,
  GiftOrderDetails,
  ModerationFlag,
  Order,
  ParentOrderRecord,
  PayerInfoRecord,
  PaymentRequestRecord,
  PaymentRequestStatus,
  PlatformConfig,
  PlatformFeeConfig,
  PolicyDocument,
  RecipientComplaintCategory,
  RecipientComplaintRecord,
  SellerVerificationState,
  ThirdPartyPayerDeclaration,
  VendorStorefront,
  WarrantyClaim,
  WarrantyClaimCategory,
  WarrantyClaimStatus,
  WarrantyPolicyConfig,
} from '../types/marketplace';
import type {
  MultiVendorCheckoutQuote,
  PayerSafeRequestView,
  PaymentRequestAvailabilityResult,
  RecipientSafeOrderView,
  VendorSearchResultItem,
} from './marketplace';

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  backendUnavailable?: boolean;
}

async function parseJsonSafe<T>(res: Response): Promise<{ parsed?: T; isJson: boolean }> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!text) return { isJson: contentType.includes('application/json') };
  try {
    return { parsed: JSON.parse(text) as T, isJson: true };
  } catch {
    return { isJson: false };
  }
}

async function postJson<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const { parsed, isJson } = await parseJsonSafe<T & { error?: string }>(res);
    if (!isJson && (res.status === 404 || res.status === 405 || res.ok)) {
      return {
        ok: false,
        status: res.status,
        error: 'Backend API is not available in static hosting mode.',
        backendUnavailable: true,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: parsed,
        error: parsed?.error || `HTTP ${res.status}`,
        backendUnavailable: res.status === 404 && !isJson,
      };
    }
    return { ok: true, status: res.status, data: parsed };
  } catch (err) {
    return { ok: false, status: 0, error: (err as Error).message, backendUnavailable: true };
  }
}

async function getJson<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url);
    const { parsed, isJson } = await parseJsonSafe<T & { error?: string }>(res);
    if (!isJson && (res.status === 404 || res.status === 405 || res.ok)) {
      return {
        ok: false,
        status: res.status,
        error: 'Backend API is not available in static hosting mode.',
        backendUnavailable: true,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: parsed,
        error: parsed?.error || `HTTP ${res.status}`,
        backendUnavailable: res.status === 404 && !isJson,
      };
    }
    return { ok: true, status: res.status, data: parsed };
  } catch (err) {
    return { ok: false, status: 0, error: (err as Error).message, backendUnavailable: true };
  }
}

export function fetchAuthoritativeQuote(params: {
  cartItems: CartItem[];
  deliveryMethod: DeliveryMethod;
  referralDiscount?: number;
}) {
  return postJson<{ quote: MultiVendorCheckoutQuote; currency: 'NGN'; authoritative: boolean }>(
    '/api/checkout/quote',
    params
  );
}

export function initializeCheckoutPayment(params: {
  cartItems: CartItem[];
  deliveryMethod: DeliveryMethod;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  orderOwnerId?: string;
  payerInfo?: PayerInfoRecord;
  thirdPartyPayer?: ThirdPartyPayerDeclaration;
  isGift?: boolean;
  giftDetails?: GiftOrderDetails;
  paymentRequestId?: string;
  paymentRequestReference?: string;
  deliveryAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
  };
  referralDiscount?: number;
  idempotencyKey: string;
  demoOutcome: 'success' | 'pending' | 'failed';
  acceptedPriceChanges?: boolean;
}) {
  return postJson<{
    mode: string;
    reference: string;
    amount: number;
    currency: 'NGN';
    status: 'initialized' | 'pending' | 'failed';
    message?: string;
    authorizationUrl?: string;
    quote: MultiVendorCheckoutQuote;
    duplicate?: boolean;
  }>('/api/payments/initialize', params);
}

export function verifyCheckoutPayment(params: {
  reference: string;
  forceCompletePending?: boolean;
}) {
  return postJson<{
    verified: boolean;
    duplicate?: boolean;
    status?: string;
    parentOrder?: ParentOrderRecord;
    childOrders?: Order[];
    error?: string;
    message?: string;
  }>('/api/payments/verify', params);
}

export function submitVendorDispatchApi(
  orderId: string,
  payload: {
    dispatcherOrCourierName: string;
    dispatcherPhone?: string;
    dispatchReference: string;
    dispatchDate?: string;
    expectedDeliveryWindow: string;
    deliveryNotes?: string;
  }
) {
  return postJson<{ ok: boolean; order?: Order; message?: string }>(`/api/orders/${orderId}/dispatch`, payload);
}

export function resendDeliveryPinApi(orderId: string, buyerId: string) {
  return postJson<{ ok: boolean; code?: string; expiresAt?: string; order?: Order }>(
    `/api/orders/${orderId}/delivery-code/resend`,
    { buyerId }
  );
}

export function setAlternativeRecipientApi(
  orderId: string,
  payload: { buyerId: string; name: string; phone: string; relationship: string; note?: string }
) {
  return postJson<{ ok: boolean; order?: Order }>(`/api/orders/${orderId}/alternative-recipient`, payload);
}

export function markDeliveryFailedApi(
  orderId: string,
  payload: { vendorId?: string; reason: string; rescheduledWindow?: string }
) {
  return postJson<{ ok: boolean; order?: Order }>(`/api/orders/${orderId}/delivery-failed`, payload);
}

export function verifyDeliveryOtpApi(
  orderId: string,
  payload: { code: string; vendorId?: string; actorName?: string }
) {
  return postJson<{ verified: boolean; order?: Order; error?: string; remainingAttempts?: number }>(
    `/api/orders/${orderId}/verify-delivery-code`,
    payload
  );
}

export function adminOverrideDeliveryApi(
  orderId: string,
  payload: { role: 'admin'; adminName: string; reason: string }
) {
  return postJson<{ ok: boolean; order?: Order }>(`/api/orders/${orderId}/admin-override-delivery`, payload);
}

export function submitWarrantyClaimApi(
  orderId: string,
  payload: {
    buyerId: string;
    buyerName: string;
    issueCategory: WarrantyClaimCategory;
    description: string;
    attachmentNames?: string[];
    attachmentPreviews?: string[];
  }
) {
  return postJson<{ ok: boolean; claim?: WarrantyClaim; order?: Order }>(
    `/api/orders/${orderId}/warranty-claim`,
    payload
  );
}

export function respondWarrantyClaimApi(
  orderId: string,
  claimId: string,
  payload: {
    role?: 'vendor' | 'admin';
    vendorId?: string;
    vendorName?: string;
    proposedRemedy?: WarrantyClaim['proposedRemedy'];
    vendorResponse?: string;
    nextStatus?: WarrantyClaimStatus;
    adminName?: string;
    status?: WarrantyClaimStatus;
    resolutionSummary?: string;
    adminNotes?: string;
  }
) {
  return postJson<{ ok: boolean; warrantyClaims?: WarrantyClaim[] }>(
    `/api/orders/${orderId}/warranty-claim/${claimId}/respond`,
    payload
  );
}

export function uploadChatAttachmentApi(payload: {
  conversationId: string;
  orderId?: string;
  senderId: string;
  senderRole: 'buyer' | 'vendor' | 'admin';
  fileName: string;
  mimeType: string;
  dataBase64: string;
  evidenceTag?: ChatEvidenceTag;
  caption?: string;
}) {
  return postJson<{ ok: boolean; attachment?: ChatAttachmentRecord; triggers?: string[] }>(
    '/api/chat/attachments',
    payload
  );
}

export function searchVendorsApi(params: { q?: string; verifiedOnly?: boolean; state?: string }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.verifiedOnly) sp.set('verifiedOnly', 'true');
  if (params.state) sp.set('state', params.state);
  return getJson<{ ok: boolean; results: VendorSearchResultItem[] }>(`/api/vendors/search?${sp.toString()}`);
}

export function toggleFollowVendorApi(vendorId: string) {
  return postJson<{
    ok: boolean;
    isFollowing: boolean;
    followedVendorIds?: string[];
    vendor?: VendorStorefront;
  }>(`/api/vendors/${vendorId}/follow`, {});
}

export function adminVerifyVendorApi(
  vendorId: string,
  payload: {
    role: 'admin';
    decision: 'Approved' | 'Rejected' | 'Needs Info';
    identityStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info';
    socialStatus?: 'Approved' | 'Under Review' | 'Rejected' | 'Needs Info';
    notes?: string;
    adminName: string;
  }
) {
  return postJson<{
    ok: boolean;
    vendors?: VendorStorefront[];
    pendingSellerState?: SellerVerificationState;
  }>(`/api/admin/vendors/${vendorId}/verify`, payload);
}

export function adminUpdateWarrantyPolicyApi(payload: Partial<WarrantyPolicyConfig> & { role: 'admin'; adminName: string }) {
  return postJson<{ ok: boolean; warrantyConfig: WarrantyPolicyConfig }>('/api/admin/warranty-policy', payload);
}

export function fetchAdminModerationApi() {
  return getJson<{
    ok: boolean;
    moderationFlags: ModerationFlag[];
    restrictedMessagingUserIds: string[];
  }>('/api/admin/moderation?role=admin');
}

export function adminTakeModerationActionApi(
  flagId: string,
  payload: {
    role: 'admin';
    action: 'warn' | 'restrict_messaging' | 'suspend_vendor' | 'dismiss';
    adminName: string;
    note?: string;
  }
) {
  return postJson<{
    ok: boolean;
    moderationFlags?: ModerationFlag[];
    restrictedMessagingUserIds?: string[];
  }>(`/api/admin/moderation/${flagId}/action`, payload);
}

export function adminUpdateFeesApi(payload: {
  role: 'admin';
  customerFeeRate: number;
  vendorFeeRate: number;
  vendorSpecificRates?: Record<string, number>;
  promotionalLabel?: string;
  effectiveDate?: string;
  expiryDate?: string;
  eligibilityRules?: string;
  reason: string;
  adminName: string;
}) {
  return postJson<{ ok: boolean; feeConfig: PlatformFeeConfig }>('/api/admin/fees', payload);
}

export function adminUpdateDeliveryConfigApi(payload: Partial<DeliveryConfig> & { adminName: string }) {
  return postJson<{ ok: boolean; deliveryConfig: DeliveryConfig }>('/api/admin/delivery-config', payload);
}

export function adminPublishPolicyApi(payload: Partial<PolicyDocument> & {
  policyId?: string;
  version: string;
  changeSummary: string;
  adminName: string;
}) {
  return postJson<{ ok: boolean; policies: PolicyDocument[] }>('/api/admin/policies', payload);
}

export function recordVendorAgreementAcceptApi(payload: {
  vendorId: string;
  vendorName: string;
  agreementVersion: string;
  policyVersion: string;
  declarationsAccepted: boolean[];
  finalConsentAccepted: boolean;
  verifiedIdentityRef?: string;
}) {
  return postJson<{ ok: boolean }>('/api/vendor/agreement-accept', payload);
}

export function resetServerDemoDatabase() {
  return postJson<{ ok: boolean }>('/api/state/reset', {});
}

export function createPaymentRequestApi(payload: {
  orderOwnerId: string;
  orderOwnerName: string;
  orderOwnerEmail: string;
  orderOwnerPhone: string;
  cartItems: CartItem[];
  deliveryMethod: DeliveryMethod;
  deliveryAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    landmark?: string;
  };
  isGift?: boolean;
  giftDetails?: GiftOrderDetails;
  validityHours?: number;
  customRawToken?: string;
}) {
  return postJson<{
    ok: boolean;
    request: PaymentRequestRecord;
    rawToken: string;
    sharePath: string;
  }>('/api/payment-requests', payload);
}

export function fetchPaymentRequestApi(token: string) {
  return getJson<{
    ok: boolean;
    request: PayerSafeRequestView;
    availability: PaymentRequestAvailabilityResult;
  }>(`/api/payment-requests/${encodeURIComponent(token)}`);
}

export function cancelPaymentRequestApi(
  tokenOrId: string,
  payload: { orderOwnerId: string; reason?: string }
) {
  return postJson<{ ok: boolean; request?: PaymentRequestRecord }>(
    `/api/payment-requests/${encodeURIComponent(tokenOrId)}/cancel`,
    payload
  );
}

export function payPaymentRequestApi(
  token: string,
  payload: {
    payerId?: string;
    payerName: string;
    payerEmail: string;
    payerPhone: string;
    isAuthenticatedCustomer?: boolean;
    expectedAmount: number;
    outcome?: 'success' | 'pending' | 'failed';
    paymentProviderRef?: string;
    useLivePaystack?: boolean;
  }
) {
  return postJson<{
    ok: boolean;
    mode?: string;
    reference?: string;
    authorizationUrl?: string;
    status: PaymentRequestStatus;
    request?: PayerSafeRequestView;
    parentOrder?: ParentOrderRecord;
    childOrders?: Order[];
    paymentReference?: string;
    error?: string;
  }>(`/api/payment-requests/${encodeURIComponent(token)}/pay`, payload);
}

export function fetchGiftRecipientViewApi(orderId: string, rtok?: string) {
  const qs = rtok ? `?rtok=${encodeURIComponent(rtok)}` : '';
  return getJson<{
    ok: boolean;
    view: RecipientSafeOrderView;
    complaints: RecipientComplaintRecord[];
  }>(`/api/orders/${encodeURIComponent(orderId)}/recipient-view${qs}`);
}

export function submitGiftRecipientComplaintApi(
  orderId: string,
  payload: {
    rtok?: string;
    category: RecipientComplaintCategory;
    description: string;
    attachmentNames?: string[];
    attachmentPreviews?: string[];
  }
) {
  return postJson<{
    ok: boolean;
    complaint?: RecipientComplaintRecord;
  }>(`/api/orders/${encodeURIComponent(orderId)}/recipient-complaint`, payload);
}

export function adminUpdatePaymentRequestConfigApi(payload: {
  role: 'admin';
  validityHours: number;
  adminName: string;
}) {
  return postJson<{ ok: boolean; platformConfig: PlatformConfig }>(
    '/api/admin/payment-request-config',
    payload
  );
}
