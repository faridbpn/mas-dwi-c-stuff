export function applyHighlightState(mesh, { isMatch, active }) {
    const material = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    material.forEach((m) => {
        if (!active || isMatch) {
            // gak ada filter aktif atau buku ini cocok => tampilan solid
            m.transparent = false;
            m.opacity = 1;
            m.depthWrite = true;
            if (m.emissive) m.emissive.setHex(active ? 0xffd76a : 0x000000);
            if (m.emissiveIntencity !== undefined) m.emissiveIntencity = active ? 0.5 : 0; 
        } else {
            // filter aktif TAPI buku ini gak cocok => tampilan redup
            m.transparent = true;
            m.opacity = 0.15;
            m.depthWrite = false;
            if (m.emissive) m.emissive.setHex(0x000000);
            if (m.emissiveIntencity !== undefined) m.emissiveIntencity = 0; 
        }
        m.needsUpdate = true;
    });
}