const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. CẤU HÌNH LƯU FILE (MULTER) ---
// Tạo folder uploads nếu chưa có
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Cấu hình nơi lưu và tên file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Lưu vào folder 'uploads'
    },
    filename: (req, file, cb) => {
        // Đặt tên file = thời gian hiện tại + đuôi file (để tránh trùng tên)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Mở folder uploads ra public để React có thể truy cập ảnh
app.use('/uploads', express.static(uploadDir));

// --- 2. KẾT NỐI DATABASE (MYSQL) ---
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'christmas_db',
    port: 3307 // Chú ý: Phải trùng với cổng trong docker-compose
});

// Tự động tạo bảng 'photos' nếu chưa có
const initDb = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS photos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.query(sql, (err) => {
        if (err) console.error("Lỗi tạo bảng:", err);
        else console.log("Database đã sẵn sàng!");
    });
};
initDb();

// --- 3. VIẾT API (CÁC CHỨC NĂNG) ---

// API 1: Lấy danh sách ảnh
app.get('/api/photos', (req, res) => {
    const sql = 'SELECT * FROM photos ORDER BY created_at ASC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Trả về danh sách ảnh kèm đường dẫn đầy đủ
        const photos = results.map(photo => ({
            id: photo.id,
            url: `http://localhost:3000/uploads/${photo.filename}`
        }));
        res.json(photos);
    });
});

// API 2: Upload ảnh mới
app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Chưa chọn file!' });

    const filename = req.file.filename;
    const sql = 'INSERT INTO photos (filename) VALUES (?)';
    
    db.query(sql, [filename], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
            message: 'Upload thành công!',
            photo: {
                id: result.insertId,
                url: `http://localhost:3000/uploads/${filename}`
            }
        });
    });
});

// API 3: Xóa toàn bộ ảnh (Reset)
app.delete('/api/reset', (req, res) => {
    // 1. Xóa trong DB
    db.query('TRUNCATE TABLE photos', (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // 2. Xóa file trong ổ cứng
        fs.readdir(uploadDir, (err, files) => {
            if (files) {
                for (const file of files) {
                    fs.unlink(path.join(uploadDir, file), () => {});
                }
            }
        });
        
        res.json({ message: 'Đã xóa sạch dữ liệu!' });
    });
});

// Chạy Server
app.listen(3000, () => {
    console.log('Server Backend đang chạy tại http://localhost:3000');
});