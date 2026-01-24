import { ReactComponent as MaleBody } from '@/assets/male.svg';
import './styles.css';
import { useState } from 'react';
import MuscleZones from '@/components/MuscleZones';
import Drawer from '@/components/Drawer';
import zones, { MuscleZone } from '@/constants/zones';

export default function Avatar() {
  const [activeZone, setActiveZone] = useState<MuscleZone | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const zoneGroup = target.closest('g[data-zone]');

    if (!zoneGroup) return;

    const zoneId = zoneGroup.getAttribute('data-zone');
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    setActiveZone(zone);
    setTimeout(() => {
      openZone(zone);
    }, 300);
  };

  const onListClick = (zone: MuscleZone) => {
    setActiveZone(zone);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openZone = (zone: MuscleZone) => {
    setActiveZone(zone);
    setDrawerOpen(true);
  };

  return (
    <>
      <div className="avatar-wrapper glass mb-5 md:mb-0 md:mr-5">
        <MaleBody
          onClick={onClick}
          width={250}
          data-active-zone={activeZone?.id ?? ''}
          className="avatar"
        />
      </div>

      <MuscleZones zones={zones} onListClick={onListClick} />

      {activeZone && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} header={activeZone.label}>
          <p>{activeZone.description}</p>
        </Drawer>
      )}
    </>
  );
}
