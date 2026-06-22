import { getTranslations } from 'next-intl/server';

export default async function LoginPage() {
  const t = await getTranslations('auth.login');
  return <div>{t('title')}</div>;
}
