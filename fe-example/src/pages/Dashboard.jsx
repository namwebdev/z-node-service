// Author: TrungQuanDev | https://youtube.com/@trungquandev
import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import { useNavigate } from "react-router-dom";
import { fetchUserAPI, logoutAPI, get2FAQRCodeAPI, setup2FA, verify2FA } from "~/apis";
import Setup2FA from "~/components/setup-2fa";
import Require2FA from "~/components/require-2fa";
import { toast } from 'react-toastify'

function Dashboard() {
  const [user, setUser] = useState(null);
  const [openSetup2FA, setOpenSetup2FA] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Gọi API
      const user = await fetchUserAPI();
      setUser(user);
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    // Gọi APi
    await logoutAPI(user._id);
    // Xóa thông tin user trong LocalStorage phía Front-end
    localStorage.removeItem("userInfo");
    // Điều hướng tới trang Login khi Logout thành công
    navigate("/login");
  };

  const handleSetup2FA = async (otpToken) => {
    const res = await setup2FA(user._id, otpToken);
    if (!res) {
      toast.error("Setup 2FA failed!");
      return;
    }

    setUser(res);
    localStorage.setItem("userInfo", JSON.stringify(user));
    setOpenSetup2FA(false);
    toast.success("Setup 2FA successfully!");
  };

  const handleVerify2FA = async (otpToken) => {
    const res = await verify2FA(user._id, otpToken);
    if (!res) {
      toast.error("Verify 2FA failed!");
      return;
    }

    setUser(res);
    localStorage.setItem("userInfo", JSON.stringify(user));
    toast.success("Verify 2FA successfully!");
  }

  if (!user) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          width: "100vw",
          height: "100vh",
        }}
      >
        <CircularProgress />
        <Typography>Loading dashboard user...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: "1120px",
        margin: "1em auto",
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
        gap: 1,
        padding: "0 1em",
      }}
    >
      {/* Modal để user cài đặt 2FA */}
      <Setup2FA
        isOpen={openSetup2FA}
        toggleOpen={setOpenSetup2FA}
        user={user}
        onSetup2FA={handleSetup2FA}
      />

      {/* Modal yêu cầu xác thực 2FA */}
      {/* Với điều kiện user đã bật tính năng 2FA, và user chưa xác thực 2FA ngay sau khi đăng nhập ở lần tiếp theo */}
      {/* <Require2FA /> */}
      {user.require_2fa && !user.is_2fa_verified && <Require2FA onVerify2FA={handleVerify2FA} />}

      <Alert
        severity="info"
        sx={{ ".MuiAlert-message": { overflow: "hidden" } }}
      >
        Đây là trang Dashboard sau khi user:&nbsp;
        <Typography
          variant="span"
          sx={{
            fontWeight: "bold",
            "&:hover": { color: "#e67e22", cursor: "pointer" },
          }}
        >
          {user.email}
        </Typography>
        &nbsp; đăng nhập thành công thì mới cho truy cập vào.
      </Alert>

      <Alert
        severity={`${user.require_2fa ? "success" : "warning"}`}
        sx={{ ".MuiAlert-message": { overflow: "hidden" } }}
      >
        Tình trạng bảo mật tài khoản:&nbsp;
        <Typography
          variant="span"
          sx={{
            fontWeight: "bold",
            "&:hover": { color: "#e67e22", cursor: "pointer" },
          }}
        >
          {user.require_2fa ? "Đã Bật" : "Chưa Bật"} xác thực 2 lớp - Two-Factor
          Authentication (2FA)
        </Typography>
      </Alert>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "end",
          gap: 2,
          mt: 1,
        }}
      >
        {!user.require_2fa && (
          <Button
            type="button"
            variant="contained"
            color="warning"
            size="large"
            sx={{ maxWidth: "max-content" }}
            onClick={() => setOpenSetup2FA(true)}
          >
            Enable 2FA
          </Button>
        )}

        <Button
          type="button"
          variant="contained"
          color="info"
          size="large"
          sx={{ maxWidth: "max-content" }}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ textAlign: "right" }}>
        Author:&nbsp;
        <Typography
          variant="span"
          sx={{ fontWeight: "bold", "&:hover": { color: "#fdba26" } }}
        >
          <a
            style={{ color: "inherit", textDecoration: "none" }}
            href="https://youtube.com/@trungquandev"
            target="_blank"
            rel="noreferrer"
          >
            TrungQuanDev - Một Lập Trình Viên
          </a>
        </Typography>
      </Box>
    </Box>
  );
}

export default Dashboard;
