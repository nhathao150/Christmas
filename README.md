```markdown
# 🎄 3D Christmas Tree - Interactive Holiday Magic

Một dự án cây thông Noel 3D tương tác sử dụng công nghệ nhận diện cử chỉ tay (AI), hiệu ứng đồ họa Three.js và hệ thống lưu trữ ảnh Fullstack.

![Project Preview](public/photos/preview.jpg)
*(Bạn có thể thay thế dòng này bằng link ảnh demo dự án của bạn)*

---

## ✨ Tính năng nổi bật

* **🌟 Đồ họa 3D lộng lẫy:** Cây thông được tạo từ hàng ngàn hạt (particles) với hiệu ứng Bloom phát sáng, tuyết rơi và ánh kim sang trọng.
* **🤖 Điều khiển bằng AI (Hand Gestures):** Sử dụng MediaPipe để điều khiển cây thông qua Webcam:
    * 🖐 **Xòe tay (5 ngón):** Hiệu ứng nổ tung (Disperse), các hạt bay lơ lửng.
    * ✊ **Nắm tay:** Thu các hạt về thành hình cây thông (Assemble).
    * 👌 **Chụm ngón (Cái + Trỏ):** Chế độ xem ảnh (Focus Mode) - Phóng to một tấm ảnh bất kỳ.
* **📸 Upload ảnh Fullstack:** * Người dùng có thể tải ảnh từ máy lên.
    * Ảnh được lưu trữ vĩnh viễn trong Database (MySQL) và ổ cứng Server.
    * Hiệu ứng "treo ảnh" lên cây thông 3D.
* **🎶 Âm thanh & Giao diện:** Nhạc nền tự động, giao diện hướng dẫn trực quan.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

### Frontend
* **React (Vite):** Framework chính.
* **Three.js / React Three Fiber:** Xử lý đồ họa 3D.
* **MediaPipe:** Nhận diện cử chỉ tay (AI).
* **TypeScript:** Ngôn ngữ lập trình.

### Backend
* **Node.js & Express:** API Server.
* **Multer:** Xử lý upload file.
* **MySQL:** Cơ sở dữ liệu lưu trữ thông tin ảnh.

### DevOps
* **Docker & Docker Compose:** Đóng gói và chạy MySQL Database.

---

## 🚀 Hướng dẫn cài đặt & Chạy dự án

Để chạy dự án này, bạn cần mở **3 cửa sổ Terminal** tương ứng với 3 thành phần: Database, Backend và Frontend.

### Bước 1: Khởi động Database (MySQL)
Tại thư mục gốc của dự án, chạy lệnh:

```bash
docker-compose up -d

```

*Chờ khoảng 15-30s để Database khởi động thành công.*

### Bước 2: Chạy Backend (Server)

Mở một Terminal mới, di chuyển vào thư mục server và chạy:

```bash
cd server
npm install  # Cài đặt thư viện (chỉ cần làm lần đầu)
npm start

```

*Server sẽ chạy tại: `http://localhost:3000*`

### Bước 3: Chạy Frontend (React App)

Mở một Terminal mới (tại thư mục gốc), chạy:

```bash
npm install  # Cài đặt thư viện (chỉ cần làm lần đầu)
npm run dev

```

*Truy cập vào đường dẫn hiện ra (thường là `http://localhost:5173`) để trải nghiệm.*

---

## 🎮 Hướng dẫn sử dụng

1. **Cấp quyền Camera:** Khi mở web lần đầu, hãy cho phép trình duyệt truy cập Webcam để AI hoạt động.
2. **Đọc hướng dẫn:** Một Popup sẽ hiện ra, nhấn **OK** để bắt đầu (nhạc sẽ tự phát).
3. **Tương tác:** Đưa tay lên trước Camera và thử các cử chỉ (Nắm, Xòe, Chụm).
4. **Thêm ảnh:** Nhấn nút **THÊM ẢNH** màu vàng để upload ảnh kỷ niệm của bạn lên cây thông.

---

## 📂 Cấu trúc thư mục

```text
CHRISTMAS-TREE/
├── docker-compose.yml   # Cấu hình MySQL Docker
├── server/              # Source code Backend
│   ├── uploads/         # Nơi chứa ảnh người dùng upload
│   ├── index.js         # Logic API
│   └── ...
├── src/                 # Source code Frontend (React)
│   ├── App.tsx          # Logic chính (3D + AI)
│   ├── index.css        # Giao diện (Styling)
│   └── ...
└── ...

```

---

## 👤 Tác giả

**Nhật Hào**

* Developer & Creator of this project.
* © 2025 Christmas Tree 3D Project.

---

*Chúc bạn có một mùa Giáng sinh an lành và ấm áp! 🎄🎅*
