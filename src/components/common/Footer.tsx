import React from 'react';
import { Logo } from './Logo';
import { TrustTileIcon } from './TrustGraphics';

interface FooterProps {
  onNavigate: (view: string) => void;
  onOpenHowItWorks: () => void;
  onOpenBuyerProtection: () => void;
  onOpenInspectionEducationModal?: () => void;
  onOpenPolicyCentre?: (slug?: string) => void;
  hideTopTrustBanner?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenHowItWorks,
  onOpenBuyerProtection,
  onOpenInspectionEducationModal,
  onOpenPolicyCentre,
  hideTopTrustBanner = false,
}) => {
  return (
    <footer className="bg-white text-[#211B2B] border-t border-[#EAE6F0] pt-10 pb-[calc(7.25rem+env(safe-area-inset-bottom))] md:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Trust Banner */}
        {!hideTopTrustBanner && (
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] shadow-[0_1px_2px_rgba(33,27,43,0.03)] flex items-start gap-3.5">
            <TrustTileIcon variant="provenance" />
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#211B2B]">Foreign-Used Provenance</h4>
              <p className="text-xs text-[#716B7B] mt-1 leading-relaxed">
                Sourced from verified US, UK &amp; Japan suppliers with checked import batches.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] shadow-[0_1px_2px_rgba(33,27,43,0.03)] flex items-start gap-3.5">
            <TrustTileIcon variant="disclosure" />
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#211B2B]">Clear Red Disclosures</h4>
              <p className="text-xs text-[#716B7B] mt-1 leading-relaxed">
                Any known issue or repair is highlighted in clear red everyday English before you pay.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] shadow-[0_1px_2px_rgba(33,27,43,0.03)] flex items-start gap-3.5">
            <TrustTileIcon variant="vendor" />
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#211B2B]">Vetted Vendors</h4>
              <p className="text-xs text-[#716B7B] mt-1 leading-relaxed">
                Business documents and identity checked before vendors are approved to sell.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] shadow-[0_1px_2px_rgba(33,27,43,0.03)] flex items-start gap-3.5">
            <TrustTileIcon variant="escrow" />
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#211B2B]">24-Hour Inspection Hold</h4>
              <p className="text-xs text-[#716B7B] mt-1 leading-relaxed">
                Minimum 24-hour check window after verified delivery before payout is released.
              </p>
            </div>
          </div>
        </div>
        )}

        {/* Links & Brand */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 pb-10 border-b border-[#EAE6F0]">
          <div className="md:col-span-2">
            <div className="mb-3">
              <Logo size="md" showTagline={false} />
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#A981FF] mb-2">
              Know Exactly What You’re Buying.
            </p>
            <p className="text-xs text-[#716B7B] max-w-sm leading-relaxed mb-4">
              UsedRight is the trusted Nigerian technology marketplace connecting verified vendors and informed buyers with transparent product history, Delivery Verification Codes, and post-delivery inspection protection.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#716B7B]">
              <span className="font-medium text-[#211B2B]">shopusedright.com</span>
              <span>•</span>
              <span>support@shopusedright.com</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#211B2B] uppercase tracking-wider mb-3">
              Categories
            </h4>
            <ul className="space-y-2 text-xs text-[#716B7B]">
              <li>
                <button type="button" onClick={() => onNavigate('phones')} className="hover:text-[#A981FF] transition-colors">
                  Phones
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('laptops')} className="hover:text-[#A981FF] transition-colors">
                  Laptops
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('tablets')} className="hover:text-[#A981FF] transition-colors">
                  Tablets &amp; Smartwatches
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('audio')} className="hover:text-[#A981FF] transition-colors">
                  Audio, Gaming &amp; Cameras
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('computer_accessories')} className="hover:text-[#A981FF] transition-colors">
                  Laptop &amp; Phone Accessories
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#211B2B] uppercase tracking-wider mb-3">
              Policies &amp; Protection
            </h4>
            <ul className="space-y-2 text-xs text-[#716B7B]">
              <li>
                <button type="button" onClick={onOpenHowItWorks} className="hover:text-[#A981FF] transition-colors">
                  How UsedRight Works
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenBuyerProtection} className="hover:text-[#A981FF] transition-colors">
                  Buyer Protection &amp; Fee Rules
                </button>
              </li>
              {onOpenPolicyCentre && (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenPolicyCentre('about-usedright')}
                      className="hover:text-[#A981FF] font-medium text-[#211B2B] transition-colors"
                    >
                      Public Policy Centre (22 Policies)
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenPolicyCentre('customer-platform-service-fee-policy')}
                      className="hover:text-[#A981FF] transition-colors"
                    >
                      Customer Platform Service Fee
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenPolicyCentre('vendor-agreement')}
                      className="hover:text-[#A981FF] transition-colors"
                    >
                      Vendor Agreement
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenPolicyCentre('delivery-and-dispatch-policy')}
                      className="hover:text-[#A981FF] transition-colors"
                    >
                      Delivery &amp; Inspection Policy
                    </button>
                  </li>
                </>
              )}
              {onOpenInspectionEducationModal && (
                <li>
                  <button type="button" onClick={onOpenInspectionEducationModal} className="hover:text-[#A981FF] transition-colors">
                    10-Point Inspection Guide
                  </button>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#211B2B] uppercase tracking-wider mb-3">
              Account
            </h4>
            <ul className="space-y-2 text-xs text-[#716B7B]">
              <li>
                <button type="button" onClick={() => onNavigate('explore')} className="hover:text-[#A981FF] transition-colors">
                  Browse All Products
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('vendors')} className="hover:text-[#A981FF] transition-colors">
                  Verified Vendor Directory
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('messages')} className="hover:text-[#A981FF] transition-colors">
                  Transaction Messages
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('profile')} className="hover:text-[#A981FF] transition-colors">
                  Customer Dashboard
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('seller_dashboard')} className="hover:text-[#A981FF] transition-colors">
                  Vendor Portal
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#716B7B]">
          <p>© 2026 UsedRight Technology Marketplace (shopusedright.com). All rights reserved.</p>
          <p className="text-[11px] text-center sm:text-right">
            Up to 0.7% Customer Platform Service Fee • Up to 1.0% Vendor Platform Service Fee • Minimum 24-hour post-delivery inspection
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
