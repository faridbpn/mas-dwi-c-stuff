#include "httplib.h"
#include "json.hpp"
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <algorithm>

using json = nlohmann::json;

struct Book {
    int id;
    std::string title;
    std::string author;
    int year;
    std::string status; // "mau_dibaca" | "sedang_dibaca" | "sudah_dibaca"
};

// write all book in csv
void writeBooks(const std::vector<Book>& books) {
    std::ofstream file("books.csv");
    file << "id,title,author,year,status\n";
    for (const auto& b : books) {
        file << b.id << "," << b.title << "," << b.author << "," << b.year << "," << b.status << "\n";
    }
}

// read all book data from csv
std::vector<Book> readBooks() {
    std::vector<Book> books;
    std::ifstream file("books.csv");

    std::string line;
    bool isHeader = true;
    while (std::getline(file, line)) {
        if (isHeader) { isHeader = false; continue; }
        if (line.empty()) continue;

        std::stringstream ss(line);
        std::string cell;
        std::vector<std::string> cells;
        while (std::getline(ss, cell, ',')) {
            cells.push_back(cell);
        }

        Book b;
        b.id = std::stoi(cells[0]);
        b.title = cells[1];
        b.author = cells[2];
        b.year = std::stoi(cells[3]);
        // backward compat: csv lama belum punya kolom status
        b.status = cells.size() > 4 ? cells[4] : "mau_dibaca";
        books.push_back(b);
    }
    return books;
}

// look fot biggest id to find latest books
int getNextId(const std::vector<Book>& books) {
    int maxId = 0;
    for (const auto& b : books) maxId = std::max(maxId, b.id);
    return maxId + 1;
}

// convert 1 book to json object
json bookToJson(const Book& b) {
    return json{ {"id", b.id}, {"title", b.title}, {"author", b.author}, {"year", b.year}, {"status", b.status} };
}

int main() {
    httplib::Server svr;

    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type"}
    });
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        res.status = 200;
    });

    // GET /books -> get all book data
    svr.Get("/books", [](const httplib::Request&, httplib::Response& res) {
        auto books = readBooks();
        json arr = json::array();
        for (auto& b : books) arr.push_back(bookToJson(b));
        res.set_content(arr.dump(), "application/json");
    });

    // POST /books -> add new book
    svr.Post("/books", [](const httplib::Request& req, httplib::Response& res) {
        json body = json::parse(req.body);

        auto books = readBooks();
        Book b;
        b.id = getNextId(books);
        b.title = body.value("title", "");
        b.author = body.value("author", "");
        b.year = body.value("year", 0);
        b.status = body.value("status", "mau_dibaca");

        books.push_back(b);
        writeBooks(books);

        res.status = 201;
        res.set_content(bookToJson(b).dump(), "application/json");
    });

    // PUT update
    svr.Put(R"(/books/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        int id = std::stoi(req.matches[1]);
        auto books = readBooks();

        for (auto& b : books) {
            if (b.id == id) {
                json body = json::parse(req.body);
                b.title = body.value("title", b.title);
                b.author = body.value("author", b.author);
                b.year = body.value("year", b.year);
                b.status = body.value("status", b.status);
                writeBooks(books);
                res.set_content(bookToJson(b).dump(), "application/json");
                return;
            }
        }
        res.status = 404;
        res.set_content(R"({"error":"Buku tidak ditemukan"})", "application/json");
    });

    // DELETE hapus buku
    svr.Delete(R"(/books/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        int id = std::stoi(req.matches[1]);
        auto books = readBooks();

        auto it = std::remove_if(books.begin(), books.end(),
            [id](const Book& b) { return b.id == id; });
        if (it == books.end()) {
            res.status = 404;
            res.set_content(R"({"error":"Buku tidak ditemukan"})", "application/json");
            return;
        }
        books.erase(it, books.end());
        writeBooks(books);
        res.set_content(R"({"message":"Buku terhapus"})", "application/json");
    });

    std::cout << "Server jalan di http://localhost:8080\n";
    svr.listen("0.0.0.0", 8080);
}