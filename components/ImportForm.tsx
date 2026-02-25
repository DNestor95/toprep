'use client'

import { useState } from 'react'

export default function ImportForm() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setMessage('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setMessage('Please select a file to upload')
      return
    }

    setLoading(true)
    setMessage('')

    // TODO: Implement actual file upload logic
    // This would typically involve:
    // 1. Parsing the CSV file
    // 2. Validating the data
    // 3. Inserting into the database
    // 4. Showing progress/results

    try {
      // Simulated upload delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      setMessage('File uploaded successfully! Processing in background...')
      setFile(null)
      if (e.target instanceof HTMLFormElement) {
        e.target.reset()
      }
    } catch (error) {
      setMessage('Error uploading file. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
          Choose CSV File
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">CSV up to 10MB</p>
          </div>
        </div>
        {file && (
          <div className="mt-2">
            <p className="text-sm text-gray-700">Selected: {file.name}</p>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-md ${
          message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          <p className="text-sm">{message}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={!file || loading}
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : 'Upload CSV'}
        </button>
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Download Template
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium">CSV Format Requirements:</p>
        <ul className="mt-1 list-disc list-inside space-y-1">
          <li>customer_name (required)</li>
          <li>deal_amount (required, numeric)</li>
          <li>gross_profit (optional, numeric)</li>
          <li>status (lead, qualified, proposal, negotiation, closed_won, closed_lost)</li>
          <li>source (optional)</li>
          <li>close_date (optional, YYYY-MM-DD format)</li>
        </ul>
      </div>
    </form>
  )
}