import supabase from './supabase'
import {
  BUILDINGS, WINGS, FLATS, DONATIONS, nextReceiptNo
} from './mockData'

const useMock = !import.meta.env.VITE_SUPABASE_URL

// ─── Buildings ────────────────────────────────────────────────────────────────
export async function getBuildings() {
  if (useMock) return { data: BUILDINGS, error: null }
  return supabase.from('buildings').select('*').order('name')
}

// ─── Wings ────────────────────────────────────────────────────────────────────
export async function getWings(buildingId) {
  if (useMock) {
    return {
      data: WINGS.filter(w => w.building_id === buildingId),
      error: null,
    }
  }
  return supabase
    .from('wings')
    .select('*')
    .eq('building_id', buildingId)
    .order('name')
}

// ─── Flats ────────────────────────────────────────────────────────────────────
export async function getFlats(wingId) {
  if (useMock) {
    return {
      data: FLATS.filter(f => f.wing_id === wingId),
      error: null,
    }
  }
  return supabase
    .from('flats')
    .select('*, donations(id, receipt_no, amount, donor_name, payment_mode, created_at)')
    .eq('wing_id', wingId)
    .order('floor')
    .order('flat_number')
}

export async function getFlatById(flatId) {
  if (useMock) {
    const flat = FLATS.find(f => f.id === flatId)
    return { data: flat, error: flat ? null : new Error('Not found') }
  }
  const { data, error } = await supabase
    .from('flats')
    .select('*, wings(name, buildings(name))')
    .eq('id', flatId)
    .single()
  return { data, error }
}

// ─── Donations ────────────────────────────────────────────────────────────────
export async function submitDonation(payload) {
  if (useMock) {
    const receiptNo = nextReceiptNo()
    const donation = {
      id:             crypto.randomUUID(),
      receipt_no:     receiptNo,
      created_at:     new Date().toISOString(),
      ...payload,
    }
    DONATIONS.push(donation)

    // Mark flat paid in mock store
    const flat = FLATS.find(f => f.id === payload.flat_id)
    if (flat) flat.status = 'paid'

    return { data: donation, error: null }
  }

  // 1. Generate receipt number via Supabase RPC
  const { data: receiptData, error: rpcError } = await supabase
    .rpc('next_receipt_number')
  if (rpcError) return { data: null, error: rpcError }

  const receiptNo = receiptData

  // 2. Insert donation
  const { data: donation, error: donErr } = await supabase
    .from('donations')
    .insert({ ...payload, receipt_no: receiptNo })
    .select()
    .single()
  if (donErr) return { data: null, error: donErr }

  // 3. Mark flat as paid
  await supabase
    .from('flats')
    .update({ status: 'paid' })
    .eq('id', payload.flat_id)

  return { data: donation, error: null }
}

export async function getDonationByReceiptNo(receiptNo) {
  if (useMock) {
    const d = DONATIONS.find(x => x.receipt_no === receiptNo)
    return { data: d || null, error: null }
  }
  return supabase
    .from('donations')
    .select('*, flats(flat_number, wings(name, buildings(name)))')
    .eq('receipt_no', receiptNo)
    .single()
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export async function getReportData() {
  if (useMock) {
    const totalDonations = DONATIONS.length
    const totalAmount    = DONATIONS.reduce((s, d) => s + Number(d.amount), 0)
    const cashTotal      = DONATIONS.filter(d => d.payment_mode === 'Cash')
      .reduce((s, d) => s + Number(d.amount), 0)
    const upiTotal       = DONATIONS.filter(d => d.payment_mode === 'UPI')
      .reduce((s, d) => s + Number(d.amount), 0)

    const byCollector = {}
    DONATIONS.forEach(d => {
      const k = d.collected_by || 'Unknown'
      if (!byCollector[k]) byCollector[k] = { name: k, count: 0, amount: 0 }
      byCollector[k].count++
      byCollector[k].amount += Number(d.amount)
    })

    const totalFlats = FLATS.length
    const paidFlats  = FLATS.filter(f => f.status === 'paid').length

    return {
      data: {
        totalDonations,
        totalAmount,
        cashTotal,
        upiTotal,
        byCollector: Object.values(byCollector),
        totalFlats,
        paidFlats,
        pendingFlats: totalFlats - paidFlats,
      },
      error: null,
    }
  }

  const [donRes, flatRes] = await Promise.all([
    supabase.from('donations').select('amount, payment_mode, collected_by'),
    supabase.from('flats').select('status'),
  ])

  if (donRes.error) return { data: null, error: donRes.error }

  const donations  = donRes.data || []
  const flats      = flatRes.data || []
  const totalAmount = donations.reduce((s, d) => s + Number(d.amount), 0)
  const cashTotal   = donations.filter(d => d.payment_mode === 'Cash')
    .reduce((s, d) => s + Number(d.amount), 0)
  const upiTotal    = donations.filter(d => d.payment_mode === 'UPI')
    .reduce((s, d) => s + Number(d.amount), 0)

  const byCollectorMap = {}
  donations.forEach(d => {
    const k = d.collected_by || 'Unknown'
    if (!byCollectorMap[k]) byCollectorMap[k] = { name: k, count: 0, amount: 0 }
    byCollectorMap[k].count++
    byCollectorMap[k].amount += Number(d.amount)
  })

  const paidFlats = flats.filter(f => f.status === 'paid').length

  return {
    data: {
      totalDonations: donations.length,
      totalAmount,
      cashTotal,
      upiTotal,
      byCollector:  Object.values(byCollectorMap),
      totalFlats:   flats.length,
      paidFlats,
      pendingFlats: flats.length - paidFlats,
    },
    error: null,
  }
}
