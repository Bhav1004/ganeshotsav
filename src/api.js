import supabase from './supabase'
import { BUILDINGS, WINGS, FLATS, DONATIONS, nextReceiptNo } from './mockData'

const useMock = !import.meta.env.VITE_SUPABASE_URL

// ─── Buildings ────────────────────────────────────────────────────────────────
export async function getBuildings(assignedIds = []) {
  if (useMock) {
    const data = assignedIds.length ? BUILDINGS.filter(b => assignedIds.includes(b.id)) : BUILDINGS
    return { data, error: null }
  }
  let q = supabase.from('buildings').select('*').order('name')
  if (assignedIds.length) q = q.in('id', assignedIds)
  return q
}

// ─── Wings ────────────────────────────────────────────────────────────────────
export async function getWings(buildingId) {
  if (useMock) return { data: WINGS.filter(w => w.building_id === buildingId), error: null }
  return supabase.from('wings').select('*').eq('building_id', buildingId).order('name')
}

// ─── Flats ────────────────────────────────────────────────────────────────────
export async function getFlats(wingId) {
  if (useMock) return { data: FLATS.filter(f => f.wing_id === wingId), error: null }
  return supabase
    .from('flats')
    .select('*, donations(id, receipt_no, amount, donor_name, payment_mode, created_at)')
    .eq('wing_id', wingId)
    .order('floor').order('flat_number')
}

export async function getFlatById(flatId) {
  if (useMock) {
    const flat = FLATS.find(f => f.id === flatId)
    return { data: flat, error: flat ? null : new Error('Not found') }
  }
  return supabase.from('flats')
    .select('*, wings(id, name, buildings(name))')
    .eq('id', flatId).single()
}

export async function getNextPendingFlat(wingId, currentFlatId) {
  if (useMock) {
    const wingFlats = FLATS
      .filter(f => f.wing_id === wingId && f.status === 'pending' && f.id !== currentFlatId)
      .sort((a, b) => a.floor - b.floor || a.flat_number.localeCompare(b.flat_number))
    return { data: wingFlats[0] || null, error: null }
  }
  const { data, error } = await supabase
    .from('flats')
    .select('id, flat_number, floor')
    .eq('wing_id', wingId)
    .eq('status', 'pending')
    .neq('id', currentFlatId)
    .order('floor').order('flat_number')
    .limit(1)
  return { data: data?.[0] || null, error }
}

export async function updateFlatNote(flatId, notes) {
  if (useMock) {
    const flat = FLATS.find(f => f.id === flatId)
    if (flat) flat.notes = notes
    return { error: null }
  }
  return supabase.from('flats').update({ notes }).eq('id', flatId)
}

export async function setFlatStatus(flatId, status) {
  if (useMock) {
    const flat = FLATS.find(f => f.id === flatId)
    if (flat) flat.status = status
    return { error: null }
  }
  return supabase.from('flats').update({ status }).eq('id', flatId)
}

// ─── Donations ────────────────────────────────────────────────────────────────
export async function submitDonation(payload) {
  if (useMock) {
    const receiptNo = nextReceiptNo()
    const donation  = { id: crypto.randomUUID(), receipt_no: receiptNo, created_at: new Date().toISOString(), ...payload }
    DONATIONS.push(donation)
    const flat = FLATS.find(f => f.id === payload.flat_id)
    if (flat) flat.status = 'paid'
    return { data: donation, error: null }
  }
  const { data: receiptData, error: rpcError } = await supabase.rpc('next_receipt_number')
  if (rpcError) return { data: null, error: rpcError }
  const { data: donation, error: donErr } = await supabase
    .from('donations').insert({ ...payload, receipt_no: receiptData }).select().single()
  if (donErr) return { data: null, error: donErr }
  await supabase.from('flats').update({ status: 'paid' }).eq('id', payload.flat_id)
  return { data: donation, error: null }
}

export async function getDonationByReceiptNo(receiptNo) {
  if (useMock) return { data: DONATIONS.find(x => x.receipt_no === receiptNo) || null, error: null }
  return supabase.from('donations')
    .select('*, flats(flat_number, wing_id, wings(name, buildings(name)))')
    .eq('receipt_no', receiptNo).single()
}

export async function getDonationByFlatId(flatId) {
  if (useMock) return { data: DONATIONS.find(d => d.flat_id === flatId) || null, error: null }
  return supabase.from('donations').select('*').eq('flat_id', flatId).maybeSingle()
}

export async function getDonationsByMobile(mobile) {
  if (useMock) {
    const results = DONATIONS.filter(d => d.mobile === mobile)
    return { data: results, error: null }
  }
  return supabase.from('donations')
    .select('*, flats(flat_number, wings(name, buildings(name)))')
    .eq('mobile', mobile)
    .order('created_at', { ascending: false })
}

export async function updateDonation(id, updates) {
  if (useMock) {
    const d = DONATIONS.find(x => x.id === id)
    if (d) Object.assign(d, updates)
    return { error: null }
  }
  return supabase.from('donations').update(updates).eq('id', id)
}

export async function deleteDonationAndUnlockFlat(donationId, flatId, adminName = 'admin') {
  if (useMock) {
    const idx = DONATIONS.findIndex(d => d.id === donationId)
    if (idx !== -1) DONATIONS.splice(idx, 1)
    const flat = FLATS.find(f => f.id === flatId)
    if (flat) flat.status = 'pending'
    return { error: null }
  }
  const { error: delErr } = await supabase.from('donations').delete().eq('id', donationId)
  if (delErr) return { error: delErr }
  await supabase.from('flats').update({ status: 'pending' }).eq('id', flatId)
  await supabase.from('audit_log').insert({
    action: 'UNLOCK_FLAT', entity_type: 'flat', entity_id: flatId,
    details: { donation_id: donationId }, done_by: adminName,
  })
  return { error: null }
}

export async function refuseFlat(flatId, collectorName) {
  if (useMock) {
    const flat = FLATS.find(f => f.id === flatId)
    if (flat) flat.status = 'refused'
    return { error: null }
  }
  await supabase.from('flats').update({ status: 'refused' }).eq('id', flatId)
  await supabase.from('audit_log').insert({
    action: 'FLAT_REFUSED', entity_type: 'flat', entity_id: flatId,
    details: { collector: collectorName }, done_by: collectorName,
  })
  return { error: null }
}

// ─── Search ───────────────────────────────────────────────────────────────────
export async function searchDonations(query) {
  if (!query || query.trim().length < 2) return { data: [], error: null }
  const q = query.trim()
  if (useMock) {
    const results = DONATIONS.filter(d =>
      d.donor_name?.toLowerCase().includes(q.toLowerCase()) ||
      d.mobile?.includes(q) ||
      d.receipt_no?.toLowerCase().includes(q.toLowerCase())
    )
    return { data: results, error: null }
  }
  const { data, error } = await supabase
    .from('donations')
    .select('*, flats(flat_number, wings(name, buildings(name)))')
    .or(`donor_name.ilike.%${q}%,mobile.ilike.%${q}%,receipt_no.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(30)
  return { data: data || [], error }
}

// ─── EOD Report ───────────────────────────────────────────────────────────────
export async function getEODReport() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  if (useMock) {
    const todayDonations = DONATIONS.filter(d => new Date(d.created_at) >= today)
    const totalAmount    = todayDonations.reduce((s, d) => s + Number(d.amount), 0)
    const cashAmount     = todayDonations.filter(d => d.payment_mode === 'Cash').reduce((s, d) => s + Number(d.amount), 0)
    const pendingFlats   = FLATS.filter(f => f.status === 'pending').length
    const paidFlats      = FLATS.filter(f => f.status === 'paid').length
    const collectorMap   = {}
    todayDonations.forEach(d => {
      const k = d.collected_by || 'Unknown'
      if (!collectorMap[k]) collectorMap[k] = { name: k, amount: 0, count: 0 }
      collectorMap[k].amount += Number(d.amount)
      collectorMap[k].count++
    })
    return {
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
      totalAmount, cashAmount, upiAmount: totalAmount - cashAmount,
      donationCount: todayDonations.length,
      pendingFlats, paidFlats, totalFlats: FLATS.length,
      collectors: Object.values(collectorMap).sort((a, b) => b.amount - a.amount),
    }
  }

  const [donRes, flatRes] = await Promise.all([
    supabase.from('donations').select('amount, payment_mode, collected_by').gte('created_at', todayISO),
    supabase.from('flats').select('status'),
  ])

  const donations  = donRes.data || []
  const flats      = flatRes.data || []
  const totalAmount = donations.reduce((s, d) => s + Number(d.amount), 0)
  const cashAmount  = donations.filter(d => d.payment_mode === 'Cash').reduce((s, d) => s + Number(d.amount), 0)
  const collectorMap = {}
  donations.forEach(d => {
    const k = d.collected_by || 'Unknown'
    if (!collectorMap[k]) collectorMap[k] = { name: k, amount: 0, count: 0 }
    collectorMap[k].amount += Number(d.amount)
    collectorMap[k].count++
  })

  return {
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    totalAmount, cashAmount, upiAmount: totalAmount - cashAmount,
    donationCount: donations.length,
    pendingFlats:  flats.filter(f => f.status === 'pending').length,
    paidFlats:     flats.filter(f => f.status === 'paid').length,
    totalFlats:    flats.length,
    collectors:    Object.values(collectorMap).sort((a, b) => b.amount - a.amount),
  }
}

// ─── Volunteers ───────────────────────────────────────────────────────────────
export async function getVolunteers() {
  if (useMock) return {
    data: [
      { id: '1', name: 'Rahul Sharma',   pin: '1234', logged_in: false, is_active: true, assigned_buildings: [] },
      { id: '2', name: 'Priya Patil',    pin: '2345', logged_in: false, is_active: true, assigned_buildings: [] },
      { id: '3', name: 'Amit Desai',     pin: '3456', logged_in: false, is_active: true, assigned_buildings: [] },
    ], error: null
  }
  return supabase.from('volunteers').select('*').order('name')
}

export async function forceLogoutVolunteer(volunteerId) {
  if (useMock) return { error: null }
  return supabase.from('volunteers').update({ logged_in: false, session_token: null }).eq('id', volunteerId)
}

export async function updateVolunteerAssignment(volunteerId, buildingIds) {
  if (useMock) return { error: null }
  return supabase.from('volunteers').update({ assigned_buildings: buildingIds }).eq('id', volunteerId)
}

export async function addVolunteer(name, pin) {
  if (useMock) return { error: null }
  return supabase.from('volunteers').insert({ name, pin, is_active: true })
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export async function getReportData() {
  if (useMock) {
    const totalAmount = DONATIONS.reduce((s, d) => s + Number(d.amount), 0)
    const cashTotal   = DONATIONS.filter(d => d.payment_mode === 'Cash').reduce((s, d) => s + Number(d.amount), 0)
    const byCollector = {}
    DONATIONS.forEach(d => {
      const k = d.collected_by || 'Unknown'
      if (!byCollector[k]) byCollector[k] = { name: k, count: 0, amount: 0 }
      byCollector[k].count++
      byCollector[k].amount += Number(d.amount)
    })
    return { data: {
      totalDonations: DONATIONS.length, totalAmount, cashTotal,
      upiTotal: totalAmount - cashTotal,
      byCollector: Object.values(byCollector),
      totalFlats:    FLATS.length,
      paidFlats:     FLATS.filter(f => f.status === 'paid').length,
      refusedFlats:  FLATS.filter(f => f.status === 'refused').length,
      pendingFlats:  FLATS.filter(f => f.status === 'pending').length,
    }, error: null }
  }
  const [donRes, flatRes] = await Promise.all([
    supabase.from('donations').select('amount, payment_mode, collected_by'),
    supabase.from('flats').select('status'),
  ])
  if (donRes.error) return { data: null, error: donRes.error }
  const donations   = donRes.data || []
  const flats       = flatRes.data || []
  const totalAmount = donations.reduce((s, d) => s + Number(d.amount), 0)
  const cashTotal   = donations.filter(d => d.payment_mode === 'Cash').reduce((s, d) => s + Number(d.amount), 0)
  const byCollectorMap = {}
  donations.forEach(d => {
    const k = d.collected_by || 'Unknown'
    if (!byCollectorMap[k]) byCollectorMap[k] = { name: k, count: 0, amount: 0 }
    byCollectorMap[k].count++
    byCollectorMap[k].amount += Number(d.amount)
  })
  return { data: {
    totalDonations: donations.length, totalAmount, cashTotal,
    upiTotal: totalAmount - cashTotal,
    byCollector: Object.values(byCollectorMap),
    totalFlats:   flats.length,
    paidFlats:    flats.filter(f => f.status === 'paid').length,
    refusedFlats: flats.filter(f => f.status === 'refused').length,
    pendingFlats: flats.filter(f => f.status === 'pending').length,
  }, error: null }
}