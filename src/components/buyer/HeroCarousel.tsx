import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

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
  bottomBlendClass: string;
  leftBlendClass: string;
  rightBlendClass: string;
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
    surfaceClass:
      'bg-gradient-to-b from-white via-[#FAF8F4] to-[#FAF8F4] lg:bg-gradient-to-r lg:from-[#FAF8F4] lg:via-white lg:to-white',
    artworkBgClass: 'bg-white',
    bottomBlendClass: 'from-white via-white/35 to-transparent',
    leftBlendClass: 'lg:from-white lg:via-white/35 lg:to-transparent',
    rightBlendClass: 'lg:from-white lg:via-white/40 lg:to-transparent',
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
    surfaceClass:
      'bg-gradient-to-b from-[#F5F0FF] via-[#FAF9FC] to-[#FAF8F4] lg:bg-gradient-to-r lg:from-[#FAF8F4] lg:via-[#F5F0FF] lg:to-[#E9DCFF]',
    artworkBgClass: 'bg-[#E9DCFF]',
    bottomBlendClass: 'from-[#F5F0FF] via-[#F5F0FF]/40 to-transparent',
    leftBlendClass: 'lg:from-[#F6F1FF] lg:via-[#F6F1FF]/45 lg:to-transparent',
    rightBlendClass: 'lg:from-[#E9DCFF] lg:via-[#E9DCFF]/45 lg:to-transparent',
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
    surfaceClass:
      'bg-gradient-to-b from-[#EDE6FF] via-[#FAF8F4] to-[#FAF8F4] lg:bg-gradient-to-r lg:from-[#FAF8F4] lg:via-[#F5F0FF] lg:to-[#EAE2FF]',
    artworkBgClass: 'bg-[#EAE2FF]',
    bottomBlendClass: 'from-[#FAF8F4] via-[#FAF8F4]/35 to-transparent',
    leftBlendClass: 'lg:from-[#F6F1FF] lg:via-[#F6F1FF]/40 lg:to-transparent',
    rightBlendClass: 'lg:from-[#EAE2FF] lg:via-[#EAE2FF]/45 lg:to-transparent',
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

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    // Ignore pointer starts on interactive buttons/links so clicks never get swallowed
    if ((e.target as HTMLElement)?.closest('button, a')) return;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    setIsPaused(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
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
      tabIndex={0}
      className="relative w-full overflow-hidden border-b border-[#EAE6F0]/90 bg-[#FAF8F4] select-none touch-pan-y focus:outline-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setIsPaused(true);
          goToSlide(activeIndex + 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setIsPaused(true);
          goToSlide(activeIndex - 1);
        }
      }}
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
            <div className="max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 lg:items-stretch lg:h-[348px] xl:h-[376px]">
              {/* Artwork Panel: Edge-to-edge 16:9 on mobile; seamless right showcase on desktop */}
              <div
                className={`order-1 lg:order-2 lg:col-span-7 relative w-full aspect-video lg:aspect-auto lg:h-full overflow-hidden ${slide.artworkBgClass}`}
              >
                <img
                  src={slide.image}
                  alt={slide.imageAlt}
                  referrerPolicy="no-referrer"
                  loading="eager"
                  draggable={false}
                  className="w-full h-full object-cover object-center"
                />
                {/* Soft edge blending so image dissolves naturally into surrounding copy surface */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t lg:hidden ${slide.bottomBlendClass}`}
                />
                <div
                  aria-hidden="true"
                  className={`pointer-events-none hidden lg:block absolute inset-y-0 left-0 w-20 bg-gradient-to-r ${slide.leftBlendClass}`}
                />
                <div
                  aria-hidden="true"
                  className={`pointer-events-none hidden lg:block absolute inset-y-0 right-0 w-20 bg-gradient-to-l ${slide.rightBlendClass}`}
                />
              </div>

              {/* Editorial Copy & Single Primary CTA with comfortable inner horizontal padding */}
              <div className="order-2 lg:order-1 lg:col-span-5 px-4 pt-3.5 pb-9 sm:px-6 sm:pt-4 sm:pb-10 lg:px-8 lg:py-8 flex flex-col justify-center gap-2 sm:gap-2.5">
                <p className="text-[11px] font-semibold tracking-wide text-[#7E4EF2]">
                  {slide.kicker}
                </p>
                <h1 className="text-[22px] sm:text-2xl xl:text-[32px] font-semibold text-[#211B2B] tracking-tight leading-[1.16] [text-wrap:balance]">
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

      {/* Understated Pagination Dots: centered on mobile, aligned under copy column on desktop */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2.5 lg:bottom-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center lg:justify-start">
          <div
            className="pointer-events-auto flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm"
            role="tablist"
            aria-label="Carousel slide selector"
          >
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
                className={`h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A981FF] ${
                  active
                    ? 'w-6 bg-[#A981FF]'
                    : 'w-1.5 bg-[#D0BCFC] hover:bg-[#B796FE]'
                }`}
              />
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
