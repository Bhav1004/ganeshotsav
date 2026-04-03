// api/receipt-number.js
// Vercel Serverless Function
// Called by frontend to generate next receipt number via Supabase RPC

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role for RPC
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { data, error } = await supabase.rpc('next_receipt_number')

  if (error) {
    console.error('receipt-number RPC error:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ receipt_no: data })
}
