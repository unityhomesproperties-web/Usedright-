import React, { useState } from 'react';
import {
  Clock,
  FileCheck,
  ShieldCheck,
  AlertOctagon,
  Upload,
  CheckCircle2,
  Building2,
  MapPin,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { SellerVerificationState, VendorSocialLink } from '../../types/marketplace';
import { normalizeSocialUrl } from '../../utils/marketplace';

interface PendingSellerViewProps {
  verificationState: SellerVerificationState;
  onSimulateApproval: () => void;
  onOpenHowItWorks: () => void;
  onUpdateSocialVerification?: (payload: {
    socialLinks: VendorSocialLink[];
    alternativeManualVerification: boolean;
    alternativeManualReason?: string;
  }) => void;
}

const PLATFORMS: VendorSocialLink['platform'][] = [
  'Instagram',
  'Facebook',
  'TikTok',
  'X (Twitter)',
  'Website',
  'LinkedIn',
];

export const PendingSellerView: React.FC<PendingSellerViewProps> = ({
  verificationState,
  onSimulateApproval,
  onOpenHowItWorks,
  onUpdateSocialVerification,
}) => {
  const [extraDocNote, setExtraDocNote] = useState('');
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [platform1, setPlatform1] = useState<VendorSocialLink['platform']>(
    verificationState.socialLinks?.[0]?.platform || 'Instagram'
  );
  const [handle1, setHandle1] = useState(
    verificationState.socialLinks?.[0]?.handleOrUrl || ''
  );
  const [platform2, setPlatform2] = useState<VendorSocialLink['platform']>(
    verificationState.socialLinks?.[1]?.platform || 'Facebook'
  );
  const [handle2, setHandle2] = useState(
    verificationState.socialLinks?.[1]?.handleOrUrl || ''
  );
  const [useAltManual, setUseAltManual] = useState(
    Boolean(verificationState.alternativeManualVerification)
  );
  const [altReason, setAltReason] = useState(
    verificationState.alternativeManualReason || ''
  );
  const [socialSavedMsg, setSocialSavedMsg] = useState<string | null>(null);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraDocNote.trim()) return;
    setUploadedDocName(extraDocNote.trim());
    setExtraDocNote('');
  };

  const handleSaveSocials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSocialVerification) return;
    const links: VendorSocialLink[] = [];
    if (handle1.trim()) {
      links.push({
        id: `soc-p1-${Date.now()}`,
        platform: platform1,
        handleOrUrl: handle1.trim(),
        normalizedUrl: normalizeSocialUrl(platform1, handle1.trim()),
        verified: false,
      });
    }
    if (handle2.trim()) {
      links.push({
        id: `soc-p2-${Date.now()}`,
        platform: platform2,
        handleOrUrl: handle2.trim(),
        normalizedUrl: normalizeSocialUrl(platform2, handle2.trim()),
        verified: false,
      });
    }
    onUpdateSocialVerification({
      socialLinks: links,
      alternativeManualVerification: useAltManual,
      alternativeManualReason: useAltManual ? altReason.trim() : undefined,
    });
    setSocialSavedMsg('Social verification details updated for UsedRight Admin review.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-6">
      <div className="bg-white rounded-2xl border border-[#EAE6F0] p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#A981FF] flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-[#211B2B]">
                  {verificationState.businessName || 'Nordic Tech Ltd'} — Verification Under Review
                </h1>
                {verificationState.vendorNumber && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#FAF9FC] border border-[#EAE6F0] text-[#7E4EF2]">
                    {verificationState.vendorNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#716B7B] flex flex-wrap items-center gap-1.5">
                <span>CAC Reg: {verificationState.cacNumber || 'RC-1928371'}</span>
                {verificationState.state && (
                  <span className="inline-flex items-center gap-1 text-[#211B2B] font-medium">
                    · <MapPin className="w-3 h-3 text-[#A981FF]" />
                    {verificationState.state}
                  </span>
                )}
                <span>· Submitted {verificationState.submittedAt}</span>
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-xs font-medium text-[#211B2B]">
            <Clock className="w-4 h-4 text-[#A981FF]" />
            Status: {verificationState.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-1">
            <div className="font-semibold text-[#211B2B]">1. Identity &amp; CAC Review</div>
            <div className="text-[#4A4356]">
              Status: <strong>{verificationState.status}</strong>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-1">
            <div className="font-semibold text-[#211B2B]">
              2. Social Presence / Alternative Manual Check
            </div>
            <div className="text-[#4A4356]">
              Status:{' '}
              <strong>
                {verificationState.socialVerificationStatus || 'Under Review'}
              </strong>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Product Listing Currently Restricted</div>
            <p className="mt-0.5">
              Unapproved vendors cannot publish listings until UsedRight completes CAC, identity, social media (or alternative manual review), and foreign-used import verification.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-sm font-semibold text-[#211B2B]">Submitted Verification Documents</h2>
          <div className="space-y-2">
            {(verificationState.documents || []).map((doc, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-[#A981FF]" />
                  <div>
                    <div className="font-medium text-[#211B2B]">{doc.type}</div>
                    <div className="text-[11px] text-[#716B7B]">{doc.name} · {doc.uploadDate}</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-[#EAE6F0] text-[11px] font-medium text-[#211B2B]">
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Business Social Links / Alternative Manual Verification Editor */}
        <form onSubmit={handleSaveSocials} className="pt-3 border-t border-[#EAE6F0] space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#211B2B] flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#A981FF]" />
              Business Social Media Verification (2 Links or Alternative Check)
            </h2>
          </div>

          {verificationState.socialLinks && verificationState.socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {verificationState.socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.normalizedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B]"
                >
                  <strong>{link.platform}:</strong> {link.handleOrUrl}
                  <ExternalLink className="w-3 h-3 text-[#7E4EF2]" />
                </a>
              ))}
            </div>
          )}

          {onUpdateSocialVerification && (
            <div className="space-y-2.5 p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex gap-1.5">
                  <select
                    value={platform1}
                    onChange={(e) => setPlatform1(e.target.value as VendorSocialLink['platform'])}
                    className="px-2 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={handle1}
                    onChange={(e) => setHandle1(e.target.value)}
                    placeholder="@storehandle or URL"
                    className="flex-1 px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                  />
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={platform2}
                    onChange={(e) => setPlatform2(e.target.value as VendorSocialLink['platform'])}
                    className="px-2 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={handle2}
                    onChange={(e) => setHandle2(e.target.value)}
                    placeholder="@secondhandle or URL"
                    className="flex-1 px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-[#4A4356]">
                <input
                  type="checkbox"
                  checked={useAltManual}
                  onChange={(e) => setUseAltManual(e.target.checked)}
                  className="mt-0.5 accent-[#A981FF]"
                />
                <span>
                  I do not have 2 active business social media links — request Alternative Manual Verification (e.g. physical shopfront photos / CAC address inspection)
                </span>
              </label>

              {useAltManual && (
                <textarea
                  rows={2}
                  value={altReason}
                  onChange={(e) => setAltReason(e.target.value)}
                  placeholder="Explain your physical store location, Computer Village / plaza stall details, or wholesale references..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-medium"
                >
                  Save Social Verification Details
                </button>
                {socialSavedMsg && (
                  <span className="text-[#238653] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {socialSavedMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </form>

        <form onSubmit={handleUploadSubmit} className="pt-3 border-t border-[#EAE6F0] space-y-2 text-xs">
          <label className="block font-semibold text-[#211B2B]">
            Upload Additional Foreign-Use Import Proof (Optional)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={extraDocNote}
              onChange={(e) => setExtraDocNote(e.target.value)}
              placeholder="Document filename (e.g. AirwayBill_Nov2026.pdf)"
              className="flex-1 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[#A981FF] text-[#211B2B] font-medium"
            >
              <Upload className="w-4 h-4 text-[#A981FF]" />
              Attach Document
            </button>
          </div>
          {uploadedDocName && (
            <div className="text-[#4A4356] flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-4 h-4 text-[#A981FF]" />
              Attached <strong>{uploadedDocName}</strong> to review queue.
            </div>
          )}
        </form>

        <div className="pt-3 border-t border-[#EAE6F0] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenHowItWorks}
            className="text-xs font-medium text-[#A981FF] hover:underline flex items-center gap-1"
          >
            <ShieldCheck className="w-4 h-4" />
            Read UsedRight Vendor Policy
          </button>

          <button
            type="button"
            onClick={onSimulateApproval}
            className="px-4 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium min-h-[42px]"
          >
            Demo Only: Simulate Admin KYC Approval
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingSellerView;
