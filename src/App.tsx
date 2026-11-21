import React, { useEffect, useRef, useState } from 'react';
import { useStore, type Nav, type Transition } from './state/store';
import { Sky } from './scenes/Sky';
import { Welcome } from './screens/Welcome';
import { Years } from './screens/Years';
import { Months } from './screens/Months';
import { Garden } from './screens/Garden';
import { MemoryView } from './screens/MemoryView';
import { CreateMemory } from './screens/CreateMemory';
import { Friends } from './screens/Friends';
import { Archive } from './screens/Archive';
import './styles/global.css';
import './styles/screens.css';

function ScreenFor({ nav }: { nav: Nav }) {
  switch (nav.screen) {
    case 'welcome': return <Welcome />;
    case 'years': return <Years />;
    case 'months': return <Months />;
    case 'garden': return <Garden />;
    case 'memory': return <MemoryView />;
    case 'create': return <CreateMemory />;
    case 'friends': return <Friends />;
    case 'archive': return <Archive />;
  }
}

const keyOf = (n: Nav) => `${n.screen}:${n.year}:${n.month}:${n.memoryId ?? ''}:${n.editId ?? ''}:${n.newDate ?? ''}`;

export default function App() {
  const ready = useStore((s) => s.ready);
  const nav = useStore((s) => s.nav);
  const transition = useStore((s) => s.transition);
  const toast = useStore((s) => s.toast);
  const init = useStore((s) => s.init);
  const [prev, setPrev] = useState<{ nav: Nav; cls: Transition } | null>(null);
  const lastNav = useRef<Nav>(nav);

  useEffect(() => { void init(); }, [init]);

  useEffect(() => {
    if (keyOf(lastNav.current) !== keyOf(nav)) {
      const old = lastNav.current;
      lastNav.current = nav;
      setPrev({ nav: old, cls: transition });
      const id = window.setTimeout(() => setPrev(null), 650);
      return () => window.clearTimeout(id);
    }
  }, [nav, transition]);

  return (
    <>
      <Sky />
      <div className="app">
        {ready && (
          <>
            {prev && (
              <div className={`layer exiting ${prev.cls}`} key={`prev-${keyOf(prev.nav)}`}>
                <ScreenFor nav={prev.nav} />
              </div>
            )}
            <div key={keyOf(nav)} className={`layer ${transition}`}>
              <ScreenFor nav={nav} />
            </div>
          </>
        )}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </>
  );
}
