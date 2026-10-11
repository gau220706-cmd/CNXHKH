# Study Hub — Ứng dụng Ôn tập Thông minh & Tương tác

Study Hub là ứng dụng web ôn tập kiến thức hiện đại, nhẹ nhàng, thân thiện và giàu tính tương tác, được xây dựng theo chuẩn Single-Page Application (SPA) tối ưu hóa cho cả điện thoại, máy tính bảng và laptop.

Dự án hiện tại tích hợp toàn bộ ngân hàng câu hỏi môn học **Chủ nghĩa xã hội khoa học (CNXHKH)** với 204 câu hỏi trắc nghiệm chia theo 6 bài học.

---

## 🌟 Tính năng nổi bật

1. **Hai chế độ ôn tập chuyên biệt:**
   - **Ôn theo từng bài:** Tập trung vào một bài học cụ thể, thời gian 25:00, xáo trộn câu hỏi và phương án trả lời.
   - **Ôn tập hỗn hợp (50 câu):** Thử thách toàn diện trong 40:00 với 50 câu hỏi phân bổ công bằng, bao phủ toàn bộ các bài học.

2. **Chấm điểm tức thì (Instant Feedback):**
   - Làm câu nào được chấm ngay câu đó, không phải chờ đến cuối bài.
   - Khóa câu hỏi sau khi chấm để tránh gian lận.
   - Hiển thị phản hồi tích cực, lời khen ngợi hoặc động viên tâm lý ấm áp cùng giải thích chi tiết.
   - Hiệu ứng âm thanh nhẹ nhàng bằng Web Audio API (không phụ thuộc file ngoài, tắt/bật tùy ý).

3. **Bảo lưu tiến độ & khôi phục phiên:**
   - Bộ đếm thời gian thực tính theo timestamp `(startTime + plannedDuration) - Date.now()`.
   - Tải lại trang hoặc chuyển tab không mất tiến độ phiên đang làm dở.
   - Tự động hoàn thành và tổng kết khi hết thời gian thi.

4. **Lưu trữ cục bộ an toàn (IndexedDB + Dexie.js):**
   - Kết quả, lịch sử, điểm số, XP và huy hiệu lưu trực tiếp trên trình duyệt của người dùng.
   - Không yêu cầu backend, không lưu dữ liệu cá nhân lên máy chủ công cộng.
   - Hỗ trợ xuất (Export) và nhập (Import) dữ liệu sao lưu định dạng JSON có kiểm tra schema phiên bản.

5. **Gamification & Tổng kết chi tiết:**
   - Hệ thống XP (+10 XP/câu đúng, +50 XP/phiên hoàn thành).
   - Hệ thống 6 huy hiệu thành tích độc đáo.
   - Màn hình tổng kết: Điểm thang 10, tỷ lệ chính xác %, danh sách chi tiết các câu sai và nút "Ôn lại các câu sai" chỉ với một click.

6. **Giao diện hiện đại & Khả năng truy cập:**
   - Thiết kế Glassmorphism tinh tế, màu sắc dịu mắt.
   - Hỗ trợ Chế độ Sáng / Tối (Dark / Light Theme).
   - Tương thích Responsive trên mọi kích thước màn hình.
   - Hỗ trợ giảm chuyển động (`prefers-reduced-motion`) và bàn phím.

---

## 📁 Cấu trúc thư mục

```
c:\CNXHKH\
├── public\
│   └── data\
│       ├── subjects.json       # Danh mục môn học
│       ├── lessons.json        # Danh mục 6 bài học
│       └── questions.json      # 204 câu hỏi trắc nghiệm đã chuẩn hóa
├── src\
│   ├── components\
│   │   ├── Navbar.tsx          # Thanh điều hướng, XP, theme toggle
│   │   ├── Dashboard.tsx       # Trang chủ, chọn chế độ & danh sách bài
│   │   ├── StudySessionView.tsx # Giao diện phòng thi & chấm tức thì
│   │   ├── SummaryView.tsx     # Màn hình tổng kết & ôn lại câu sai
│   │   ├── HistoryView.tsx     # Xem lịch sử các phiên & chi tiết
│   │   └── SettingsBackupModal.tsx # Cài đặt âm thanh, xáo trộn & sao lưu JSON
│   ├── data\                   # Dữ liệu dự phòng TypeScript
│   ├── db\
│   │   └── index.ts            # Tầng lưu trữ IndexedDB (Dexie.js)
│   ├── services\
│   │   ├── questionService.ts  # Xáo trộn, phân bổ đề thi hỗn hợp, lời khen
│   │   ├── sessionService.ts   # Quản lý phiên, chấm điểm, tính XP
│   │   └── soundService.ts     # Hiệu ứng âm thanh bằng Web Audio API
│   ├── types\
│   │   └── index.ts            # Định nghĩa kiểu dữ liệu TypeScript
│   ├── App.tsx                 # Điều phối state chính của ứng dụng
│   ├── index.css               # Design system, CSS variables & animations
│   └── main.tsx                # Entry point
├── dist\                       # Bản build tĩnh production (GitHub Pages ready)
├── package.json
├── vite.config.ts              # Base './' hỗ trợ deploy tĩnh mọi nơi
└── tsconfig.json
```

---

## 🚀 Hướng dẫn chạy và triển khai

### 1. Chạy môi trường phát triển (Local Dev)
```bash
npm install
npm run dev
```
Truy cập: `http://localhost:3000/`

### 2. Đóng gói triển khai tĩnh (GitHub Pages / Vercel / Netlify)
```bash
npm run build
```
Thư mục `dist/` được tối ưu hóa hoàn toàn tĩnh, đường dẫn asset tương đối `./` sẵn sàng đưa lên GitHub Pages hoặc bất kỳ dịch vụ hosting nào mà không cần cấu hình thêm.
