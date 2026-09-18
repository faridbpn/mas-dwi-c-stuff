const API_URL = "http://localhost:8080/books";

export async function fetchBooks() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Gagal memuat buku");
    return res.json();
}

export async function createBook(payload) {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Gagal menambahkan buku");
    return res.json();
}

export async function updateBook(id, payload) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Gagal mengupdate buku");
    return res.json();
}

export async function deleteBook(id) {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Gagal menghapus buku");
}