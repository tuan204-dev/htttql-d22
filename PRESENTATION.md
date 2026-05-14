# Script Thuyết trình — Hệ thống Quản lý Sân bóng

> **Thời lượng:** ~12–15 phút. Đọc theo nhịp tự nhiên, chậm hơn nói thường ngày khoảng 20%.

---

## 1. Mở đầu (45 giây)

Xin chào thầy/cô và các bạn. Em là [Tên], mã sinh viên [MSSV].

Hôm nay em xin trình bày bài tập lớn môn Hệ thống Thông tin Quản lý của em: **Hệ thống Quản lý Sân bóng đá**.

Đây là một website giúp một cụm sân bóng đá — quy mô tầm trung khoảng 4 đến 10 sân — có thể chuyển toàn bộ hoạt động kinh doanh từ giấy tờ, sổ tay sang môi trường số. Khách hàng có thể tự đặt sân online 24/7; nhân viên quầy có công cụ để vận hành tại sân; và chủ sân có báo cáo doanh thu tức thì để ra quyết định.

Trong phần trình bày tiếp theo, em sẽ đi qua **bối cảnh bài toán**, **các nghiệp vụ chính**, **trải nghiệm của từng vai trò người dùng**, **các quy tắc nghiệp vụ quan trọng**, và cuối cùng là **giá trị mà hệ thống mang lại** cho chủ sân và khách hàng.

---

## 2. Bối cảnh & vấn đề thực tế (1 phút 30 giây)

Để hiểu vì sao cần một hệ thống như vậy, em xin được mô tả nhanh tình trạng hiện tại ở phần lớn các cụm sân bóng đá ở Việt Nam mà em đã quan sát.

Hiện nay, ước tính khoảng **70% cụm sân tầm trung** vẫn quản lý bằng phương thức rất thủ công: sổ ghi chép, tin nhắn Zalo, và điện thoại. Khách muốn đặt sân thì phải gọi điện, người trực sân tra sổ xem khung giờ đó còn trống không, ghi tay vào sổ, rồi nhắc khách chuyển khoản đặt cọc. Doanh thu cuối ngày được nhẩm sơ trên đầu, cuối tháng thì cộng tay từ các cuống vé.

Cách làm này phát sinh **bốn vấn đề** lớn.

**Thứ nhất**, dễ trùng lịch. Khi hai khách gọi điện gần nhau, người trực sân có thể nhớ nhầm hoặc ghi sai, dẫn tới tình huống hai đội cùng đến sân vào một giờ — và một đội phải về tay không. Đây không chỉ là mất doanh thu một đơn, mà còn mất uy tín lâu dài.

**Thứ hai**, thất thoát doanh thu. Tiền dịch vụ kèm theo — nước, áo đấu, trọng tài — bán tại quầy thường không ghi sổ đầy đủ. Tiền cọc, tiền sân, tiền dịch vụ lẫn vào nhau, đến cuối tháng chủ sân không biết chính xác doanh thu thực tế.

**Thứ ba**, khách hàng bất tiện. Khách muốn đặt sân ngoài giờ hành chính, hoặc cuối tuần lúc người trực sân nghỉ, không có cách nào tự tra cứu và đặt được. Trong khi đó, các dịch vụ tương đương như Grab hay Booking đã quen với việc đặt 24/7 từ điện thoại.

**Thứ tư**, không có dữ liệu để ra quyết định. Chủ sân muốn biết sân nào lấp đầy cao, sân nào ế, khung giờ nào nên tăng giá, mã khuyến mãi nào hiệu quả — đều phải đoán, không có con số.

Hệ thống của em ra đời để giải quyết đồng thời cả bốn vấn đề này.

---

## 3. Bốn nghiệp vụ chính của hệ thống (2 phút)

Hệ thống được xây dựng để đáp ứng **bốn nhóm nghiệp vụ** chính.

**Nghiệp vụ thứ nhất — Đặt sân và quản lý lịch đặt.**

Khách hàng có thể tự lên website, chọn loại sân — sân 5, sân 7, hay sân 11 người — chọn ngày trong vòng 14 ngày sắp tới, và hệ thống sẽ hiển thị toàn bộ khung giờ trống của sân đó từ 6 giờ sáng đến 11 giờ tối, chia thành các ô 30 phút. Khách bấm chọn các ô liền nhau — ví dụ 18 giờ đến 19 giờ rưỡi — và hệ thống sẽ tự tính tiền sân theo bảng giá. Đơn được tạo ngay, không cần gọi điện cho ai.

**Nghiệp vụ thứ hai — Quản lý sân và giá thuê.**

Chủ sân có thể tạo mới, sửa, xóa các sân; thêm ảnh; cập nhật trạng thái sân — đang hoạt động, đang bảo trì, hay đóng cửa. Quan trọng hơn, hệ thống cho phép cấu hình **bảng giá theo khung giờ**. Ví dụ: ngày thường buổi sáng 200 nghìn một giờ, ngày thường buổi tối là giờ cao điểm 300 nghìn, cuối tuần thì 350 nghìn cả ngày. Mỗi sân có thể có bảng giá riêng. Khi khách đặt, hệ thống tự tra bảng giá đúng và tính tiền — chủ sân không phải nói giá thủ công.

**Nghiệp vụ thứ ba — Thanh toán và hóa đơn.**

Hệ thống hỗ trợ ba hình thức: tiền mặt tại quầy, chuyển khoản, và thanh toán online qua cổng VNPay. Mỗi đơn có thể được thanh toán nhiều lần — ví dụ khách đặt cọc trước 30%, ngày đá đến đóng nốt 70%. Mỗi giao dịch được ghi vào lịch sử, có mã giao dịch, có người thu tiền, có thời điểm thu. Khi khách yêu cầu, nhân viên có thể in hóa đơn ngay tại quầy — hóa đơn nhiệt khổ 80 milimét, giống các quán café hay siêu thị mini.

**Nghiệp vụ thứ tư — Dịch vụ kèm theo và báo cáo.**

Ngoài tiền sân, sân bóng còn bán thêm nước suối, bia, áo đấu, thuê trọng tài, băng cuốn cổ chân. Khách có thể đặt trước khi đến, hoặc mua phát sinh tại quầy trong lúc đang đá. Tất cả đều được ghi nhận vào đơn của khách, và tổng hợp vào báo cáo.

Báo cáo doanh thu — phần em đầu tư khá nhiều thời gian — cho phép chủ sân chọn khoảng ngày bất kỳ, xem doanh thu theo ngày, theo tháng, theo sân, theo dịch vụ. Có biểu đồ trực quan, có bảng top 10 khách hàng chi tiêu nhiều nhất, có chỉ số tỉ lệ lấp đầy của từng sân. Chủ sân có thể trả lời ngay câu hỏi: *"Tháng vừa rồi sân nào kiếm được nhiều tiền nhất, vào khung giờ nào?"* — một câu hỏi mà trước đây phải mất nửa ngày cộng sổ mới ra.

---

## 4. Ba vai trò người dùng (1 phút 15 giây)

Hệ thống phục vụ **ba vai trò** khác nhau, mỗi vai trò có giao diện riêng phù hợp với nhu cầu của họ.

**Vai trò thứ nhất là Khách hàng.** Đây là người chơi bóng, là người trả tiền. Họ vào website để tìm sân, đặt sân, thanh toán, theo dõi lịch đặt của mình, hủy đơn khi cần, và sau khi đá xong có thể đánh giá sân.

**Vai trò thứ hai là Nhân viên** — người trực tại sân. Họ có một dashboard riêng để xem các đơn đặt trong ngày, xác nhận đơn khi khách đến đặt cọc, check-in khi khách đến đá, bán dịch vụ kèm theo qua màn hình POS giống như thu ngân ở quán café, thu tiền và in hóa đơn cho khách.

**Vai trò thứ ba là Quản trị viên** — thường là chủ sân hoặc người được chủ sân giao phụ trách. Họ có toàn quyền của Nhân viên, cộng thêm khả năng quản lý danh mục sân, cấu hình bảng giá, quản lý dịch vụ, tạo mã khuyến mãi, quản lý tài khoản nhân viên, và xem báo cáo doanh thu — phần mà Nhân viên không được phép xem.

**Việc phân quyền này có ý nghĩa thực tế:** nhân viên quầy không nên thấy doanh thu tháng (vì có thể gây so bì lương), không nên đổi giá tùy ý (tránh ưu ái khách quen), không nên xem được số điện thoại của toàn bộ khách hàng (bảo mật thông tin). Mỗi role chỉ thấy đúng phần việc của mình.

---

## 5. Hành trình của Khách hàng (2 phút)

Em xin được mô tả chi tiết trải nghiệm của khách hàng từ lúc đặt sân đến lúc kết thúc.

Bước đầu tiên, khách vào trang chủ. Họ thấy danh sách 8 sân, mỗi sân có ảnh thực, có tên, loại sân, địa chỉ, và giá từ. Họ có thể lọc theo loại sân — chỉ xem sân 7 chẳng hạn — hoặc tìm theo tên.

Khách bấm vào một sân, ví dụ Sân B2. Trang chi tiết mở ra với ảnh lớn, mô tả, bảng giá đầy đủ theo từng khung giờ và từng loại ngày, và phần đặt sân ở bên phải.

Khách chọn ngày — giả sử ngày mai. Ngay lập tức, hệ thống hiển thị lưới khung giờ từ 6 giờ sáng đến 11 giờ tối, mỗi ô 30 phút. **Ô màu xanh là trống**, **ô màu xám là đã có người đặt rồi**. Khách nhìn thoáng qua là biết khung nào còn trống.

Khách bấm chọn các ô liền nhau — ví dụ ba ô từ 18 giờ đến 19 giờ rưỡi. Hệ thống có ràng buộc: phải chọn các khung liền nhau, không cho phép chọn cách quãng. Tổng cộng được phép đặt tối thiểu nửa giờ, tối đa bốn giờ trong một đơn.

Bên dưới, khách có thể tích chọn thêm dịch vụ kèm: hai chai nước, một bộ áo đấu, một trận trọng tài. Mỗi món tự cộng vào tổng tiền.

Nếu khách có mã khuyến mãi — ví dụ mã `WELCOME10` cho người mới — khách nhập vào ô mã, bấm Áp dụng, hệ thống kiểm tra mã có còn hiệu lực không, có thỏa điều kiện đơn tối thiểu không, và giảm giá tương ứng.

Cuối cùng, khách thấy tổng kết: tiền sân, tiền dịch vụ, giảm giá, **tổng cộng**, và **số tiền cọc bằng 30% tổng**. Khách bấm Đặt sân.

Nếu khách chưa đăng nhập, hệ thống yêu cầu đăng nhập trước. Sau khi đăng nhập, đơn được tạo với một mã định danh có dạng `BK` cộng với ngày tháng năm cộng với số thứ tự — ví dụ `BK20260515001` — dễ đọc, dễ ghi nhớ. Đơn có trạng thái **"Chờ thanh toán"**.

Khách có thể thanh toán cọc ngay qua VNPay, hoặc đợi tới sân trả tiền mặt. Sau khi cọc được thu, đơn tự động chuyển sang trạng thái **"Đã xác nhận"** — sân được giữ chỗ chính thức cho khách.

Đến ngày đá, khách tới sân. Nhân viên check-in. Đá xong, đơn chuyển sang **"Hoàn thành"**. Khách có thể vào lịch sử đặt sân, để lại đánh giá 1 đến 5 sao kèm bình luận về sân — giúp khách khác sau này tham khảo.

Toàn bộ hành trình này có thể thực hiện chỉ từ điện thoại, bất kỳ giờ nào trong ngày, không cần gọi điện cho ai.

---

## 6. Hành trình của Nhân viên (1 phút 30 giây)

Bây giờ em xin chuyển sang vai trò Nhân viên.

Khi nhân viên bắt đầu ca trực, họ đăng nhập và vào dashboard. Họ thấy ngay **bốn con số quan trọng của ngày hôm nay**: tổng số đơn, số đơn đang chờ duyệt, doanh thu đã thu, và số sân đang được sử dụng. Dưới đó là **lịch sân hôm nay** sắp xếp theo giờ, và danh sách đơn cần xác nhận.

Khi khách đến đặt cọc, nhân viên vào trang Duyệt đơn, tìm đơn theo mã hoặc theo tên khách. Khi tìm được đơn, nhân viên bấm "Thu tiền", chọn hình thức — tiền mặt, chuyển khoản, hay VNPay — nhập số tiền nhận được. Hệ thống kiểm tra: nếu số tiền đạt mức cọc tối thiểu, đơn **tự động chuyển sang "Đã xác nhận"** mà không cần nhân viên thao tác thêm. Nếu khách trả thẳng 100%, đơn chuyển sang "Đã thanh toán đủ".

Đến giờ khách đá, nhân viên vào trang Check-in. Họ nhập mã đơn hoặc số điện thoại khách, hệ thống hiện chi tiết đơn — tên, ngày, giờ, sân, đã thanh toán bao nhiêu. Nhân viên bấm Check-in, đơn chuyển sang trạng thái **"Đang đá"** và sân được đánh dấu đang sử dụng.

Trong lúc khách đang đá, nếu khách gọi thêm nước hay áo, nhân viên dùng màn hình **POS — viết tắt của Point of Sale**, giống như thu ngân ở café. Họ tìm đơn của khách, thêm dịch vụ vào giỏ — kiểu như thêm món trong app gọi đồ — nhập tiền khách trả, hệ thống tính tiền thừa cần trả lại, in hóa đơn nhiệt khổ nhỏ kèm theo.

Khi khách đá xong, nhân viên bấm **Hoàn thành**, đơn chốt. Doanh thu của đơn được cộng vào báo cáo của ngày hôm đó.

Cuối ca, nhân viên không cần làm gì thêm — không cộng sổ, không nhập máy. Mọi giao dịch trong ca đã được lưu vết đầy đủ.

---

## 7. Hành trình của Quản trị viên (1 phút 30 giây)

Cuối cùng là vai trò Quản trị viên — chủ sân hoặc người quản lý.

Khi quản trị viên đăng nhập, họ vào dashboard riêng. Họ thấy **bức tranh toàn cảnh của tháng**: tổng doanh thu, tổng số đơn, số khách mới, tổng số sân đang hoạt động, biểu đồ doanh thu 30 ngày qua, biểu đồ phân bố đơn theo trạng thái, và danh sách đơn đang chờ xác nhận.

Khi cần thay đổi giá — ví dụ tăng giá giờ cao điểm vì sắp giải Euro — quản trị viên vào Bảng giá, chọn sân, sửa khung giờ tối từ 300 lên 350 nghìn. **Có một điểm quan trọng:** hệ thống cho phép sửa **chỉ một trường**, không bắt nhập lại toàn bộ. Ví dụ chỉ cần đổi giá, không cần đụng đến khung giờ hay loại ngày — giúp thao tác nhanh và an toàn.

Khi muốn chạy chiến dịch khuyến mãi — ví dụ "Sinh nhật giảm 15%" — họ vào Khuyến mãi, tạo mã mới, đặt loại giảm là phần trăm hay số tiền cố định, đặt đơn tối thiểu, ngày hết hạn, giới hạn số lượt sử dụng. Mã được kích hoạt ngay, khách có thể nhập vào trang đặt sân.

Khi cần tuyển nhân viên mới, họ vào Người dùng, tạo tài khoản cho nhân viên với vai trò Staff, đặt mật khẩu tạm. Nhân viên có thể đổi mật khẩu sau khi đăng nhập lần đầu.

Phần em muốn nhấn mạnh nhất là **trang Báo cáo**. Quản trị viên chọn khoảng ngày bất kỳ — ví dụ tháng vừa rồi — và xem được:
- **Tab Doanh thu**: tổng doanh thu, chia ra bao nhiêu tiền sân, bao nhiêu tiền dịch vụ, biểu đồ doanh thu từng ngày, biểu đồ so sánh giữa các sân.
- **Tab Đặt sân**: tổng số đơn, phân loại theo trạng thái, xu hướng theo ngày.
- **Tab Khách hàng**: bảng top 10 khách chi tiêu nhiều nhất — đây là danh sách "khách VIP" để chủ sân có chiến lược chăm sóc riêng.
- **Tab Sân**: tỉ lệ lấp đầy của từng sân — sân nào kín 80%, sân nào chỉ 30% — để ra quyết định mở rộng hay bỏ.
- **Tab Dịch vụ**: dịch vụ nào bán chạy nhất, doanh thu bao nhiêu — để điều chỉnh tồn kho.

Đây là loại dữ liệu mà trước đây — với sổ tay — quản trị viên phải mất nửa ngày cộng tay mới có; còn bây giờ là một cú click.

---

## 8. Bốn quy tắc nghiệp vụ then chốt (1 phút 15 giây)

Em xin được nêu nhanh **bốn quy tắc nghiệp vụ** quan trọng nhất mà hệ thống đảm bảo.

**Quy tắc thứ nhất — Không bao giờ trùng lịch.** Một khung giờ trên một sân chỉ có thể thuộc về tối đa một đơn đặt sân được duyệt. Kể cả khi hai khách bấm Đặt sân **cùng một giây**, chỉ một người thành công, người còn lại nhận thông báo *"Khung giờ vừa bị người khác đặt, vui lòng chọn lại"* và được gợi ý chọn lại khung khác. Đây là quy tắc cứng, không thể vi phạm.

**Quy tắc thứ hai — Đặt cọc 30%.** Khách đặt sân phải đóng cọc 30% tổng giá trị đơn trong vòng một khoảng thời gian quy định. Nếu không đóng cọc, đơn vẫn ở trạng thái "Chờ thanh toán" và **không giữ chỗ cứng**. Khi cọc được thu đủ, đơn tự động chuyển sang "Đã xác nhận" và sân được giữ chính thức.

**Quy tắc thứ ba — Hủy đơn có điều kiện.** Khách chỉ được hủy đơn nếu thời gian từ bây giờ đến giờ đá còn **trên 24 giờ**. Sát giờ hơn thì không được tự hủy — phải gọi điện cho nhân viên. Khi hủy hợp lệ, khung giờ được trả về kho và khách khác có thể đặt lại; tiền cọc được hoàn theo chính sách của sân.

**Quy tắc thứ tư — Snapshot giá tại thời điểm đặt.** Khi khách đặt sân với giá 525 nghìn, nhưng tuần sau chủ sân tăng giá lên 600 nghìn — đơn cũ của khách vẫn giữ nguyên 525 nghìn, không bị thay đổi theo. Tương tự với dịch vụ. Điều này đảm bảo **tính bất biến của hợp đồng** giữa khách và sân: đã thỏa thuận giá nào thì giữ giá đó.

Bốn quy tắc này là xương sống của hệ thống, đảm bảo công bằng cho cả khách và chủ sân.

---

## 9. Giá trị mang lại (1 phút 30 giây)

Em xin được tổng kết **giá trị thực tế** mà hệ thống mang lại cho từng bên.

**Đối với khách hàng**, lợi ích rõ nhất là: đặt sân được **24/7 từ điện thoại**, không cần chờ ai. Nhìn thấy ngay khung giờ trống — không phải gọi hỏi mò. Thanh toán linh hoạt — cọc trước hay đóng đủ đều được, qua tiền mặt, chuyển khoản, hay ví điện tử. Theo dõi được lịch sử đặt sân, lịch sắp tới, biên lai từng đơn. Có thể đánh giá sân và đọc đánh giá của người khác trước khi quyết định.

**Đối với nhân viên quầy**, công việc nhẹ đi rất nhiều. Không phải ghi sổ, không phải cộng tay, không phải tự nhớ ai đặt giờ nào. Khi khách tới, gõ mã đơn là có đủ thông tin. Khi bán dịch vụ, dùng POS như app gọi đồ. Khi thu tiền, hệ thống tự tính tiền thừa, tự in hóa đơn. Cuối ca không phải làm gì thêm — báo cáo tự sinh.

**Đối với chủ sân**, đây là phần em tâm đắc nhất. Họ có:
- **Doanh thu minh bạch theo thời gian thực** — biết ngay đến từng giờ, không phải đợi cuối tháng.
- **Dữ liệu để ra quyết định** — biết sân nào kiếm tiền, khung giờ nào nên tăng giá, dịch vụ nào nên đẩy, khách nào nên chăm sóc.
- **Giảm thất thoát** — mỗi đồng tiền đều có vết, không ai có thể "quên ghi sổ" được nữa.
- **Mở rộng dễ hơn** — khi muốn thêm sân, thêm chi nhánh, thêm nhân viên, hệ thống đã có sẵn — không phải đào tạo lại quy trình giấy tờ.

Em ước tính một cụm sân tầm trung — khoảng 8 sân — sau khi áp dụng hệ thống có thể **giảm thất thoát doanh thu khoảng 5 đến 10%** chỉ riêng từ việc loại bỏ trùng lịch và bán dịch vụ có ghi vết đầy đủ. Với doanh thu trung bình 200 triệu một tháng, đây là số tiền không nhỏ.

---

## 10. Hướng phát triển (45 giây)

Hệ thống hiện tại đã đáp ứng đủ bốn nghiệp vụ cốt lõi, nhưng em ghi nhận **một số hướng phát triển** trong tương lai.

**Thứ nhất**, thêm thông báo tự động qua email và tin nhắn — khi đơn được xác nhận, khi sắp đến giờ đá, khi có khuyến mãi mới.

**Thứ hai**, mở rộng cho **nhiều cụm sân** — hiện tại hệ thống thiết kế cho một cụm; nếu chủ có nhiều cụm ở nhiều quận khác nhau, cần thêm cấp quản lý chi nhánh.

**Thứ ba**, **chương trình khách hàng thân thiết** — tích điểm sau mỗi lần đặt, đổi điểm lấy ưu đãi, hạng thành viên.

**Thứ tư**, **đặt sân định kỳ** — khách muốn đặt mỗi thứ Tư hàng tuần trong ba tháng, hiện phải đặt từng tuần một; tương lai có thể đặt một lần cho cả chuỗi.

**Thứ năm**, **ứng dụng di động riêng** — hiện tại đã chạy tốt trên trình duyệt mobile, nhưng app riêng sẽ có push notification và trải nghiệm mượt hơn.

Đây là những tính năng "có thì tốt", không phải nghiệp vụ cốt lõi — nên em ưu tiên hoàn thiện bốn nghiệp vụ chính trước, sau đó mới mở rộng.

---

## 11. Kết luận (45 giây)

Em xin được tóm tắt phần trình bày trong **ba ý**.

**Một**, hệ thống Quản lý Sân bóng giải quyết một bài toán có thật, phổ biến — chuyển hóa quy trình thủ công bằng sổ giấy và điện thoại thành quy trình số hóa thống nhất.

**Hai**, hệ thống đáp ứng đầy đủ bốn nghiệp vụ cốt lõi — đặt sân, quản lý sân và giá, thanh toán và hóa đơn, dịch vụ kèm theo và báo cáo — với ba vai trò người dùng được phân quyền rõ ràng, mỗi vai trò có giao diện và chức năng phù hợp với công việc của họ.

**Ba**, các quy tắc nghiệp vụ then chốt như chống trùng lịch, đặt cọc giữ chỗ, snapshot giá, hủy đơn có điều kiện — đều được hiện thực hóa chặt chẽ, đảm bảo công bằng cho khách hàng và minh bạch cho chủ sân.

Hệ thống không chỉ là công cụ thay thế sổ tay — nó còn là nguồn dữ liệu cho phép chủ sân hiểu rõ hoạt động kinh doanh của mình, ra quyết định dựa trên số liệu thay vì cảm tính, và mở rộng quy mô dễ dàng hơn trong tương lai.

Em xin chân thành cảm ơn thầy/cô và các bạn đã lắng nghe. Em sẵn sàng nhận câu hỏi.

---

## CÂU HỎI THƯỜNG GẶP (đề phòng)

### Q1: "Nếu khách đặt rồi nhưng không đến thì sao?"

> "Đó gọi là 'no-show'. Khách đã đóng cọc 30% — số tiền này thuộc về sân, không hoàn lại. Đơn được chuyển sang trạng thái Hoàn thành hoặc Hủy tùy chính sách. Trong tương lai có thể thêm hạng khách: ai no-show nhiều lần sẽ bị giới hạn quyền đặt."

### Q2: "Nếu sân hỏng đột xuất — ví dụ mưa to ngập sân — thì xử lý đơn đã đặt thế nào?"

> "Nhân viên đăng nhập, vào đơn, bấm 'Hủy đơn' với lý do 'Sân không khả dụng do thời tiết'. Hệ thống có nút hoàn cọc — chuyển trả khách qua kênh đã thanh toán. Khung giờ được trả về kho. Chủ sân có thể gửi mã khuyến mãi xin lỗi cho khách lần sau."

### Q3: "Nhân viên gian lận — thu tiền nhưng không ghi nhận thì sao?"

> "Mọi giao dịch tiền mặt đều phải ghi nhận trên hệ thống mới được coi là hợp lệ. Hóa đơn được in từ hệ thống, có mã đơn, có số tiền — khách giữ. Cuối tháng, đối soát giữa tiền mặt thực tế với tổng giao dịch trong hệ thống là phát hiện ngay chênh lệch. Hệ thống không loại trừ hoàn toàn rủi ro con người, nhưng làm cho việc gian lận khó hơn và dễ truy ra."

### Q4: "Mã khuyến mãi bị share tràn lan thì làm sao kiểm soát?"

> "Mỗi mã có ba điều kiện kiểm soát: ngày hiệu lực — ví dụ chỉ chạy từ 1 đến 31 tháng 5; đơn tối thiểu — phải đặt từ 500k mới được dùng; và số lượt sử dụng tối đa — ví dụ chỉ 100 lượt đầu tiên. Khi đủ điều kiện một trong ba thì mã tự khóa. Nếu muốn mã chỉ dành cho một khách cụ thể, tương lai có thể thêm tính năng 'mã cá nhân' gắn với customerId."

### Q5: "Báo cáo có chính xác không? Có check được không?"

> "Mọi con số trong báo cáo đều được tổng hợp trực tiếp từ các giao dịch gốc — không có khâu nhập lại. Doanh thu = tổng số tiền các payment có trạng thái 'Thành công' trong khoảng ngày được chọn. Có thể bấm vào từng số để xem chi tiết — ví dụ click 'doanh thu sân B2' thì hiện ra danh sách 25 đơn cụ thể đóng góp vào con số đó. Hoàn toàn minh bạch và truy vết được."

### Q6: "Tại sao đặt cọc 30%? Sao không 50%?"

> "Em chọn 30% theo khảo sát thực tế các cụm sân ở TP.HCM — đa số áp dụng 30%. Tỷ lệ này đủ để khách cam kết, đủ để bù lỗ nếu khách no-show, mà không quá cao đến mức khách ngại đặt. Hệ thống cho phép admin cấu hình con số này nếu sau này muốn đổi."

### Q7: "Hệ thống có hỗ trợ nhiều ngôn ngữ không?"

> "Hiện tại tiếng Việt là ngôn ngữ chính, phù hợp với thị trường mục tiêu. Cấu trúc code có tách phần text ra để dễ thêm tiếng Anh hay tiếng Hàn về sau — phục vụ khách nước ngoài ở các khu có nhiều người nước ngoài như Phú Mỹ Hưng, Thảo Điền."

### Q8: "Nếu mất internet thì nhân viên có làm việc được không?"

> "Hệ thống là web, cần internet để hoạt động. Đây là hạn chế thực tế. Em đề xuất giải pháp: nhân viên có thể tạm ghi tay khi mất net (rất hiếm, mạng 4G điện thoại làm hotspot trong vài phút). Khi có mạng lại thì nhập bù vào hệ thống. Với cụm sân hiện đại, mất internet quá ít khi xảy ra — không phải vấn đề ưu tiên."

### Q9: "Một sân lý tưởng đầu tư bao nhiêu thì áp dụng được hệ thống này?"

> "Hệ thống không có chi phí cố định cao — không cần phần cứng đặc biệt, chỉ cần máy tính hoặc tablet cho nhân viên, máy in hóa đơn nhiệt khoảng 1.5 triệu, và internet. Phù hợp với mọi quy mô từ 2 đến 20 sân. Cụm càng lớn, lợi ích càng rõ vì sổ tay càng dễ sai sót."

### Q10: "Em đã thử nghiệm hệ thống ở sân thực tế nào chưa?"

> "Hiện tại em mới thử nghiệm trên dữ liệu mô phỏng — em tạo sẵn 8 sân, 13 người dùng, hơn 30 đơn đặt sân trải đều trong 30 ngày qua và 7 ngày tới với đủ các trạng thái khác nhau, hơn 30 giao dịch thanh toán, 8 đánh giá. Bước tiếp theo nếu được, em sẽ liên hệ một cụm sân thật ở khu Thủ Đức để chạy thử song song với sổ tay của họ trong 1 tháng, so sánh độ chính xác."

---

## CHECKLIST 5 PHÚT TRƯỚC KHI THUYẾT TRÌNH

- [ ] Hệ thống đã chạy: thử mở trang chủ, login admin, vào báo cáo — đều OK
- [ ] Đã đăng nhập sẵn 3 tab: customer / staff / admin
- [ ] Dán sẵn ba tài khoản test ra giấy nhớ:
      `admin@soccer.local / admin123`
      `staff@soccer.local / staff123`
      `customer@soccer.local / customer123`
- [ ] Máy tính cắm điện, đã test chia sẻ màn hình
- [ ] In một bản tóm tắt 1 trang cầm tay (đề phòng máy lỗi)
- [ ] Uống nước, hít thở sâu 3 lần, mỉm cười

---

## TIPS TRÌNH BÀY

1. **Đọc chậm 20% so với nói thường ngày.** Người nghe lần đầu cần thời gian xử lý.
2. **Dừng 1–2 giây sau mỗi ý quan trọng.** Cho thông tin lắng đọng.
3. **Eye contact đều 3 vị trí** trong phòng — trái, giữa, phải.
4. **Đừng đọc nguyên văn từ script** — đọc trước nhiều lần để thuộc ý, rồi nói tự nhiên.
5. **Nếu lỡ quên ý:** im lặng 2 giây nhìn xuống script, ngẩng lên tiếp tục. Không hấp tấp.
6. **Câu hỏi không biết:** *"Câu hỏi rất hay, em chưa cân nhắc kỹ khía cạnh đó. Em xin ghi nhận và tìm hiểu thêm."* — đừng bịa.
7. **Mở đầu và kết thúc** là hai phần được nhớ rõ nhất — luyện kỹ hai phần này.

---

> **Chúc thuyết trình thành công!** 🎤
