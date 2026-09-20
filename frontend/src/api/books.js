const API_URL = "http://localhost:8080/books";

export async function fetchBooks() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(API_URL, { signal: controller.signal });
        if (!res.ok) throw new Error("Gagal memuat buku");
        return res.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function createBook(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        if (!res.ok) throw new Error("Gagal menambahkan buku");
        return res.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function updateBook(id, payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        if (!res.ok) throw new Error("Gagal mengupdate buku");
        return res.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function deleteBook(id) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(`${API_URL}/${id}`, { 
            method: "DELETE",
            signal: controller.signal,
        });
        if (!res.ok) throw new Error("Gagal menghapus buku");
    } finally {
        clearTimeout(timeoutId);
    }
}