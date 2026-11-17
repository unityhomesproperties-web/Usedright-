import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  BookOpen,
  FileText,
  Printer,
  ChevronRight,
  AlertCircle,
  Calendar,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import { PolicyDocument } from '../../types/marketplace';
import { LEGAL_REVIEW_NOTICE } from '../../data/policiesCatalog';

interface PolicyCentreModalProps {
  isOpen: boolean;
  onClose: () => void;
  policies: PolicyDocument[];
  initialSlug?: string;
}

const POLICY_CATEGORIES: Array<PolicyDocument['category'] | 'All'> = [
  'All',
  'Core Terms',
  'Devices & Warranty',
  'Fees & Payments',
  'Delivery & Inspection',
  'Privacy & Safety',
];

export const PolicyCentreModal: React.FC<PolicyCentreModalProps> = ({
  isOpen,
  onClose,
  policies,
  initialSlug,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PolicyDocument['category'] | 'All'>('All');
  const [selectedSlug, setSelectedSlug] = useState<string>(
    initialSlug || policies[0]?.slug || 'about-usedright'
  );
  const [mobileShowDoc, setMobileShowDoc] = useState(Boolean(initialSlug));

  useEffect(() => {
    if (isOpen && initialSlug) {
      setSelectedSlug(initialSlug);
      setMobileShowDoc(true);
    } else if (isOpen && !initialSlug && policies.length > 0 && !policies.some((p) => p.slug === selectedSlug)) {
      setSelectedSlug(policies[0].slug);
    }
  }, [isOpen, initialSlug, policies, selectedSlug]);

  const visiblePolicies = useMemo(() => {
    const publishedOrScheduled = policies.filter(
      (p) => p.status === 'Published' || p.status === 'Scheduled'
    );
    const q = searchQuery.trim().toLowerCase();
    return publishedOrScheduled
      .filter((p) => (selectedCategory === 'All' ? true : p.category === selectedCategory))
      .filter((p) => {
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.sections.some(
            (s) =>
              s.heading.toLowerCase().includes(q) ||
              s.paragraphs.some((para) => para.toLowerCase().includes(q)) ||
              (s.bullets && s.bullets.some((b) => b.toLowerCase().includes(q)))
          )
        );
      })
      .sort((a, b) => a.number - b.number);
  }, [policies, searchQuery, selectedCategory]);

  const activeDoc = useMemo(() => {
    return (
      policies.find((p) => p.slug === selectedSlug) ||
      visiblePolicies[0] ||
      policies[0]
    );
  }, [policies, selectedSlug, visiblePolicies]);

  if (!isOpen) return null;

  const handlePrintPolicy = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="UsedRight Public Policy Centre"
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[92vh] border border-[#EAE6F0] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="px-4 sm:px-6 py-4 border-b border-[#EAE6F0] bg-[#FAF9FC] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] text-[#A981FF] flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-[#211B2B] truncate">
                UsedRight Public Policy Centre ({policies.filter((p) => p.status !== 'Archived').length} Policies)
              </h2>
              <p className="text-[11px] sm:text-xs text-[#716B7B] truncate">
                Know Exactly What You’re Buying · Transparent terms, fees, verification, delivery & buyer protection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrintPolicy}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white hover:border-[#A981FF] text-xs font-medium text-[#211B2B]"
            >
              <Printer className="w-3.5 h-3.5 text-[#A981FF]" />
              Print Policy
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Policy Centre"
              className="p-2 rounded-xl border border-[#EAE6F0] bg-white text-[#716B7B] hover:text-[#211B2B] min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-[#EAE6F0] bg-white space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-[#716B7B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies (e.g. Delivery Verification Code, 0.7%, Vendor Fee, Foreign-Used, Refund, Privacy)..."
              aria-label="Search UsedRight policies"
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-xs sm:text-sm text-[#211B2B] placeholder-[#716B7B] focus:outline-none focus:border-[#A981FF] focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear policy search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#716B7B] hover:text-[#211B2B]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {POLICY_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#A981FF] text-white'
                      : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#211B2B] hover:border-[#A981FF]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Sidebar + Document Reader */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Index List */}
          <aside
            className={`md:col-span-4 lg:col-span-4 border-r border-[#EAE6F0] bg-[#FAF9FC] overflow-y-auto p-3 space-y-1.5 ${
              mobileShowDoc ? 'hidden md:block' : 'block'
            }`}
          >
            {visiblePolicies.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#716B7B]">
                No policies match "{searchQuery}". Clear your search to view all 22 policy documents.
              </div>
            ) : (
              visiblePolicies.map((doc) => {
                const isSelected = activeDoc?.slug === doc.slug;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlug(doc.slug);
                      setMobileShowDoc(true);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-white border-2 border-[#A981FF] shadow-xs'
                        : 'bg-white/80 border-[#EAE6F0] hover:border-[#B796FE]'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#716B7B]">
                        <span className="px-1.5 py-0.5 rounded bg-[#F5F0FF] text-[#30102F]">
                          #{doc.number}
                        </span>
                        <span>{doc.category}</span>
                      </div>
                      <div className="text-xs font-semibold text-[#211B2B] leading-snug">
                        {doc.title}
                      </div>
                      <div className="text-[11px] text-[#716B7B] line-clamp-2">
                        {doc.summary}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 mt-1 ${
                        isSelected ? 'text-[#A981FF]' : 'text-[#716B7B]'
                      }`}
                    />
                  </button>
                );
              })
            )}
          </aside>

          {/* Right Document Reader */}
          <main
            className={`md:col-span-8 lg:col-span-8 bg-white overflow-y-auto p-4 sm:p-6 space-y-5 ${
              mobileShowDoc ? 'block' : 'hidden md:block'
            }`}
          >
            {activeDoc && (
              <>
                <button
                  type="button"
                  onClick={() => setMobileShowDoc(false)}
                  className="md:hidden inline-flex items-center gap-1.5 text-xs font-medium text-[#A981FF] pb-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All {visiblePolicies.length} Policies
                </button>

                {/* Legal Review Banner */}
                <div className="p-3.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] flex items-start gap-2.5 text-[11px] text-[#30102F]">
                  <AlertCircle className="w-4 h-4 text-[#A981FF] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{LEGAL_REVIEW_NOTICE}</p>
                </div>

                {/* Policy Header */}
                <div className="space-y-2 pb-4 border-b border-[#EAE6F0]">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="px-2.5 py-1 rounded-full bg-[#F5F0FF] border border-[#D0BCFC] font-semibold text-[#30102F]">
                      Policy #{activeDoc.number} · {activeDoc.category}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF9FC] border border-[#EAE6F0] text-[#211B2B] font-medium">
                      <Tag className="w-3 h-3 text-[#A981FF]" />
                      Version {activeDoc.currentVersion}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF9FC] border border-[#EAE6F0] text-[#716B7B]">
                      <Calendar className="w-3 h-3 text-[#A981FF]" />
                      Effective {activeDoc.effectiveDate}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#238653]/10 text-[#238653] font-semibold">
                      {activeDoc.status}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-semibold text-[#211B2B]">
                    {activeDoc.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4A4356] leading-relaxed">
                    {activeDoc.summary}
                  </p>
                </div>

                {/* Policy Sections */}
                <div className="space-y-5">
                  {activeDoc.sections.map((section, idx) => (
                    <section key={idx} className="space-y-2">
                      <h4 className="text-sm font-semibold text-[#211B2B] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#A981FF] shrink-0" />
                        <span>{section.heading}</span>
                      </h4>
                      {section.paragraphs.map((para, pIdx) => (
                        <p key={pIdx} className="text-xs sm:text-sm text-[#4A4356] leading-relaxed">
                          {para}
                        </p>
                      ))}
                      {section.bullets && section.bullets.length > 0 && (
                        <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-[#4A4356]">
                          {section.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="leading-relaxed">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>

                {/* Version History */}
                {activeDoc.versions && activeDoc.versions.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2 text-xs">
                    <div className="font-semibold text-[#211B2B]">Published Version History</div>
                    <div className="space-y-1.5">
                      {activeDoc.versions.map((ver, vIdx) => (
                        <div
                          key={`${ver.version}-${vIdx}`}
                          className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#4A4356] pb-1.5 border-b border-[#EAE6F0] last:border-b-0 last:pb-0"
                        >
                          <div>
                            <strong className="text-[#211B2B]">v{ver.version}</strong> ({ver.status}) · Effective {ver.effectiveDate}
                            <div className="text-[#716B7B]">{ver.changeSummary}</div>
                          </div>
                          <span className="text-[#716B7B]">{ver.updatedBy}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Policies */}
                {activeDoc.relatedSlugs.length > 0 && (
                  <div className="pt-3 border-t border-[#EAE6F0] space-y-2">
                    <div className="text-xs font-semibold text-[#211B2B]">Related Policies</div>
                    <div className="flex flex-wrap gap-2">
                      {activeDoc.relatedSlugs.map((slug) => {
                        const rel = policies.find((p) => p.slug === slug);
                        if (!rel) return null;
                        return (
                          <button
                            key={slug}
                            type="button"
                            onClick={() => setSelectedSlug(rel.slug)}
                            className="px-3 py-1.5 rounded-full bg-[#F5F0FF] hover:bg-[#D0BCFC] text-[#30102F] text-xs font-medium transition-colors"
                          >
                            #{rel.number} {rel.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default PolicyCentreModal;
