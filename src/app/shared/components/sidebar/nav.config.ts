export type NavAudience = 'all' | 'super' | 'city';

export interface NavItem {
  readonly id: string;
  readonly labelKey: string;
  readonly route?: string;
  readonly svgPath: string;
  readonly audience?: NavAudience;
  readonly children?: readonly NavItem[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'home',
    labelKey: 'nav.home',
    route: '/home',
    audience: 'all',
    svgPath:
      '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
  },
  {
    id: 'geography',
    labelKey: 'nav.geography',
    audience: 'super',
    svgPath:
      '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>',
    children: [
      {
        id: 'governorates',
        labelKey: 'nav.governorates',
        route: '/governorates',
        svgPath: '<circle cx="12" cy="12" r="10"></circle>',
      },
      {
        id: 'cities',
        labelKey: 'nav.cities',
        route: '/cities',
        svgPath: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>',
      },
      {
        id: 'zones',
        labelKey: 'nav.zones',
        route: '/zones',
        svgPath: '<polygon points="3 11 11 3 21 8 17 21 7 21 3 11"></polygon>',
      },
    ],
  },
  {
    id: 'city-admins',
    labelKey: 'nav.cityAdmins',
    audience: 'super',
    route: '/city-admins',
    svgPath:
      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>',
  },
  {
    id: 'pricing',
    labelKey: 'nav.pricing',
    audience: 'super',
    svgPath:
      '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
    children: [
      {
        id: 'delivery-pricing',
        labelKey: 'nav.deliveryPricing',
        route: '/delivery-pricing',
        svgPath:
          '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
      },
      {
        id: 'driver-pricing',
        labelKey: 'nav.driverPricing',
        route: '/driver-pricing',
        svgPath: '<circle cx="12" cy="12" r="10"></circle>',
      },
    ],
  },
  {
    id: 'orders',
    labelKey: 'nav.orders',
    svgPath:
      '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>',
    children: [
      {
        id: 'orders-list',
        labelKey: 'nav.ordersList',
        route: '/orders',
        svgPath:
          '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>',
      },
      {
        id: 'orders-stats',
        labelKey: 'nav.ordersStats',
        route: '/orders-stats',
        svgPath:
          '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
      },
    ],
  },
  {
    id: 'delegates',
    labelKey: 'nav.delegates',
    svgPath:
      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    children: [
      {
        id: 'delegates-active',
        labelKey: 'nav.delegatesActive',
        route: '/delegates',
        svgPath:
          '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>',
      },
    ],
  },
  {
    id: 'products',
    labelKey: 'nav.products',
    svgPath:
      '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>',
    children: [
      {
        id: 'products-list',
        labelKey: 'nav.productsList',
        route: '/products',
        svgPath:
          '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>',
      },
    ],
  },
  {
    id: 'mobile',
    labelKey: 'nav.mobile',
    svgPath:
      '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>',
    children: [
      {
        id: 'mobile-overview',
        labelKey: 'nav.mobileOverview',
        route: '/mobile-overview',
        svgPath:
          '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
      },
      {
        id: 'mobile-builder',
        labelKey: 'nav.mobileBuilder',
        route: '/mobile-builder',
        svgPath:
          '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
      },
    ],
  },
  {
    id: 'drivers',
    labelKey: 'nav.drivers',
    svgPath:
      '<circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon>',
    children: [
      {
        id: 'drivers-active',
        labelKey: 'nav.driversActive',
        route: '/drivers',
        svgPath: '<circle cx="12" cy="12" r="10"></circle>',
      },
      {
        id: 'drivers-credit',
        labelKey: 'nav.driversCredit',
        route: '/drivers-credit',
        svgPath: '<rect x="2" y="6" width="20" height="12" rx="2"></rect>',
      },
      {
        id: 'drivers-credit-history',
        labelKey: 'nav.driversCreditHistory',
        route: '/drivers-credit-history',
        svgPath: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
      },
      {
        id: 'drivers-outside',
        labelKey: 'nav.driversOutside',
        route: '/drivers-outside-orders',
        svgPath: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>',
      },
      {
        id: 'drivers-requests',
        labelKey: 'nav.driversRequests',
        route: '/drivers-requests',
        svgPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>',
      },
      {
        id: 'drivers-join',
        labelKey: 'nav.driversJoin',
        route: '/drivers-join-requests',
        svgPath:
          '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line>',
      },
    ],
  },
  {
    id: 'merchants',
    labelKey: 'nav.merchants',
    svgPath:
      '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
    children: [
      {
        id: 'merchants-list',
        labelKey: 'nav.merchantsList',
        route: '/merchants',
        svgPath: '<circle cx="12" cy="7" r="4"></circle>',
      },
    ],
  },
  {
    id: 'customers',
    labelKey: 'nav.customers',
    svgPath:
      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>',
    children: [
      {
        id: 'customers-active',
        labelKey: 'nav.customersActive',
        route: '/customers',
        svgPath: '<circle cx="9" cy="7" r="4"></circle>',
      },
      {
        id: 'customers-deleted',
        labelKey: 'nav.customersDeleted',
        route: '/customers-deleted',
        svgPath:
          '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
      },
      {
        id: 'customers-otp',
        labelKey: 'nav.customersOtp',
        route: '/customers-otp',
        svgPath:
          '<rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
      },
      {
        id: 'customers-forget',
        labelKey: 'nav.customersForget',
        route: '/customers-forget',
        svgPath:
          '<circle cx="12" cy="12" r="10"></circle><path d="M12 8v4"></path><line x1="12" y1="16" x2="12.01" y2="16"></line>',
      },
    ],
  },
  {
    id: 'stores-super',
    labelKey: 'nav.stores',
    audience: 'super',
    route: '/stores',
    svgPath:
      '<path d="M3 9l2-5h14l2 5"></path><path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"></path><path d="M10 21V12h4v9"></path>',
  },
  {
    id: 'stores',
    labelKey: 'nav.stores',
    svgPath:
      '<path d="M3 9l2-5h14l2 5"></path><path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"></path><path d="M10 21V12h4v9"></path>',
    children: [
      {
        id: 'stores-active',
        labelKey: 'nav.storesActive',
        route: '/stores',
        svgPath: '<path d="M3 9l2-5h14l2 5"></path>',
      },
      {
        id: 'stores-percentage',
        labelKey: 'nav.storesPercentage',
        route: '/stores-percentage',
        svgPath:
          '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>',
      },
    ],
  },
  {
    id: 'notifications',
    labelKey: 'nav.notifications',
    svgPath:
      '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>',
    children: [
      {
        id: 'notifications-all',
        labelKey: 'nav.notificationsAll',
        route: '/notifications',
        svgPath: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>',
      },
    ],
  },
  {
    id: 'categories-super',
    labelKey: 'nav.categories',
    audience: 'super',
    svgPath: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
    children: [
      {
        id: 'main-categories',
        labelKey: 'nav.categoriesMain',
        route: '/main-categories',
        svgPath: '<rect x="3" y="3" width="7" height="7"></rect>',
      },
      {
        id: 'subcategories-super',
        labelKey: 'nav.categoriesSub',
        route: '/subcategories',
        svgPath: '<rect x="14" y="14" width="7" height="7"></rect>',
      },
    ],
  },
  {
    id: 'categories-city',
    labelKey: 'nav.categories',
    svgPath:
      '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
    children: [
      {
        id: 'categories-sub',
        labelKey: 'nav.categoriesSub',
        route: '/categories-sub',
        svgPath: '<rect x="14" y="14" width="7" height="7"></rect>',
      },
    ],
  },
  {
    id: 'brands',
    labelKey: 'nav.brands',
    svgPath:
      '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>',
    children: [
      {
        id: 'brands-list',
        labelKey: 'nav.brandsList',
        route: '/brands',
        svgPath:
          '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>',
      },
    ],
  },
  {
    id: 'ads',
    labelKey: 'nav.ads',
    svgPath:
      '<rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 3l-4 4-4-4"></path>',
    children: [
      {
        id: 'ads-list',
        labelKey: 'nav.adsList',
        route: '/ads',
        svgPath: '<rect x="2" y="7" width="20" height="14" rx="2"></rect>',
      },
    ],
  },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    svgPath:
      '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
    children: [
      {
        id: 'settings-list',
        labelKey: 'nav.settingsList',
        route: '/settings',
        svgPath: '<circle cx="12" cy="12" r="3"></circle>',
      },
      {
        id: 'app-version',
        labelKey: 'nav.appVersion',
        route: '/app-version',
        svgPath: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>',
      },
    ],
  },
  {
    id: 'pages',
    labelKey: 'nav.pages',
    svgPath:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
    children: [
      {
        id: 'pages-list',
        labelKey: 'nav.pagesList',
        route: '/pages',
        svgPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>',
      },
    ],
  },
  {
    id: 'users',
    labelKey: 'nav.users',
    svgPath:
      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>',
    children: [
      {
        id: 'users-list',
        labelKey: 'nav.usersList',
        route: '/users',
        svgPath: '<circle cx="9" cy="7" r="4"></circle>',
      },
    ],
  },
  {
    id: 'wallets',
    labelKey: 'nav.wallets',
    svgPath:
      '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
    children: [
      {
        id: 'wallets-overview',
        labelKey: 'nav.walletsOverview',
        route: '/wallets-overview',
        svgPath:
          '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
      },
      {
        id: 'wallets-list',
        labelKey: 'nav.walletsList',
        route: '/wallets',
        svgPath: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>',
      },
      {
        id: 'wallets-transactions',
        labelKey: 'nav.walletsTransactions',
        route: '/wallets-transactions',
        svgPath:
          '<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>',
      },
      {
        id: 'wallets-settlements',
        labelKey: 'nav.walletsSettlements',
        route: '/wallets-settlements',
        svgPath:
          '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
      },
      {
        id: 'wallets-handovers',
        labelKey: 'nav.walletsHandovers',
        route: '/wallets-handovers',
        svgPath:
          '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>',
      },
      {
        id: 'wallets-compensations',
        labelKey: 'nav.walletsCompensations',
        route: '/wallets-compensations',
        svgPath:
          '<polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>',
      },
      {
        id: 'wallets-internal',
        labelKey: 'nav.walletsInternal',
        route: '/wallets-internal',
        svgPath:
          '<rect x="3" y="10" width="18" height="11" rx="2"></rect><path d="M7 10V7a5 5 0 0 1 10 0v3"></path>',
      },
    ],
  },
];
