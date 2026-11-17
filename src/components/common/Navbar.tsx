import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  User,
  Compass,
  MessageSquare,
  Store,
  ShieldCheck,
  LayoutGrid,
  Package,
  ClipboardList,
  MoreHorizontal,
  X,
  CreditCard,
  Tag,
  Star,
  Megaphone,
  FileCheck,
  Settings,
  LogOut,
  ChevronDown,
  Activity,
  Bell,
  CheckCheck,
} from 'lucide-react';
import { AppNotification, CategoryConfig, DemoRole } from '../../types/marketplace';
import { Logo } from './Logo';

export type VendorNavTab =
  | 'overview'
  | 'products'
  | 'orders'
  | 'messages'
  | 'activity'
  | 'storefront'
  | 'promotions'
  | 'reviews'
  | 'marketing'
  | 'holds'
  | 'warranties'
  | 'evidence'
  | 'settings';

interface NavbarProps {
  currentRole: DemoRole;
  activeView: string;
  customerSubScreen?: string;
  isCartOpen?: boolean;
  onNavigate: (view: string, extra?: any) => void;
  activeCategories: CategoryConfig[];
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSearchOverlay?: () => void;
  onOpenProtectionModal: () => void;
  onOpenHowItWorksModal: () => void;
  onOpenInspectionEducationModal?: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register', contextMessage?: string) => void;
  onSignOut?: () => void;
  notifications?: AppNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onNotificationClick?: (notif: AppNotification) => void;
  unreadMessagesCount: number;
  vendorTab?: VendorNavTab;
  onSelectVendorTab?: (tab: VendorNavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  activeView,
  customerSubScreen = 'overview',
  isCartOpen = false,
  onNavigate,
  activeCategories,
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  onOpenSearchOverlay,
  onOpenProtectionModal,
  onOpenAuthModal,
  onSignOut,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onNotificationClick,
  unreadMessagesCount,
  vendorTab = 'overview',
  onSelectVendorTab,
}) => {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [vendorMoreOpen, setVendorMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const roleNotifications = notifications.filter((n) => {
    if (!n.recipientRole) return true;
    if (currentRole === 'admin') return n.recipientRole === 'admin';
    if (currentRole === 'seller_approved' || currentRole === 'seller_pending') {
      return n.recipientRole === 'vendor';
    }
    return n.recipientRole === 'buyer';
  });
  const unreadNotificationsCount = roleNotifications.filter((n) => !n.read).length;

  const isApprovedVendor = currentRole === 'seller_approved';
  const isCategoryRoute = activeCategories.some((c) => c.id === activeView);

  const handleVendorTab = (tab: VendorNavTab) => {
    setVendorMoreOpen(false);
    if (onSelectVendorTab) {
      onSelectVendorTab(tab);
    }
    if (activeView !== 'seller_dashboard') {
      onNavigate('seller_dashboard');
    }
  };

  // Bottom navigation tab highlight exclusivity
  const activeMobileTab: 'home' | 'explore' | 'cart' | 'orders' | 'profile' = (() => {
    if (isCartOpen) return 'cart';
    if (activeView === 'order_details' || activeView === 'messages') return 'orders';
    if (activeView === 'profile' && customerSubScreen === 'orders') return 'orders';
    if (activeView === 'profile') return 'profile';
    if (
      activeView === 'explore' ||
      activeView === 'deals' ||
      isCategoryRoute ||
      activeView === 'vendors' ||
      activeView === 'vendor_storefront'
    ) {
      return 'explore';
    }
    return 'home';
  })();

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-[#EAE6F0]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
            {/* Logo */}
            <button
              type="button"
              onClick={() => onNavigate(isApprovedVendor ? 'seller_dashboard' : 'home')}
              className="flex items-center focus:outline-none text-left shrink-0 min-h-[44px]"
              aria-label="UsedRight Home"
            >
              <Logo size="sm" showTagline={false} />
            </button>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 min-w-[200px] xl:min-w-[260px] max-w-md mx-2">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#716B7B] pointer-events-none" />
                <input
                  type="text"
                  aria-label="Search marketplace products"
                  value={searchQuery}
                  onFocus={() => onOpenSearchOverlay?.()}
                  onClick={() => onOpenSearchOverlay?.()}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    onOpenSearchOverlay?.();
                  }}
                  placeholder="Search iPhone 13, MacBook Pro, Deals..."
                  className="w-full pl-10 pr-4 py-2 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-sm text-[#211B2B] placeholder-[#716B7B] focus:outline-none focus:border-[#A981FF] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav
              aria-label="Main navigation"
              className="hidden lg:flex items-center gap-4 whitespace-nowrap shrink-0"
            >
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className={`text-sm font-medium py-1.5 border-b-2 transition-colors ${
                  activeView === 'home'
                    ? 'border-[#A981FF] text-[#A981FF]'
                    : 'border-transparent text-[#211B2B] hover:text-[#A981FF]'
                }`}
              >
                Home
              </button>

              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className={`text-sm font-medium flex items-center gap-1 py-1.5 border-b-2 transition-colors ${
                  activeView === 'explore' || activeView === 'deals' || isCategoryRoute
                    ? 'border-[#A981FF] text-[#A981FF]'
                    : 'border-transparent text-[#211B2B] hover:text-[#A981FF]'
                }`}
              >
                <Compass className="w-4 h-4" />
                Explore
              </button>

              {/* Categories Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCategoriesOpen((prev) => !prev)}
                  className="text-sm font-medium flex items-center gap-1 py-1.5 text-[#211B2B] hover:text-[#A981FF]"
                >
                  Categories
                  <ChevronDown className="w-4 h-4" />
                </button>
                {categoriesOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl border border-[#EAE6F0] shadow-lg p-2 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoriesOpen(false);
                        onNavigate('deals');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between mb-1 ${
                        activeView === 'deals'
                          ? 'bg-[#A981FF] text-white'
                          : 'bg-[#F5F0FF] text-[#211B2B] hover:border-[#A981FF]'
                      }`}
                    >
                      <span>Latest Deals</span>
                      <span className="text-[10px] font-medium">Weekly Drops</span>
                    </button>
                    {activeCategories
                      .filter((c) => (c.id as string) !== 'other_tech')
                      .map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategoriesOpen(false);
                            onNavigate(cat.id);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                            activeView === cat.id
                              ? 'bg-[#F5F0FF] text-[#A981FF]'
                              : 'text-[#211B2B] hover:bg-[#FAF9FC]'
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span className="text-[11px] text-[#716B7B]">{cat.brands[0]}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onNavigate('vendors')}
                className={`text-sm font-medium flex items-center gap-1 py-1.5 border-b-2 transition-colors ${
                  activeView === 'vendors' || activeView === 'vendor_storefront'
                    ? 'border-[#A981FF] text-[#A981FF]'
                    : 'border-transparent text-[#211B2B] hover:text-[#A981FF]'
                }`}
              >
                <Store className="w-4 h-4" />
                Vendors
              </button>

              {currentRole === 'buyer' && (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate('profile', { subScreen: 'orders' })}
                    className={`text-sm font-medium py-1.5 border-b-2 transition-colors ${
                      (activeView === 'profile' && customerSubScreen === 'orders') ||
                      activeView === 'order_details'
                        ? 'border-[#A981FF] text-[#A981FF]'
                        : 'border-transparent text-[#211B2B] hover:text-[#A981FF]'
                    }`}
                  >
                    Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('profile', { subScreen: 'overview' })}
                    className={`text-sm font-medium py-1.5 border-b-2 transition-colors ${
                      activeView === 'profile' && customerSubScreen !== 'orders'
                        ? 'border-[#A981FF] text-[#A981FF]'
                        : 'border-transparent text-[#211B2B] hover:text-[#A981FF]'
                    }`}
                  >
                    Profile
                  </button>
                </>
              )}

              {(currentRole === 'seller_approved' || currentRole === 'seller_pending') && (
                <button
                  type="button"
                  onClick={() => onNavigate('seller_dashboard')}
                  className={`text-sm font-medium py-1.5 border-b-2 transition-colors ${
                    activeView === 'seller_dashboard'
                      ? 'border-[#A981FF] text-[#A981FF]'
                      : 'border-transparent text-[#211B2B] hover:text-[#A981FF]'
                  }`}
                >
                  Vendor Portal
                </button>
              )}

              {currentRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin_dashboard')}
                  className={`text-sm font-medium flex items-center gap-1 py-1.5 border-b-2 transition-colors ${
                    activeView === 'admin_dashboard'
                      ? 'border-[#A981FF] text-[#A981FF]'
                      : 'border-transparent text-[#211B2B] hover:text-[#A981FF]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#A981FF]" />
                  Support Console
                </button>
              )}

              {currentRole === 'visitor' && (
                <button
                  type="button"
                  onClick={onOpenProtectionModal}
                  className="text-sm font-medium text-[#716B7B] hover:text-[#A981FF] flex items-center gap-1"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Protection
                </button>
              )}
            </nav>

            {/* Right Actions: Search (mobile) + Notifications Bell (when logged in) + Cart */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                type="button"
                aria-label="Open live search"
                onClick={() => onOpenSearchOverlay?.()}
                className="md:hidden relative p-2 rounded-xl text-[#4A4356] hover:bg-[#FAF9FC] hover:text-[#A981FF] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <Search className="w-5 h-5" />
              </button>

              {currentRole !== 'visitor' && (
                <div className="relative">
                  <button
                    type="button"
                    aria-label={`Notifications${unreadNotificationsCount > 0 ? ` (${unreadNotificationsCount} unread)` : ''}`}
                    aria-expanded={notifOpen}
                    onClick={() => setNotifOpen((prev) => !prev)}
                    data-testid="notifications-bell-btn"
                    className="relative p-2 rounded-xl text-[#4A4356] hover:bg-[#FAF9FC] hover:text-[#A981FF] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadNotificationsCount > 0 && (
                      <span
                        data-testid="notifications-unread-badge"
                        className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#A981FF] text-white text-[10px] font-semibold flex items-center justify-center"
                      >
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div
                      role="dialog"
                      aria-label="Account notifications"
                      className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl border border-[#EAE6F0] shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-[#EAE6F0] bg-[#FAF9FC] flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-[#211B2B]">
                            Notifications ({roleNotifications.length})
                          </div>
                          <div className="text-[11px] text-[#716B7B]">
                            Order updates, Delivery Codes &amp; inspection alerts
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadNotificationsCount > 0 && onMarkAllNotificationsRead && (
                            <button
                              type="button"
                              onClick={() => onMarkAllNotificationsRead()}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#A981FF] hover:underline"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              Mark all read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setNotifOpen(false)}
                            aria-label="Close notifications"
                            className="p-1 rounded-lg text-[#716B7B] hover:bg-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-[#EAE6F0]">
                        {roleNotifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-[#716B7B]">
                            No notifications yet. Important order, dispatch, and verification alerts appear here.
                          </div>
                        ) : (
                          roleNotifications.slice(0, 12).map((notif) => (
                            <button
                              key={notif.id}
                              type="button"
                              onClick={() => {
                                onMarkNotificationRead?.(notif.id);
                                onNotificationClick?.(notif);
                                setNotifOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-2.5 ${
                                notif.read ? 'bg-white hover:bg-[#FAF9FC]' : 'bg-[#F5F0FF]/55 hover:bg-[#F5F0FF]'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                  notif.read ? 'bg-[#EAE6F0]' : 'bg-[#A981FF]'
                                }`}
                              />
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-[#211B2B] truncate">
                                    {notif.title}
                                  </span>
                                  <span className="text-[10px] text-[#716B7B] shrink-0">{notif.time}</span>
                                </div>
                                <p className="text-[11px] text-[#4A4356] leading-relaxed">
                                  {notif.message}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isApprovedVendor && currentRole !== 'admin' && (
                <button
                  type="button"
                  aria-label="Open cart"
                  onClick={onOpenCart}
                  className="relative p-2 rounded-xl text-[#4A4356] hover:bg-[#FAF9FC] hover:text-[#A981FF] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#A981FF] text-white text-[10px] font-medium flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* FLOATING PILL MOBILE BOTTOM NAVIGATION */}
      {isApprovedVendor ? (
        <nav
          aria-label="Vendor mobile navigation"
          className="md:hidden fixed bottom-3 left-4 right-4 z-50 rounded-full bg-white/95 backdrop-blur-md shadow-2xl border border-[#EAE6F0] py-2 px-4 flex items-center justify-around"
        >
          <button
            type="button"
            onClick={() => handleVendorTab('overview')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-full text-[10px] font-medium transition-all ${
              activeView === 'seller_dashboard' && vendorTab === 'overview'
                ? 'text-[#A981FF] bg-[#F5F0FF]'
                : 'text-[#716B7B]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" aria-hidden="true">
              <rect
                x="4"
                y="4"
                width="7"
                height="7"
                rx="2"
                fill={activeView === 'seller_dashboard' && vendorTab === 'overview' ? '#D0BCFC' : '#F2EFF7'}
                stroke={activeView === 'seller_dashboard' && vendorTab === 'overview' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.5"
              />
              <rect
                x="13"
                y="4"
                width="7"
                height="7"
                rx="2"
                fill={activeView === 'seller_dashboard' && vendorTab === 'overview' ? '#A981FF' : '#FFFFFF'}
                stroke={activeView === 'seller_dashboard' && vendorTab === 'overview' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.5"
              />
              <rect
                x="4"
                y="13"
                width="7"
                height="7"
                rx="2"
                fill={activeView === 'seller_dashboard' && vendorTab === 'overview' ? '#A981FF' : '#FFFFFF'}
                stroke={activeView === 'seller_dashboard' && vendorTab === 'overview' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.5"
              />
              <rect
                x="13"
                y="13"
                width="7"
                height="7"
                rx="2"
                fill={activeView === 'seller_dashboard' && vendorTab === 'overview' ? '#D0BCFC' : '#F2EFF7'}
                stroke={activeView === 'seller_dashboard' && vendorTab === 'overview' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.5"
              />
            </svg>
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => handleVendorTab('products')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-full text-[10px] font-medium transition-all ${
              activeView === 'seller_dashboard' && vendorTab === 'products'
                ? 'text-[#A981FF] bg-[#F5F0FF]'
                : 'text-[#716B7B]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" aria-hidden="true">
              <path
                d="M12 3.5L19.5 7.5v9L12 20.5 4.5 16.5v-9L12 3.5z"
                fill={activeView === 'seller_dashboard' && vendorTab === 'products' ? '#D0BCFC' : '#F2EFF7'}
                stroke={activeView === 'seller_dashboard' && vendorTab === 'products' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M4.5 7.5L12 11.5l7.5-4M12 11.5v9"
                stroke={activeView === 'seller_dashboard' && vendorTab === 'products' ? '#7E4EF2' : '#716B7B'}
                strokeWidth="1.4"
              />
            </svg>
            <span>Products</span>
          </button>
          <button
            type="button"
            onClick={() => handleVendorTab('orders')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-full text-[10px] font-medium transition-all ${
              activeView === 'seller_dashboard' && vendorTab === 'orders'
                ? 'text-[#A981FF] bg-[#F5F0FF]'
                : 'text-[#716B7B]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" aria-hidden="true">
              <rect
                x="5"
                y="4"
                width="14"
                height="16"
                rx="2.5"
                fill={activeView === 'seller_dashboard' && vendorTab === 'orders' ? '#D0BCFC' : '#F2EFF7'}
                stroke={activeView === 'seller_dashboard' && vendorTab === 'orders' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.5"
              />
              <path
                d="M8.5 9.5h7M8.5 13h7M8.5 16.5h4.5"
                stroke={activeView === 'seller_dashboard' && vendorTab === 'orders' ? '#7E4EF2' : '#716B7B'}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>Orders</span>
          </button>
          <button
            type="button"
            onClick={() => handleVendorTab('messages')}
            className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-full text-[10px] font-medium transition-all ${
              activeView === 'seller_dashboard' && vendorTab === 'messages'
                ? 'text-[#A981FF] bg-[#F5F0FF]'
                : 'text-[#716B7B]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" aria-hidden="true">
              <path
                d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16H9.5L5 19.5V6.5z"
                fill={activeView === 'seller_dashboard' && vendorTab === 'messages' ? '#D0BCFC' : '#F2EFF7'}
                stroke={activeView === 'seller_dashboard' && vendorTab === 'messages' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="9.5" cy="10" r="1" fill={activeView === 'seller_dashboard' && vendorTab === 'messages' ? '#7E4EF2' : '#716B7B'} />
              <circle cx="12.5" cy="10" r="1" fill={activeView === 'seller_dashboard' && vendorTab === 'messages' ? '#7E4EF2' : '#716B7B'} />
              <circle cx="15.5" cy="10" r="1" fill={activeView === 'seller_dashboard' && vendorTab === 'messages' ? '#7E4EF2' : '#716B7B'} />
            </svg>
            <span>Messages</span>
            {unreadMessagesCount > 0 && (
              <span className="absolute top-0.5 right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#A981FF] text-white text-[9px] font-semibold flex items-center justify-center shadow-sm">
                {unreadMessagesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setVendorMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-full text-[10px] font-medium text-[#716B7B]"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" fill="#F2EFF7" stroke="#716B7B" strokeWidth="1.5" />
              <circle cx="8.5" cy="12" r="1.2" fill="#716B7B" />
              <circle cx="12" cy="12" r="1.2" fill="#716B7B" />
              <circle cx="15.5" cy="12" r="1.2" fill="#716B7B" />
            </svg>
            <span>More</span>
          </button>
        </nav>
      ) : currentRole !== 'admin' && activeView !== 'product_details' ? (
        <nav
          aria-label="Customer mobile navigation"
          className="md:hidden fixed bottom-3 left-4 right-4 z-50 rounded-full bg-white/95 backdrop-blur-md shadow-2xl border border-[#EAE6F0] py-2 px-4 flex items-center justify-around"
        >
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-full text-[10px] font-medium transition-all ${
              activeMobileTab === 'home'
                ? 'text-[#A981FF] bg-[#F5F0FF]'
                : 'text-[#716B7B]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" aria-hidden="true">
              <path
                d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5z"
                fill={activeMobileTab === 'home' ? '#D0BCFC' : '#F2EFF7'}
                stroke={activeMobileTab === 'home' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <rect
                x="9.5"
                y="13"
                width="5"
                height="7.5"
                rx="1.2"
                fill={activeMobileTab === 'home' ? '#A981FF' : '#FFFFFF'}
                stroke={activeMobileTab === 'home' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.3"
              />
            </svg>
            <span>Home</span>
          </button>

          {/* 2. Explore */}
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-full text-[10px] font-medium transition-all ${
              activeMobileTab === 'explore'
                ? 'text-[#A981FF] bg-[#F5F0FF]'
                : 'text-[#716B7B]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="8.5"
                fill={activeMobileTab === 'explore' ? '#D0BCFC' : '#F2EFF7'}
                stroke={activeMobileTab === 'explore' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.6"
              />
              <polygon
                points="15.5,8.5 13.4,13.4 8.5,15.5 10.6,10.6"
                fill={activeMobileTab === 'explore' ? '#A981FF' : '#FFFFFF'}
                stroke={activeMobileTab === 'explore' ? '#7E4EF2' : '#716B7B'}
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            <span>Explore</span>
          </button>

          {/* 3. Cart */}
          <button
            type="button"
            onClick={onOpenCart}
            className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-full text-[10px] font-medium transition-all ${
              activeMobileTab === 'cart'
                ? 'text-[#A981FF] bg-[#F5F0FF]'
                : 'text-[#716B7B]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" aria-hidden="true">
              <path
                d="M4 5h2.2l1.6 8.2a1.5 1.5 0 0 0 1.5 1.2h7.6a1.5 1.5 0 0 0 1.4-1l1.7-5.4H7.1"
                fill={activeMobileTab === 'cart' ? '#D0BCFC' : '#F2EFF7'}
                stroke={activeMobileTab === 'cart' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="18.5" r="1.4" fill={activeMobileTab === 'cart' ? '#A981FF' : '#716B7B'} />
              <circle cx="16.5" cy="18.5" r="1.4" fill={activeMobileTab === 'cart' ? '#A981FF' : '#716B7B'} />
            </svg>
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#A981FF] text-white text-[9px] font-semibold flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {/* 4. Orders */}
          <button
            type="button"
            onClick={() => onNavigate('profile', { subScreen: 'orders' })}
            className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-full text-[10px] font-medium transition-all ${
              activeMobileTab === 'orders'
                ? 'text-[#A981FF] bg-[#F5F0FF]'
                : 'text-[#716B7B]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" aria-hidden="true">
              <path
                d="M12 3.5L19.5 7.5v9L12 20.5 4.5 16.5v-9L12 3.5z"
                fill={activeMobileTab === 'orders' ? '#D0BCFC' : '#F2EFF7'}
                stroke={activeMobileTab === 'orders' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M4.5 7.5L12 11.5l7.5-4M12 11.5v9"
                stroke={activeMobileTab === 'orders' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle
                cx="18.5"
                cy="6.5"
                r="2.4"
                fill="#238653"
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            </svg>
            <span>Orders</span>
          </button>

          {/* 5. Profile */}
          <button
            type="button"
            onClick={() => {
              if (currentRole === 'visitor') onOpenAuthModal('login');
              else if (currentRole === 'seller_pending') onNavigate('seller_dashboard');
              else onNavigate('profile', { subScreen: 'overview' });
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-full text-[10px] font-medium transition-all ${
              activeMobileTab === 'profile'
                ? 'text-[#A981FF] bg-[#F5F0FF]'
                : 'text-[#716B7B]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="8.5"
                fill={activeMobileTab === 'profile' ? '#D0BCFC' : '#F2EFF7'}
                stroke={activeMobileTab === 'profile' ? '#A981FF' : '#716B7B'}
                strokeWidth="1.5"
              />
              <circle
                cx="12"
                cy="9.5"
                r="2.8"
                fill={activeMobileTab === 'profile' ? '#A981FF' : '#FFFFFF'}
                stroke={activeMobileTab === 'profile' ? '#7E4EF2' : '#716B7B'}
                strokeWidth="1.2"
              />
              <path
                d="M7.5 17.5c.9-2.2 2.5-3.2 4.5-3.2s3.6 1 4.5 3.2"
                stroke={activeMobileTab === 'profile' ? '#7E4EF2' : '#716B7B'}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>Profile</span>
          </button>
        </nav>
      ) : null}

      {/* Vendor Mobile "More" Bottom Sheet */}
      {vendorMoreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More vendor tools"
          className="md:hidden fixed inset-0 z-50 bg-black/40 flex items-end"
        >
          <div className="bg-white w-full rounded-t-2xl p-5 border-t border-[#EAE6F0] max-h-[80vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE6F0]">
              <h3 className="text-sm font-semibold text-[#211B2B]">More Vendor Tools</h3>
              <button
                type="button"
                onClick={() => setVendorMoreOpen(false)}
                className="p-2 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
                aria-label="Close vendor menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'holds', label: 'Payments & Ledger', icon: CreditCard },
                { id: 'warranties', label: '3-Month Warranties', icon: ShieldCheck },
                { id: 'activity', label: 'Activity & History', icon: Activity },
                { id: 'promotions', label: 'Promotions', icon: Tag },
                { id: 'storefront', label: 'Storefront', icon: Store },
                { id: 'reviews', label: 'Reviews', icon: Star },
                { id: 'marketing', label: 'Marketing with UsedRight', icon: Megaphone },
                { id: 'evidence', label: 'Foreign-Use Proof', icon: FileCheck },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleVendorTab(item.id as VendorNavTab)}
                    className="flex items-center gap-2 p-3 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] text-left font-medium text-[#211B2B] min-h-[44px]"
                  >
                    <Icon className="w-4 h-4 text-[#A981FF] shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setVendorMoreOpen(false);
                    onSignOut();
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl border border-[#FED7D7] bg-[#FFF5F5] text-left font-medium text-[#D9534F] min-h-[44px]"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
