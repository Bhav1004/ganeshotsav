// ─── Mock seed data ──────────────────────────────────────────────────────────
// Used when Supabase is not configured (VITE_SUPABASE_URL missing)

export const BUILDINGS = [
  { id: 'b1',  name: 'Anand Nagar A' },
  { id: 'b2',  name: 'Anand Nagar B' },
  { id: 'b3',  name: 'Shivaji Tower' },
  { id: 'b4',  name: 'Ganesh Heights' },
  { id: 'b5',  name: 'Laxmi Residency' },
  { id: 'b6',  name: 'Saraswati Apts' },
  { id: 'b7',  name: 'Om Sai CHS' },
  { id: 'b8',  name: 'Rajhans Tower' },
  { id: 'b9',  name: 'Sunrise CHS' },
  { id: 'b10', name: 'Everest Apts' },
  { id: 'b11', name: 'Green Park' },
  { id: 'b12', name: 'Silver Oak' },
  { id: 'b13', name: 'Palm Grove' },
  { id: 'b14', name: 'Royal Heights' },
]

function generateWings(buildingId) {
  return ['A', 'B', 'C'].map(w => ({
    id: `${buildingId}-w${w}`,
    building_id: buildingId,
    name: `Wing ${w}`,
  }))
}

function generateFlats(wingId) {
  const flats = []
  for (let floor = 1; floor <= 6; floor++) {
    for (let unit = 1; unit <= 4; unit++) {
      const flatNumber = `${floor}0${unit}`
      flats.push({
        id:          `${wingId}-${flatNumber}`,
        wing_id:     wingId,
        floor,
        flat_number: flatNumber,
        status:      'pending',
      })
    }
  }
  return flats
}

export const WINGS = BUILDINGS.flatMap(b => generateWings(b.id))
export const FLATS = WINGS.flatMap(w => generateFlats(w.id))

// In-memory donations store (resets on page refresh in mock mode)
export const DONATIONS = []

let receiptCounter = 1
export function nextReceiptNo() {
  return `BGMM${String(receiptCounter++).padStart(5, '0')}`
}

// ─── Special Entries mock data ────────────────────────────────────────────────
export const SPECIAL_ENTRIES = [
  { id: 's1', name: 'Sharma General Store', owner_name: 'Ramesh Sharma', category: 'Shop', area: 'Main Market', status: 'pending', notes: '', created_by: '', created_at: new Date().toISOString() },
  { id: 's2', name: 'Hotel Sai Palace',     owner_name: 'Suresh Patil',  category: 'Shop', area: 'Station Road', status: 'pending', notes: '', created_by: '', created_at: new Date().toISOString() },
  { id: 's3', name: 'Dr. Mehta Bungalow',   owner_name: 'Dr. A. Mehta',  category: 'Bungalow', area: 'Ganesh Chowk', status: 'pending', notes: '', created_by: '', created_at: new Date().toISOString() },
  { id: 's4', name: 'Councillor Joshi',     owner_name: 'P. Joshi',      category: 'VIP', area: 'Main Market', status: 'pending', notes: '', created_by: '', created_at: new Date().toISOString() },
]