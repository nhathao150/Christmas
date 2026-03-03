# 🎄 3D Christmas Tree — Interactive Holiday Magic

> Cây thông Noel 3D tương tác với nhận diện cử chỉ tay AI, đồ họa Three.js và hệ thống lưu trữ ảnh Fullstack.

---

## ✨ Tính năng nổi bật

| Tính năng | Mô tả |
|---|---|
| 🌟 **Đồ họa 3D** | Hàng nghìn hạt (particles) với hiệu ứng Bloom phát sáng |
| ❄️ **Tuyết rơi** | 800 hạt tuyết chuyển động tự nhiên |
| 🤖 **AI Gesture Control** | Điều khiển bằng cử chỉ tay qua Webcam (MediaPipe) |
| 📸 **Upload ảnh Fullstack** | Lưu ảnh vĩnh viễn vào MySQL, hiển thị trên cây 3D |
| 🎶 **Nhạc nền** | Nhạc Giáng sinh tự động phát khi vào trang |
| 💛 **Hiệu ứng Trái tim** | Ghép 2 tay tạo hình trái tim từ các hạt |

---

## 🤖 Cử chỉ điều khiển

| Cử chỉ | Hiệu ứng |
|---|---|
| 🖐 **Xòe 5 ngón** | Nổ tung — các hạt bay lơ lửng |
| ✊ **Nắm tay** | Thu hồi — hạt về hình cây thông |
| 👌 **Chụm ngón (1 tay)** | Focus Mode — phóng to một tấm ảnh |
| 🫶 **Ghép 2 tay hình tim** | Heart Mode — hạt xếp thành trái tim hồng |

---

## 🛠️ Tech Stack

### Frontend
- **React + Vite** — Framework & Build tool
- **TypeScript** — Ngôn ngữ lập trình
- **Three.js / React Three Fiber** — Đồ họa 3D
- **MediaPipe** — Nhận diện cử chỉ tay (AI)

### Backend
- **Node.js & Express** — API Server
- **Multer** — Xử lý upload file
- **MySQL 8.0** — Cơ sở dữ liệu

### DevOps
- **Docker & Docker Compose** — Container hoá MySQL

---

## 🚀 Cài đặt & Chạy dự án

Yêu cầu: **Docker Desktop**, **Node.js ≥ 18**

Cần mở **3 Terminal** riêng biệt:

### Terminal 1 — Database (MySQL)
```bash
# Tại thư mục gốc dự án
docker-compose up -d
```
> Chờ ~15–30s để MySQL khởi động hoàn toàn.

### Terminal 2 — Backend
```bash
cd server
npm install     # Chỉ cần làm lần đầu
node index.js
```
> Server chạy tại: `http://localhost:3000`

### Terminal 3 — Frontend
```bash
# Tại thư mục gốc
npm install     # Chỉ cần làm lần đầu
npm run dev
```
> Truy cập: `http://localhost:5173`

---

## 🔧 Cấu hình kết nối

| Thành phần | Giá trị |
|---|---|
| MySQL Host | `localhost` |
| MySQL Port | `3307` |
| MySQL Database | `christmas_db` |
| MySQL Password | `root` |
| Backend Port | `3000` |
| Frontend Port | `5173` |

---

## 📂 Cấu trúc thư mục

```
CHRISTMAS-TREE/
├── docker-compose.yml   # Cấu hình MySQL Docker
├── server/              # Backend (Node.js + Express)
│   ├── index.js         # API: upload, lấy ảnh, reset
│   └── uploads/         # Ảnh người dùng upload
├── src/                 # Frontend (React + Three.js)
│   ├── App.tsx          # Logic chính: 3D + AI + UI
│   └── index.css        # Giao diện & animations
└── public/
    └── sound/           # Nhạc nền Giáng sinh
```

---

## 🐳 Quản lý Docker

```bash
# Khởi động
docker-compose up -d

# Kiểm tra trạng thái
docker ps

# Xem log MySQL
docker logs christmas_mysql

# Dừng (giữ data)
docker-compose down

# Dừng + xóa sạch data
docker-compose down -v
```

---

## 👤 Tác giả

**Nhật Hào** — Developer & Creator  
© 2025 Christmas Tree 3D Project

---

*Chúc bạn một mùa Giáng sinh an lành và ấm áp! 🎄🎅*
