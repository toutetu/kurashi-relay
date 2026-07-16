import { Outlet } from "react-router-dom";
import { MamaKajiProvider } from "../features/mamakaji/context/MamaKajiContext";

export function MamaKajiLayout() {
  return (
    <MamaKajiProvider>
      <Outlet />
    </MamaKajiProvider>
  );
}
