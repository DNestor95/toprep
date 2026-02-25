import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import ImportForm from '@/components/ImportForm'

export default async function Imports() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Check user role - only managers and admins can access imports
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (profile?.role === 'sales_rep') {
    redirect('/dashboard')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
          <p className="text-gray-600">Import data from CSV files or external systems</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">CSV Import</h3>
            <ImportForm />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import History</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">deals_2024_01.csv</p>
                  <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Success
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">leads_export.csv</p>
                  <p className="text-sm text-gray-500">{new Date(Date.now() - 86400000).toLocaleDateString()}</p>
                </div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  Partial
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">API Integration</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">eLeads Integration</h4>
                <p className="text-sm text-gray-500">Sync deals and activities automatically</p>
              </div>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                Configure
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">CRM Sync</h4>
                <p className="text-sm text-gray-500">Two-way sync with external CRM</p>
              </div>
              <button className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md">
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}