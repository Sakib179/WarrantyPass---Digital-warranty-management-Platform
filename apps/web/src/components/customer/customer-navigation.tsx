import {
  CreditCard,
  FolderLock,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  WalletCards,
} from 'lucide-react';

export const customerNavigation = [
  { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard aria-hidden="true" size={19} /> },
  {
    label: 'My products',
    href: '/dashboard/products',
    icon: <Package aria-hidden="true" size={19} />,
  },
  {
    label: 'Warranty wallet',
    href: '/dashboard/warranties',
    icon: <WalletCards aria-hidden="true" size={19} />,
  },
  {
    label: 'Manual warranty vault',
    href: '/dashboard/manual-vault',
    icon: <FolderLock aria-hidden="true" size={19} />,
  },
  {
    label: 'Warranty claims',
    href: '/dashboard/claims',
    icon: <Shield aria-hidden="true" size={19} />,
  },
  {
    label: 'Subscription',
    href: '/dashboard/subscription',
    icon: <CreditCard aria-hidden="true" size={19} />,
  },
  {
    label: 'Account settings',
    href: '/account/profile',
    icon: <Settings aria-hidden="true" size={19} />,
  },
  { label: 'Security', href: '/account/security', icon: <Shield aria-hidden="true" size={19} /> },
];
