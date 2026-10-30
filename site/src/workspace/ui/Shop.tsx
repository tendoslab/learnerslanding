import { Hammer } from 'lucide-react';
import { useWorkspace } from '../store';
import { DECOR } from '../rewards';

export default function Shop({ onBuild }: { onBuild: (itemId: string) => void }) {
  const coins = useWorkspace((s) => s.coins);
  const inventory = useWorkspace((s) => s.inventory);
  const buy = useWorkspace((s) => s.buy);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-honey/30 bg-honey/10 p-3 text-center text-xs text-yellow-50">
        Earn coins by finishing focus sessions (1 per minute + bonus) and checking off tasks. Spend them here, then place items in your village.
      </div>
      <ul className="space-y-2">
        {DECOR.map((item) => {
          const owned = inventory[item.id] ?? 0;
          const affordable = coins >= item.price;
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 transition hover:bg-white/10">
              <div className="flex h-14 w-14 shrink-0 items-end justify-center rounded-lg bg-black/25 p-1">
                <img src={`/sprites/decor/${item.id}.png`} alt="" className="pixelated max-h-full max-w-full" style={{ imageRendering: 'pixelated', height: Math.min(48, item.h * 2) }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-[11px] text-white/50">{item.desc}</p>
                {owned > 0 && (
                  <button onClick={() => onBuild(item.id)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-green-200 hover:text-green-100">
                    <Hammer size={11} /> {owned} in inventory · place
                  </button>
                )}
              </div>
              <button
                onClick={() => buy(item.id)}
                disabled={!affordable}
                className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-extrabold transition ${
                  affordable ? 'border-honey/40 bg-honey/20 text-yellow-100 hover:bg-honey/35' : 'cursor-not-allowed border-white/5 bg-white/5 text-white/30'
                }`}
              >
                {item.price} 🪙
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
