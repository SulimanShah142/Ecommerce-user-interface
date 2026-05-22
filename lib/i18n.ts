export type Locale = 'en' | 'fa' | 'ps';

export const LANGUAGES: { code: Locale; label: string; direction: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', direction: 'ltr' },
  { code: 'fa', label: 'Dari', direction: 'rtl' },
  { code: 'ps', label: 'Pashto', direction: 'rtl' },
];

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: {
    // Navigation Tabs & Headers
    home: 'Home',
    categories: 'Categories',
    products: 'Products',
    cart: 'Cart',
    chat: 'Chat',
    settings: 'Settings',
    flashSale: 'FLASH SALE',
    seeAll: 'See All',
    justForYou: 'Just For You',
    customerSupport: 'Customer Support',
    supportSubtitle: 'Live support for help and returns',
    browseCategories: 'Browse all categories',
    browseProducts: 'Browse Products',
    itemsFound: 'items found',
    loading: 'Loading...',
    send: 'Save',
    save: 'Save',
    error: 'Error',
    success: 'Success',

    // Core Input Form Fields & Labels
    name: 'Name',
    fullName: 'Full Name',
    email: 'Email Address',
    phone: 'Phone',
    phoneNumber: 'Phone Number',
    address: 'Street Address',
    shippingAddress: 'Shipping Address',
    appLanguage: 'App Language',
    editProfile: 'Edit Profile',
    password: 'Password',

    // Authentication Screens
    createAccount: 'CREATE AN ACCOUNT',
    signUpSubtitle: 'Sign up to start shopping your favorite trends.',
    welcomeBack: 'WELCOME BACK',
    enterNamePlaceholder: 'Enter your name',
    enterEmailPlaceholder: 'Enter your email',
    passwordPlaceholder: '••••••••',
    phonePlaceholder: '+93 7XX XXX XXX',
    register: 'REGISTER',
    signIn: 'SIGN IN',
    alreadyHaveAccount: 'Already have an account? ',
    newToBrandGallery: 'New to Brand Gallery? ',
    registerNow: 'REGISTER NOW',
    forgotPassword: 'Forgot Password?',
    otpLoginTitle: 'OTP SECURE LOGIN',
    otpSubtitle: 'Enter your phone number to receive a temporary login code.',
    getOtpCode: 'GET CODE',
    enterOtpCode: 'ENTER SECURITY CODE',
    verifyAndLogin: 'VERIFY & LOGIN',

    // Orders & Order Tracking ID Pages
    orderDetails: 'Order Details',
    orderId: 'Order ID',
    orderSummary: 'Order Summary',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    free: 'FREE',
    grandTotal: 'Grand Total',
    totalPaid: 'Total Paid',
    items: 'Items',
    cargoItems: 'Cargo Items',
    noOrdersFound: 'No orders found yet.',

    // Interactive Logistics Step Trackers
    status: 'Status',
    placed: 'Placed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    pending: 'Pending',
    confirmed: 'Confirmed',
    pickedUp: 'Picked Up',
    liveTracking: 'Live Tracking',
    taskCompleted: 'Task Completed',

    // Fleet & Operational Manifest System
    recipient: 'Recipient',
    customerManifest: 'Customer Manifest',
    resolvingAddress: 'Resolving address...',
    addressNotFound: 'Street Address Not Found',
    addressUnavailable: 'Address details unavailable offline',
    pickUpFromWarehouse: 'Pick Up From Warehouse',
    confirmDelivery: 'Confirm Delivery',
    statusUpdateSuccess: 'Status updated successfully',
    failedStatusUpdate: 'Update failed. Check your internet connection.',
    orderNotFound: 'Order not found',
    logisticsTracker: 'Logistics Progress Tracker',
    orderEntry: 'Order Entry',
    fleetMap: 'Real-Time Fleet Position Map',
    confirmManifestOrder: 'Confirm Manifest Order',
    totalAccountPaid: 'Total Account Paid',

    // Chat Component Systems
    noCategories: 'No categories found.',
    noProducts: 'No products available.',
    noProductsInCategory: 'No products in this category.',
    noMessages: 'No messages yet. Send one to start a chat.',
    typeMessage: 'Type a message...',
    yourCart: 'Your Cart',
    total: 'Total',
    proceedCheckout: 'Proceed to Checkout',
    addedToCart: 'Added to cart',
    addToCart: 'Add to Cart',
    online: 'Online',
    offline: 'Offline',
    chatSupport: 'Chat Support',
    emptyCart: 'Your cart is empty',
    productAdded: 'Product updated successfully.'
  },
  fa: {
    // Navigation Tabs & Headers
    home: 'خانه',
    categories: 'دسته‌بندی‌ها',
    products: 'محصولات',
    cart: 'سبد خرید',
    chat: 'چت',
    settings: 'تنظیمات',
    flashSale: 'فروش ویژه',
    seeAll: 'نمایش همه',
    justForYou: 'فقط برای شما',
    customerSupport: 'پشتیبانی مشتری',
    supportSubtitle: 'پشتیبانی زنده برای کمک و بازگشت',
    browseCategories: 'تمام دسته‌ها را مرور کنید',
    browseProducts: 'محصولات را مرور کنید',
    itemsFound: 'محصول یافت شد',
    loading: 'در حال بارگیری...',
    send: 'ذخیره',
    save: 'ذخیره',
    error: 'خطا',
    success: 'موفقیت',

    // Core Input Form Fields & Labels
    name: 'نام',
    fullName: 'نام کامل',
    email: 'آدرس ایمیل',
    phone: 'تلفن',
    phoneNumber: 'شماره تلفن',
    address: 'آدرس سرک',
    shippingAddress: 'آدرس ارسال',
    appLanguage: 'زبان برنامه',
    editProfile: 'ویرایش پروفایل',
    password: 'رمز عبور',

    // Authentication Screens
    createAccount: 'ایجاد حساب کاربری',
    signUpSubtitle: 'برای شروع خرید لباس‌های مورد علاقه خود ثبت نام کنید.',
    welcomeBack: 'خوش آمدید',
    enterNamePlaceholder: 'نام خود را وارد کنید',
    enterEmailPlaceholder: 'ایمیل خود را وارد کنید',
    passwordPlaceholder: '••••••••',
    phonePlaceholder: '۰۷X XXX XXXX',
    register: 'ثبت نام',
    signIn: 'ورود به حساب',
    alreadyHaveAccount: 'قبلاً حساب کاربری ساخته‌اید؟ ',
    newToBrandGallery: 'تازه وارد هستید؟ ',
    registerNow: 'اکنون ثبت نام کنید',
    forgotPassword: 'رمز عبور را فراموش کرده‌اید؟',
    otpLoginTitle: 'ورود امن با رمز یکبار مصرف',
    otpSubtitle: 'شماره تلفن خود را وارد کنید تا کد ورود موقت برای شما ارسال شود.',
    getOtpCode: 'دریافت کد',
    enterOtpCode: 'کد امنیتی را وارد کنید',
    verifyAndLogin: 'تایید و ورود',

    // Orders & Order Tracking ID Pages
    orderDetails: 'جزییات سفارش',
    orderId: 'آیدی سفارش',
    orderSummary: 'خلاصه سفارش',
    subtotal: 'قیمت فرعی',
    shipping: 'ارسال بار',
    free: 'رایگان',
    grandTotal: 'مجموع کلی',
    totalPaid: 'مجموع پرداخت شده',
    items: 'اقلام',
    cargoItems: 'محموله بار',
    noOrdersFound: 'هنوز هیچ سفارشی یافت نشد.',

    // Interactive Logistics Step Trackers
    status: 'وضعیت',
    placed: 'ثبت شده',
    shipped: 'ارسال شده',
    delivered: 'تحویل داده شده',
    pending: 'در انتظار',
    confirmed: 'تایید شده',
    pickedUp: 'برداشته شد',
    liveTracking: 'ردیابی زنده',
    taskCompleted: 'وظیفه انجام شد',

    // Fleet & Operational Manifest System
    recipient: 'گیرنده',
    customerManifest: 'منیفست مشتری',
    resolvingAddress: 'در حال پیدا کردن آدرس...',
    addressNotFound: 'آدرس سرک پیدا نشد',
    addressUnavailable: 'جزئیات آدرس آفلاین در دسترس نیست',
    pickUpFromWarehouse: 'دریافت از گدام',
    confirmDelivery: 'تایید تحویل بار',
    statusUpdateSuccess: 'وضعیت با موفقیت بروزرسانی شد',
    failedStatusUpdate: 'بروزرسانی ناموفق بود. انترنت خود را بررسی کنید.',
    orderNotFound: 'سفارش پیدا نشد',
    logisticsTracker: 'سیستم ردیابی پیشرفت لوژستیک',
    orderEntry: 'ورودی سفارش',
    fleetMap: 'نقشه موقعیت فعلی موترها',
    confirmManifestOrder: 'تایید نهایی سفارش',
    totalAccountPaid: 'کل مبلغ پرداخت شده',

    // Chat Component Systems
    noCategories: 'هیچ دسته‌ای پیدا نشد.',
    noProducts: 'محصولی موجود نیست.',
    noProductsInCategory: 'محصولی در این دسته موجود نیست.',
    noMessages: 'هنوز پیامی نیست. ارسال کنید تا چت شروع شود.',
    typeMessage: 'پیام خود را بنویسید...',
    yourCart: 'سبد خرید شما',
    total: 'مجموع',
    proceedCheckout: 'ادامه به پرداخت',
    addedToCart: 'به سبد اضافه شد',
    addToCart: 'افزودن به سبد',
    online: 'آنلاین',
    offline: 'آفلاین',
    chatSupport: 'پشتیبانی چت',
    emptyCart: 'سبد خرید شما خالی است',
    productAdded: 'مشخصات با موفقیت بروزرسانی شد.'
  },
  ps: {
    // Navigation Tabs & Headers
    home: 'کور',
    categories: 'کتګورۍ',
    products: 'محصولات',
    cart: 'ټاکڼی',
    chat: 'چټ',
    settings: 'تنظیمات',
    flashSale: 'فلاش سېل',
    seeAll: 'ټول وګورئ',
    justForYou: 'ستاسو لپاره',
    customerSupport: 'د پیرودونکي ملاتړ',
    supportSubtitle: 'د مرستې او راستنیدو لپاره ژوندی ملاتړ',
    browseCategories: 'ټولې کتګورۍ وګورئ',
    browseProducts: 'محصولات وپلټئ',
    itemsFound: 'محصوالت وموندل شول',
    loading: 'بارول...',
    send: 'خوندي کول',
    save: 'خوندي کول',
    error: 'تېروتنه',
    success: 'بریالیتوب',

    // Core Input Form Fields & Labels
    name: 'نوم',
    fullName: 'بشپړ نوم',
    email: 'د بریښنالیک پته',
    phone: 'تلیفون',
    phoneNumber: 'د تلیفون شمیره',
    address: 'د سړک پته',
    shippingAddress: 'د لیږد پته',
    appLanguage: 'د اپلیکیشن ژبه',
    editProfile: 'پروفایل سمول',
    password: 'تېرنوی / پټ نوم',

    // Authentication Screens
    createAccount: 'حساب جوړ کړئ',
    signUpSubtitle: 'خپل د خوښې کالیو پیرلو لپاره همدا اوس راجستر شئ.',
    welcomeBack: 'ښه راغلاست',
    enterNamePlaceholder: 'خپل نوم ولیکئ',
    enterEmailPlaceholder: 'خپل بریښنالیک ولیکئ',
    passwordPlaceholder: '••••••••',
    phonePlaceholder: '۰۷X XXX XXXX',
    register: 'راجستر کول',
    signIn: 'ننوتل',
    alreadyHaveAccount: 'مخکې له مخکې حساب لرئ؟ ',
    newToBrandGallery: 'په سېسټم کې نوي یاست؟ ',
    registerNow: 'همدا اوس حساب جوړ کړئ',
    forgotPassword: 'پټ نوم هیر شوی دی؟',
    otpLoginTitle: 'یو ځل کوډ له لارې خوندي ننوتل',
    otpSubtitle: 'خپل د تلیفون شمیره ولیکئ ترڅو تاسو ته یو ځل کاریدونکی کوډ واستول شي.',
    getOtpCode: 'کوډ ترلاسه کړئ',
    enterOtpCode: 'امنیتي کوډ ولیکئ',
    verifyAndLogin: 'تایید او ننوتل',

    // Orders & Order Tracking ID Pages
    orderDetails: 'د سفارش جزییات',
    orderId: 'د سفارش آیدي',
    orderSummary: 'د سفارش خلاصه',
    subtotal: 'فرعي قیمت',
    shipping: 'د بار لیږدونه',
    free: 'وړیا',
    grandTotal: 'ټول مالي مجموعه',
    totalPaid: 'ټول تادیه شوي پیسې',
    items: 'توکي',
    cargoItems: 'د بار محموله',
    noOrdersFound: 'تر اوسه هیڅ سفارش ندی موندل شوی.',

    // Interactive Logistics Step Trackers
    status: 'بڼه',
    placed: 'ثبت شو',
    shipped: 'لیږل شوی',
    delivered: 'تسلیم شو',
    pending: 'په تمه دی',
    confirmed: 'تایید شو',
    pickedUp: 'پورته شو',
    liveTracking: 'ژوندی تعقیب',
    taskCompleted: 'دنده ترسره شوه',

    // Fleet & Operational Manifest System
    recipient: 'ترلاسه کوونکی',
    customerManifest: 'د پیریدونکي منیفست',
    resolvingAddress: 'د پته د موندلو په حال کې...',
    addressNotFound: 'د سرک پته ونه موندل شوه',
    addressUnavailable: 'د پتې آنلاین توضیحات شتون نلري',
    pickUpFromWarehouse: 'له ګدام څخه اخیستل',
    confirmDelivery: 'د بار تسلیمي تایید کړئ',
    statusUpdateSuccess: 'حالت په بریالیتوب سره نوی شو',
    failedStatusUpdate: 'د حالت په نوي کولو کې تېروتنه. انټرنیټ وګورئ.',
    orderNotFound: 'سفارش ونه موندل شو',
    logisticsTracker: 'د لوژستیک پرمختګ تعقیبونکی',
    orderEntry: 'د سفارش ننوتل',
    fleetMap: 'د موټرو د اوسني موقعیت نقشه',
    confirmManifestOrder: 'د سفارش وروستی تایید',
    totalAccountPaid: 'ټولې ورکړل شوې پیسې',

    // Chat Component Systems
    noCategories: 'هیڅ کتګوري ونه موندل شوه.',
    noProducts: 'هیڅ محصول شتون نلري.',
    noProductsInCategory: 'په دې کتګورۍ کې هیڅ محصول نشته.',
    noMessages: 'تر اوسه هیڅ پیغام نشته. یو ولیږئ.',
    typeMessage: 'پیغام ولیکئ...',
    yourCart: 'ستاسو ټاکڼی',
    total: 'ټول',
    proceedCheckout: 'د تادیې لپاره ادامه',
    addedToCart: 'ټاکڼی ته اضافه شو',
    addToCart: 'ټوګه کړئ',
    online: 'آنلاین',
    offline: 'آفلاین',
    chatSupport: 'چټ ملاتړ',
    emptyCart: 'ستاسو ټاکڼی خالي دی',
    productAdded: 'معلومات په بریالیتوب سره نوي شول.'
  } // Fixed syntax closure: changed '}}' to '}'
};

// 🎯 CRASH PROTECTION: Automatically cleans up and reads out missing keys safely
export function translate(locale: Locale, key: string) {
  if (TRANSLATIONS[locale]?.[key]) {
    return TRANSLATIONS[locale][key];
  }
  
  if (TRANSLATIONS.en[key]) {
    return TRANSLATIONS.en[key];
  }

  const cleanFallback = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
    
  return cleanFallback;
}

export function isRTL(locale: Locale) {
  return locale !== 'en';
}
