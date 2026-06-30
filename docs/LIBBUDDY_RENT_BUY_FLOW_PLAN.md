# Libbuddy - Ke hoach luong thue/mua sach

Tai lieu nay dung de doi chieu Libbuddy voi mot web thu vien hien dai: khach hang co the tim sach, duoc AI tu van, dang ky/dang nhap, thue/muon sach, mua sach, theo doi don va nhan ho tro ro rang.

## 1. Nguyen tac trai nghiem

- Khach hang khong thay khu admin trong navbar.
- Moi hanh dong co muc tieu ro: tim sach, hoi AI, luu sach, thue/muon, mua, theo doi.
- Gia, coc, phi giao nhan, han tra va vi tri sach phai hien thi truoc khi xac nhan.
- AI chi goi y sach co trong kho Libbuddy, khong bia sach ngoai du lieu.
- Admin/thu thu quan ly o URL rieng va can vai tro phu hop.

## 2. Luong dang ky/dang nhap

1. Khach vao `Dang ky` hoac `Dang nhap` tu navbar.
2. Chon vai tro:
   - Doc gia: tim sach, thue/mua, dat truoc, theo doi sach.
   - Thu thu: xu ly muon tra va kho sach sau khi duoc phan quyen.
3. Nhap email/so dien thoai va mat khau.
4. He thong thuc te can:
   - Goi API auth, nhan JWT/refresh token.
   - Luu session an toan bang httpOnly cookie.
   - Dieu huong theo vai tro: doc gia ve `/books` hoac `/my-books`, thu thu/admin ve `/admin`.
5. Ban hien tai:
   - UI dang ky/dang nhap da goi API auth that va luu JWT tren frontend.
   - Buoc production tiep theo la chuyen session sang httpOnly cookie/refresh token.

## 3. Luong thue/muon sach

1. Kham pha:
   - Khach vao `/books`, tim theo ten sach, tac gia, the loai, nhu cau doc.
   - Loc theo chu de, do kho va tinh trang con sach.
2. Ra quyet dinh:
   - Xem panel chi tiet sach: mo ta, doi tuong phu hop, vi tri ke, so ban con.
   - Neu chua chac, sang `/ai-advisor` de duoc goi y.
3. Bat dau don:
   - Bam `Thue/Muon sach` tren panel chi tiet.
   - He thong mo `/checkout?book=<id>&mode=rent`.
4. Xac thuc:
   - Neu chua dang nhap, yeu cau dang nhap/dang ky.
   - Neu da dang nhap, tiep tuc bang tai khoan hien tai.
5. Chon cach nhan:
   - Nhan tai thu vien: giu sach 24 gio tai quay.
   - Giao tan noi: nhap dia chi, tinh phi giao.
6. Thanh toan/xac nhan:
   - Hien phi thue, tien coc hoan tra, phi giao nhan neu co.
   - Xac nhan don va tao ma don.
7. Sau xac nhan:
   - Don xuat hien trong `Sach cua toi`.
   - Neu nhan tai thu vien: trang thai `Cho lay`.
   - Neu giao tan noi: trang thai `Dang xu ly` -> `Dang giao` -> `Da nhan`.
   - He thong gui thong bao han tra truoc 3 ngay.
8. Tra sach:
   - Khach tra tai quay hoac dat lich thu hoi.
   - Thu thu kiem tra tinh trang sach.
   - Hoan coc neu hop le, cap nhat lich su doc.

## 4. Luong mua sach

1. Khach vao `/books`, chon sach va bam `Mua ban ca nhan`.
2. He thong mo `/checkout?book=<id>&mode=buy`.
3. Xac thuc tai khoan.
4. Chon nhan tai thu vien hoac giao tan noi.
5. Hien gia mua, phi giao nhan, tong thanh toan.
6. Xac nhan don.
7. Sau xac nhan:
   - Don xuat hien trong lich su mua.
   - Neu co ban vat ly: cap nhat ton kho.
   - Neu co ban so trong tuong lai: cap quyen doc online.

## 5. Admin/thu thu can ho tro

- Dashboard tong quan van hanh.
- Kho sach: them sach, cap nhat ban in, vi tri ke, trang thai.
- Doc gia: ho so, trang thai muon, qua han, nhu cau doc.
- Muon tra: xu ly don thue/muon, tra sach, gia han, dat truoc.
- AI tu van: xem cau hoi, nhu cau doc moi, chat luong goi y.
- Bao cao: luot muon, nhu cau theo the loai, dau sach can bo sung.
- Cai dat: chinh sach thoi han, tien coc, phi, phan quyen.

## 6. Doi chieu hien tai

Da dat:
- Navbar khach hang da khong hien Admin.
- Co trang dang nhap va dang ky goi backend that.
- Co route `/checkout` cho ca `rent` va `buy`, tao order backend that.
- Kho sach co loc, chi tiet, nut thue/mua.
- AI advisor co prompt nhanh va goi y sach trong kho.
- `Sach cua toi` co tab dang muon, dat truoc, da luu, lich su.
- Admin co 7 tab chuc nang rieng.

Can lam tiep de dat cap san pham that:
- Noi auth frontend voi API JWT that.
- Luu session bang cookie an toan va route guard theo role.
- Tao bang Order/Checkout/Payment/Delivery trong backend.
- Mo rong `Sach cua toi` de hien them toan bo lich su order/payment/fulfillment.
- Them payment provider hoac payment mock service co trang thai ro.
- Them email/SMS notification cho han tra, dat truoc, giao nhan.
- Them admin workflow xu ly don: confirm, cancel, mark picked up, mark returned, refund deposit.
- Them audit log cho hanh dong admin/thu thu.

## 7. Ket luan san pham

Libbuddy hien da co dung khung luong cua mot web thu vien hien dai: khach hang co the tim sach, hoi AI, dang nhap/dang ky, chon thue hoac mua, chon cach nhan va xem tong phi truoc khi xac nhan. He thong da co auth/order backend cho luong cot loi. De len muc production day du, uu tien tiep theo la route guard bang cookie an toan, payment provider, notification, audit log va admin workflow xu ly order chi tiet.
