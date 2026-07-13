import { NavLink, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './lib/store.jsx'
import { IcFlag, IcHome, IcSpark, IcUser, IcUsers } from './components/Icons.jsx'
import Home from './screens/Home.jsx'
import Challenges from './screens/Challenges.jsx'
import Together from './screens/Together.jsx'
import Coach from './screens/Coach.jsx'
import Profile from './screens/Profile.jsx'
import Onboarding from './screens/Onboarding.jsx'

const TABS = [
  { to: '/', label: '홈', Icon: IcHome, end: true },
  { to: '/challenges', label: '챌린지', Icon: IcFlag },
  { to: '/together', label: '함께', Icon: IcUsers },
  { to: '/coach', label: '코치', Icon: IcSpark },
  { to: '/profile', label: '나', Icon: IcUser },
]

function Shell() {
  const { state } = useStore()

  if (!state.profile.onboarded) {
    return (
      <div className="app-shell">
        <Onboarding />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/together" element={<Together />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <nav className="tabbar">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
