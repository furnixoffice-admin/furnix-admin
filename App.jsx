import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LayoutDashboard, Users, Building2, ClipboardList, Wallet, LogOut, Menu, RefreshCw } from 'lucide-react'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = url && key ? createClient(url, key) : null
const nav = [
  ['Dashboard', LayoutDashboard], ['Customer', Users], ['Project', Building2],
  ['RAB', ClipboardList], ['Pembayaran', Wallet]
]
const rupiah = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0))

export default function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [page, setPage] = useState('Dashboard')
  const [projects, setProjects] = useState([])
  const [customers, setCustomers] = useState([])
  const [rab, setRab] = useState([])
  const [payments, setPayments] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadData() {
    if (!supabase || !session) return
    setBusy(true); setMessage('')
    const results = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('customer').select('*').order('id', { ascending: false }),
      supabase.from('rab').select('*').order('id', { ascending: false }),
      supabase.from('payments').select('*').order('payment_date', { ascending: false })
    ])
    const setters = [setProjects, setCustomers, setRab, setPayments]
    let errors = []
    results.forEach((r, i) => { setters[i](r.data || []); if (r.error) errors.push(r.error.message) })
    if (errors.length) setMessage('Ada tabel yang belum dapat dibaca: ' + errors.join(' · '))
    setBusy(false)
  }

  useEffect(() => { loadData() }, [session])

  async function signIn(e) {
    e.preventDefault(); setBusy(true); setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    setBusy(false)
  }

  async function signOut() { await supabase.auth.signOut(); setSession(null) }

  if (!supabase) return <Setup />
  if (!session) return <main className="login-wrap"><section className="login-card">
    <div className="brand-mark">F</div><p className="eyebrow">FURNIX SPACE</p><h1>FURNIX ADMIN</h1>
    <p className="muted">Masuk ke sistem administrasi proyek</p>
    <form onSubmit={signIn}>
      <label>Email pemilik</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@furnix.com" required />
      <label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password akun Supabase" required />
      <button className="primary full" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
    </form>
    {message && <p className="notice">{message}</p>}
    <p className="tiny">Akun dibuat melalui Supabase Authentication. Jangan bagikan password.</p>
  </section></main>

  const total = projects.reduce((s,p)=>s+Number(p.project_value||0),0)
  return <div className="app-shell">
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark small">F</div><div><b>FURNIX</b><small>ADMIN SYSTEM</small></div></div>
      <div className="nav-label">MENU UTAMA</div>
      {nav.map(([name, Icon]) => <button key={name} className={'nav-item '+(page===name?'active':'')} onClick={()=>{setPage(name);setMobileNav(false)}}><Icon size={18}/>{name}</button>)}
      <div className="sidebar-bottom"><span className="owner-dot"></span><div><b>Owner</b><small>{session.user.email}</small></div><button className="icon-btn" onClick={signOut} title="Keluar"><LogOut size={17}/></button></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-btn mobile-only" onClick={()=>setMobileNav(!mobileNav)}><Menu/></button><div><span className="eyebrow">FURNIX SPACE</span><h2>{page}</h2></div><button className="refresh" onClick={loadData}><RefreshCw size={16}/> Refresh</button></header>
      {message && <div className="notice">{message}</div>}
      {page==='Dashboard' && <>
        <div className="welcome"><div><p className="eyebrow gold">RINGKASAN BISNIS</p><h1>Selamat datang kembali.</h1><p className="muted">Pantau proyek dan administrasi Furnix dari satu tempat.</p></div><span className="welcome-tag">OWNER PANEL</span></div>
        <div className="stats">
          <Stat label="Total Proyek" value={projects.length}/>
          <Stat label="Nilai Kontrak" value={rupiah(total)}/>
          <Stat label="Data RAB" value={rab.length}/>
          <Stat label="Transaksi" value={payments.length}/>
        </div>
        <ProjectTable projects={projects}/>
      </>}
      {page==='Project' && <ProjectTable projects={projects}/>}
      {page==='Customer' && <DataTable title="Daftar Customer" rows={customers} columns={['id','name','phone','address']}/>}
      {page==='RAB' && <DataTable title="Rincian RAB" rows={rab} columns={['project_id','category','item_name','volume','unit','unit_price','total_price']}/>}
      {page==='Pembayaran' && <DataTable title="Riwayat Pembayaran" rows={payments} columns={['project_id','payment_date','payment_type','amount','payment_method','payment_status']}/>}
      <footer>FURNIX SPACE · INTERNAL ADMINISTRATION</footer>
    </main>
  </div>
}

function Setup(){ return <main className="login-wrap"><section className="login-card"><div className="brand-mark">F</div><p className="eyebrow">FURNIX SPACE</p><h1>Konfigurasi diperlukan</h1><p className="muted">Aplikasi belum menerima alamat Supabase dan kunci publik. Isi Environment Variables di Vercel sebelum login digunakan.</p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code></section></main> }
function Stat({label,value}) { return <section className="stat"><span>{label}</span><strong>{value}</strong></section> }
function ProjectTable({projects}) { return <section className="panel"><div className="panel-head"><div><p className="eyebrow">PORTOFOLIO</p><h3>Daftar Proyek</h3></div><span className="count">{projects.length} proyek</span></div><div className="table-scroll"><table><thead><tr><th>Nama Proyek</th><th>Alamat</th><th>Nilai Kontrak</th><th>Status</th><th>Target Selesai</th></tr></thead><tbody>{projects.map(p=><tr key={p.id}><td><b>{p.project_name}</b><small>#{p.id}</small></td><td>{p.project_address||'—'}</td><td>{rupiah(p.project_value)}</td><td><span className="status">{p.status}</span></td><td>{p.target_completion||'—'}</td></tr>)}{!projects.length&&<tr><td colSpan="5" className="empty">Belum ada data proyek atau akses tabel belum diatur.</td></tr>}</tbody></table></div></section> }
function DataTable({title,rows,columns}) { return <section className="panel"><div className="panel-head"><h3>{title}</h3><span className="count">{rows.length} data</span></div><div className="table-scroll"><table><thead><tr>{columns.map(c=><th key={c}>{c.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||i}>{columns.map(c=><td key={c}>{['amount','unit_price','total_price'].includes(c)?rupiah(r[c]):String(r[c]??'—')}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={columns.length} className="empty">Belum ada data.</td></tr>}</tbody></table></div></section> }
