async function submitBook() {
  if (editingId.value) {
    await fetch(`${API_URL}/${editingId.value}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });
  } else {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });
  }

  resetForm();
  loadBooks();
}