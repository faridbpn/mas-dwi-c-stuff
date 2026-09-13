// Izinkan diakses dari browser (CORS)
svr.set_default_headers({
    {"Access-Control-Allow-Origin", "*"},
    {"Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"},
    {"Access-Control-Allow-Headers", "Content-Type"}
});
svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
    res.status = 200;
});