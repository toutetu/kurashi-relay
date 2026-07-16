import {
  POINT_PER_STAMP,
  remainingKajiForTicket,
  remainingPointsForTicket,
  TICKET_COST,
} from "../data";
import { useMamaKaji } from "../context/MamaKajiContext";

export function PointsChip() {
  const { points } = useMamaKaji();
  const remainingPt = remainingPointsForTicket(points);
  const remainingKaji = remainingKajiForTicket(points);

  return (
    <p className="mt-3 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mkj-line2)] bg-[var(--mkj-caramel-soft)] px-3 py-1.5 text-[11.5px] font-extrabold text-[var(--mkj-caramel-ink)]">
        🎫 {points}pt ／ 作る券まで あと{remainingPt}pt
        <span className="sr-only">（家事あと{remainingKaji}個ぶん）</span>
      </span>
    </p>
  );
}

export function TicketFooter({ points }: { points: number }) {
  const remainingKaji = remainingKajiForTicket(points);

  return (
    <span>
      🎫 作る券まで あと
      <b className="text-base font-extrabold text-[var(--mkj-rasp)]">
        {remainingKaji}個
      </b>
      <span className="sr-only">
        （{TICKET_COST}ポイント必要、現在{points}ポイント、1スタンプで
        {POINT_PER_STAMP}ポイント）
      </span>
    </span>
  );
}
