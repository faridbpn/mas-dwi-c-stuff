async function submitBook() {
  try {
    const url = editingId.value ? `${API_URL}/${editingId.value}` : API_URL;
    const method = editingId.value ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Gagal simpan buku:", err);
      alert("Gagal menyimpan buku. Cek console untuk detail.");
      return;
    }
  } catch (e) {
    console.error("Network error:", e);
    alert("Gagal menghubungi server. Pastikan server C++ sedang berjalan.");
    return;
  }
  resetForm();
  loadBooks();
}