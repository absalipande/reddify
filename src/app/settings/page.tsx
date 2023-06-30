import { redirect } from 'next/navigation';

import { UserNameForm } from '@/components/UserNameForm';
import { authOptions, getAuthSession } from '@/lib/auth';

export const metadata = {
  title: 'Settings',
  description: 'Manage account and website settings.',
};

export default async function SettingsPage() {
  
}
