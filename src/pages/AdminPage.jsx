import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, Users, Building2, RefreshCw, LogOut,
  TrendingUp, CheckCircle2, Banknote, Smartphone,
  Download, ChevronDown, ChevronUp, Unlock, Pencil,
  Save, X, UserX, UserCheck, Plus, ShieldCheck, Send, Store, Settings
} from 'lucide-react'
import { useCollector } from '../context/CollectorContext'
import {
  getBuildings, getVolunteers, forceLogoutVolunteer,
  updateVolunteerAssignment, addVolunteer,
  deleteDonationAndUnlockFlat, updateDonation, getEODReport, getSpecialEntries,
  deleteSpecialDonationAndReset, editSpecialEntry, deleteSpecialEntry,
  getHandovers, confirmHandover, getVolunteerBalances,
} from '../api'
import supabase from '../supabase'
import { BUILDINGS, WINGS, FLATS, DONATIONS } from '../mockData'

const useMock = !import.meta.env.VITE_SUPABASE_URL

// ── Data fetcher ──────────────────────────────────────────────────────────────
async function fetchAdminData() {
  if (useMock) return buildReport(BUILDINGS, WINGS, FLATS, DONATIONS)
  const [bRes, wRes, fRes, dRes] = await Promise.all([
    supabase.from('buildings').select('*').order('name'),
    supabase.from('wings').select('*'),
    supabase.from('flats').select('id, wing_id, status, flat_number, floor'),
    supabase.from('donations').select('*').order('created_at', { ascending: false }),
  ])
  return buildReport(bRes.data||[], wRes.data||[], fRes.data||[], dRes.data||[])
}

function buildReport(buildings, wings, flats, donations) {
  const wingStats = {}
  wings.forEach(w => { wingStats[w.id] = { wing: w, totalFlats:0, paidFlats:0, refusedFlats:0, amount:0, donations:[] } })
  flats.forEach(f => {
    if (!wingStats[f.wing_id]) return
    wingStats[f.wing_id].totalFlats++
    if (f.status === 'paid')    wingStats[f.wing_id].paidFlats++
    if (f.status === 'refused') wingStats[f.wing_id].refusedFlats++
  })
  donations.forEach(d => {
    const flat = flats.find(f => f.id === d.flat_id)
    if (!flat || !wingStats[flat.wing_id]) return
    wingStats[flat.wing_id].amount += Number(d.amount)
    wingStats[flat.wing_id].donations.push({ ...d, flatId: flat.id, flatNumber: flat.flat_number, flatFloor: flat.floor })
  })
  const buildingStats = buildings.map(b => {
    const bWings     = wings.filter(w => w.building_id === b.id)
    const bFlats     = flats.filter(f => bWings.some(w => w.id === f.wing_id))
    const bDonations = donations.filter(d => bFlats.some(f => f.id === d.flat_id))
    return {
      building: b,
      wings: bWings.map(w => wingStats[w.id]).filter(Boolean),
      totalFlats:   bFlats.length,
      paidFlats:    bFlats.filter(f => f.status==='paid').length,
      refusedFlats: bFlats.filter(f => f.status==='refused').length,
      amount:       bDonations.reduce((s,d)=>s+Number(d.amount),0),
      donationCount: bDonations.length,
    }
  })
  const collectorMap = {}
  donations.forEach(d => {
    const k = d.collected_by||'Unknown'
    if (!collectorMap[k]) collectorMap[k] = { name:k, count:0, amount:0, cash:0, upi:0 }
    collectorMap[k].count++
    collectorMap[k].amount += Number(d.amount)
    if (d.payment_mode==='Cash') collectorMap[k].cash += Number(d.amount)
    else collectorMap[k].upi += Number(d.amount)
  })
  const totalAmount = donations.reduce((s,d)=>s+Number(d.amount),0)
  const cashAmount  = donations.filter(d=>d.payment_mode==='Cash').reduce((s,d)=>s+Number(d.amount),0)
  return {
    summary: {
      totalAmount, cashAmount, upiAmount: totalAmount-cashAmount,
      totalFlats: flats.length,
      paidFlats:    flats.filter(f=>f.status==='paid').length,
      refusedFlats: flats.filter(f=>f.status==='refused').length,
      donationCount: donations.length,
    },
    buildingStats,
    collectors: Object.values(collectorMap).sort((a,b)=>b.amount-a.amount),
    recentDonations: donations.slice(0,100),
    allDonationsRaw: donations,
    allFlatsRaw: flats,
  }
}

function fmt(n) { return Number(n).toLocaleString('en-IN') }
function pct(a,b) { return b ? Math.round((a/b)*100) : 0 }

function StatCard({ icon, label, value, sub, color='orange' }) {
  const colors = {
    orange:'bg-orange-50 border-orange-200 text-ganesh-deep',
    green: 'bg-green-50  border-green-200  text-green-700',
    blue:  'bg-blue-50   border-blue-200   text-blue-700',
    amber: 'bg-amber-50  border-amber-200  text-amber-700',
    gray:  'bg-gray-50   border-gray-200   text-gray-600',
  }
  return (
    <div className={`rounded-2xl border-2 p-3 ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70">{icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

function ProgressBar({ paid, refused, total }) {
  const paidPct    = total ? Math.round((paid/total)*100)    : 0
  const refusedPct = total ? Math.round((refused/total)*100) : 0
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
      <div className="h-full bg-green-500 transition-all duration-500" style={{width:`${paidPct}%`}}/>
      <div className="h-full bg-gray-400 transition-all duration-500" style={{width:`${refusedPct}%`}}/>
    </div>
  )
}

// ── Edit Donation Modal ───────────────────────────────────────────────────────
function EditDonationModal({ donation, onClose, onSave }) {
  const [form, setForm] = useState({
    donor_name:   donation.donor_name,
    mobile:       donation.mobile || '',
    amount:       donation.amount,
    payment_mode: donation.payment_mode,
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    setSaving(true)
    await onSave(donation.id, form)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800">✏️ Edit Donation</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-gray-100 touch-manipulation"><X size={18}/></button>
        </div>
        <p className="text-xs text-gray-400 font-mono">{donation.receipt_no}</p>

        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Donor Name</label>
          <input className="input-field" value={form.donor_name} onChange={e=>set('donor_name',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Mobile</label>
          <input className="input-field" value={form.mobile} onChange={e=>set('mobile',e.target.value)} inputMode="numeric"/>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Amount (₹)</label>
          <input className="input-field" type="number" value={form.amount} onChange={e=>set('amount',e.target.value)}/>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {['Cash','UPI'].map(m => (
            <button key={m} onClick={()=>set('payment_mode',m)}
              className={`py-3 rounded-xl font-bold border-2 transition-all touch-manipulation ${
                form.payment_mode===m ? 'bg-ganesh-orange text-white border-ganesh-orange' : 'bg-white text-gray-600 border-gray-200'
              }`}>{m==='Cash'?'💵 Cash':'📲 UPI'}</button>
          ))}
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          <span className="flex items-center justify-center gap-2">
            <Save size={16}/>{saving?'Saving…':'Save Changes'}
          </span>
        </button>
      </div>
    </div>
  )
}

// ── Assign Buildings Modal ────────────────────────────────────────────────────
function AssignModal({ volunteer, buildings, onClose, onSave }) {
  const [selected, setSelected] = useState(new Set(volunteer.assigned_buildings||[]))
  const [saving, setSaving]     = useState(false)

  const toggle = (id) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const save = async () => {
    setSaving(true)
    await onSave(volunteer.id, [...selected])
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">🏢 Assign Buildings</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-gray-100 touch-manipulation"><X size={18}/></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">For: <strong>{volunteer.name}</strong></p>
        <p className="text-xs text-gray-400 mb-3">(Leave all unchecked = can see all buildings)</p>
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {buildings.map(b => (
            <label key={b.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl cursor-pointer touch-manipulation">
              <input type="checkbox" checked={selected.has(b.id)} onChange={()=>toggle(b.id)}
                className="w-5 h-5 accent-orange-500"/>
              <span className="font-medium text-gray-700">{b.name}</span>
            </label>
          ))}
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : `✅ Save (${selected.size===0?'All':selected.size} buildings)`}
        </button>
      </div>
    </div>
  )
}



function SummaryRow({ label, cash, upi, highlight }) {
  const fmt = n => Number(n||0).toLocaleString('en-IN')
  return (
    <div className={`flex justify-between items-center py-1.5 ${highlight ? 'font-bold' : ''}`}>
      <p className={`text-sm ${highlight ? 'text-red-600' : 'text-gray-600'}`}>{label}</p>
      <div className="flex gap-3">
        <p className={`text-sm w-16 text-right ${highlight ? 'text-red-600' : 'text-green-700'}`}>
          {cash > 0 ? `₹${fmt(cash)}` : '—'}
        </p>
        <p className={`text-sm w-16 text-right ${highlight ? 'text-red-600' : 'text-blue-700'}`}>
          {upi > 0 ? `₹${fmt(upi)}` : '—'}
        </p>
        <p className={`text-sm w-16 text-right font-semibold ${highlight ? 'text-red-600' : 'text-gray-700'}`}>
          ₹{fmt(cash + upi)}
        </p>
      </div>
    </div>
  )
}

// ── Edit Special Entry Modal ──────────────────────────────────────────────────
function EditSpecialModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState({
    name:       entry.name       || '',
    owner_name: entry.owner_name || '',
    category:   entry.category   || 'Shop',
    area:       entry.area       || '',
    mobile:     entry.mobile     || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const CAT_ICON = { Shop:'🏪', VIP:'⭐', Bungalow:'🏠' }

  const save = async () => {
    setSaving(true)
    await onSave(entry.id, form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800">✏️ Edit Entry</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-gray-100 touch-manipulation"><X size={18}/></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['Shop','VIP','Bungalow'].map(cat=>(
            <button key={cat} onClick={()=>set('category',cat)}
              className={`py-2 rounded-xl text-sm font-bold border-2 transition-all touch-manipulation ${
                form.category===cat?'bg-ganesh-orange text-white border-ganesh-orange':'bg-white text-gray-600 border-gray-200'
              }`}>
              {CAT_ICON[cat]} {cat}
            </button>
          ))}
        </div>
        <input className="input-field" placeholder="Name *" value={form.name} onChange={e=>set('name',e.target.value)}/>
        <input className="input-field" placeholder="Owner name" value={form.owner_name} onChange={e=>set('owner_name',e.target.value)}/>
        <input className="input-field" placeholder="Area / Street" value={form.area} onChange={e=>set('area',e.target.value)}/>
        <input className="input-field" placeholder="Mobile number" type="tel" inputMode="numeric" maxLength={10}
          value={form.mobile} onChange={e=>set('mobile',e.target.value.replace(/\D/g,''))}/>
        <button onClick={save} disabled={saving} className="btn-primary">
          <span className="flex items-center justify-center gap-2"><Save size={16}/>{saving?'Saving…':'Save Changes'}</span>
        </button>
      </div>
    </div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { logout } = useCollector()
  const navigate   = useNavigate()

  const [data, setData]         = useState(null)
  const [volunteers, setVolunteers] = useState([])
  const [buildings, setBuildings]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab]   = useState('buildings')
  const [expandedBuilding, setExpandedBuilding] = useState(null)
  const [editDonation, setEditDonation]   = useState(null)
  const [assignVolunteer, setAssignVolunteer] = useState(null)
  const [unlockConfirm, setUnlockConfirm] = useState(null)
  const [newVolunteer, setNewVolunteer]   = useState({ show:false, name:'', pin:'' })
  const [actionLoading, setActionLoading] = useState(false)
  const [liveUpdates, setLiveUpdates]     = useState(0)
  const [specials, setSpecials]           = useState([])
  const [handovers, setHandovers]           = useState([])
  const [volunteerBalances, setVolunteerBalances] = useState([])
  const [expandedVol, setExpandedVol]     = useState(null)
  const [editSpecial, setEditSpecial]     = useState(null)
  const [deleteSpecial, setDeleteSpecial] = useState(null)
  const reloadTimer = useRef(null)

  const load = useCallback(async (quiet=false) => {
    if (!quiet) setLoading(true); else setRefreshing(true)
    const [report, vols, blds, spl, hvrs, balances] = await Promise.all([
      fetchAdminData(),
      getVolunteers(),
      getBuildings(),
      getSpecialEntries(),
      getHandovers(),
      getVolunteerBalances(),
    ])
    setData(report)
    setVolunteers(vols.data||[])
    setBuildings(blds.data||[])
    setSpecials(spl.data||[])
    setHandovers(hvrs.data||[])
    setVolunteerBalances(balances.data||[])
    setLoading(false); setRefreshing(false)
  }, [])

  useEffect(()=>{load()},[load])

  // Realtime: auto-reload admin data when donations or flats change
  useEffect(()=>{
    if (!import.meta.env.VITE_SUPABASE_URL) return
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'donations'},()=>{
        clearTimeout(reloadTimer.current)
        reloadTimer.current = setTimeout(()=>load(true), 800)
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'flats'},()=>{
        clearTimeout(reloadTimer.current)
        reloadTimer.current = setTimeout(()=>load(true), 800)
      })
      .subscribe()
    return ()=>{ supabase.removeChannel(channel); clearTimeout(reloadTimer.current) }
  },[])

  const handleUnlockFlat = async (donationId, flatId, specialEntryId) => {
    setActionLoading(true)
    let error
    if (specialEntryId) {
      const res = await deleteSpecialDonationAndReset(donationId, specialEntryId)
      error = res.error
    } else {
      const res = await deleteDonationAndUnlockFlat(donationId, flatId)
      error = res.error
    }
    setActionLoading(false)
    setUnlockConfirm(null)
    if (!error) load(true)
  }

  const handleEditSave = async (donationId, updates) => {
    await updateDonation(donationId, updates)
    load(true)
  }

  const handleForceLogout = async (volunteerId) => {
    setActionLoading(true)
    await forceLogoutVolunteer(volunteerId)
    setActionLoading(false)
    load(true)
  }

  const handleAssignSave = async (volunteerId, buildingIds) => {
    await updateVolunteerAssignment(volunteerId, buildingIds)
    load(true)
  }

  const handleAddVolunteer = async () => {
    if (!newVolunteer.name.trim() || newVolunteer.pin.length !== 4) return
    setActionLoading(true)
    const { addVolunteer: addV } = await import('../api')
    await addV(newVolunteer.name.trim(), newVolunteer.pin)
    setNewVolunteer({ show:false, name:'', pin:'' })
    setActionLoading(false)
    load(true)
  }

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['Receipt No','Donor Name','Mobile','Amount','Payment Mode','Transaction ID','Collected By','Date'],
      ...data.recentDonations.map(d=>[
        d.receipt_no, d.donor_name, d.mobile||'', d.amount, d.payment_mode,
        d.transaction_id||'', d.collected_by||'',
        new Date(d.created_at).toLocaleDateString('en-IN')
      ])
    ]
    const csv  = rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download='ganeshotsav2026.csv'; a.click()
  }

  const handleConfirmHandover = async (id) => {
    setActionLoading(true)
    await confirmHandover(id)
    setActionLoading(false)
    load(true)
  }

  const handleEditSpecial = async (id, updates) => {
    await editSpecialEntry(id, updates)
    load(true)
  }

  const handleDeleteSpecial = async (id, deleteDon) => {
    setActionLoading(true)
    await deleteSpecialEntry(id, deleteDon)
    setActionLoading(false)
    setDeleteSpecial(null)
    load(true)
  }

  const handleEODReport = async () => {
    const report = await getEODReport()
    const top    = report.collectors[0]
    const adminPhone = import.meta.env.VITE_ADMIN_WHATSAPP || ''
    const msg =
      `🙏 *Ganeshotsav 2026 – EOD Report*\n` +
      `📅 ${report.date}\n\n` +
      `💰 *Today's Collection*\n` +
      `Total: ₹${Number(report.totalAmount).toLocaleString('en-IN')}\n` +
      `Donations: ${report.donationCount}\n` +
      `💵 Cash: ₹${Number(report.cashAmount).toLocaleString('en-IN')}\n` +
      `📲 UPI: ₹${Number(report.upiAmount).toLocaleString('en-IN')}\n\n` +
      `🏠 *Flat Progress*\n` +
      `✅ Paid: ${report.paidFlats} / ${report.totalFlats}\n` +
      `❌ Pending: ${report.pendingFlats}\n\n` +
      (top ? `🏆 *Top Collector*\n${top.name}: ₹${Number(top.amount).toLocaleString('en-IN')} (${top.count} receipts)\n\n` : '') +
      (report.collectors.length > 1
        ? `👥 *All Collectors*\n` + report.collectors.map(c => `• ${c.name}: ₹${Number(c.amount).toLocaleString('en-IN')}`).join('\n') + '\n\n'
        : '') +
      `Jai Ganesh! 🐘`
    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleLogout = () => { logout(); navigate('/login',{replace:true}) }

  const TABS = [
    { id:'buildings',   label:'🏢 Buildings' },
    { id:'special',     label:'🏪 Special' },
    { id:'collection',  label:'📊 Collection' },
    { id:'handovers',   label:'✅ Approvals' },
    { id:'collectors',  label:'🏆 Collectors' },
    { id:'volunteers',  label:'👥 Volunteers' },
    { id:'donations',   label:'📋 Donations' },
  ]

  return (
    <div className="min-h-dvh bg-orange-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-ganesh-deep to-ganesh-orange text-white sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex-1">
            <h1 className="font-bold text-lg">🛡️ Admin Panel</h1>
            <p className="text-xs text-orange-100">Ganeshotsav 2026</p>
          </div>
          <button onClick={()=>load(true)} className="p-2 rounded-xl bg-white/20 touch-manipulation">
            <RefreshCw size={18} className={refreshing?'animate-spin':''}/>
          </button>
          <button onClick={handleEODReport} className="p-2 rounded-xl bg-white/20 touch-manipulation" title="Send EOD Report to WhatsApp">
            <Send size={18}/>
          </button>
          <button onClick={exportCSV} className="p-2 rounded-xl bg-white/20 touch-manipulation" title="Export CSV">
            <Download size={18}/>
          </button>
          <button onClick={()=>navigate('/admin/settings')} className="p-2 rounded-xl bg-white/20 touch-manipulation" title="Settings">
            <Settings size={18}/>
          </button>
          <button onClick={handleLogout} className="p-2 rounded-xl bg-white/20 touch-manipulation">
            <LogOut size={18}/>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-5xl animate-bounce">🙏</div>
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      ) : data ? (
        <div className="px-4 py-4 space-y-4 pb-16 max-w-2xl mx-auto">

          {/* Summary */}
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">💰 Overall Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<IndianRupee size={14}/>} label="Total Collected"
                value={`₹${fmt(data.summary.totalAmount)}`}
                sub={`${data.summary.donationCount} donations`} color="orange"/>
              <StatCard icon={<TrendingUp size={14}/>} label="Coverage"
                value={`${pct(data.summary.paidFlats,data.summary.totalFlats)}%`}
                sub={`${data.summary.paidFlats}/${data.summary.totalFlats} flats`} color="amber"/>
              <StatCard icon={<Banknote size={14}/>} label="Cash"
                value={`₹${fmt(data.summary.cashAmount)}`} color="green"/>
              <StatCard icon={<Smartphone size={14}/>} label="UPI"
                value={`₹${fmt(data.summary.upiAmount)}`} color="blue"/>
            </div>
            {data.summary.refusedFlats > 0 && (
              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-500 flex justify-between">
                <span>🚫 Refused flats</span>
                <span className="font-semibold">{data.summary.refusedFlats}</span>
              </div>
            )}
          </section>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-orange-100 p-1 flex flex-wrap gap-1">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setActiveTab(t.id)}
                className={`py-2 rounded-xl text-xs font-semibold transition-all touch-manipulation ${
                  activeTab===t.id?'bg-ganesh-orange text-white shadow-sm':'text-gray-500'
                }`}>{t.label}</button>
            ))}
          </div>

          {/* ── Buildings Tab ── */}
          {activeTab==='buildings' && (
            <section className="space-y-3">
              {data.buildingStats.sort((a,b)=>b.amount-a.amount).map(bs=>(
                <div key={bs.building.id} className="bg-white rounded-2xl border border-orange-100 overflow-hidden">
                  <button className="w-full px-4 py-3 flex items-center gap-3 touch-manipulation active:bg-orange-50"
                    onClick={()=>setExpandedBuilding(expandedBuilding===bs.building.id?null:bs.building.id)}>
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} className="text-ganesh-orange"/>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-gray-800 truncate">{bs.building.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <ProgressBar paid={bs.paidFlats} refused={bs.refusedFlats} total={bs.totalFlats}/>
                        <span className="text-xs text-gray-500 flex-shrink-0">{bs.paidFlats}/{bs.totalFlats}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-ganesh-deep text-sm">₹{fmt(bs.amount)}</p>
                      <p className="text-xs text-gray-400">{bs.donationCount} collected</p>
                    </div>
                    {expandedBuilding===bs.building.id ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                  </button>

                  {expandedBuilding===bs.building.id && (
                    <div className="border-t border-orange-100 divide-y divide-orange-50">
                      {bs.wings.map(ws=>(
                        <div key={ws.wing.id}>
                          <div className="px-4 py-2.5 flex items-center gap-3 bg-orange-50/50">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-ganesh-orange">
                              {ws.wing.name.replace('Wing ','')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-700">{ws.wing.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <ProgressBar paid={ws.paidFlats} refused={ws.refusedFlats} total={ws.totalFlats}/>
                                <span className="text-xs text-gray-400 flex-shrink-0">{ws.paidFlats}/{ws.totalFlats}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-sm text-gray-700">₹{fmt(ws.amount)}</p>
                              <div className="flex gap-1 justify-end mt-0.5">
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-medium">✅{ws.paidFlats}</span>
                                {ws.refusedFlats>0 && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">🚫{ws.refusedFlats}</span>}
                              </div>
                            </div>
                          </div>
                          {/* Wing donations — flat no + donor + collector + amount + date */}
                          {ws.donations.length > 0 && (
                            <div className="divide-y divide-gray-50">
                              {ws.donations
                                .sort((a,b) => (a.flatFloor - b.flatFloor) || (a.flatNumber||'').localeCompare(b.flatNumber||''))
                                .map(d=>(
                                <div key={d.id} className="px-4 py-3 bg-white">
                                  <div className="flex items-start gap-2.5">
                                    {/* Flat number badge */}
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex flex-col items-center justify-center flex-shrink-0">
                                      <span className="text-[9px] text-orange-400 font-semibold leading-none">FLAT</span>
                                      <span className="text-sm font-bold text-ganesh-orange leading-tight">{d.flatNumber||'—'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {/* Row 1: donor name + amount */}
                                      <div className="flex justify-between items-start gap-1">
                                        <p className="text-sm font-bold text-gray-800 truncate flex-1">{d.donor_name}</p>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <p className="font-bold text-ganesh-deep text-sm">₹{fmt(d.amount)}</p>
                                          <button
                                            onClick={()=>setUnlockConfirm({donationId:d.id, flatId:d.flatId, name:d.donor_name})}
                                            className="p-1.5 rounded-lg bg-red-50 text-red-500 touch-manipulation"
                                            title="Unlock flat">
                                            <Unlock size={13}/>
                                          </button>
                                        </div>
                                      </div>
                                      {/* Row 2: collector name */}
                                      <p className="text-xs text-blue-600 font-semibold truncate mt-0.5">
                                        👤 {d.collected_by || 'Unknown collector'}
                                      </p>
                                      {/* Row 3: receipt, payment mode, date */}
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        <span className="text-[10px] text-gray-400 font-mono">{d.receipt_no}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                          d.payment_mode==='Cash'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'
                                        }`}>{d.payment_mode==='Cash'?'💵':'📲'} {d.payment_mode}</span>
                                        {d.created_at && (
                                          <span className="text-[10px] text-gray-400">
                                            🕐 {new Date(d.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}


          {/* ── Special Tab ── */}
          {activeTab==='special' && (
            <section className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                {['Shop','VIP','Bungalow'].map(cat => {
                  const catEntries = specials.filter(e => e.category === cat)
                  const paid       = catEntries.filter(e => e.status === 'paid').length
                  const icons      = { Shop: '🏪', VIP: '⭐', Bungalow: '🏠' }
                  const colors     = { Shop: 'bg-blue-100 text-blue-700', VIP: 'bg-yellow-100 text-yellow-700', Bungalow: 'bg-purple-100 text-purple-700' }
                  return (
                    <div key={cat} className="bg-white rounded-xl border border-orange-100 p-3 text-center">
                      <p className="text-xl mb-1">{icons[cat]}</p>
                      <p className="font-bold text-gray-800 text-sm">{cat}</p>
                      <p className="text-xs text-green-600 font-semibold">{paid}/{catEntries.length} paid</p>
                    </div>
                  )
                })}
              </div>

              {/* Entries list */}
              <div className="space-y-2">
                {specials.length === 0 && (
                  <p className="text-center text-gray-400 py-10">No special entries yet</p>
                )}
                {specials.map(e => {
                  const icons  = { Shop: '🏪', VIP: '⭐', Bungalow: '🏠' }
                  const colors = { Shop: 'bg-blue-100 text-blue-700', VIP: 'bg-yellow-100 text-yellow-700', Bungalow: 'bg-purple-100 text-purple-700' }
                  const don    = data?.allDonationsRaw?.find(d => d.special_entry_id === e.id)
                  return (
                    <div key={e.id} className="bg-white rounded-xl border border-orange-100 p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">{icons[e.category]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-bold text-gray-800 truncate">{e.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${colors[e.category]}`}>
                              {e.category}
                            </span>
                          </div>
                          {e.owner_name && <p className="text-xs text-gray-500 mt-0.5">👤 {e.owner_name}</p>}
                          {e.area       && <p className="text-xs text-gray-400">📍 {e.area}</p>}
                          {don && (
                            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-green-700">₹{fmt(don.amount)}</p>
                                <p className="text-xs text-blue-600 font-semibold">👤 {don.collected_by||'—'}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{don.receipt_no}</p>
                              </div>
                              <button
                                onClick={()=>setUnlockConfirm({donationId:don.id, specialEntryId:e.id, name:e.name, isSpecial:true})}
                                className="p-1.5 rounded-lg bg-red-50 text-red-500 touch-manipulation"
                                title="Unlock entry">
                                <Unlock size={13}/>
                              </button>
                            </div>
                          )}
                          {e.status==='refused' && (
                            <p className="text-xs text-gray-500 mt-1">🚫 {e.notes||'Refused'}</p>
                          )}
                          {e.status==='pending' && (
                            <p className="text-xs text-red-500 mt-1 font-medium">❌ Pending collection</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}



          {/* ── Collection Tab ── */}
          {activeTab==='collection' && (
            <section className="space-y-4">
              {/* Overall banner */}
              {(() => {
                const totalColl = volunteerBalances.reduce((s,v)=>s+v.totalCollected,0)
                const totalSub  = volunteerBalances.reduce((s,v)=>s+v.totalSubmitted,0)
                const totalPend = volunteerBalances.reduce((s,v)=>s+v.totalPending,0)
                const cashColl  = volunteerBalances.reduce((s,v)=>s+v.cashCollected,0)
                const upiColl   = volunteerBalances.reduce((s,v)=>s+v.upiCollected,0)
                const cashSub   = volunteerBalances.reduce((s,v)=>s+v.cashSubmitted,0)
                const upiSub    = volunteerBalances.reduce((s,v)=>s+v.upiSubmitted,0)
                const cashPend  = volunteerBalances.reduce((s,v)=>s+v.cashPending,0)
                const upiPend   = volunteerBalances.reduce((s,v)=>s+v.upiPending,0)
                return (
                  <div className="bg-white rounded-2xl border border-orange-100 overflow-hidden shadow-sm">
                    {/* Column headers */}
                    <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 flex justify-between">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">All Volunteers</p>
                      <div className="flex gap-3">
                        <p className="text-xs font-bold text-green-700 w-16 text-right">💵 Cash</p>
                        <p className="text-xs font-bold text-blue-700  w-16 text-right">📲 UPI</p>
                        <p className="text-xs font-bold text-gray-700  w-16 text-right">Total</p>
                      </div>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <SummaryRow label="Collected" cash={cashColl} upi={upiColl}/>
                      <SummaryRow label="Submitted" cash={cashSub}  upi={upiSub}/>
                      <SummaryRow label="⚠️ Pending" cash={cashPend} upi={upiPend} highlight/>
                    </div>
                  </div>
                )
              })()}

              {/* Per volunteer cards */}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Per Volunteer</p>
              {volunteerBalances.filter(v=>v.totalCollected>0||v.handovers.length>0).map(v => (
                <div key={v.name} className="bg-white rounded-2xl border border-orange-100 overflow-hidden">
                  {/* Volunteer header */}
                  <button
                    className="w-full px-4 py-3 flex items-start justify-between touch-manipulation active:bg-orange-50"
                    onClick={()=>setExpandedVol(expandedVol===v.name?null:v.name)}
                  >
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${v.logged_in?'bg-green-500':'bg-gray-300'}`}/>
                        <p className="font-bold text-gray-800">{v.name}</p>
                        <span className="text-xs text-gray-400">{v.donationCount} donations</span>
                      </div>
                      {/* Mini balance row */}
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs bg-orange-50 text-ganesh-deep px-2 py-0.5 rounded-md font-semibold">
                          Collected ₹{fmt(v.totalCollected)}
                        </span>
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-semibold">
                          Submitted ₹{fmt(v.totalSubmitted)}
                        </span>
                        {v.totalPending > 0 && (
                          <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-semibold">
                            ⚠️ Pending ₹{fmt(v.totalPending)}
                          </span>
                        )}
                        {v.totalPending <= 0 && v.totalCollected > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-semibold">
                            ✅ All Clear
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedVol===v.name
                      ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0 mt-1"/>
                      : <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-1"/>}
                  </button>

                  {/* Expanded detail */}
                  {expandedVol===v.name && (
                    <div className="border-t border-orange-100">
                      {/* Detailed balance table */}
                      <div className="px-4 py-3 bg-orange-50/50">
                        <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
                          <span></span>
                          <div className="flex gap-3">
                            <span className="w-16 text-right text-green-700">💵 Cash</span>
                            <span className="w-16 text-right text-blue-700">📲 UPI</span>
                            <span className="w-16 text-right text-gray-700">Total</span>
                          </div>
                        </div>
                        {[
                          { label:'Collected', cash:v.cashCollected, upi:v.upiCollected },
                          { label:'Submitted', cash:v.cashSubmitted, upi:v.upiSubmitted },
                          { label:'Pending',   cash:v.cashPending,   upi:v.upiPending, warn:true },
                        ].map(row=>(
                          <div key={row.label} className={`flex justify-between text-sm py-1 ${row.warn&&(row.cash>0||row.upi>0)?'font-bold text-red-600':''}`}>
                            <span className="text-gray-600">{row.warn&&(row.cash>0||row.upi>0)?'⚠️ ':''}{row.label}</span>
                            <div className="flex gap-3">
                              <span className="w-16 text-right">{row.cash>0?`₹${fmt(row.cash)}`:'—'}</span>
                              <span className="w-16 text-right">{row.upi>0?`₹${fmt(row.upi)}`:'—'}</span>
                              <span className="w-16 text-right font-semibold">₹{fmt(row.cash+row.upi)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Handover history for this volunteer */}
                      {v.handovers.length > 0 && (
                        <div className="divide-y divide-gray-50">
                          <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Handover History</p>
                          {v.handovers.map(h=>(
                            <div key={h.id} className="px-4 py-2.5 flex justify-between items-center">
                              <div>
                                <div className="flex gap-2 text-sm">
                                  {Number(h.cash_amount)>0&&<span className="text-green-700">💵 ₹{fmt(h.cash_amount)}</span>}
                                  {Number(h.upi_amount)>0 &&<span className="text-blue-700">📲 ₹{fmt(h.upi_amount)}</span>}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(h.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                                </p>
                                {h.note&&<p className="text-xs text-gray-400">{h.note}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                  h.status==='confirmed'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'
                                }`}>
                                  {h.status==='confirmed'?'✅':'⏳'}
                                </span>
                                {h.status==='pending'&&(
                                  <button onClick={()=>handleConfirmHandover(h.id)} disabled={actionLoading}
                                    className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg font-semibold touch-manipulation">
                                    Confirm
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {volunteerBalances.filter(v=>v.totalCollected>0).length===0 && (
                <p className="text-center text-gray-400 py-10">No collections yet</p>
              )}
            </section>
          )}

          {/* ── Approvals Tab (pending handovers only) ── */}
          {activeTab==='handovers' && (
            <section className="space-y-3">
              {(() => {
                const pending = handovers.filter(h=>h.status==='pending')
                if (pending.length===0) return (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="font-bold text-green-700">All Clear!</p>
                    <p className="text-gray-400 text-sm mt-1">No pending submissions to approve.</p>
                  </div>
                )
                return (
                  <>
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3 flex justify-between items-center">
                      <p className="font-semibold text-amber-700 text-sm">⏳ {pending.length} pending approval{pending.length>1?'s':''}</p>
                      <p className="font-bold text-amber-800">₹{fmt(pending.reduce((s,h)=>s+Number(h.cash_amount)+Number(h.upi_amount),0))}</p>
                    </div>
                    {pending.map(h=>(
                      <div key={h.id} className="bg-white rounded-xl border-2 border-amber-200 p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-800">{h.volunteer_name}</p>
                            <div className="flex gap-3 mt-1">
                              {Number(h.cash_amount)>0&&<span className="text-sm font-semibold text-green-700">💵 ₹{fmt(h.cash_amount)}</span>}
                              {Number(h.upi_amount)>0 &&<span className="text-sm font-semibold text-blue-700">📲 ₹{fmt(h.upi_amount)}</span>}
                            </div>
                            {h.note&&<p className="text-xs text-gray-400 mt-0.5 italic">"{h.note}"</p>}
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(h.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                            </p>
                          </div>
                          <button onClick={()=>handleConfirmHandover(h.id)} disabled={actionLoading}
                            className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm touch-manipulation flex-shrink-0 ml-3 active:scale-95 transition-transform">
                            ✅ Confirm
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )
              })()}
            </section>
          )}

          {/* ── Collectors Tab ── */}
          {activeTab==='collectors' && (
            <section className="space-y-2">
              {data.collectors.length===0 && <p className="text-center text-gray-400 py-10">No collections yet</p>}
              {data.collectors.map((c,i)=>(
                <div key={c.name} className="bg-white rounded-2xl border border-orange-100 p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
                    i===0?'bg-amber-400':i===1?'bg-gray-400':i===2?'bg-orange-400':'bg-orange-200 text-ganesh-deep'
                  }`}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{c.name}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-medium">💵 ₹{fmt(c.cash)}</span>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">📲 ₹{fmt(c.upi)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-ganesh-deep">₹{fmt(c.amount)}</p>
                    <p className="text-xs text-gray-400">{c.count} receipts</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* ── Volunteers Tab ── */}
          {activeTab==='volunteers' && (
            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Manage Volunteers</p>
                <button onClick={()=>setNewVolunteer(n=>({...n,show:true}))}
                  className="flex items-center gap-1 text-xs text-ganesh-orange font-semibold touch-manipulation">
                  <Plus size={14}/> Add
                </button>
              </div>

              {/* Add volunteer form */}
              {newVolunteer.show && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 space-y-3">
                  <p className="font-semibold text-gray-700 text-sm">➕ New Volunteer</p>
                  <input className="input-field" placeholder="Full name"
                    value={newVolunteer.name} onChange={e=>setNewVolunteer(n=>({...n,name:e.target.value}))}/>
                  <input className="input-field tracking-widest text-center font-bold" placeholder="4-digit PIN"
                    maxLength={4} inputMode="numeric"
                    value={newVolunteer.pin} onChange={e=>setNewVolunteer(n=>({...n,pin:e.target.value.replace(/\D/g,'')}))}/>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={()=>setNewVolunteer({show:false,name:'',pin:''})}
                      className="py-2 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm touch-manipulation">Cancel</button>
                    <button onClick={handleAddVolunteer} disabled={actionLoading}
                      className="py-2 rounded-xl bg-ganesh-orange text-white font-semibold text-sm touch-manipulation">
                      {actionLoading?'Adding…':'Add'}
                    </button>
                  </div>
                </div>
              )}

              {volunteers.map(v=>(
                <div key={v.id} className="bg-white rounded-2xl border border-orange-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      v.logged_in ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {v.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">{v.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          v.logged_in ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {v.logged_in ? '🟢 Online' : '⚫ Offline'}
                        </span>
                        {(v.assigned_buildings||[]).length > 0 && (
                          <span className="text-xs bg-orange-100 text-ganesh-orange px-2 py-0.5 rounded-md font-medium">
                            {v.assigned_buildings.length} buildings
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={()=>setAssignVolunteer(v)}
                        title="Assign buildings"
                        className="p-2 rounded-xl bg-orange-50 text-ganesh-orange touch-manipulation">
                        <Building2 size={15}/>
                      </button>
                      {v.logged_in && (
                        <button onClick={()=>handleForceLogout(v.id)} disabled={actionLoading}
                          title="Force logout"
                          className="p-2 rounded-xl bg-red-50 text-red-500 touch-manipulation">
                          <UserX size={15}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* ── Donations Tab ── */}
          {activeTab==='donations' && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">All Donations</p>
                <button onClick={exportCSV}
                  className="flex items-center gap-1 text-xs text-ganesh-orange font-semibold touch-manipulation">
                  <Download size={13}/> CSV
                </button>
              </div>
              <div className="space-y-2">
                {data.recentDonations.length===0 && <p className="text-center text-gray-400 py-10">No donations yet</p>}
                {data.recentDonations.map(d=>{
                  const flat = data.allFlatsRaw.find(f=>f.id===d.flat_id)
                  return (
                    <div key={d.id} className="bg-white rounded-xl border border-orange-100 px-4 py-3">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-800 truncate">{d.donor_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">{d.receipt_no}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3 flex items-start gap-2">
                          <div>
                            <p className="font-bold text-ganesh-deep">₹{fmt(d.amount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                              d.payment_mode==='Cash'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'
                            }`}>{d.payment_mode==='Cash'?'💵':'📲'} {d.payment_mode}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={()=>setEditDonation(d)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-500 touch-manipulation">
                              <Pencil size={13}/>
                            </button>
                            <button onClick={()=>setUnlockConfirm({donationId:d.id, flatId:flat?.id, name:d.donor_name})}
                              className="p-1.5 rounded-lg bg-red-50 text-red-500 touch-manipulation">
                              <Unlock size={13}/>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                        <span>By: {d.collected_by||'—'}</span>
                        <span>{new Date(d.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      ) : <p className="text-center text-gray-500 py-20">Could not load data</p>}

      {/* ── Unlock Confirm Dialog ── */}
      {unlockConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center">
            <p className="text-4xl mb-3">🔓</p>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Unlock Flat?</h3>
            <p className="text-gray-500 text-sm mb-1">Donor: <strong>{unlockConfirm.name}</strong></p>
            <p className="text-red-600 text-sm font-medium mb-5">This will DELETE the donation and reset the flat to Pending.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>setUnlockConfirm(null)}
                className="py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold touch-manipulation">Cancel</button>
              <button onClick={()=>handleUnlockFlat(unlockConfirm.donationId, unlockConfirm.flatId, unlockConfirm.specialEntryId)}
                disabled={actionLoading}
                className="py-3 rounded-xl bg-red-500 text-white font-semibold touch-manipulation">
                {actionLoading?'Unlocking…':'Yes, Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Edit Special Entry Modal ── */}
      {editSpecial && (
        <EditSpecialModal
          entry={editSpecial}
          onClose={()=>setEditSpecial(null)}
          onSave={(id,updates)=>{ handleEditSpecial(id,updates); setEditSpecial(null) }}
        />
      )}

      {/* ── Delete Special Entry Dialog ── */}
      {deleteSpecial && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center">
            <p className="text-3xl mb-3">🗑️</p>
            <h3 className="font-bold text-gray-800 text-lg mb-1">Delete Entry?</h3>
            <p className="text-gray-500 text-sm mb-4">{deleteSpecial.name}</p>
            <div className="space-y-2">
              <button onClick={()=>handleDeleteSpecial(deleteSpecial.id, true)}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold touch-manipulation text-sm">
                {actionLoading?'Deleting…':'🗑️ Delete Entry + Donation'}
              </button>
              <button onClick={()=>handleDeleteSpecial(deleteSpecial.id, false)}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-orange-100 text-orange-700 font-semibold touch-manipulation text-sm">
                Delete Entry Only (keep donation)
              </button>
              <button onClick={()=>setDeleteSpecial(null)}
                className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold touch-manipulation text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Donation Modal ── */}
      {editDonation && (
        <EditDonationModal
          donation={editDonation}
          onClose={()=>setEditDonation(null)}
          onSave={handleEditSave}
        />
      )}

      {/* ── Assign Buildings Modal ── */}
      {assignVolunteer && (
        <AssignModal
          volunteer={assignVolunteer}
          buildings={buildings}
          onClose={()=>setAssignVolunteer(null)}
          onSave={handleAssignSave}
        />
      )}
    </div>
  )
}