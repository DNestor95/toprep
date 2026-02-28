import { redirect } from 'next/navigation'

export default async function ManagerPersonalAnalyticsRedirect() {
  redirect('/analytics?mode=personal')
}
