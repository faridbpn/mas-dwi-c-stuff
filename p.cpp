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
    std::string status;
};

// escape 1 field: bungkus kutip kalau ada koma/kutip/newline
std::string csvEscape(const std::string& field) {
    bool needsQuoting = field.find(',') != std::string::npos ||
                        field.find('"') != std::string::npos ||
                        field.find('\n') != std::string::npos;
    if (!needsQuoting) return field;

    std::string escaped = "\"";
    for (char c : field) {
        if (c == '"') escaped += "\"\""; // " jadi ""
        else escaped += c;
    }
    escaped += "\"";
    return escaped;
}

// parse 1 baris CSV yang mungkin ada field ber-quote
std::vector<std::string> parseCsvLine(const std::string& line) {
    std::vector<std::string> cells;
    std::string current;
    bool inQuotes = false;

    for (size_t i = 0; i < line.size(); i++) {
        char c = line[i];
        if (inQuotes) {
            if (c == '"') {
                if (i + 1 < line.size() && line[i + 1] == '"') {
                    current += '"'; // "" -> "
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += c;
            }
        } else {
            if (c == '"') {
                inQuotes = true;
            } else if (c == ',') {
                cells.push_back(current);
                current.clear();
            } else {
                current += c;
            }
        }
    }
    cells.push_back(current);
    return cells;
}

// write all book in csv
void writeBooks(const std::vector<Book>& books) {
    std::ofstream file("books.csv");
    file << "id,title,author,year,status\n";
    for (const auto& b : books) {
        file << b.id << ","
             << csvEscape(b.title) << ","
             << csvEscape(b.author) << ","
             << b.year << ","
             << csvEscape(b.status) << "\n";
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

        auto cells = parseCsvLine(line);
        if (cells.size() < 4) continue; // baris rusak, skip aja daripada crash

        Book b;
        try {
            b.id = std::stoi(cells[0]);
            b.title = cells[1];
            b.author = cells[2];
            b.year = std::stoi(cells[3]);
            b.status = cells.size() > 4 ? cells[4] : "mau_dibaca";
        } catch (const std::exception&) {
            continue; // baris korup dari format lama, skip daripada bikin server crash
        }
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

    svr.Get("/books", [](const httplib::Request&, httplib::Response& res) {
        auto books = readBooks();
        json arr = json::array();
        for (auto& b : books) arr.push_back(bookToJson(b));
        res.set_content(arr.dump(), "application/json");
    });

    svr.Post("/books", [](const httplib::Request& req, httplib::Response& res) {
        try {
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
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(R"({"error":"Data tidak valid"})", "application/json");
        }
    });

    svr.Put(R"(/books/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        try {
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
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(R"({"error":"Data tidak valid"})", "application/json");
        }
    });

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