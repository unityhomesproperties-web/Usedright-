import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Store,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Mail,
  Lock,
  RotateCcw,
  LogIn,
  UserPlus,
  KeyRound,
  Info,
  BookOpen,
} from 'lucide-react';
import { DemoRole, VendorSocialLink } from '../../types/marketplace';
import { Logo } from '../common/Logo';
import { DEMO_ADMIN_CREDENTIALS } from '../../data/marketplaceCatalog';
import {
  VENDOR_FINAL_CONSENT_LABEL,
  VENDOR_REGISTRATION_DECLARATIONS,
} from '../../data/policiesCatalog';
import { normalizeSocialUrl } from '../../utils/marketplace';
import { NIGERIAN_COMMERCIAL_HUBS } from '../../utils/nigerianStates';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (
    role: DemoRole,
    userEmail?: string,
    userName?: string,
    userState?: string
  ) => void;
  onVendorAgreementAccepted?: (payload: {
    vendorName: string;
    agreementVersion: string;
    declarationsAccepted: boolean[];
    finalConsentAccepted: boolean;
    state: string;
    socialLinks?: VendorSocialLink[];
    alternativeManualVerification?: boolean;
    alternativeManualReason?: string;
  }) => void;
  onOpenPolicyCentre?: (slug?: string) => void;
  onSelectRole?: (role: DemoRole) => void;
  initialMode?: 'login' | 'register';
  contextMessage?: string;
  onResetDemoData?: () => void;
}

const SOCIAL_PLATFORMS: VendorSocialLink['platform'][] = [
  'Instagram',
  'Facebook',
  'TikTok',
  'X (Twitter)',
  'Website',
  'LinkedIn',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onVendorAgreementAccepted,
  onOpenPolicyCentre,
  onSelectRole,
  initialMode = 'login',
  contextMessage,
  onResetDemoData,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [registerType, setRegisterType] = useState<'customer' | 'vendor'>('customer');
  const [vendorType, setVendorType] = useState<'business' | 'individual'>('business');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [cacNumber, setCacNumber] = useState('');
  const [selectedState, setSelectedState] = useState('Lagos State');

  // Vendor social media verification fields (2 required unless alternative manual requested)
  const [socialPlatform1, setSocialPlatform1] = useState<VendorSocialLink['platform']>('Instagram');
  const [socialHandle1, setSocialHandle1] = useState('');
  const [socialPlatform2, setSocialPlatform2] = useState<VendorSocialLink['platform']>('TikTok');
  const [socialHandle2, setSocialHandle2] = useState('');
  const [requestAlternativeManual, setRequestAlternativeManual] = useState(false);
  const [alternativeManualReason, setAlternativeManualReason] = useState('');

  const [vendorDeclarations, setVendorDeclarations] = useState<boolean[]>(() =>
    VENDOR_REGISTRATION_DECLARATIONS.map(() => false)
  );
  const [vendorFinalConsent, setVendorFinalConsent] = useState(false);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authFeedback, setAuthFeedback] = useState('');

  const allVendorDeclarationsAccepted =
    vendorDeclarations.every(Boolean) && vendorFinalConsent;

  useEffect(() => {
    setMode(initialMode);
    setInlineNotice(null);
    setVendorDeclarations(VENDOR_REGISTRATION_DECLARATIONS.map(() => false));
    setVendorFinalConsent(false);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const triggerSuccess = (
    role: DemoRole,
    demoEmail?: string,
    demoName?: string,
    userState?: string
  ) => {
    if (onLoginSuccess) {
      onLoginSuccess(role, demoEmail, demoName, userState);
    } else if (onSelectRole) {
      onSelectRole(role);
    }
  };

  const handleDemoLogin = (role: DemoRole, demoEmail: string, demoName: string) => {
    setEmail(demoEmail);
    setPassword('Demo123!');
    setInlineNotice(null);
    setAuthSuccess(true);
    setAuthFeedback(`Signing in as ${demoName}...`);
    setTimeout(() => {
      triggerSuccess(role, demoEmail, demoName);
      setAuthSuccess(false);
      onClose();
    }, 350);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineNotice(null);

    if (mode === 'login') {
      const lowerEmail = email.toLowerCase().trim();
      let determinedRole: DemoRole = 'buyer';
      let determinedName = fullName || 'Ayodele Olayinka';

      if (lowerEmail === DEMO_ADMIN_CREDENTIALS.email) {
        if (password.trim() !== DEMO_ADMIN_CREDENTIALS.accessCode) {
          setInlineNotice(
            `Admin demo requires access code ${DEMO_ADMIN_CREDENTIALS.accessCode}.`
          );
          return;
        }
        determinedRole = 'admin';
        determinedName = DEMO_ADMIN_CREDENTIALS.name;
      } else if (
        lowerEmail.includes('vendor') ||
        lowerEmail.includes('seller') ||
        lowerEmail.includes('primemobile')
      ) {
        determinedRole = 'seller_approved';
        determinedName = 'Prime Mobile Store';
      } else if (lowerEmail.includes('pending') || lowerEmail.includes('nordic')) {
        determinedRole = 'seller_pending';
        determinedName = 'Nordic Tech Ltd';
      }

      setAuthSuccess(true);
      setAuthFeedback(`Welcome back, ${determinedName}`);
      setTimeout(() => {
        triggerSuccess(determinedRole, email, determinedName);
        setAuthSuccess(false);
        onClose();
      }, 350);
    } else {
      if (registerType === 'vendor') {
        const socialLinks: VendorSocialLink[] = [];
        if (socialHandle1.trim()) {
          socialLinks.push({
            id: `soc-1-${Date.now()}`,
            platform: socialPlatform1,
            handleOrUrl: socialHandle1.trim(),
            normalizedUrl: normalizeSocialUrl(socialPlatform1, socialHandle1.trim()),
            verified: false,
          });
        }
        if (socialHandle2.trim()) {
          socialLinks.push({
            id: `soc-2-${Date.now()}`,
            platform: socialPlatform2,
            handleOrUrl: socialHandle2.trim(),
            normalizedUrl: normalizeSocialUrl(socialPlatform2, socialHandle2.trim()),
            verified: false,
          });
        }

        if (!requestAlternativeManual && socialLinks.length < 2) {
          setInlineNotice(
            'Enter 2 active business social media links/handles, or check "Request Alternative Manual Verification" below.'
          );
          return;
        }
        if (requestAlternativeManual && alternativeManualReason.trim().length < 15) {
          setInlineNotice(
            'Please provide a brief explanation (at least 15 characters) for your Alternative Manual Verification request.'
          );
          return;
        }

        if (!allVendorDeclarationsAccepted) {
          setInlineNotice(
            'You must individually check all 15 Vendor Declarations and the Final Binding Consent checkbox before submitting.'
          );
          return;
        }
        const vName = businessName || fullName || 'New Registered Vendor';
        onVendorAgreementAccepted?.({
          vendorName: vName,
          agreementVersion: '2026.1',
          declarationsAccepted: vendorDeclarations,
          finalConsentAccepted: vendorFinalConsent,
          state: selectedState,
          socialLinks,
          alternativeManualVerification: requestAlternativeManual,
          alternativeManualReason: requestAlternativeManual
            ? alternativeManualReason.trim()
            : undefined,
        });
        setAuthSuccess(true);
        setAuthFeedback(`Vendor application, social check & 15+1 declarations recorded for ${vName} (${selectedState}). Opening status...`);
        setTimeout(() => {
          triggerSuccess('seller_pending', email, vName, selectedState);
          setAuthSuccess(false);
          onClose();
        }, 400);
      } else {
        setAuthSuccess(true);
        const cName = fullName || 'New Customer';
        setAuthFeedback(`Welcome to UsedRight, ${cName}!`);
        setTimeout(() => {
          triggerSuccess('buyer', email, cName, selectedState);
          setAuthSuccess(false);
          onClose();
        }, 400);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account sign in or registration"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#EAE6F0] relative max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-[#716B7B] hover:text-[#211B2B] hover:bg-[#FAF9FC] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Close authentication modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4 text-center">
          <div className="inline-block mb-1">
            <Logo size="md" showTagline={false} />
          </div>
          <p className="text-xs text-[#716B7B]">Know Exactly What You’re Buying</p>
        </div>

        {contextMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-xs text-[#211B2B] flex items-start gap-2">
            <Info className="w-4 h-4 text-[#A981FF] shrink-0 mt-0.5" />
            <span>{contextMessage}</span>
          </div>
        )}

        {inlineNotice && (
          <div className="mb-4 p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030]">
            {inlineNotice}
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 p-1 bg-[#FAF9FC] rounded-xl border border-[#EAE6F0] mb-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setInlineNotice(null);
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all min-h-[42px] ${
              mode === 'login'
                ? 'bg-white text-[#A981FF] shadow-2xs font-semibold'
                : 'text-[#716B7B] hover:text-[#211B2B]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setInlineNotice(null);
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all min-h-[42px] ${
              mode === 'register'
                ? 'bg-white text-[#A981FF] shadow-2xs font-semibold'
                : 'text-[#716B7B] hover:text-[#211B2B]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Account
          </button>
        </div>

        {authSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F5F0FF] text-[#A981FF] border border-[#D0BCFC] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#211B2B]">{authFeedback}</h3>
            <p className="text-xs text-[#716B7B]">Opening your workspace...</p>
          </div>
        ) : (
          <div>
            {mode === 'login' ? (
              <div className="space-y-4">
                <form onSubmit={handleFormSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="auth-email" className="block text-xs font-medium text-[#211B2B] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#716B7B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="auth-password" className="text-xs font-medium text-[#211B2B]">
                        Password / Access Code
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setInlineNotice('For demo access, use one of the labelled demo accounts below.')
                        }
                        className="text-xs text-[#A981FF] hover:underline"
                      >
                        Need help?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#716B7B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-sm font-medium transition-colors min-h-[44px]"
                  >
                    Log In to Account
                  </button>
                </form>

                {/* Clearly Labelled Demo Environment Access */}
                <div className="pt-3 border-t border-[#EAE6F0] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#211B2B] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#A981FF]" />
                      Demo Accounts (Testing Environment)
                    </span>
                    {onResetDemoData && (
                      <button
                        type="button"
                        onClick={onResetDemoData}
                        className="text-xs text-[#716B7B] hover:text-[#D9534F] flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleDemoLogin('buyer', 'customer@usedright.demo', 'Ayodele Olayinka')}
                      className="p-2.5 rounded-xl bg-[#FAF9FC] hover:bg-[#F5F0FF] border border-[#EAE6F0] text-left transition-colors flex items-center justify-between min-h-[48px]"
                    >
                      <div>
                        <div className="font-semibold text-[#211B2B] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#A981FF]" />
                          Demo Customer (Ayodele Olayinka)
                        </div>
                        <div className="text-[11px] text-[#716B7B] font-mono">customer@usedright.demo</div>
                      </div>
                      <span className="text-xs text-[#A981FF] font-medium">Enter →</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoLogin('seller_approved', 'vendor@usedright.demo', 'Prime Mobile Store')}
                      className="p-2.5 rounded-xl bg-[#FAF9FC] hover:bg-[#F5F0FF] border border-[#EAE6F0] text-left transition-colors flex items-center justify-between min-h-[48px]"
                    >
                      <div>
                        <div className="font-semibold text-[#211B2B] flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-[#A981FF]" />
                          Demo Approved Vendor (Prime Mobile Store)
                        </div>
                        <div className="text-[11px] text-[#716B7B] font-mono">vendor@usedright.demo</div>
                      </div>
                      <span className="text-xs text-[#A981FF] font-medium">Enter →</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoLogin('seller_pending', 'pending@usedright.demo', 'Nordic Tech Ltd')}
                      className="p-2.5 rounded-xl bg-[#FAF9FC] hover:bg-[#F5F0FF] border border-[#EAE6F0] text-left transition-colors flex items-center justify-between min-h-[48px]"
                    >
                      <div>
                        <div className="font-semibold text-[#211B2B] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#716B7B]" />
                          Demo Pending Vendor (Nordic Tech Ltd)
                        </div>
                        <div className="text-[11px] text-[#716B7B] font-mono">pending@usedright.demo</div>
                      </div>
                      <span className="text-xs text-[#A981FF] font-medium">Enter →</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDemoLogin(
                          'admin',
                          DEMO_ADMIN_CREDENTIALS.email,
                          DEMO_ADMIN_CREDENTIALS.name
                        )
                      }
                      className="p-2.5 rounded-xl bg-[#211B2B] hover:bg-[#4A4356] text-white text-left transition-colors flex items-center justify-between min-h-[48px]"
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-[#D0BCFC]" />
                          Demo Admin Support (Protected)
                        </div>
                        <div className="text-[11px] text-[#D0BCFC] font-mono">
                          {DEMO_ADMIN_CREDENTIALS.email} · {DEMO_ADMIN_CREDENTIALS.accessCode}
                        </div>
                      </div>
                      <span className="text-xs text-[#D0BCFC] font-medium">Enter →</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRegisterType('customer')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      registerType === 'customer'
                        ? 'border-[#A981FF] bg-[#F5F0FF] text-[#211B2B]'
                        : 'border-[#EAE6F0] bg-white text-[#716B7B]'
                    }`}
                  >
                    <User className="w-4 h-4 text-[#A981FF] mb-1" />
                    <div className="font-semibold text-[#211B2B]">Customer Account</div>
                    <div className="text-[11px] text-[#716B7B]">Buy verified foreign-used tech</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegisterType('vendor')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      registerType === 'vendor'
                        ? 'border-[#A981FF] bg-[#F5F0FF] text-[#211B2B]'
                        : 'border-[#EAE6F0] bg-white text-[#716B7B]'
                    }`}
                  >
                    <Store className="w-4 h-4 text-[#A981FF] mb-1" />
                    <div className="font-semibold text-[#211B2B]">Register as Vendor</div>
                    <div className="text-[11px] text-[#716B7B]">Sell verified products</div>
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-3">
                  {registerType === 'customer' ? (
                    <>
                      <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] text-[#30102F] flex items-start gap-2">
                        <Info className="w-4 h-4 text-[#A981FF] shrink-0 mt-0.5" />
                        <span>
                          <strong className="font-semibold text-[#211B2B]">
                            Payment Name Tip:
                          </strong>{' '}
                          Register using the same full name on the Nigerian bank account or card you plan to pay with. If someone else is paying for you, declare them as a third-party payer at checkout to avoid automated verification delays.
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#211B2B] mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Ayodele Olayinka"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] focus:outline-none focus:border-[#A981FF]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#211B2B] mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] focus:outline-none focus:border-[#A981FF]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#211B2B] mb-1">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+234 803 000 0000"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] focus:outline-none focus:border-[#A981FF]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="auth-customer-state"
                          className="block text-xs font-medium text-[#211B2B] mb-1"
                        >
                          Your State in Nigeria
                        </label>
                        <select
                          id="auth-customer-state"
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF]"
                        >
                          {NIGERIAN_COMMERCIAL_HUBS.map((hub) => (
                            <option key={hub.value} value={hub.value}>
                              {hub.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#211B2B] mb-1">Password</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] focus:outline-none focus:border-[#A981FF]"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex gap-2 p-1 bg-[#FAF9FC] rounded-lg border border-[#EAE6F0] text-xs">
                        <button
                          type="button"
                          onClick={() => setVendorType('business')}
                          className={`flex-1 py-1.5 rounded-md font-medium ${
                            vendorType === 'business' ? 'bg-white shadow-2xs text-[#A981FF]' : 'text-[#716B7B]'
                          }`}
                        >
                          Registered Business
                        </button>
                        <button
                          type="button"
                          onClick={() => setVendorType('individual')}
                          className={`flex-1 py-1.5 rounded-md font-medium ${
                            vendorType === 'individual' ? 'bg-white shadow-2xs text-[#A981FF]' : 'text-[#716B7B]'
                          }`}
                        >
                          Individual Seller
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#211B2B] mb-1">
                          {vendorType === 'business' ? 'Storefront Name' : 'Full Legal Name'}
                        </label>
                        <input
                          type="text"
                          required
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g. Apex Precision Tech"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] focus:outline-none focus:border-[#A981FF]"
                        />
                      </div>

                      {vendorType === 'business' && (
                        <div>
                          <label className="block text-xs font-medium text-[#211B2B] mb-1">CAC Number</label>
                          <input
                            type="text"
                            required
                            value={cacNumber}
                            onChange={(e) => setCacNumber(e.target.value)}
                            placeholder="RC-1928371"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] focus:outline-none focus:border-[#A981FF]"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-[#211B2B] mb-1">Business Email</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="sales@yourcompany.com"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] focus:outline-none focus:border-[#A981FF]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#211B2B] mb-1">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+234 802 000 0000"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] focus:outline-none focus:border-[#A981FF]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="auth-vendor-state"
                          className="block text-xs font-medium text-[#211B2B] mb-1"
                        >
                          Business State / Base Location in Nigeria
                        </label>
                        <select
                          id="auth-vendor-state"
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF]"
                        >
                          {NIGERIAN_COMMERCIAL_HUBS.map((hub) => (
                            <option key={hub.value} value={hub.value}>
                              {hub.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Vendor Business Social Media Verification (2 Links or Alternative Manual Review) */}
                      <div className="p-3.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2.5">
                        <div>
                          <div className="text-xs font-semibold text-[#211B2B]">
                            Business Social Media Verification
                          </div>
                          <p className="text-[11px] text-[#716B7B] leading-snug mt-0.5">
                            Provide 2 active business social handles or links for UsedRight trust verification, or request alternative manual review.
                          </p>
                        </div>

                        {!requestAlternativeManual && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                aria-label="Primary social platform"
                                value={socialPlatform1}
                                onChange={(e) =>
                                  setSocialPlatform1(e.target.value as VendorSocialLink['platform'])
                                }
                                className="px-2.5 py-2 text-xs rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF]"
                              >
                                {SOCIAL_PLATFORMS.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                aria-label="Primary social handle or link"
                                value={socialHandle1}
                                onChange={(e) => setSocialHandle1(e.target.value)}
                                placeholder="@yourstore or full link"
                                className="col-span-2 px-3 py-2 text-xs rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF]"
                              />
                            </div>
                            {socialHandle1.trim() && (
                              <div className="text-[10px] text-[#716B7B] truncate">
                                Resolved: {normalizeSocialUrl(socialPlatform1, socialHandle1.trim())}
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-2">
                              <select
                                aria-label="Secondary social platform"
                                value={socialPlatform2}
                                onChange={(e) =>
                                  setSocialPlatform2(e.target.value as VendorSocialLink['platform'])
                                }
                                className="px-2.5 py-2 text-xs rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF]"
                              >
                                {SOCIAL_PLATFORMS.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                aria-label="Secondary social handle or link"
                                value={socialHandle2}
                                onChange={(e) => setSocialHandle2(e.target.value)}
                                placeholder="@yourstore or URL"
                                className="col-span-2 px-3 py-2 text-xs rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF]"
                              />
                            </div>
                            {socialHandle2.trim() && (
                              <div className="text-[10px] text-[#716B7B] truncate">
                                Resolved: {normalizeSocialUrl(socialPlatform2, socialHandle2.trim())}
                              </div>
                            )}
                          </div>
                        )}

                        <label className="flex items-start gap-2 text-[11px] text-[#211B2B] font-medium cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={requestAlternativeManual}
                            onChange={(e) => setRequestAlternativeManual(e.target.checked)}
                            className="mt-0.5 rounded border-[#D0BCFC] accent-[#A981FF] shrink-0"
                          />
                          <span>
                            I don&apos;t have 2 active business social links — Request Alternative Manual Verification
                          </span>
                        </label>

                        {requestAlternativeManual && (
                          <div>
                            <label className="block text-[11px] font-medium text-[#211B2B] mb-1">
                              Storefront / Physical Shop Verification Explanation
                            </label>
                            <textarea
                              rows={2}
                              value={alternativeManualReason}
                              onChange={(e) => setAlternativeManualReason(e.target.value)}
                              placeholder="Describe your physical shop address, WhatsApp Business catalog, or dealer invoice references..."
                              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF]"
                            />
                          </div>
                        )}
                      </div>

                      {/* 15 Mandatory Vendor Declarations + 1 Final Consent */}
                      <div className="p-3.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#211B2B]">
                            Vendor Declarations (
                            {vendorDeclarations.filter(Boolean).length}/
                            {VENDOR_REGISTRATION_DECLARATIONS.length} checked)
                          </span>
                          {onOpenPolicyCentre && (
                            <button
                              type="button"
                              onClick={() => onOpenPolicyCentre('vendor-agreement')}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7E4EF2] hover:underline"
                            >
                              <BookOpen className="w-3 h-3" />
                              Read Vendor Agreement &amp; Fee Rules
                            </button>
                          )}
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                          {VENDOR_REGISTRATION_DECLARATIONS.map((decl, idx) => (
                            <label
                              key={idx}
                              className="flex items-start gap-2 text-[11px] text-[#4A4356] leading-snug cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={vendorDeclarations[idx]}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setVendorDeclarations((prev) =>
                                    prev.map((v, i) => (i === idx ? checked : v))
                                  );
                                }}
                                className="mt-0.5 rounded border-[#D0BCFC] accent-[#A981FF] shrink-0"
                              />
                              <span>
                                <strong className="text-[#211B2B]">{idx + 1}.</strong> {decl}
                              </span>
                            </label>
                          ))}
                        </div>

                        <label className="pt-2 border-t border-[#EAE6F0] flex items-start gap-2 text-[11px] font-semibold text-[#211B2B] leading-snug cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vendorFinalConsent}
                            onChange={(e) => setVendorFinalConsent(e.target.checked)}
                            className="mt-0.5 rounded border-[#A981FF] accent-[#A981FF] shrink-0"
                          />
                          <span>{VENDOR_FINAL_CONSENT_LABEL}</span>
                        </label>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={registerType === 'vendor' && !allVendorDeclarationsAccepted}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      registerType === 'vendor' && !allVendorDeclarationsAccepted
                        ? 'bg-[#D0BCFC] text-[#30102F] cursor-not-allowed'
                        : 'bg-[#A981FF] hover:bg-[#B796FE] text-white'
                    }`}
                  >
                    {registerType === 'customer'
                      ? 'Create Customer Account'
                      : 'Submit Vendor Registration'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
