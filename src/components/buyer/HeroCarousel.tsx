import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroSlide {
  id: string;
  image: string;
  imageAlt: string;
  kicker: string;
  headline: string;
  copy: string;
  ctaLabel: string;
  ctaAction: 'explore' | 'how_it_works';
  surfaceClass: string;
  artworkBgClass: string;
  imageClass: string;
}

interface HeroCarouselProps {
  onExploreDevices: () => void;
  onHowItWorks: () => void;
}

const SLIDES: HeroSlide[] = [
  {
    id: 'slide-preowned-tech',
    image: '/assets/aistudio/IMG_2362_fd8ee2e8.jpeg',
    imageAlt: 'Pre-owned laptop, smartphone, tablet, earbuds, and smartwatch lineup',
    kicker: 'Pre-Owned Technology Marketplace',
    headline: 'Pre-Owned Tech. Smarter Buying.',
    copy: 'Shop pre-owned phones, laptops and gadgets with transparent condition details and verified sellers.',
    ctaLabel: 'Explore Devices',
    ctaAction: 'explore',
    surfaceClass: 'bg-gradient-to-br from-[#FFFFFF] via-[#FAF8F4] to-[#F5F0FF]',
    artworkBgClass: 'bg-white',
    imageClass: 'w-full h-full object-cover object-center scale-[1.01]',
  },
  {
    id: 'slide-smartphones-transparency',
    image: '/assets/aistudio/IMG_2358_95d247fc.jpeg',
    imageAlt: 'Smartphones collection featuring pre-owned phones, smartwatch, and wireless earbuds',
    kicker: 'Condition Transparency',
    headline: 'Know Exactly What You’re Buying.',
    copy: 'Cosmetic wear, battery health, and functional checks are clearly separated before checkout.',
    ctaLabel: 'How It Works',
    ctaAction: 'how_it_works',
    surfaceClass: 'bg-gradient-to-br from-[#F5F0FF] via-[#FFFFFF] to-[#EAE0FF]/70',
    artworkBgClass: 'bg-[#D0BCFC]/30',
    imageClass: 'w-full h-full object-cover object-center scale-[1.01]',
  },
  {
    id: 'slide-favourite-device',
    image: '/assets/aistudio/IMG_2361_15ba111e.jpeg',
    imageAlt: 'Pre-owned smartphones, wireless earbuds, and smartwatches in studio display',
    kicker: 'Curated Naira Pricing',
    headline: 'Find Your Next Favourite Device.',
    copy: 'Compare verified Nigerian vendors with clear disclosures and 24-hour inspection protection.',
    ctaLabel: 'Shop Now',
    ctaAction: 'explore',
    surfaceClass: 'bg-gradient-to-br from-[#FAF8F4] via-[#FFFFFF] to-[#F5F0FF]',
    artworkBgClass: 'bg-[#EAE2FF]',
    imageClass: 'w-full h-full object-cover object-center scale-[1.01]',
  },
];

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  onExploreDevices,
  onHowItWorks,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [isPaused, prefersReducedMotion]);

  const goToSlide = (nextIdx: number) => {
    const normalized = (nextIdx + SLIDES.length) % SLIDES.length;
    setActiveIndex(normalized);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore pointer starts on interactive buttons/links so clicks never get swallowed
    if ((e.target as HTMLElement)?.closest('button, a')) return;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    setIsPaused(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null || pointerStartY.current === null) return;
    const dx = e.clientX - pointerStartX.current;
    const dy = e.clientY - pointerStartY.current;
    pointerStartX.current = null;
    pointerStartY.current = null;

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        goToSlide(activeIndex + 1);
      } else {
        goToSlide(activeIndex - 1);
      }
    }
  };

  const handleCta = (action: HeroSlide['ctaAction']) => {
    if (action === 'how_it_works') {
      onHowItWorks();
    } else {
      onExploreDevices();
    }
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured UsedRight promotions"
      className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
    >
      <div
        className="relative rounded-2xl border border-[#EAE6F0] bg-white shadow-sm overflow-hidden select-none touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div
          className={`flex ${
            prefersReducedMotion
              ? ''
              : 'transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]'
          }`}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${idx + 1} of ${SLIDES.length}: ${slide.headline}`}
              aria-hidden={idx !== activeIndex}
              className={`w-full shrink-0 ${slide.surfaceClass}`}
            >
              <div className="flex flex-col lg:grid lg:grid-cols-12 lg:items-stretch lg:h-[360px] xl:h-[396px]">
                {/* Artwork Panel: 16:9 mobile framing on top; unobstructed right-side showcase on desktop */}
                <div className="order-1 lg:order-2 lg:col-span-7 p-2.5 pb-0 sm:p-3.5 sm:pb-0 lg:p-4 flex items-center justify-center">
                  <div
                    className={`w-full aspect-video lg:h-full lg:w-auto lg:max-w-full rounded-xl overflow-hidden border border-[#EAE6F0]/80 ${slide.artworkBgClass}`}
                  >
                    <img
                      src={slide.image}
                      alt={slide.imageAlt}
                      referrerPolicy="no-referrer"
                      loading="eager"
                      draggable={false}
                      className={slide.imageClass}
                    />
                  </div>
                </div>

                {/* Editorial Copy & Single Primary CTA */}
                <div className="order-2 lg:order-1 lg:col-span-5 px-4 pt-3.5 pb-4 sm:px-6 sm:pt-4 sm:pb-5 lg:px-8 lg:py-7 flex flex-col justify-center gap-2.5 sm:gap-3 min-h-[164px] lg:min-h-0">
                  <p className="text-[11px] font-semibold tracking-wide text-[#7E4EF2]">
                    {slide.kicker}
                  </p>
                  <h1 className="text-xl sm:text-2xl xl:text-[32px] font-semibold text-[#211B2B] tracking-tight leading-[1.18] [text-wrap:balance]">
                    {slide.headline}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#4A4356] leading-relaxed max-w-md line-clamp-2">
                    {slide.copy}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      tabIndex={idx === activeIndex ? 0 : -1}
                      onClick={() => handleCta(slide.ctaAction)}
                      className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#9366FA] text-white text-xs sm:text-sm font-medium transition-colors min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A981FF] focus-visible:ring-offset-2"
                    >
                      <span>{slide.ctaLabel}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Controls Strip: Pagination Dots + Subtle Arrow Navigation (keeps artwork unobstructed) */}
        <div className="px-4 py-2.5 bg-white/95 border-t border-[#EAE6F0] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2" role="tablist" aria-label="Carousel slide selector">
            {SLIDES.map((slide, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Go to slide ${idx + 1}: ${slide.headline}`}
                  onClick={() => {
                    setIsPaused(true);
                    goToSlide(idx);
                  }}
                  className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A981FF] ${
                    active
                      ? 'w-7 bg-[#A981FF]'
                      : 'w-2 bg-[#D0BCFC] hover:bg-[#B796FE]'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => {
                setIsPaused(true);
                goToSlide(activeIndex - 1);
              }}
              className="w-8 h-8 rounded-full border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] text-[#211B2B] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A981FF]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => {
                setIsPaused(true);
                goToSlide(activeIndex + 1);
              }}
              className="w-8 h-8 rounded-full border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] text-[#211B2B] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A981FF]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
