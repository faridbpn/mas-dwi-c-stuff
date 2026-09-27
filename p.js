export function applyHighlightState(mesh, { isMatch, active }) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

  materials.forEach((m) => {
    if (!active || isMatch) {
      // gak ada filter aktif, ATAU buku ini cocok -> tampil solid + glow tipis kalau match
      m.transparent = false;
      m.opacity = 1;
      m.depthWrite = true;
      if (m.emissive) m.emissive.setHex(active ? 0xffd76a : 0x000000);
      if (m.emissiveIntensity !== undefined) m.emissiveIntensity = active ? 0.5 : 0;
    } else {
      // filter aktif TAPI buku ini gak cocok -> redupin, transparan
      m.transparent = true;
      m.opacity = 0.15;
      m.depthWrite = false;
      if (m.emissive) m.emissive.setHex(0x000000);
      if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 0;
    }
    m.needsUpdate = true; // WAJIB, biar perubahan `transparent` ke-apply ulang ke shader
  });
}